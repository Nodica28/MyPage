import {QueryClient, QueryFunction} from "@tanstack/react-query";

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const responseBody = isJson ? await res.json() : await res.text();

  throw new APIError(
    responseBody.error || `API Error: ${res.status} ${res.statusText}`,
    res.status,
    {response: responseBody}
  );
}

// Custom API request function to handle form data
export async function apiRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | FormData | object;
    credentials?: string;
    [key: string]: any;
  } = {}
): Promise<any> {
  try {
    const headers =
      options.body instanceof FormData
        ? {...(options.headers || {})} // Don't set Content-Type for FormData
        : {
            "Content-Type": "application/json",
            ...(options.headers || {})
          };

    // Convert object body to JSON string if it's not FormData and not already a string
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    const res = await fetch(url, {
      ...options,
      body,
      method: options.method || "GET",
      headers,
      credentials: "include" // Always include credentials
    });

    // Check if the response is JSON
    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    // Parse the response based on content type
    const data = isJson ? await res.json() : await res.text();

    // Handle API errors
    if (!res.ok) {
      const error = new Error(
        isJson && data.error ? data.error : "API request failed"
      );

      // Add extra properties to the error
      (error as any).status = res.status;
      (error as any).data = data;

      throw error;
    }

    return data;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({on401: unauthorizedBehavior}) =>
  async ({queryKey}) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        method: "GET",
        credentials: "include", // Always include credentials
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error("Query failed:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch data", 0, {originalError: error});
    }
  };

// Enhanced Query Client with optimized caching strategies for seamless navigation
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({on401: "throw"}),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch when component mounts if data exists
      refetchOnReconnect: "always", // Refetch on network reconnect
      // Extended caching for better navigation experience
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes cache time - keep data longer in memory
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (
          error instanceof APIError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      // Enable selective refetching based on data type
      structuralSharing: true // Prevent unnecessary re-renders
    },
    mutations: {
      retry: false,
      // Optimistic updates for better UX
      onError: (error) => {
        console.error("Mutation error:", error);
      }
    }
  }
});

// Enhanced prefetch utilities for strategic data loading
export const prefetchHelpers = {
  // Prefetch user profile data with different stale times based on data type
  prefetchUserProfile: (userId?: string) => {
    return queryClient.prefetchQuery({
      queryKey: userId ? ["user", userId] : ["user"],
      queryFn: () => apiRequest(userId ? `/api/users/${userId}` : "/api/user"),
      staleTime: 10 * 60 * 1000, // User data changes less frequently
      gcTime: 60 * 60 * 1000 // Keep user data for 1 hour
    });
  },

  // Prefetch organization data
  prefetchOrganization: (orgId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ["organization", orgId],
      queryFn: () => apiRequest(`/api/organization/${orgId}`),
      staleTime: 15 * 60 * 1000, // Organization data rarely changes
      gcTime: 60 * 60 * 1000
    });
  },

  // Prefetch badge profile settings
  prefetchBadgeProfile: (userId?: string) => {
    return queryClient.prefetchQuery({
      queryKey: ["badge-profile", userId || "current"],
      queryFn: () =>
        apiRequest(`/api/badge-profile${userId ? `/${userId}` : ""}`),
      staleTime: 3 * 60 * 1000, // Profile settings may change more often
      gcTime: 30 * 60 * 1000
    });
  },

  // Prefetch page settings based on route
  prefetchPageSettings: (pageType: string) => {
    return queryClient.prefetchQuery({
      queryKey: ["page-settings", pageType],
      queryFn: () => apiRequest(`/api/settings/${pageType}`),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000
    });
  },

  // Prefetch common data used across pages
  prefetchCommonData: async () => {
    const promises = [
      prefetchHelpers.prefetchUserProfile(),
      queryClient.prefetchQuery({
        queryKey: ["theme-settings"],
        queryFn: () => apiRequest("/api/theme"),
        staleTime: 15 * 60 * 1000
      }),
      queryClient.prefetchQuery({
        queryKey: ["navigation-data"],
        queryFn: () => apiRequest("/api/navigation"),
        staleTime: 10 * 60 * 1000
      })
    ];

    await Promise.allSettled(promises);
  },

  // Invalidate related queries after mutations with selective invalidation
  invalidateUserData: () => {
    queryClient.invalidateQueries({queryKey: ["user"], exact: false});
    queryClient.invalidateQueries({queryKey: ["badge-profile"], exact: false});
    queryClient.invalidateQueries({queryKey: ["settings"], exact: false});
  },

  // Smart invalidation for specific data types
  invalidateProfileData: () => {
    queryClient.invalidateQueries({queryKey: ["user"], exact: false});
    queryClient.invalidateQueries({queryKey: ["badge-profile"], exact: false});
  },

  invalidateSettingsData: () => {
    queryClient.invalidateQueries({queryKey: ["settings"], exact: false});
    queryClient.invalidateQueries({queryKey: ["theme-settings"], exact: false});
  },

  // Clear cache on logout with selective clearing
  clearCache: () => {
    queryClient.clear();
  },

  // Remove specific user data without clearing everything
  clearUserData: () => {
    queryClient.removeQueries({queryKey: ["user"], exact: false});
    queryClient.removeQueries({queryKey: ["badge-profile"], exact: false});
  }
};

