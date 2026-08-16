import {z} from "zod";

/**
 * Section Types - Core definitions for the section system
 * This is the single source of truth for section types in the application
 */

/**
 * Enum of valid section types
 */
export const SectionTypeEnum = {
  QUICK_ACTIONS: "quick_actions",
  RESOURCES: "resources",
  CTA: "cta",
  EMBED: "embed"
} as const;

/**
 * Type representing all valid section types
 */
export type SectionType =
  (typeof SectionTypeEnum)[keyof typeof SectionTypeEnum];

/**
 * Validation schema for section types
 */
export const sectionTypeSchema = z.enum([
  SectionTypeEnum.QUICK_ACTIONS,
  SectionTypeEnum.RESOURCES,
  SectionTypeEnum.CTA,
  SectionTypeEnum.EMBED
]);

/**
 * Base interface for all section content objects
 */
export interface BaseSectionContent {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  status?: "sample" | "connected";
}

/**
 * QuickAction item in a quick_actions section
 */
export interface QuickAction {
  id: string;
  label: string;
  url: string;
  type: "meeting" | "chat" | "custom" | "demo" | "leadgen";
  icon: string;
  settings?: Record<string, any>;
}

/**
 * Content for quick_actions section type
 */
export interface QuickActionsContent extends BaseSectionContent {
  actions?: QuickAction[];
}

/**
 * Resource item in a resources section
 */
export interface Resource {
  id: string;
  title?: string;
  name?: string; // For backward compatibility
  description?: string;
  type: "pdf" | "url" | "image" | "other";
  url: string;
  thumbnail?: string;
  size?: number;
}

/**
 * Content for resources section type
 */
export interface ResourcesContent extends BaseSectionContent {
  resources?: Resource[];
}

/**
 * Content for cta section type
 */
export interface CTAContent extends BaseSectionContent {
  // Background options
  backgroundColor?: "white" | "gray" | "brand" | "custom";
  customBackgroundColor?: string;

  // Button options
  buttonColor?: "brand" | "white" | "black" | "custom";
  customButtonColor?: string;

  // Template options
  template?: "text-only" | "text-with-icon" | "image-inset";
  iconLeft?: string;
  image?: string;

  // Legacy theme option (will be deprecated)
  theme?: "default" | "highlight" | "urgent" | "subtle";
}

/**
 * Allowed embed types for the embed section
 */
export type EmbedType =
  | "video"
  | "presentation"
  | "webpage"
  | "document"
  | "other";

/**
 * Content for embed section type
 */
export interface EmbedContent extends BaseSectionContent {
  embedUrl?: string;
  embedType?: EmbedType;
  embedCode?: string;
}

/**
 * Union type for all section content types
 */
export type SectionContent =
  | QuickActionsContent
  | ResourcesContent
  | CTAContent
  | EmbedContent;

/**
 * Type guard to check if content is QuickActionsContent
 */
export function isQuickActionsContent(
  content: any
): content is QuickActionsContent {
  return content && Array.isArray(content.actions);
}

/**
 * Type guard to check if content is ResourcesContent
 */
export function isResourcesContent(content: any): content is ResourcesContent {
  return content && Array.isArray(content.resources);
}

/**
 * Type guard to check if content is CTAContent
 */
export function isCTAContent(content: any): content is CTAContent {
  return (
    content &&
    (typeof content.theme === "string" ||
      typeof content.backgroundColor === "string" ||
      typeof content.template === "string")
  );
}

/**
 * Type guard to check if content is EmbedContent
 */
export function isEmbedContent(content: any): content is EmbedContent {
  return (
    content &&
    (typeof content.embedUrl === "string" ||
      typeof content.embedCode === "string")
  );
}

/**
 * Base interface for all sections
 */
export interface Section {
  id: string | number;
  name: string;
  type: SectionType;
  anchor: string;
  isVisible: boolean;
  order: number;
  content: SectionContent;
}

/**
 * Create a type-safe section content object based on section type
 */
export function createEmptySectionContent(type: SectionType): SectionContent {
  switch (type) {
    case SectionTypeEnum.QUICK_ACTIONS:
      return {
        title: "Quick Actions",
        description: "Connect with me through these channels",
        actions: [
          {
            id: "action-meeting-default",
            label: "Book a meeting",
            url: "https://calendly.com/yourusername",
            type: "meeting",
            icon: "calendar",
            settings: {}
          },
          {
            id: "action-chat-default",
            label: "Send a message",
            url: "mailto:your@email.com",
            type: "chat",
            icon: "message",
            settings: {}
          },
          {
            id: "action-leadgen-default",
            label: "Get in touch",
            url: "",
            type: "leadgen",
            icon: "file",
            settings: {
              fields: [
                {
                  id: "field-1",
                  label: "Full Name",
                  type: "text",
                  required: false
                },
                {id: "field-2", label: "Email", type: "email", required: true},
                {id: "field-3", label: "Phone", type: "phone", required: false},
                {
                  id: "field-4",
                  label: "Company Name",
                  type: "text",
                  required: false
                }
              ]
            }
          }
        ],
        status: "sample"
      };
    case SectionTypeEnum.RESOURCES:
      return {
        title: "Featured Resources",
        description: "Explore our collection of resources",
        resources: [
          {
            id: "resource-guide-default",
            title: "Getting Started Guide",
            description: "A comprehensive guide to help you get started",
            type: "pdf",
            url: "https://example.com/guide.pdf",
            thumbnail: "#3b82f6"
          },
          {
            id: "resource-website-default",
            title: "Visit Our Website",
            description: "Learn more about our services and offerings",
            type: "url",
            url: "https://example.com",
            thumbnail: "#10b981"
          },
          {
            id: "resource-contact-default",
            title: "Contact Information",
            description: "Find all the ways to reach us",
            type: "other",
            url: "https://example.com/contact",
            thumbnail: "#f97316"
          }
        ],
        status: "sample"
      };
    case SectionTypeEnum.CTA:
      return {
        title: "Ready to get started?",
        description: "Join thousands of users already using our platform",
        buttonText: "Sign Up Now",
        buttonLink: "#",
        backgroundColor: "white",
        customBackgroundColor: "",
        buttonColor: "brand",
        customButtonColor: "",
        template: "text-only",
        iconLeft: "file",
        image: undefined,
        status: "sample"
      };
    case SectionTypeEnum.EMBED:
      return {
        title: "Watch Demo",
        description: "See our product in action",
        embedUrl: "",
        embedType: "video",
        buttonText: "View full screen",
        status: "sample"
      };
  }
}

/**
 * Create a default section with type-safe content
 */
export function createDefaultSection(
  type: SectionType,
  id: string | number
): Section {
  // For CTA sections, use simplified name
  const name =
    type === SectionTypeEnum.CTA ? "CTA" : getDefaultSectionName(type);

  return {
    id,
    name,
    type,
    anchor: type,
    isVisible: true,
    order: 0,
    content: createEmptySectionContent(type)
  };
}

/**
 * Get a default section name based on type
 */
function getDefaultSectionName(type: SectionType): string {
  switch (type) {
    case SectionTypeEnum.QUICK_ACTIONS:
      return "Quick Actions";
    case SectionTypeEnum.RESOURCES:
      return "Featured Resources";
    case SectionTypeEnum.CTA:
      return "Call to Action";
    case SectionTypeEnum.EMBED:
      return "Embed Content";
  }
}
