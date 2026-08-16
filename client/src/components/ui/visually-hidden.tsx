"use client";

import * as React from "react";
import {cn} from "@/lib/utils";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * VisuallyHidden component for accessibility
 * Visually hides content but keeps it accessible to screen readers
 */
const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({className, children, ...props}, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "absolute w-[1px] h-[1px] p-0 -m-px overflow-hidden whitespace-nowrap border-0",
          "clip-[rect(0,0,0,0)] clip-path-[inset(100%)]",
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

VisuallyHidden.displayName = "VisuallyHidden";

export {VisuallyHidden};
export default VisuallyHidden;
