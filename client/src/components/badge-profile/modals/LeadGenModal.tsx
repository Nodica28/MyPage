import React, {useState} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {X, Loader2} from "lucide-react";
import {cn} from "@/lib/utils";
import {useToast} from "@/hooks/use-toast";
import {useMobile} from "@/hooks/use-media-query";

// Define field type
interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea";
  required: boolean;
}

interface LeadGenModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action: {
    id: string;
    label: string;
    settings?: {
      fields?: FormField[];
    };
  };
  fullScreen?: boolean;
  userEmail?: string;
}

export function LeadGenModal({
  isOpen,
  onOpenChange,
  action,
  fullScreen = false,
  userEmail
}: LeadGenModalProps) {
  const isMobile = useMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const {toast} = useToast();

  const fields = action.settings?.fields || [
    {id: "name", label: "Full Name", type: "text", required: true},
    {id: "email", label: "Email", type: "email", required: true},
    {id: "phone", label: "Phone", type: "phone", required: false},
    {id: "message", label: "Message", type: "textarea", required: false}
  ];
  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));

    // Clear error for this field if exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }

      if (field.type === "email" && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = "Please enter a valid email address";
        }
      }

      if (field.type === "phone" && formData[field.id]) {
        const phoneRegex =
          /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        if (!phoneRegex.test(formData[field.id])) {
          newErrors[field.id] =
            "Please enter a valid phone number (e.g., (123)456-7890 or 123-456-7890)";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create enhanced form data with field types
      const enhancedFormData = fields.reduce(
        (acc, field) => {
          if (formData[field.id]) {
            acc[field.id] = {
              value: formData[field.id],
              type: field.type,
              label: field.label
            };
          }
          return acc;
        },
        {} as Record<string, {value: string; type: string; label: string}>
      );

      // Send form data to the backend API - ensure we use the local API endpoint
      const apiUrl = window.location.origin + "/api/leadgen/send";
      console.log("Submitting form to:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actionId: action.id,
          formData: enhancedFormData,
          userEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit form");
      }

      setSuccess(true);
      toast({
        title: "Success!",
        description: "Your information has been submitted successfully."
      });

      // Reset form after successful submission
      setFormData({});
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "There was a problem submitting your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset success state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSuccess(false);
      setFormData({});
      setErrors({});
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col",
          fullScreen && isMobile
            ? "w-[100vw] h-[100vh] max-w-none max-h-none p-0 rounded-none border-0"
            : "max-w-lg"
        )}
        hideCloseButton
      >
        <DialogHeader
          className={cn(
            "px-4 py-2 border-b",
            fullScreen && isMobile ? "sticky top-0 z-10 bg-background" : ""
          )}
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{action.label}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => handleOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Fill out the form below and we'll get back to you soon.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-sm font-medium">
                    {field.label}{" "}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>

                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      name={field.id}
                      value={formData[field.id] || ""}
                      onChange={handleInputChange}
                      placeholder={`Enter your ${field.label.toLowerCase()}`}
                      className={cn(errors[field.id] && "border-red-500")}
                    />
                  ) : (
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type === "email" ? "email" : "text"}
                      value={formData[field.id] || ""}
                      onChange={handleInputChange}
                      placeholder={
                        field.type === "phone"
                          ? "(123)456-7890"
                          : `Enter your ${field.label.toLowerCase()}`
                      }
                      pattern={
                        field.type === "phone"
                          ? "[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}"
                          : undefined
                      }
                      className={cn(errors[field.id] && "border-red-500")}
                    />
                  )}

                  {errors[field.id] && (
                    <p className="text-xs font-medium text-red-500">
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              ))}

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="bg-green-100 text-green-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium">Thank You!</h3>
              <p className="text-muted-foreground">
                Your information has been submitted successfully. We'll be in
                touch soon.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
