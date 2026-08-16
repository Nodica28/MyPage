/**
 * ReadOnlySectionUI.tsx
 *
 * This component provides read-only views of sections for public profiles
 * and other display-only contexts. It uses the same section types and
 * content structures as the editable versions but renders them as static UI.
 */
import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Link,
  FileText,
  ExternalLink,
  Video,
  MessageSquare,
  Calendar,
  Globe,
  File,
  Presentation
} from "lucide-react";
import {MeetingModal} from "@/components/badge-profile/modals/MeetingModal";

// Import standardized section types
import {
  Section,
  SectionTypeEnum,
  CTAContent,
  isQuickActionsContent,
  isResourcesContent,
  isEmbedContent
} from "../../shared/types/sections";

/**
 * Props for read-only section components
 */
export interface ReadOnlySectionProps {
  /** The section to render */
  section: Section;
  /** Optional additional class name */
  className?: string;
  /** Optional click handler for tracking */
  onLinkClick?: (url: string, section: Section) => void;
}

/**
 * Master function to render any section type in read-only mode
 */
const renderReadOnlySection = (
  section: Section,
  className?: string,
  onLinkClick?: (url: string, section: Section) => void
) => {
  const type = section.type;

  // Skip rendering if section is not visible
  if (section.isVisible === false) {
    return null;
  }

  const commonProps = {
    section,
    className,
    onLinkClick
  };

  switch (type) {
    case SectionTypeEnum.QUICK_ACTIONS:
      return <ReadOnlyQuickActionsSection {...commonProps} />;
    case SectionTypeEnum.RESOURCES:
      return <ReadOnlyResourcesSection {...commonProps} />;
    case SectionTypeEnum.CTA:
      return <ReadOnlyCTASection {...commonProps} />;
    case SectionTypeEnum.EMBED:
      return <ReadOnlyEmbedSection {...commonProps} />;
    case SectionTypeEnum.VIDEO:
      // VIDEO sections use the same rendering as EMBED sections
      return <ReadOnlyEmbedSection {...commonProps} />;
    default:
      console.warn(`Unknown section type for read-only rendering: ${type}`);
      return null;
  }
};

/**
 * QuickActions Section - Read-only version
 */