// Enhanced image preloading utility with better error handling and prioritization
export const imagePreloader = {
  preloadImage: (
    src: string,
    priority: "low" | "high" = "low"
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Set loading priority for browsers that support it
      if ("loading" in img) {
        img.loading = priority === "high" ? "eager" : "lazy";
      }

      // Set fetch priority for browsers that support it
      if ("fetchPriority" in img) {
        (img as any).fetchPriority = priority;
      }

      img.onload = () => resolve();
      img.onerror = (error) => {
        console.warn(`Failed to preload image: ${src}`, error);
        reject(error);
      };
      img.src = src;
    });
  },

  preloadImages: async (
    sources: string[],
    priority: "low" | "high" = "low"
  ): Promise<void> => {
    const promises = sources.map((src) =>
      imagePreloader.preloadImage(src, priority)
    );
    await Promise.allSettled(promises);
  },

  // Preload critical images for current user with prioritization
  preloadUserImages: async (user: any) => {
    const criticalImages: string[] = [];
    const secondaryImages: string[] = [];

    // Critical images (above the fold, always visible)
    if (user?.profileImage) criticalImages.push(user.profileImage);

    // Secondary images (may be below the fold)
    if (user?.bannerImage) secondaryImages.push(user.bannerImage);
    if (user?.organization?.logo) secondaryImages.push(user.organization.logo);

    // Load critical images first with high priority
    if (criticalImages.length > 0) {
      await imagePreloader.preloadImages(criticalImages, "high");
    }

    // Load secondary images with low priority
    if (secondaryImages.length > 0) {
      await imagePreloader.preloadImages(secondaryImages, "low");
    }
  },

  // Preload images for a specific route
  preloadRouteImages: async (route: string) => {
    const routeImageMap: Record<
      string,
      {critical: string[]; secondary: string[]}
    > = {
      "/headshots": {
        critical: ["/icons/camera.svg"],
        secondary: ["/placeholder/headshot.jpg", "/backgrounds/studio.jpg"]
      },
      "/brand-assets": {
        critical: ["/icons/palette.svg"],
        secondary: ["/placeholder/banner.jpg", "/backgrounds/creative.jpg"]
      },
      "/badge-profile": {
        critical: ["/icons/user.svg"],
        secondary: ["/backgrounds/default.jpg", "/placeholder/avatar.svg"]
      }
    };

    const images = routeImageMap[route];
    if (images) {
      // Load critical images first
      if (images.critical.length > 0) {
        await imagePreloader.preloadImages(images.critical, "high");
      }
      // Load secondary images in background
      if (images.secondary.length > 0) {
        imagePreloader.preloadImages(images.secondary, "low");
      }
    }
  }
};
