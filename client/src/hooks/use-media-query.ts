import {useEffect, useState} from "react";

// Define standard breakpoints that match tailwind default breakpoints
export const breakpoints = {
  xs: 0, // Extra small devices
  sm: 640, // Small devices (640px and up)
  md: 768, // Medium devices (768px and up)
  lg: 1024, // Large devices (1024px and up)
  xl: 1280, // Extra large devices (1280px and up)
  xxl: 1536 // Extra extra large devices (1536px and up)
};

// Type for common breakpoint keys
export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to check if the current viewport matches the media query
 * @param query The media query to check against (e.g., '(min-width: 768px)')
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Default to true for SSR to avoid layout shifts
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== "undefined") {
      // Set initial value
      const media = window.matchMedia(query);
      setMatches(media.matches);

      // Create an event listener function
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // Add the event listener
      media.addEventListener("change", listener);

      // Clean up
      return () => {
        media.removeEventListener("change", listener);
      };
    }
  }, [query]);

  return matches;
}

/**
 * Hook to check if the current viewport is at least the specified breakpoint
 * @param breakpoint The breakpoint to check (e.g., 'md')
 * @returns Boolean indicating if the current viewport is at least the specified breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`);
}

/**
 * Hook to check if the current viewport is a mobile device (less than md breakpoint)
 * @returns Boolean indicating if the current viewport is a mobile device
 */
export function useMobile(): boolean {
  return !useMediaQuery(`(min-width: ${breakpoints.md}px)`);
}

/**
 * Hook to get the current breakpoint
 * @returns The current breakpoint
 */
export function useCurrentBreakpoint(): Breakpoint {
  const isXS = useMediaQuery(`(max-width: ${breakpoints.sm - 1}px)`);
  const isSM = useMediaQuery(
    `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`
  );
  const isMD = useMediaQuery(
    `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`
  );
  const isLG = useMediaQuery(
    `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`
  );
  const isXL = useMediaQuery(
    `(min-width: ${breakpoints.xl}px) and (max-width: ${breakpoints.xxl - 1}px)`
  );
  const isXXL = useMediaQuery(`(min-width: ${breakpoints.xxl}px)`);

  if (isXXL) return "xxl";
  if (isXL) return "xl";
  if (isLG) return "lg";
  if (isMD) return "md";
  if (isSM) return "sm";
  if (isXS) return "xs";
  return "xs";
}
