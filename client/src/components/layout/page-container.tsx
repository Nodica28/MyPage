"use client";
import React from "react";
import {cn} from "@/lib/utils";

type ContentWidth = "default" | "lg" | "xl" | "full";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  contentWidth?: ContentWidth;
  className?: string;
}

export function PageContainer({
  children,
  title,
  description,
  actions,
  contentWidth = "default",
  className
}: PageContainerProps) {
  return (
    <div
      className={cn(
        // Base padding and width - more compact on mobile
        "py-2 px-0 sm:px-2 md:px-6 md:py-6 w-full bg-white",
        {
          // Only apply max-width and centering constraints for non-full widths
          "md:max-w-3xl md:mx-auto": contentWidth === "default",
          "md:max-w-4xl md:mx-auto": contentWidth === "lg",
          "md:max-w-6xl md:mx-auto": contentWidth === "xl",
          "w-full max-w-full": contentWidth === "full"
        },
        className
      )}
    >
      {(title || actions) && (
        <PageHeader
          title={title || ""}
          description={description}
          actions={actions}
        />
      )}
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({title, description, actions}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function PageSection({
  children,
  title,
  description,
  className
}: PageSectionProps) {
  return (
    <section className={cn("space-y-2 sm:space-y-3 md:space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground md:text-base">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContent({children, className}: PageContentProps) {
  return (
    <div
      className={cn("space-y-3 sm:space-y-4 md:space-y-6 w-full", className)}
    >
      {children}
    </div>
  );
}
