import {useState} from "react";
import {Card, CardFooter} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
  Maximize2,
  Play,
  Presentation,
  ExternalLink,
  FileText,
  Globe
} from "lucide-react";
import {cn} from "@/lib/utils";
import {EmbedModal} from "./modals/EmbedModal";
import {InlineTextEditor} from "@/components/ui/inline-text-editor";

// Props for EmbedSection component
interface EmbedSectionProps {
  title?: string;
  description?: string;
  embedUrl?: string;
  embedType?: "video" | "presentation" | "webpage" | "document" | "other";
  embedCode?: string;
  buttonText?: string;
  buttonLink?: string;
  className?: string;
  showEditControls?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDescriptionChange?: (newDescription: string) => void;
}

export function EmbedSection({
  title,
  description,
  embedUrl,
  embedType = "video",
  buttonText = "Open full screen",
  buttonLink,
  className,
  showEditControls = false,
  onTitleChange,
  onDescriptionChange
}: EmbedSectionProps) {
  const [embedModalOpen, setEmbedModalOpen] = useState(false);

  // Get thumbnail URL for videos or presentations
  const getVideoThumbnail = () => {
    if (!embedUrl) return null;

    if (embedType === "video") {
      // YouTube thumbnail
      if (embedUrl.includes("youtube.com") || embedUrl.includes("youtu.be")) {
        let videoId;

        if (embedUrl.includes("youtube.com/watch?v=")) {
          try {
            videoId = new URL(embedUrl).searchParams.get("v");
          } catch (error) {
            // Handle invalid URLs
            console.error("Error getting video ID:", error);
            return null;
          }
        } else if (embedUrl.includes("youtu.be/")) {
          videoId = embedUrl.split("/").pop()?.split("?")[0];
        }

        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/0.jpg`;
        }
      }

      // Vimeo thumbnails would require an API call, so we skip for now
      // You could implement a server-side proxy to fetch these if needed
    }

    // For presentations, we'll rely on the UI to display the presentation icon
    // with appropriate styling instead of a static placeholder

    return null;
  };

  // Handle the play button click
  const handlePlayClick = () => {
    // Instead of playing inline, let's open the modal
    setEmbedModalOpen(true);
  };

  // Handle the full screen button click
  const handleFullScreenClick = () => {
    // If we have a custom button link, use it
    if (buttonLink) {
      window.open(buttonLink, "_blank");
    } else {
      // Otherwise open the embed modal
      setEmbedModalOpen(true);
    }
  };

  // Get preview icon based on embed type
  const getPreviewIcon = () => {
    switch (embedType) {
      case "video":
        return <Play className="h-6 w-6" />;
      case "presentation":
        return <Presentation className="h-6 w-6" />;
      case "webpage":
        return <Globe className="h-6 w-6" />;
      case "document":
        return <FileText className="h-6 w-6" />;
      default:
        return <ExternalLink className="h-6 w-6" />;
    }
  };

  // Determine if we should show a play button or view button
  const showPlayButton = embedType === "video";

  // Get the thumbnail for the video/presentation
  const thumbnailUrl = getVideoThumbnail();

  return (
    <Card className={cn("py-5 px-4 md:px-6 space-y-3", className)}>
      {/* Title and description if provided */}
      {showEditControls ? (
        <InlineTextEditor
          value={title || ""}
          onSave={(newValue: string) => onTitleChange?.(newValue)}
          placeholder="Enter embed title..."
          textClassName="text-lg font-medium"
          showEditButton={true}
        />
      ) : (
        title && <h3 className="text-lg font-medium">{title}</h3>
      )}
      {showEditControls ? (
        <InlineTextEditor
          value={description || ""}
          onSave={(newValue: string) => onDescriptionChange?.(newValue)}
          placeholder="Enter embed description..."
          multiline={true}
          textClassName="text-sm text-muted-foreground whitespace-pre-wrap break-words"
          showEditButton={true}
        />
      ) : (
        description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {description}
          </p>
        )
      )}

      {/* Embed container */}
      <Card className="overflow-hidden">
        {/* YouTube/Vimeo thumbnail or stylized background for presentations/other types */}
        <div
          className={cn(
            "aspect-video relative flex items-center justify-center cursor-pointer",
            embedType === "presentation" && !thumbnailUrl
              ? "bg-gradient-to-r from-blue-50 to-indigo-100"
              : embedType === "document" && !thumbnailUrl
                ? "bg-gradient-to-r from-amber-50 to-yellow-100"
                : embedType === "webpage" && !thumbnailUrl
                  ? "bg-gradient-to-r from-green-50 to-emerald-100"
                  : "bg-muted"
          )}
          onClick={handlePlayClick}
        >
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={title || `${embedType} thumbnail`}
              className="w-full h-full object-cover"
            />
          )}

          {/* Icon overlay */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center",
              thumbnailUrl ? "bg-black/30" : "bg-transparent"
            )}
          >
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-16 w-16 rounded-full mb-2",
                thumbnailUrl ? "bg-white/20 backdrop-blur-sm" : "bg-white/90"
              )}
            >
              {getPreviewIcon()}
            </Button>
            <p
              className={cn(
                "text-sm font-medium px-3 py-1 rounded-full",
                thumbnailUrl
                  ? "text-white bg-black/40"
                  : "text-gray-700 bg-white/90"
              )}
            >
              {showPlayButton ? "Play" : "View"} {embedType}
            </p>
          </div>
        </div>

        {/* Footer with full screen button */}
        <CardFooter className="p-3 bg-muted/30 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleFullScreenClick}>
            <Maximize2 className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        </CardFooter>
      </Card>

      {/* Embed Modal for full-screen viewing */}
      <EmbedModal
        isOpen={embedModalOpen}
        onOpenChange={setEmbedModalOpen}
        embedUrl={embedUrl || ""}
        embedTitle={title || "Embedded Content"}
        embedType={embedType}
      />
    </Card>
  );
}
