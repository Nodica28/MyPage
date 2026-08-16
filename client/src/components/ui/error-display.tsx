import React from "react";
import {AlertCircle, X} from "lucide-react";
import {cn} from "@/lib/utils";

interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: "default" | "destructive" | "warning";
}

export function ErrorDisplay({
  error,
  onDismiss,
  className,
  variant = "destructive"
}: ErrorDisplayProps) {
  if (!error) return null;

  const variantStyles = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    destructive: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800"
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border rounded-lg",
        variantStyles[variant],
        className
      )}
    >
      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface FormErrorProps {
  error?: string;
  className?: string;
}

export function FormError({error, className}: FormErrorProps) {
  if (!error) return null;

  return <p className={cn("text-sm text-red-600 mt-1", className)}>{error}</p>;
}
