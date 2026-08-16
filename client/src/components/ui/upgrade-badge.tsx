import React from "react";
import {Link} from "wouter";
import {ChevronRight} from "lucide-react";
import {Button} from "./button";
import {cn} from "@/lib/utils";

interface UpgradeBadgeProps {
  /** The text to display in the badge */
  text?: string;
  /** The link destination */
  href?: string;
  /** Additional CSS classes */
  className?: string;
  /** Badge variant */
  variant?: "default" | "secondary" | "destructive" | "outline";
  /** Whether to show the chevron icon */
  showIcon?: boolean;
}

export const UpgradeBadge: React.FC<UpgradeBadgeProps> = ({
  text = "Upgrade",
  href = "/settings?tab=billing",
  className,
  variant = "secondary",
  showIcon = true
}) => {
  return (
    <Link to={href}>
      <Button
        variant={variant}
        className={cn(
          "bg-violet-50 h-8 px-3 rounded-full text-primary border-2 border-primary/20 hover:bg-primary/20 hover:text-primary/80 cursor-pointer",
          className
        )}
      >
        <span className="text-sm font-medium">{text}</span>
        {showIcon && <ChevronRight className="h-4 w-4 ml-1" />}
      </Button>
    </Link>
  );
};

export default UpgradeBadge;
