import React from "react";
import {cn} from "@/lib/utils";
import {useDeviceType} from "@/hooks/use-mobile";

interface ResponsiveContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Add horizontal padding based on screen size
   * @default true
   */
  withPadding?: boolean;

  /**
   * Constrain the maximum width of the container
   * @default true
   */
  constrained?: boolean;

  /**
   * Use full viewport width on mobile
   * @default false
   */
  fullWidthOnMobile?: boolean;

  /**
   * Add bottom padding to account for mobile navigation
   * @default false
   */
  withNavPadding?: boolean;

  /**
   * Center the content horizontally
   * @default false
   */
  centered?: boolean;
}

/**
 * A responsive container component that adapts to different screen sizes
 */
export function ResponsiveContainer({
  children,
  className,
  withPadding = true,
  constrained = true,
  fullWidthOnMobile = false,
  withNavPadding = false,
  centered = false,
  ...props
}: ResponsiveContainerProps) {
  const {deviceType} = useDeviceType();
  const isMobile = deviceType === "mobile";

  return (
    <div
      className={cn(
        // Base styles
        "w-full mx-auto",

        // Padding
        withPadding && ["px-4 sm:px-6 md:px-8"],

        // Constrained width
        constrained && [
          "max-w-7xl",
          isMobile && !fullWidthOnMobile && "max-w-[90%]"
        ],

        // Full width on mobile
        isMobile && fullWidthOnMobile && "max-w-none px-0",

        // Navigation padding
        withNavPadding && "pb-16 md:pb-0",

        // Centering
        centered && "flex flex-col items-center",

        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A mobile-friendly section component with proper spacing
 */
export function ResponsiveSection({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-6 md:py-10", className)} {...props}>
      {children}
    </section>
  );
}

/**
 * A component that only renders its children on mobile devices
 */
export function MobileOnly({
  children,
  breakpoint = "md"
}: {
  children: React.ReactNode;
  breakpoint?: "sm" | "md" | "lg";
}) {
  return <div className={`block ${breakpoint}:hidden`}>{children}</div>;
}

/**
 * A component that only renders its children on desktop devices
 */
export function DesktopOnly({
  children,
  breakpoint = "md"
}: {
  children: React.ReactNode;
  breakpoint?: "sm" | "md" | "lg";
}) {
  return <div className={`hidden ${breakpoint}:block`}>{children}</div>;
}
