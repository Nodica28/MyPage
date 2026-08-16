import {ProfileSetupFormData} from "@/schemas/profile-setup";
import {ProfileSetupStep} from "@/hooks/use-profile-setup";

export const validateStep = (
  step: ProfileSetupStep,
  formData: ProfileSetupFormData
): boolean => {
  switch (step) {
    case 1:
      // Step 1 is optional - profile photo and background
      return true;
    case 2:
      // Step 2 is optional - bio
      return true;
    case 3:
      // Step 3 - validate social links if any are provided
      if (formData.socialLinks && formData.socialLinks.length > 0) {
        return formData.socialLinks.every((link) => {
          // Empty URLs are allowed (optional fields)
          if (!link.url.trim()) {
            return true;
          }
          return isValidLink(link.url, link.type);
        });
      }
      return true;
    case 4:
      // Step 4 is optional - quick actions
      return true;
    case 5:
      // Step 5 is optional - resources
      return true;
    case 6:
      // Step 6 is optional - announcements
      return true;
    case 7:
      // Step 7 is optional - embed
      return true;
    default:
      return true;
  }
};

export const isValidLink = (
  url: string,
  type: "website" | "email" | "phone" | "linkedin" | "instagram" | "custom"
): boolean => {
  if (!url.trim()) return false;

  // Email validation
  if (type === "email") {
    const emailValue = url.replace(/^mailto:/i, "");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(emailValue);
  }

  // Phone validation
  if (type === "phone") {
    const phoneValue = url.replace(/^tel:/i, "");
    const phonePattern = /^[+]?[1-9][\d\s\-()]{7,}$/;
    return phonePattern.test(phoneValue);
  }

  // URL validation for website, linkedin, instagram, custom
  try {
    let urlValue = url.replace(/^https?:\/\//i, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      urlValue = `https://${urlValue}`;
    } else {
      urlValue = url;
    }
    const urlObj = new URL(urlValue);
    return (
      !!urlObj.hostname &&
      (urlObj.hostname.includes(".") || urlObj.hostname === "localhost")
    );
  } catch {
    return false;
  }
};

export const getStepTitle = (step: ProfileSetupStep): string => {
  switch (step) {
    case 1:
      return "Profile Photo & Background";
    case 2:
      return "About Me";
    case 3:
      return "Social Links";
    case 4:
      return "Quick Actions";
    case 5:
      return "Resources";
    case 6:
      return "Announcements";
    case 7:
      return "Embed";
    default:
      return "";
  }
};

export const canSkipStep = (): boolean => {
  // All steps can be skipped
  return true;
};
