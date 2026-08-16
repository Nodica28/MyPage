"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// This component is a simplified wrapper around the dropdown menu
// that uses an uncontrolled dropdown to prevent maximum update depth errors
interface ControlledDropdownProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

export function ControlledDropdown({
  children,
  trigger,
  align = "end",
  sideOffset = 4,
  className
}: ControlledDropdownProps) {
  // Using uncontrolled component approach to avoid the update loop
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        className={className}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export {DropdownMenuItem, DropdownMenuSeparator};
