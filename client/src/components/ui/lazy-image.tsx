import React, {useState, useEffect, useRef, useCallback} from "react";
import {cn} from "@/lib/utils";
import {Loader2} from "lucide-react";

interface LazyImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  src: string;
  alt: string;
  fallback?: string;
  skeleton?: boolean;
  skeletonClassName?: string;
  loadingStrategy?: "eager" | "lazy" | "viewport";
  threshold?: number;
  rootMargin?: string;
  placeholder?: "blur" | "skeleton" | "none";
  blurDataURL?: string;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface ImageState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  isInView: boolean;
  retryAttempts: number;
}

export function LazyImage({
  src,
  alt,
  fallback,
  skeleton = true,
  skeletonClassName,
  loadingStrategy = "lazy",
  threshold = 0.1,
  rootMargin = "50px",
  placeholder = "skeleton",
  blurDataURL,
  onLoadStart,
  onLoadComplete,
  onError,
  retryCount = 2,
  retryDelay = 1000,
  className,
  style,
  ...props
}: LazyImageProps) {
  const [state, setState] = useState<ImageState>({
    isLoading: false,
    isLoaded: false,
    hasError: false,
    isInView: false,
    retryAttempts: 0
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for viewport-based lazy loading
  useEffect(() => {
    if (loadingStrategy !== "lazy") {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      // Fallback: load immediately if IntersectionObserver is not supported
      setState((prev) => ({...prev, isInView: true}));
      return;
    }

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setState((prev) => {
              if (!prev.isInView) {
                return {...prev, isInView: true};
              }
              return prev;
            });
            observerRef.current?.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    // Observe the container div - use a small delay to ensure ref is attached
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (container && observerRef.current) {
        observerRef.current.observe(container);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadingStrategy, threshold, rootMargin]);

  // Load image with retry logic
  const loadImage = useCallback(async () => {
    if (!src || state.isLoaded) return;

    setState((prev) => ({...prev, isLoading: true}));
    onLoadStart?.();

    return new Promise<void>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoaded: true,
          hasError: false
        }));
        onLoadComplete?.();
        resolve();
      };

      img.onerror = () => {
        const error = new Error(`Failed to load image: ${src}`);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          hasError: true,
          retryAttempts: prev.retryAttempts + 1
        }));
        onError?.(error);
        reject(error);
      };

      img.src = src;
    });
  }, [src, state.isLoaded, onLoadStart, onLoadComplete, onError]);

  // Retry loading with exponential backoff
  const retryLoad = useCallback(() => {
    if (state.retryAttempts < retryCount) {
      const delay = retryDelay * Math.pow(2, state.retryAttempts);
      retryTimeoutRef.current = setTimeout(() => {
        loadImage().catch(() => {
          // Will be handled by next retry or final failure
        });
      }, delay);
    }
  }, [state.retryAttempts, retryCount, retryDelay, loadImage]);

  // Handle image loading based on strategy (non-lazy strategies)
  useEffect(() => {
    if (loadingStrategy === "eager") {
      setState((prev) => ({...prev, isInView: true}));
    } else if (loadingStrategy === "viewport") {
      // Load when component mounts (for above-the-fold content)
      setState((prev) => ({...prev, isInView: true}));
    }
    // For "lazy" strategy, the IntersectionObserver useEffect handles it
  }, [loadingStrategy]);

  // Load image when in view
  useEffect(() => {
    if (state.isInView && !state.isLoaded && !state.isLoading) {
      loadImage().catch(() => {
        retryLoad();
      });
    }
  }, [state.isInView, state.isLoaded, state.isLoading, loadImage, retryLoad]);

  // Cleanup retry timeout
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Render placeholder content
  const renderPlaceholder = () => {
    if (placeholder === "none") return null;

    if (placeholder === "blur" && blurDataURL) {
      return (
        <img
          src={blurDataURL}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover filter blur-sm",
            className
          )}
          style={style}
        />
      );
    }

    if (placeholder === "skeleton" && skeleton) {
      return (
        <div
          className={cn(
            "absolute inset-0 bg-muted animate-pulse flex items-center justify-center",
            skeletonClassName
          )}
        >
          {state.isLoading && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      );
    }

    return null;
  };

  // Render error state
  const renderError = () => {
    if (!state.hasError) return null;

    return (
      <div
        className={cn(
          "absolute inset-0 bg-muted flex flex-col items-center justify-center",
          className
        )}
      >
        <div className="text-center p-4">
          <div className="text-sm text-muted-foreground mb-2">
            Failed to load image
          </div>
          {state.retryAttempts < retryCount && (
            <button
              onClick={retryLoad}
              className="text-xs text-primary hover:underline"
            >
              Retry ({state.retryAttempts}/{retryCount})
            </button>
          )}
          {fallback && state.retryAttempts >= retryCount && (
            <img
              src={fallback}
              alt={alt}
              className="max-w-full max-h-full object-cover"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden w-full h-full", className)}
      style={style}
    >
      {/* Placeholder/Skeleton */}
      {(!state.isLoaded || state.isLoading) && renderPlaceholder()}

      {/* Error State */}
      {renderError()}

      {/* Actual Image */}
      {state.isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            state.isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={loadingStrategy === "eager" ? "eager" : "lazy"}
          fetchPriority={loadingStrategy === "eager" ? "high" : "low"}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

// Pre-defined lazy image variants for common use cases
export function LazyAvatar({
  src,
  alt,
  className,
  fallback = "/placeholder/avatar.svg",
  ...props
}: Omit<LazyImageProps, "placeholder" | "skeleton">) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      fallback={fallback}
      placeholder="skeleton"
      className={cn("rounded-full aspect-square", className)}
      loadingStrategy="eager" // Avatars are usually above the fold
      {...props}
    />
  );
}

export function LazyThumbnail({
  src,
  alt,
  className,
  ...props
}: Omit<LazyImageProps, "placeholder">) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      placeholder="skeleton"
      className={cn("aspect-video", className)}
      threshold={0.2}
      rootMargin="100px"
      {...props}
    />
  );
}

export function LazyBackground({
  src,
  alt,
  className,
  children,
  ...props
}: Omit<LazyImageProps, "placeholder"> & {children?: React.ReactNode}) {
  return (
    <div className={cn("relative", className)}>
      <LazyImage
        src={src}
        alt={alt}
        placeholder="skeleton"
        className="absolute inset-0 w-full h-full object-cover"
        {...props}
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
