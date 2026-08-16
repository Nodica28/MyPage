import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {useLocation} from "wouter";

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  title?: string;
  company?: {
    companyName: string;
    companyWebsite: string;
    companyLogo?: string;
    companyId?: number;
    autoJoin?: boolean;
    primaryColor?: string;
  };
  invitationToken?: string;
  isBetaTester?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

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

export function useRegisterMutation() {
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await fetch("/api/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the user query cache with the user data
      const userData = data.user || data;
      queryClient.setQueryData(["user"], userData);

      toast({
        title: "Success",
        description:
          data.message || "Registration successful! Welcome to Badge."
      });

      // Redirect to start page or dashboard
      setLocation("/start");
    },
    onError: (error: Error) => {
      console.error("[Auth] Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive"
      });
    }
  });
}

export function useLoginMutation() {
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the user query cache with the user data
      const userData = data.user || data;
      queryClient.setQueryData(["user"], userData);

      toast({
        title: "Welcome back!",
        description: data.message || "Successfully logged in."
      });

      // Redirect to dashboard
      setLocation("/");
    },
    onError: (error: Error) => {
      console.error("[Auth] Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
    }
  });
}

export function useLogoutMutation() {
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Clear all query cache
      queryClient.clear();

      toast({
        title: "Logged out",
        description: data.message || "You have been successfully logged out."
      });

      // Redirect to auth page
      setLocation("/auth");
    },
    onError: (error: Error) => {
      console.error("[Auth] Logout error:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An error occurred during logout",
        variant: "destructive"
      });
    }
  });
}
