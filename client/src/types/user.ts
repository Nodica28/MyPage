import {SectionType} from "@/shared/types/sections";

// Define User interface for client-side use
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  companyName?: string | null;
  organizationId?: number | null;
  isCompanyAdmin?: boolean;
  onboardingComplete?: boolean;
  selectedRole?: "creator" | "professional" | "team_member" | null;
  uniquePathId: string;
  publicPath: string;
  linkedinProfile?: string | null;
  qrCodeUrl?: string | null;
  isSaved?: boolean;
  bannerSettings?: {
    activeBannerId?: string;
    savedBanners?: Array<{
      id: string;
      name?: string;
      headline: {
        text: string;
        font: string;
        color: string;
      };
      subheadline?: {
        text: string;
        font: string;
        color: string;
      };
      tags: Array<{
        text: string;
        color: string;
        backgroundColor: string;
      }>;
      backgroundType: "preset" | "custom";
      backgroundValue: string;
      customUploadUrl?: string;
      createdAt: string;
      updatedAt?: string;
    }>;
  };
  settings?: {
    theme?: {
      banner?: {
        type: string;
        id: string;
      };
      background?: {
        type: "preset" | "custom";
        preset?: string;
        customUrl?: string;
      };
    };
  };
}

// Define UserProfile interface that extends User with additional profile-related fields
export interface UserProfile extends User {
  id: number;
  settings?: {
    theme?: {
      background?: {
        type: "preset" | "custom";
        preset?: string;
        customUrl?: string;
      };
    };
    quickLinks?: Array<{
      id: string;
      label: string;
      url: string;
      type: "website" | "email" | "phone" | "custom";
    }>;
    sections?: Array<{
      id: string;
      type: SectionType | string;
      name: string;
      anchor: string;
      isVisible: boolean;
      order: number;
      content?: {
        title?: string;
        description?: string;
        buttonText?: string;
        buttonLink?: string;
        image?: string;
        status?: "connected" | "sample";
        // Properties for resources section
        resources?: Array<{
          id: string;
          title?: string;
          description?: string;
          type: "pdf" | "url" | "image" | "other";
          url: string;
          thumbnail?: string;
        }>;
        // Properties for quick_actions section
        actions?: Array<{
          id: string;
          label: string;
          url: string;
          type: "meeting" | "chat" | "custom" | "demo";
          icon?: string;
        }>;
        // Properties for embed section
        embedUrl?: string;
        embedType?: "video" | "presentation" | "other";
        embedCode?: string;
        // Properties for CTA section
        theme?: "default" | "highlight" | "urgent" | "subtle";
      };
    }>;
  };
}
