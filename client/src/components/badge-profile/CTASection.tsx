import {cn} from "@/lib/utils";
import {FileText, MessageSquare} from "lucide-react";
import {InlineTextEditor} from "@/components/ui/inline-text-editor";

// Props for the CTASection component with enhanced theme settings
interface CTASectionProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  // Legacy theme support
  theme?: "default" | "highlight" | "urgent" | "subtle";
  // New theme settings
  backgroundColor?: "white" | "gray" | "brand" | "custom";
  customBackgroundColor?: string;
  buttonColor?: "brand" | "white" | "black" | "custom";
  customButtonColor?: string;
  template?: "text-only" | "text-with-icon" | "image-inset";
  iconLeft?: string;
  image?: string;
  className?: string;
  showEditControls?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDescriptionChange?: (newDescription: string) => void;
}

export function CTASection({
  title = "Ready to get started?",
  description = "Join thousands of users already using our platform",
  buttonText = "Sign Up Now",
  buttonLink = "#",
  theme = "default",
  backgroundColor = "white",
  customBackgroundColor = "",
  buttonColor = "brand",
  customButtonColor = "",
  template = "text-only",
  iconLeft = "",
  image = "",
  className,
  showEditControls = false,
  onTitleChange,
  onDescriptionChange
}: CTASectionProps) {
  // Function to get background color class based on the selection
  const getBackgroundColorClass = () => {
    // Prioritize new backgroundColor prop over legacy theme
    if (backgroundColor) {
      switch (backgroundColor) {
        case "white":
          return "bg-white";
        case "gray":
          return "bg-muted";
        case "brand":
          return "bg-primary/10";
        case "custom":
          return "";
        default:
          return "bg-white";
      }
    }

    // Legacy theme as fallback
    switch (theme) {
      case "highlight":
        return "bg-primary/10";
      case "urgent":
        return "bg-destructive/10";
      case "subtle":
        return "bg-muted";
      default:
        return "bg-card";
    }
  };

  // Function to get button color class based on the selection
  const getButtonColorClass = () => {
    switch (buttonColor) {
      case "brand":
        return "bg-primary text-primary-foreground hover:bg-primary/90";
      case "white":
        return "bg-white text-black border hover:bg-muted/90";
      case "black":
        return "bg-black text-white hover:bg-black/90";
      case "custom":
        return "";
      default:
        return "bg-primary text-primary-foreground hover:bg-primary/90";
    }
  };

  const backgroundClass = getBackgroundColorClass();

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={`p-6 rounded-md border ${backgroundClass}`}
        style={
          backgroundColor === "custom" && customBackgroundColor
            ? {backgroundColor: customBackgroundColor}
            : {}
        }
      >
        <div className="flex items-start">
          {template === "image-inset" && image && (
            <div className="flex-shrink-0 mr-4 w-24 h-24 rounded overflow-hidden">
              <img
                src={image}
                alt="CTA"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className={template === "image-inset" ? "flex-1" : "w-full"}>
            <div className="flex items-center mb-2">
              {template === "text-with-icon" && iconLeft && (
                <span className="mr-2 text-primary">
                  {iconLeft === "file" && <FileText size={20} />}
                  {iconLeft === "message" && <MessageSquare size={20} />}
                </span>
              )}
              <div className="w-full">
                {showEditControls ? (
                  <InlineTextEditor
                    value={title || ""}
                    onSave={(newValue: string) => onTitleChange?.(newValue)}
                    placeholder="Enter CTA title..."
                    textClassName="text-lg font-semibold"
                    showEditButton={true}
                  />
                ) : (
                  <h3 className="text-lg font-semibold">{title}</h3>
                )}
              </div>
            </div>

            {showEditControls ? (
              <InlineTextEditor
                value={description || ""}
                onSave={(newValue: string) => onDescriptionChange?.(newValue)}
                placeholder="Enter CTA description..."
                multiline={true}
                textClassName="text-sm text-muted-foreground my-2 whitespace-pre-wrap break-words"
                showEditButton={true}
              />
            ) : (
              <p className="text-sm text-muted-foreground my-2 whitespace-pre-wrap break-words">
                {description}
              </p>
            )}

            {buttonText && buttonLink && (
              <div className="mt-4">
                <a
                  href={buttonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors ${getButtonColorClass()}`}
                  style={
                    buttonColor === "custom" && customButtonColor
                      ? {backgroundColor: customButtonColor, color: "#ffffff"}
                      : {}
                  }
                >
                  {buttonText}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
