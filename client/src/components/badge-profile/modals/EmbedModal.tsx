import {useState, useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {VisuallyHidden} from "@/components/ui/visually-hidden";
import {X, ExternalLink, Loader2} from "lucide-react";
import {cn} from "@/lib/utils";
import {useMobile} from "@/hooks/use-media-query";

interface EmbedModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  embedUrl: string;
  embedTitle: string;
  embedType: "video" | "presentation" | "webpage" | "document" | "other";
  fullScreen?: boolean;
}

export function EmbedModal({
  isOpen,
  onOpenChange,
  embedUrl,
  embedTitle,
  embedType,
  fullScreen = true
}: EmbedModalProps) {
  const isMobile = useMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen]);

  // Handle iframe load events
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError(`Failed to load ${embedType}. Please try opening in a new tab.`);
  };

  // Generate appropriate embed URL based on type and source
  const getFormattedEmbedUrl = () => {
    if (!embedUrl) {
      return null;
    }

    // Handle video embeds - mainly YouTube
    if (embedType === "video") {
      // Convert YouTube watch URLs to embed URLs
      if (embedUrl.includes("youtube.com/watch?v=")) {
        const videoId = new URL(embedUrl).searchParams.get("v");
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // Convert YouTube short URLs to embed URLs
      if (embedUrl.includes("youtu.be/")) {
        const videoId = embedUrl.split("/").pop();
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // Vimeo handling
      if (embedUrl.includes("vimeo.com/")) {
        const videoId = embedUrl.split("/").pop();
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    // Handle presentation embeds
    if (embedType === "presentation") {
      // Google Slides
      if (embedUrl.includes("docs.google.com/presentation")) {
        if (!embedUrl.includes("/embed")) {
          // Convert view/edit URL to embed URL
          return embedUrl.replace("/edit", "/embed").replace("/pub", "/embed");
        }
      }

      // SlideShare
      if (embedUrl.includes("slideshare.net")) {
        return `https://www.slideshare.net/slideshow/embed_code/${embedUrl.split("/").pop()}`;
      }
    }

    // Return original URL for web pages, documents, or if no special formatting is needed
    return embedUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col",
          fullScreen && isMobile
            ? "w-[100vw] h-[100vh] max-w-none max-h-none p-0 rounded-none border-0"
            : "max-w-7xl max-h-[95vh] h-[90vh]" // Added explicit height
        )}
        hideCloseButton
      >
        <DialogHeader
          className={cn(
            "flex flex-row items-center justify-between px-4 py-2 bg-background border-b",
            fullScreen && isMobile ? "sticky top-0 z-10" : ""
          )}
        >
          <div className="flex-1 flex items-center">
            <DialogTitle className="text-base">{embedTitle}</DialogTitle>
            <VisuallyHidden>{embedType} Modal</VisuallyHidden>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="rounded-full h-8 w-8"
              aria-label="Open in new tab"
            >
              <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              aria-label="Close dialog"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div
          className={cn(
            "flex-1 relative",
            fullScreen && isMobile ? "h-[calc(100vh-40px)]" : "h-[80vh]"
          )}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading {embedType}...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-4">
              <p className="text-destructive mb-4">{error}</p>
              {embedUrl && (
                <Button
                  variant="outline"
                  asChild
                  className="rounded-full"
                  aria-label="Open in new tab"
                >
                  <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                    Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {!embedUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-4">
              <p className="text-muted-foreground mb-4">No embed URL provided. Please add a URL to embed content.</p>
            </div>
          )}

          {embedUrl && (
            <iframe
              src={getFormattedEmbedUrl() || ""}
              className={cn(
                "w-full h-full border-0",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={`${embedTitle} embedded ${embedType}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; display-capture"
              loading="lazy"
              allowFullScreen
            />
          )}
        </div>

        {!isMobile && (
          <DialogFooter className="px-4 py-2 border-t">
            <DialogDescription className="text-xs text-muted-foreground">
              This {embedType} is being displayed in an embedded frame. If you
              experience any issues, try opening it in a new tab.
            </DialogDescription>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
