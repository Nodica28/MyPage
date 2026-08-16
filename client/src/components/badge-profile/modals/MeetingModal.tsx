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

interface MeetingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  meetingUrl: string;
  meetingLabel: string;
  fullScreen?: boolean;
}

export function MeetingModal({
  isOpen,
  onOpenChange,
  meetingUrl,
  meetingLabel,
  fullScreen = true
}: MeetingModalProps) {
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
    setError("Failed to load meeting page. Please try opening in a new tab.");
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
            <DialogTitle className="text-base">{meetingLabel}</DialogTitle>
            <VisuallyHidden>Meeting Modal</VisuallyHidden>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="rounded-full h-8 w-8"
              aria-label="Open in new tab"
            >
              <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
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
              <span className="ml-2">Loading meeting...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-4">
              <p className="text-destructive mb-4">{error}</p>
              <Button
                variant="outline"
                asChild
                className="rounded-full"
                aria-label="Open in new tab"
              >
                <a href={meetingUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          <iframe
            src={meetingUrl}
            className={cn(
              "w-full h-full border-0",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={`${meetingLabel} embedded meeting page`}
            allow="camera; microphone; autoplay; clipboard-write; encrypted-media; fullscreen; display-capture"
            loading="lazy"
          />
        </div>

        {!isMobile && (
          <DialogFooter className="px-4 py-2 border-t">
            <DialogDescription className="text-xs text-muted-foreground">
              This meeting is being displayed in an embedded frame. If you
              experience any issues, try opening it in a new tab.
            </DialogDescription>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