export function ReadOnlyQuickActionsSection({
  section,
  className,
  onLinkClick
}: ReadOnlySectionProps) {
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<{
    url: string;
    label: string;
  } | null>(null);

  // Create a standardized content object to handle various data formats
  // This ensures we can work with the content regardless of its structure
  const content = {
    title: section.content.title,
    description: section.content.description,
    buttonText: section.content.buttonText,
    buttonLink: section.content.buttonLink
  };

  // Safely extract actions array, if it doesn't exist, create an empty array
  const actions =
    isQuickActionsContent(section.content) &&
    Array.isArray(section.content.actions)
      ? section.content.actions
      : [];

  // Helper function to render icon
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return <Calendar className="h-5 w-5" />;
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "link":
      default:
        return <Link className="h-5 w-5" />;
    }
  };

  // Handle action click based on type
  const handleActionClick = (action: any, e: React.MouseEvent) => {
    if (action.type === "meeting") {
      e.preventDefault();
      setCurrentMeeting({
        url: action.url,
        label: action.label
      });
      setMeetingModalOpen(true);

      // Still track the click for analytics
      if (onLinkClick) {
        onLinkClick(action.url, section);
      }
    } else if (action.type === "chat") {
      e.preventDefault();
      // For chat actions, we'll handle them differently
      // This will be captured by the ChatModal component via context
      if (onLinkClick) {
        onLinkClick("#chat", section);
      }

      // Manually trigger the chat modal through global state or context
      if (typeof window !== "undefined") {
        // Dispatch a custom event to open the chat modal
        const chatEvent = new CustomEvent("openChat", {
          detail: {triggeredBy: "quick-action", actionId: action.id}
        });
        window.dispatchEvent(chatEvent);
      }
    } else if (onLinkClick) {
      // For other types, just track the click
      onLinkClick(action.url, section);
    }
  };

  return (
    <section id={section.anchor} className={`my-8 ${className || ""}`}>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{content.title || "Quick Actions"}</CardTitle>
          {content.description && (
            <CardDescription>{content.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map((action: any) => (
              <a
                key={action.id}
                href={action.type === "chat" ? "#" : action.url}
                onClick={(e) => handleActionClick(action, e)}
                target={action.type === "chat" ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mr-4">
                  {renderIcon(action.icon)}
                </div>
                <div>
                  <h3 className="font-medium">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.type === "meeting" && "Schedule a meeting"}
                    {action.type === "chat" && "Start a conversation"}
                    {action.type === "custom" && "Open link"}
                  </p>
                  {/* Only show URL for non-chat actions */}
                  {action.type !== "chat" && action.url && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {action.url}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meeting modal */}
      {currentMeeting && (
        <MeetingModal
          isOpen={meetingModalOpen}
          onOpenChange={setMeetingModalOpen}
          meetingUrl={currentMeeting.url}
          meetingLabel={currentMeeting.label}
        />
      )}
    </section>
  );
}

/**
 * Resources Section - Read-only version
 */
export function ReadOnlyResourcesSection({
  section,
  className,
  onLinkClick
}: ReadOnlySectionProps) {
  // Create a standardized content object to handle various data formats
  // This ensures we can work with the content regardless of its structure
  // By accessing properties safely and providing defaults
  const content = {
    title: section.content.title,
    description: section.content.description,
    buttonText: section.content.buttonText,
    buttonLink: section.content.buttonLink
  };

  // Safely extract resources array with proper type checking
  const resources =
    isResourcesContent(section.content) &&
    Array.isArray(section.content.resources)
      ? section.content.resources
      : [];

  // Track link clicks if needed
  const handleResourceClick = (url: string) => {
    if (onLinkClick) {
      onLinkClick(url, section);
    }
  };

  return (
    <section id={section.anchor} className={`my-8 ${className || ""}`}>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{content.title || "Resources"}</CardTitle>
          {content.description && (
            <CardDescription>{content.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource: any) => (
              <a
                key={resource.id}
                href={resource.url}
                onClick={() => handleResourceClick(resource.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start p-4 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mr-4 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {resource.title || resource.name}
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {resource.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {resource.type === "pdf" && "PDF Document"}
                    {resource.type === "image" && "Image"}
                    {resource.type === "url" && "Web Link"}
                    {resource.type === "other" && "Resource"}
                    {resource.size &&
                      ` • ${(resource.size / 1024 / 1024).toFixed(1)} MB`}
                  </div>
                </div>
              </a>
            ))}

            {resources.length === 0 && (
              <div className="col-span-2 p-6 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No resources available</p>
              </div>
            )}
          </div>
        </CardContent>
        {content.buttonText && content.buttonLink && (
          <CardFooter className="flex justify-center border-t bg-muted/50 py-4">
            <Button
              variant="outline"
              onClick={() =>
                content.buttonLink &&
                onLinkClick &&
                onLinkClick(content.buttonLink, section)
              }
              asChild
            >
              <a
                href={content.buttonLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.buttonText}
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </section>
  );
}

/**
 * CTA Section - Read-only version
 */
export function ReadOnlyCTASection({
  section,
  className,
  onLinkClick
}: ReadOnlySectionProps) {
  console.log("ReadOnlyCTASection rendering with content:", section.content);

  // Type assertion to access CTA-specific properties
  const ctaContent = section.content as CTAContent & {
    backgroundColor?: string;
    customBackgroundColor?: string;
    buttonColor?: string;
    customButtonColor?: string;
    template?: string;
    iconLeft?: string;
    image?: string;
  };

  // Enhanced content object with all the theme properties we've added
  const content = {
    title: ctaContent.title || "Ready to get started?",
    description:
      ctaContent.description ||
      "Join thousands of users already using our platform",
    buttonText: ctaContent.buttonText || "Sign Up Now",
    buttonLink: ctaContent.buttonLink || "#",

    // Theme properties - access from the typed ctaContent object
    backgroundColor: ctaContent.backgroundColor || "white",
    customBackgroundColor: ctaContent.customBackgroundColor || "",
    buttonColor: ctaContent.buttonColor || "brand",
    customButtonColor: ctaContent.customButtonColor || "",
    template: ctaContent.template || "text-only",
    iconLeft: ctaContent.iconLeft || "",
    image: ctaContent.image || "",

    // Legacy theme property
    theme: ctaContent.theme || "default"
  };

  // Function to get background color class based on the selection
  const getBackgroundColorClass = () => {
    if (!content.backgroundColor) {
      // Use legacy theme if backgroundColor is not set
      return getLegacyThemeClass();
    }

    switch (content.backgroundColor) {
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
  };

  // Function to get button color class based on the selection
  const getButtonColorClass = () => {
    switch (content.buttonColor) {
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

  // Legacy theme class function - only used as fallback
  const getLegacyThemeClass = () => {
    switch (content.theme) {
      case "highlight":
        return "bg-primary text-primary-foreground";
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "subtle":
        return "bg-muted";
      default:
        return "bg-card";
    }
  };

  // Apply background class
  const backgroundClass = getBackgroundColorClass();

  // Track link clicks if needed
  const handleClick = (url: string) => {
    if (onLinkClick && url) {
      onLinkClick(url, section);
    }
  };

  return (
    <section id={section.anchor} className={`my-8 ${className || ""}`}>
      <div
        className={`p-6 rounded-md border ${backgroundClass}`}
        style={
          content.backgroundColor === "custom" && content.customBackgroundColor
            ? {backgroundColor: content.customBackgroundColor}
            : {}
        }
      >
        <div className="flex items-start">
          {content.template === "image-inset" && content.image && (
            <div className="flex-shrink-0 mr-4 w-24 h-24 rounded overflow-hidden">
              <img
                src={content.image}
                alt="CTA"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div
            className={content.template === "image-inset" ? "flex-1" : "w-full"}
          >
            <div className="flex items-center mb-2">
              {content.template === "text-with-icon" && content.iconLeft && (
                <span className="mr-2 text-primary">
                  {content.iconLeft === "file" && <FileText size={20} />}
                  {content.iconLeft === "message" && (
                    <MessageSquare size={20} />
                  )}
                </span>
              )}
              <h3 className="text-lg font-semibold">
                {content.title || "Ready to get started?"}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground my-2">
              {content.description ||
                "Join thousands of users already using our platform"}
            </p>

            {content.buttonText && content.buttonLink && (
              <div className="mt-4">
                <a
                  href={content.buttonLink}
                  onClick={() => handleClick(content.buttonLink || "#")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors ${getButtonColorClass()}`}
                  style={
                    content.buttonColor === "custom" &&
                    content.customButtonColor
                      ? {
                          backgroundColor: content.customButtonColor,
                          color: "#ffffff"
                        }
                      : {}
                  }
                >
                  {content.buttonText}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Embed Section - Read-only version
 */
export function ReadOnlyEmbedSection({
  section,
  className,
  onLinkClick
}: ReadOnlySectionProps) {
  // More tolerant check for Embed content to accommodate various data structures
  // Create a new object with only the properties we need
  // Initialize with base content
  const baseContent = {
    title: section.content.title,
    description: section.content.description,
    buttonText: section.content.buttonText,
    buttonLink: section.content.buttonLink
  };

  // Extract embed-specific content with proper type checking
  const embedContent = isEmbedContent(section.content)
    ? {
        embedUrl: section.content.embedUrl || "",
        embedType: section.content.embedType || "video",
        embedCode: section.content.embedCode || ""
      }
    : {
        embedUrl: "",
        embedType: "video" as const,
        embedCode: ""
      };

  const content = {...baseContent, ...embedContent};

  // Helper to generate embed code
  const getEmbedCode = () => {
    if (!content.embedUrl) return null;

    // Use custom embed code if provided
    if (content.embedCode) {
      return content.embedCode;
    }

    // Handle YouTube videos
    if (content.embedType === "video") {
      if (
        content.embedUrl.includes("youtube.com") ||
        content.embedUrl.includes("youtu.be")
      ) {
        // Extract video ID from YouTube URL
        let videoId = "";
        try {
          if (content.embedUrl.includes("youtube.com/watch")) {
            const url = new URL(content.embedUrl);
            videoId = url.searchParams.get("v") || "";
          } else if (content.embedUrl.includes("youtu.be/")) {
            const parts = content.embedUrl.split("/");
            videoId = parts[parts.length - 1].split("?")[0];
          }

          if (videoId) {
            return `<iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/${videoId}" 
              title="YouTube video player" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
            ></iframe>`;
          }
        } catch (e) {
          console.error("Error parsing YouTube URL", e);
        }
      } else if (content.embedUrl.includes("vimeo.com")) {
        // Handle Vimeo videos
        try {
          const vimeoId = content.embedUrl.split("/").pop();
          if (vimeoId) {
            return `<iframe 
              width="100%" 
              height="100%" 
              src="https://player.vimeo.com/video/${vimeoId}" 
              title="Vimeo video player" 
              frameborder="0" 
              allow="autoplay; fullscreen; picture-in-picture" 
              allowfullscreen
            ></iframe>`;
          }
        } catch (e) {
          console.error("Error parsing Vimeo URL", e);
        }
      }
    }

    // Handle Google Slides presentations
    if (
      content.embedType === "presentation" &&
      content.embedUrl.includes("docs.google.com/presentation")
    ) {
      try {
        // Convert sharing URL to embed URL
        let presentationId = "";
        const url = new URL(content.embedUrl);
        const pathParts = url.pathname.split("/");
        const idIndex = pathParts.indexOf("d") + 1;

        if (idIndex < pathParts.length) {
          presentationId = pathParts[idIndex];
          return `<iframe 
            width="100%" 
            height="100%" 
            src="https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000" 
            frameborder="0" 
            allowfullscreen="true" 
            mozallowfullscreen="true" 
            webkitallowfullscreen="true"
          ></iframe>`;
        }
      } catch (e) {
        console.error("Error parsing Google Slides URL", e);
      }
    }

    // Handle Google Docs documents
    if (
      (content.embedType as string) === "document" &&
      content.embedUrl.includes("docs.google.com/document")
    ) {
      try {
        // Convert sharing URL to embed URL
        let documentId = "";
        const url = new URL(content.embedUrl);
        const pathParts = url.pathname.split("/");
        const idIndex = pathParts.indexOf("d") + 1;

        if (idIndex < pathParts.length) {
          documentId = pathParts[idIndex];
          return `<iframe 
            width="100%" 
            height="100%" 
            src="https://docs.google.com/document/d/${documentId}/preview" 
            frameborder="0"
          ></iframe>`;
        }
      } catch (e) {
        console.error("Error parsing Google Docs URL", e);
      }
    }

    // Handle PDF documents
    if (
      (content.embedType as string) === "document" &&
      content.embedUrl.toLowerCase().endsWith(".pdf")
    ) {
      return `<iframe 
        width="100%" 
        height="100%" 
        src="${content.embedUrl}" 
        title="PDF Document" 
        frameborder="0"
      ></iframe>`;
    }

    // Generic iframe fallback for all other embed types
    return `<iframe 
      width="100%"
      height="100%"
      src="${content.embedUrl}"
      title="Embedded content"
      frameborder="0"
      allowfullscreen
    ></iframe>`;
  };

  const embedCode = getEmbedCode();

  return (
    <section id={section.anchor} className={`my-8 ${className || ""}`}>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{content.title || "Media"}</CardTitle>
          {content.description && (
            <CardDescription>{content.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {embedCode ? (
            <div
              className="relative aspect-video rounded-md overflow-hidden bg-muted"
              dangerouslySetInnerHTML={{__html: embedCode}}
            />
          ) : (
            <div className="flex items-center justify-center aspect-video rounded-md bg-muted">
              <div className="text-center p-6">
                {(content.embedType as string) === "video" ? (
                  <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
                ) : (content.embedType as string) === "presentation" ? (
                  <Presentation className="h-10 w-10 mx-auto mb-2 opacity-50" />
                ) : (content.embedType as string) === "document" ? (
                  <File className="h-10 w-10 mx-auto mb-2 opacity-50" />
                ) : (content.embedType as string) === "webpage" ? (
                  <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
                ) : (
                  <ExternalLink className="h-10 w-10 mx-auto mb-2 opacity-50" />
                )}
                <p className="text-muted-foreground">No media available</p>
              </div>
            </div>
          )}
        </CardContent>
        {content.buttonText && (content.buttonLink || content.embedUrl) && (
          <CardFooter className="border-t bg-muted/50 py-4">
            <Button
              variant="outline"
              onClick={() => {
                const url = content.buttonLink || content.embedUrl;
                if (url && onLinkClick) onLinkClick(url, section);
              }}
              asChild
              className="w-full justify-center"
            >
              <a
                href={content.buttonLink || content.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                {content.buttonText}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </section>
  );
}

/**
 * Main ReadOnlySectionUI component
 * Renders a list of sections in read-only mode
 */
export function ReadOnlySectionUI({
  sections,
  className,
  onLinkClick
}: {
  sections: Section[];
  className?: string;
  onLinkClick?: (url: string, section: Section) => void;
}) {
  // Ensure sections is an array before filtering
  const sectionsArray = Array.isArray(sections) ? sections : [];
  // Filter out invisible sections
  const visibleSections = sectionsArray.filter(
    (section) => section.isVisible !== false
  );

  // Sort sections by order
  const sortedSections = [...visibleSections].sort(
    (a, b) =>
      (typeof a.order === "number" ? a.order : 0) -
      (typeof b.order === "number" ? b.order : 0)
  );

  return (
    <div className={className}>
      {sortedSections.map((section) => {
        // Use a div wrapper instead of Fragment to avoid data-replit-metadata issues
        return (
          <div key={section.id}>
            {renderReadOnlySection(section, "", onLinkClick)}
          </div>
        );
      })}

      {sortedSections.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <p>No sections to display</p>
        </div>
      )}
    </div>
  );
}

export default ReadOnlySectionUI;
