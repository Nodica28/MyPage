import React from "react";
import {cn} from "@/lib/utils";
import {useSidebar} from "@/components/ui/sidebar";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padded?: boolean;
  centered?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function PageContainer({
  children,
  className,
  padded = true,
  centered = false,
  maxWidth = "xl",
  ...props
}: PageContainerProps) {
  const {isMobile, open} = useSidebar();

  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full"
  };

  return (
    <main
      className={cn(
        "flex-1 w-full transition-all duration-300",
        padded && ["px-4 py-6", "sm:px-6 sm:py-8", "lg:px-8 lg:py-10"],
        centered && "flex flex-col items-center",
        maxWidthClasses[maxWidth],
        isMobile ? "pb-16" : "",
        !isMobile && open ? "ml-64" : "ml-0",
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}

export function PageSection({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn("w-full mb-8", className)} {...props}>
      {children}
    </section>
  );
}

export function PageHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-6 md:mb-8", className)} {...props}>
      {children}
    </div>
  );
}

export function PageTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageContent({children, className, ...props}: PageContentProps) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {children}
    </div>
  );
}
