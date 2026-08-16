import React from "react";
import {cn} from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  className
}: StepProgressProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      {Array.from({length: totalSteps}).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div
            key={stepNumber}
            className={cn(
              "flex-shrink-0 rounded-full transition-all duration-200",
              isActive ? "w-8 h-2" : "w-2 h-2",
              isCompleted || isActive ? "bg-primary" : "bg-[#EAECF0]"
            )}
            aria-current={isActive ? "step" : undefined}
          />
        );
      })}
    </div>
  );
}
