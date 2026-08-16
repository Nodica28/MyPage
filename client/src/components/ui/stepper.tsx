import {cn} from "@/lib/utils";

interface StepperProps {
  steps: {
    title: string;
    description: string;
    status: "completed" | "current" | "upcoming";
  }[];
  currentStep: number;
}

export function Stepper({steps}: StepperProps) {
  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700">
      {steps.map((step, index) => (
        <li key={index} className="mb-10 ml-6">
          <span
            className={cn(
              "absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-white dark:ring-gray-900",
              step.status === "completed"
                ? "bg-primary text-primary-foreground"
                : step.status === "current"
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "bg-gray-100 dark:bg-gray-700"
            )}
          >
            {step.status === "completed" ? (
              <svg
                className="w-3.5 h-3.5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 16 12"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 5.917 5.724 10.5 15 1.5"
                />
              </svg>
            ) : (
              <span>{index + 1}</span>
            )}
          </span>
          <h3
            className={cn(
              "font-medium leading-tight",
              step.status === "completed"
                ? "text-primary"
                : step.status === "current"
                  ? "text-blue-600 dark:text-blue-500"
                  : "text-gray-500 dark:text-gray-400"
            )}
          >
            {step.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
