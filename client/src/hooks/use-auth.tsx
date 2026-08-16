import React, {createContext, useContext, useState} from "react";
import {useToast} from "@/hooks/use-toast";
import {User as UserType} from "@/types/user";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useLocation} from "wouter";
import {RegisterData} from "@/lib/services/auth";

export interface LoginData {
  email: string;
  password: string;
}

// Use the imported User type
type User = UserType;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  googleLogin: () => void;
  googleRegister: () => void;
  slackLogin: () => void;
  slackRegister: () => void;
  getOAuthData: (token?: string) => Promise<any>;
  clearOAuthData: (token?: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  getGoogleToken: () => Promise<{
    accessToken: string;
    expiresAt: string;
    scopes: string[];
  } | null>;
  requestCalendarPermissions: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// List of public routes that don't need auth
const PUBLIC_ROUTES = [
  "/auth",
  "/register",
  "/onboarding",
  "/start",
  "/logout",
  "/user/", // Public user profiles
  "/magic-link", // Magic link authentication
  "/forgot-password", // Password reset
  "/reset-password" // Password reset confirmation
];

// Helper function to extract error message from response
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json();

    // Try different error message fields in order of preference
    return (
      errorData.message ||
      errorData.details ||
      errorData.error ||
      `Request failed with status ${response.status}`
    );
  } catch {
    // If JSON parsing fails, return a generic message
    return `Request failed with status ${response.status}`;
  }
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [error, setError] = useState<string | null>(null);
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  // Enhanced public route checking to handle dynamic routes
  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => location.startsWith(route)) ||
    // Check for public profile routes (single segment paths that aren't system routes)
    (location.match(/^\/[^/]+$/) &&
      !location.startsWith("/api") &&
      ![
        "/",
        "/settings",
        "/super-admin",
        "/admin",
        "/headshots",
        "/headshot-generator",
        "/email-signature",
        "/banner-editor",
        "/badge-profile",
        "/brand-assets",
        "/leads",
        "/test-logout"
      ].includes(location)) ||
    // Check for public badge profile routes (two segment paths)
    location.match(/^\/[^/]+\/[^/]+$/);

  const {data: user, isLoading: loading} = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      // Skip auth check for most public routes, except /auth which needs to check for redirects
      if (isPublicRoute && location !== "/auth") {
        return null;
      }

      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          // For other errors, log them but don't throw to avoid infinite retries
          const errorMessage = await extractErrorMessage(response);
          console.error("[Auth] User check failed:", errorMessage);
          return null;
        }

        const responseData = await response.json();
        // Extract user data from the new response format
        return responseData.user || responseData;
      } catch (err) {
        console.error("[Auth] Check failed:", err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
    // Run the query if we're not on a public route, or if we're specifically on /auth
    enabled: !isPublicRoute || location === "/auth"
  });

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      console.log("[Auth] Attempting login for:", email);

      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({email, password})
      });

      console.log("[Auth] Login response status:", response.status);

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("[Auth] Login successful:", responseData);

      // Extract user data from response
      const userData = responseData.user || responseData;

      // Update the query cache
      queryClient.setQueryData(["user"], userData);

      toast({
        title: "Success",
        description: responseData.message || "Successfully logged in"
      });
    } catch (err) {
      console.error("[Auth] Login error:", err);

      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      console.log("[Auth] Attempting logout");

      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const responseData = await response.json();

      // Clear the query cache
      queryClient.setQueryData(["user"], null);

      toast({
        title: "Success",
        description: responseData.message || "Successfully logged out"
      });
    } catch (err) {
      console.error("[Auth] Logout error:", err);
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
      toast({
        title: "Logout Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      console.log("[Auth] Attempting registration");

      const response = await fetch("/api/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      });

      console.log("[Auth] Registration response status:", response.status);

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log("[Auth] Registration successful:", responseData);

      // Handle both response formats (with or without organization)
      const user = responseData.user || responseData;

      // Update the query cache
      queryClient.setQueryData(["user"], user);

      toast({
        title: "Success",
        description: responseData.message || "Successfully registered"
      });
    } catch (err) {
      console.error("[Auth] Registration error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  const googleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const googleRegister = () => {
    // Check if beta-launch parameter is in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const betaLaunch = urlParams.has("beta-launch");
    const betaQuery = betaLaunch ? "&beta-launch" : "";
    window.location.href = `/api/auth/google?register=true${betaQuery}`;
  };

  // Slack sign-in has been removed from this build. Kept as no-ops so existing
  // callers compile; they surface a notice instead of redirecting to a dead route.
  const slackLogin = () => {
    toast({
      title: "Unavailable",
      description: "Slack sign-in is no longer available."
    });
  };

  const slackRegister = () => {
    toast({
      title: "Unavailable",
      description: "Slack sign-in is no longer available."
    });
  };

  const getOAuthData = async (token?: string) => {
    try {
      if (!token) {
        console.log("No token provided for OAuth data fetch");
        return null;
      }

      const response = await fetch(`/api/auth/oauth-data?token=${token}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error("Error fetching OAuth data:", error);
      return null;
    }
  };

  const clearOAuthData = async (token?: string) => {
    try {
      if (!token) {
        console.log("No token provided for OAuth data clear");
        return;
      }

      await fetch(`/api/auth/oauth-data?token=${token}`, {method: "DELETE"});
    } catch (error) {
      console.error("Error clearing OAuth data:", error);
    }
  };

  const sendMagicLink = async (email: string) => {
    try {
      const response = await fetch("/api/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({email})
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      toast({
        title: "Magic link sent",
        description: "Check your email for the login link"
      });
    } catch (error) {
      console.error("Error sending magic link:", error);
      toast({
        title: "Error",
        description: "Failed to send magic link",
        variant: "destructive"
      });
    }
  };

  const getGoogleToken = async () => {
    try {
      const response = await fetch("/api/auth/google-token", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        console.error("Error getting Google token:", errorMessage);
        return null;
      }

      const data = await response.json();
      return data.success
        ? {
            accessToken: data.accessToken,
            expiresAt: data.expiresAt,
            scopes: data.scopes
          }
        : null;
    } catch (error) {
      console.error("Error getting Google token:", error);
      return null;
    }
  };

  const requestCalendarPermissions = () => {
    window.location.href = "/api/auth/google/calendar";
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        loading,
        error,
        login,
        logout,
        register,
        googleLogin,
        googleRegister,
        slackLogin,
        slackRegister,
        getOAuthData,
        clearOAuthData,
        sendMagicLink,
        getGoogleToken,
        requestCalendarPermissions,
        isLoggedIn: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
