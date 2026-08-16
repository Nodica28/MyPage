import React, {useEffect, useRef} from "react";
import {generateColorPalette} from "@/lib/theme-utils";
import {cn} from "@/lib/utils";

interface ScopedThemeProviderProps {
  companyColor: string | null;
  children: React.ReactNode;
  className?: string;
}

/**
 * Scoped theme provider that applies company colors only to its children
 * Uses CSS variables scoped to a specific container instead of global
 */
export function ScopedThemeProvider({
  companyColor,
  children,
  className = ""
}: ScopedThemeProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => {
    if (!containerRef.current || !companyColor) {
      // Reset to defaults if no company color
      if (containerRef.current) {
        containerRef.current.style.removeProperty("--primary");
        containerRef.current.style.removeProperty("--primary-foreground");
        containerRef.current.style.removeProperty("--secondary");
        containerRef.current.style.removeProperty("--secondary-foreground");
        containerRef.current.style.removeProperty("--accent");
        containerRef.current.style.removeProperty("--accent-foreground");
        containerRef.current.style.removeProperty("--ring");
      }
      return;
    }

    const palette = generateColorPalette(companyColor);

    // Apply scoped CSS variables to the container (these override global vars for this container)
    if (containerRef.current) {
      containerRef.current.style.setProperty("--primary", palette.primary.DEFAULT);
      containerRef.current.style.setProperty(
        "--primary-foreground",
        isDark ? palette.primary.foreground.dark : palette.primary.foreground.light
      );
      containerRef.current.style.setProperty("--secondary", palette.secondary.DEFAULT);
      containerRef.current.style.setProperty(
        "--secondary-foreground",
        isDark ? palette.secondary.foreground.dark : palette.secondary.foreground.light
      );
      containerRef.current.style.setProperty("--accent", palette.accent.DEFAULT);
      containerRef.current.style.setProperty(
        "--accent-foreground",
        isDark ? palette.accent.foreground.dark : palette.accent.foreground.light
      );
      containerRef.current.style.setProperty("--ring", palette.primary.DEFAULT);
    }
  }, [companyColor, isDark]);

  // Listen for dark mode changes
  useEffect(() => {
    if (!companyColor || !containerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          containerRef.current
        ) {
          const isCurrentlyDark = document.documentElement.classList.contains("dark");
          const palette = generateColorPalette(companyColor);

          containerRef.current.style.setProperty("--primary", palette.primary.DEFAULT);
          containerRef.current.style.setProperty(
            "--primary-foreground",
            isCurrentlyDark ? palette.primary.foreground.dark : palette.primary.foreground.light
          );
          containerRef.current.style.setProperty("--secondary", palette.secondary.DEFAULT);
          containerRef.current.style.setProperty(
            "--secondary-foreground",
            isCurrentlyDark
              ? palette.secondary.foreground.dark
              : palette.secondary.foreground.light
          );
          containerRef.current.style.setProperty("--accent", palette.accent.DEFAULT);
          containerRef.current.style.setProperty(
            "--accent-foreground",
            isCurrentlyDark ? palette.accent.foreground.dark : palette.accent.foreground.light
          );
          containerRef.current.style.setProperty("--ring", palette.primary.DEFAULT);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, [companyColor]);

  return (
    <div ref={containerRef} className={cn("scoped-theme", className)}>
      {children}
    </div>
  );
}
