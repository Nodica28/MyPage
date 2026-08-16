import React, {useState, useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {FormField} from "@/shared/types/form-field";
import {Lead, LeadFormData} from "@/shared/types/lead";
import {UserProfile} from "@/types/user";
import {Loader2} from "lucide-react";
import {formatPhoneNumberForVCard} from "@/lib/utils";

interface LeadGenFormProps {
  isOpen: boolean;
  onClose: () => void;
  formHeader: string;
  formFields: FormField[];
  submitButtonText?: string;
  downloadVcard?: boolean;
  actionId: string;
  userProfile?: Partial<UserProfile>;
  customThankYouMessage?: string;
  redirectUrl?: string;
  onSubmitSuccess?: (lead: Lead) => void;
  fromQr?: boolean;
  headerIcon?: React.ReactNode;
  headerDescription?: string;
}

export function LeadGenForm({
  isOpen,
  onClose,
  formHeader,
  formFields,
  submitButtonText = "Submit",
  downloadVcard = true,
  actionId,
  userProfile,
  customThankYouMessage = "Thank you for submitting your information!",
  redirectUrl,
  onSubmitSuccess,
  fromQr = false,
  headerIcon,
  headerDescription
}: LeadGenFormProps) {
  // Form state
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    formFields.forEach((field) => {
      if (field.required && !formValues[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
        isValid = false;
      }
    });

    // Validate email format if provided
    const emailField = formFields.find((field) => field.type === "email");
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

  // Generate vCard for download
  const generateVCard = () => {
    if (!userProfile) return null;

    let vCardContent = "BEGIN:VCARD\nVERSION:3.0\n";

    // Add name
    const fullName =
      `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim();
    vCardContent += `FN:${fullName}\n`;
    if (userProfile.firstName && userProfile.lastName) {
      vCardContent += `N:${userProfile.lastName};${userProfile.firstName};;;\n`;
    }

    // Add organization if available
    if (userProfile.companyName) {
      vCardContent += `ORG:${userProfile.companyName}\n`;
    }

    // Add title if available
    if (userProfile.title) {
      vCardContent += `TITLE:${userProfile.title}\n`;
    }

    // Add email
    if (userProfile.email) {
      vCardContent += `EMAIL;type=INTERNET;type=WORK:${userProfile.email}\n`;
    }

    // Add phone
    if (userProfile.phoneNumber) {
      vCardContent += `TEL;type=CELL:${formatPhoneNumberForVCard(
        userProfile.phoneNumber
      )}\n`;
    }

    // Add website
    if (userProfile.website) {
      vCardContent += `URL;type=WORK:${userProfile.website}\n`;
    }

    // Add LinkedIn
    if (userProfile.linkedinProfile) {
      vCardContent += `X-SOCIALPROFILE;TYPE=linkedin:${userProfile.linkedinProfile}\n`;
    }

    // Add profile photo if available
    if (userProfile.profileImage) {
      vCardContent += `PHOTO;VALUE=URI:${userProfile.profileImage}\n`;
    }

    // End vCard
    vCardContent += "END:VCARD";

    return vCardContent;
  };

  // Download vCard
  const downloadVCard = () => {
    const vCardContent = generateVCard();
    if (!vCardContent) return;

    const blob = new Blob([vCardContent], {type: "text/vcard"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${userProfile?.firstName || "contact"}_${userProfile?.lastName || ""}.vcf`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      formFields.forEach((field) => {
        formData[field.id] = {
          value: formValues[field.id] || "",
          type: field.type,
          label: field.label
        };
      });

      // Create a lead object
      const newLead = {
        userId: userProfile?.id,
        actionId,
        formData,
        fromQr: fromQr === true, // Ensure it's explicitly a boolean true value
        createdAt: new Date().toISOString()
      };

      // Submit the lead to the API - ensure we use the correct endpoint in all environments
      const apiUrl = window.location.origin + "/api/leadgen/send";
      console.log("Submitting lead to:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newLead)
      });

      if (!response.ok) {
        throw new Error("Failed to submit lead");
      }

      const savedLead = await response.json();

      // Call the onSubmitSuccess callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess(savedLead);
      }

      // Set submitted state
      setIsSubmitted(true);

      // Start countdown for automatic actions (redirect or callback)
      if (redirectUrl || onSubmitSuccess) {
        setCountdown(2);
      }

      // Download vCard if enabled
      if (downloadVcard) {
        downloadVCard();
      }

      // Redirect if URL is provided
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting lead:", error);
      setErrors({
        submit: "Failed to submit form. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset the form when modal is closed
  const handleClose = () => {
    setFormValues({});
    setErrors({});
    setIsSubmitted(false);
    setCountdown(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {headerIcon && (
                  <div className="flex items-center gap-2">
                    {headerIcon}
                    {formHeader}
                  </div>
                )}
                {!headerIcon && formHeader}
              </DialogTitle>
              {headerDescription && (
                <DialogDescription>{headerDescription}</DialogDescription>
              )}
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {formFields?.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>

                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      value={formValues[field.id] || ""}
                      onChange={(e) =>
                        handleInputChange(field.id, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className={errors[field.id] ? "border-destructive" : ""}
                    />
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type === "email" ? "email" : "text"}
                      value={formValues[field.id] || ""}
                      onChange={(e) =>
                        handleInputChange(field.id, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className={errors[field.id] ? "border-destructive" : ""}
                    />
                  )}

                  {errors[field.id] && (
                    <p className="text-destructive text-sm">
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              ))}

              {errors.submit && (
                <div className="bg-destructive/10 p-3 rounded-md">
                  <p className="text-destructive text-sm">{errors.submit}</p>
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    submitButtonText
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <div className="py-6 text-center space-y-4">
            <h3 className="text-xl font-semibold">Thank You!</h3>
            <p>{customThankYouMessage}</p>
            {countdown !== null && countdown > 0 && (
              <p className="text-sm text-muted-foreground">
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
            )}
            {downloadVcard && (
              <p className="text-sm text-muted-foreground">
                Contact information has been downloaded to your device.
              </p>
            )}
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
