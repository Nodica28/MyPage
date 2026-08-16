import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LeadSettings, LeadFormData } from "@/shared/types/lead";
import { Loader2 } from "lucide-react";

interface LeadFormProps {
  leadSettings: LeadSettings;
  onSubmitSuccess: () => void;
  userEmail: string;
  pageId: string;
}

export function LeadForm({
  leadSettings,
  onSubmitSuccess,
  userEmail,
  pageId
}: LeadFormProps) {
  // Form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input change
  const handleInputChange = (fieldId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error if field has a value
    if (value.trim()) {
      setErrors((prev) => {
        const newErrors = {...prev};
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Validate the form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Check required fields
    leadSettings.fields.forEach((field) => {
      if (field.required && !formValues[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
        isValid = false;
      }
    });

    // Validate email format if provided
    const emailField = leadSettings.fields.find((field) => field.type === "email");
    if (
      emailField &&
      formValues[emailField.id] &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues[emailField.id])
    ) {
      newErrors[emailField.id] = "Please enter a valid email address";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert form values to LeadFormData format
      const formData: LeadFormData = {};
      leadSettings.fields.forEach((field) => {
        formData[field.id] = {
          value: formValues[field.id] || "",
          type: field.type,
          label: field.label
        };
      });

      // Create a lead object with the format expected by the server
      const newLead = {
        // Use the format user-{userId} or a valid actionId format
        actionId: "lead-form", // Use standard lead form action ID
        formData,
        fromQr: false,
        // Include userEmail for the server to find the profile owner
        userEmail: userEmail,
        notes: [`Accessed from page: ${pageId}`] // Use pageId in notes for context
      };

      console.log("Submitting lead data:", newLead);

      // Submit the lead to the API
      const apiUrl = window.location.origin + "/api/leadgen/send";
      console.log("Sending lead to:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newLead)
      });

      const responseData = await response.json().catch(() => ({}));
      console.log("Lead submission response:", response.status, responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to submit lead");
      }

      // Call onSubmitSuccess to allow page access
      onSubmitSuccess();
      
    } catch (error) {
      console.error("Error submitting lead:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to submit form. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {leadSettings.fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          
          {field.type === "textarea" ? (
            <Textarea
              id={field.id}
              value={formValues[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className={errors[field.id] ? "border-red-500" : ""}
            />
          ) : (
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              value={formValues[field.id] || ""}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className={errors[field.id] ? "border-red-500" : ""}
            />
          )}
          
          {errors[field.id] && (
            <p className="text-red-500 text-sm">{errors[field.id]}</p>
          )}
        </div>
      ))}

      {errors.submit && (
        <div className="bg-red-50 p-2 rounded text-red-500 text-sm">
          {errors.submit}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Continue to Page"
          )}
        </Button>
      </div>
    </form>
  );
} 