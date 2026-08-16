import {useState, useEffect, useMemo} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {VisuallyHidden} from "@/components/ui/visually-hidden";
import {cn} from "@/lib/utils";
import {useMobile} from "@/hooks/use-media-query";
import {
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Globe,
  File,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download
} from "lucide-react";

// PDF.js imports
import {Document, Page, pdfjs} from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker - use local file to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface ResourcePreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  resource: {
    id: string;
    title?: string;
    name?: string;
    description?: string;
    type: "pdf" | "url" | "image" | "other";
    url: string;
    thumbnail?: string;
    size?: number;
  } | null;
  fullScreen?: boolean;
}

// Helper to ensure URL is absolute
const ensureAbsoluteUrl = (url: string) => {
  if (!url) return "";

  // If it's already absolute, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If it's a relative URL starting with /, make it absolute to current domain
  if (url.startsWith("/")) {
    return `${window.location.origin}${url}`;
  }

  // Check if it looks like a domain name or external URL (contains dots and no slashes, or starts with www.)
  if (
    url.includes(".") &&
    !url.startsWith("/") &&
    (url.includes(".com") ||
      url.includes(".org") ||
      url.includes(".net") ||
      url.includes(".edu") ||
      url.includes(".gov") ||
      url.includes(".io") ||
      url.includes(".co") ||
      url.startsWith("www."))
  ) {
    // It's likely an external URL without protocol, add https://
    return `https://${url}`;
  }

  // Otherwise, assume it's a self-hosted resource (uploaded files)
  return url;
};

// Helper to check if a URL should use iframe embedding (for special embeddable content)
const shouldUseIframeEmbed = (url: string) => {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com") ||
    url.includes("spotify.com") ||
    url.includes("docs.google.com") ||
    url.includes("codepen.io") ||
    url.includes("codesandbox.io") ||
    url.includes("stackblitz.com") ||
    url.includes("replit.com")
  );
};

// Helper to check if a website allows iframe embedding by checking headers
const checkIfEmbeddingAllowed = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: "HEAD", // Only get headers, not content
      mode: "cors"
    });

    const xFrameOptions = response.headers.get("X-Frame-Options");
    const csp = response.headers.get("Content-Security-Policy");

    // Check X-Frame-Options header
    if (xFrameOptions) {
      const frameOptions = xFrameOptions.toLowerCase();
      if (
        frameOptions.includes("deny") ||
        frameOptions.includes("sameorigin")
      ) {
        return false;
      }
    }

    // Check Content-Security-Policy for frame-ancestors
    if (csp && csp.toLowerCase().includes("frame-ancestors")) {
      const cspLower = csp.toLowerCase();
      if (
        cspLower.includes("frame-ancestors 'none'") ||
        cspLower.includes("frame-ancestors 'self'")
      ) {
        return false;
      }
    }

    return true;
  } catch {
    // CORS error or network error - assume it might work in iframe
    console.log(
      "Could not check embedding headers for",
      url,
      "- will try iframe anyway"
    );
    return true;
  }
};

// Helper to determine if the resource can be embedded based on type and URL
const canBeEmbedded = (resource: any) => {
  if (!resource) return false;

  // PDFs will now be handled by react-pdf
  if (resource.type === "pdf") {
    return true;
  }

  // Images can be embedded directly
  if (resource.type === "image") {
    return true;
  }

  // For URLs, all can be handled by iframe
  if (resource.type === "url") {
    try {
      // First ensure the URL is absolute before trying to parse it
      const absoluteUrl = ensureAbsoluteUrl(resource.url);
      const url = new URL(absoluteUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return true;
      }
    } catch (error) {
      console.error("Error checking if resource can be embedded:", error);
      return false;
    }
  }

  return false;
};

// Modify URL for proper embedding if needed
const getEmbedUrl = (resource: any) => {
  if (!resource) return "";

  // Ensure URL is absolute first
  let embedUrl = ensureAbsoluteUrl(resource.url);

  // Handle YouTube URLs
  if (
    embedUrl.includes("youtube.com/watch?v=") ||
    embedUrl.includes("youtu.be/")
  ) {
    const videoId = embedUrl.includes("youtube.com/watch?v=")
      ? new URL(embedUrl).searchParams.get("v")
      : embedUrl.split("youtu.be/")[1]?.split("?")[0];

    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
  }

  // Handle Vimeo URLs
  if (embedUrl.includes("vimeo.com")) {
    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = embedUrl.match(vimeoRegex);
    if (match && match[1]) {
      const videoId = match[1];
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }
  }

  // Handle Spotify URLs
  if (embedUrl.includes("spotify.com")) {
    if (embedUrl.includes("/track/")) {
      embedUrl = embedUrl.replace(
        "spotify.com/track",
        "spotify.com/embed/track"
      );
    } else if (embedUrl.includes("/album/")) {
      embedUrl = embedUrl.replace(
        "spotify.com/album",
        "spotify.com/embed/album"
      );
    } else if (embedUrl.includes("/playlist/")) {
      embedUrl = embedUrl.replace(
        "spotify.com/playlist",
        "spotify.com/embed/playlist"
      );
    } else if (embedUrl.includes("/artist/")) {
      embedUrl = embedUrl.replace(
        "spotify.com/artist",
        "spotify.com/embed/artist"
      );
    }
  }

  // Handle CodePen URLs
  if (embedUrl.includes("codepen.io/") && embedUrl.includes("/pen/")) {
    const penMatch = embedUrl.match(/codepen\.io\/([^/]+)\/pen\/([^/?]+)/);
    if (penMatch) {
      const [, user, penId] = penMatch;
      embedUrl = `https://codepen.io/${user}/embed/${penId}`;
    }
  }

  // Handle CodeSandbox URLs
  if (embedUrl.includes("codesandbox.io/s/")) {
    const sandboxMatch = embedUrl.match(/codesandbox\.io\/s\/([^/?]+)/);
    if (sandboxMatch) {
      const [, sandboxId] = sandboxMatch;
      embedUrl = `https://codesandbox.io/embed/${sandboxId}`;
    }
  }

  // Handle StackBlitz URLs
  if (embedUrl.includes("stackblitz.com/") && !embedUrl.includes("/embed/")) {
    embedUrl = embedUrl.replace("stackblitz.com/", "stackblitz.com/embed/");
  }

  // Handle Replit URLs
  if (embedUrl.includes("replit.com/") && !embedUrl.includes("/embed")) {
    const replitMatch = embedUrl.match(/replit\.com\/@([^/]+)\/([^/?]+)/);
    if (replitMatch) {
      const [, user, replName] = replitMatch;
      embedUrl = `https://replit.com/@${user}/${replName}?embed=true`;
    }
  }

  // Handle Google Docs URLs
  if (embedUrl.includes("docs.google.com/document")) {
    embedUrl = embedUrl.replace(/\/edit.*$/, "/preview");
  }

  // Handle Google Sheets URLs
  if (embedUrl.includes("docs.google.com/spreadsheets")) {
    embedUrl = embedUrl.replace(/\/edit.*$/, "/preview");
  }

  // Handle Google Slides URLs
  if (embedUrl.includes("docs.google.com/presentation")) {
    embedUrl = embedUrl.replace(/\/edit.*$/, "/embed");
  }

  return embedUrl;
};

export function ResourcePreviewModal({
  isOpen,
  onOpenChange,
  resource,
  fullScreen = true
}: ResourcePreviewModalProps) {
  const isMobile = useMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF-specific state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfLoadingTimeout, setPdfLoadingTimeout] = useState<number | null>(
    null
  );
  const [useNativePdfViewer, setUseNativePdfViewer] = useState<boolean>(false);
  const [iframeTimeout, setIframeTimeout] = useState<number | null>(null);

  // Memoize PDF options to prevent unnecessary reloads
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
      standardFontDataUrl:
        "https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/",
      workerSrc: "/pdf.worker.min.js"
    }),
    []
  );

  // Reset loading state when modal opens or resource changes
  useEffect(() => {
    if (isOpen && resource) {
      console.log("ResourcePreviewModal: Opening with resource", {
        ...resource,
        processedUrl:
          resource.type === "url"
            ? ensureAbsoluteUrl(resource.url)
            : resource.url
      });
      setError(null);
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setUseNativePdfViewer(false);

      // Clear any existing timeouts
      if (pdfLoadingTimeout) {
        window.clearTimeout(pdfLoadingTimeout);
        setPdfLoadingTimeout(null);
      }
      if (iframeTimeout) {
        window.clearTimeout(iframeTimeout);
        setIframeTimeout(null);
      }

      // For URLs, start with loading state and check if embedding is allowed
      if (resource.type === "url" && canBeEmbedded(resource)) {
        setIsLoading(true);

        // Only check headers for non-special embeddable content
        // Skip header check for known embed-friendly platforms
        const shouldCheckHeaders = !shouldUseIframeEmbed(resource.url);

        if (shouldCheckHeaders) {
          // Check if the website allows embedding
          const checkEmbedding = async () => {
            const absoluteUrl = ensureAbsoluteUrl(resource.url);
            const embeddingAllowed = await checkIfEmbeddingAllowed(absoluteUrl);

            if (!embeddingAllowed) {
              console.log(
                "ResourcePreviewModal: Website blocks embedding via headers"
              );
              setIsLoading(false);
              setError(
                "This website blocks embedding for security reasons. The website's security policy prevents it from being displayed in frames to protect user privacy and prevent clickjacking attacks."
              );
              return;
            }
          };

          // Run the embedding check
          checkEmbedding();
        }

        // Set a backup timeout for cases where headers don't tell the full story
        const timeout = window.setTimeout(
          () => {
            console.log(
              "ResourcePreviewModal: Iframe timeout - website may be blocked or slow"
            );
            setIsLoading(false);

            // Use different timeout behavior based on whether we checked headers
            if (shouldCheckHeaders) {
              // For regular websites where we checked headers, it's likely a blocking issue
              setError(
                "This website is taking too long to load or may not allow embedding. Many websites block iframe embedding for security reasons."
              );
            } else {
              // For known embed platforms (YouTube, etc.), assume it loaded successfully
              setError(null);
            }
          },
          shouldCheckHeaders ? 8000 : 3000
        ); // Shorter timeout for known embed platforms
        setIframeTimeout(timeout);
      } else {
        setIsLoading(false);
      }

      // Set a timeout for PDF fallback (still needed for react-pdf failures)
      if (resource.type === "pdf") {
        const timeout = window.setTimeout(() => {
          console.error("PDF loading timeout - falling back to native viewer");
          setUseNativePdfViewer(true);
        }, 15000);
        setPdfLoadingTimeout(timeout);
      }
    }
  }, [isOpen, resource]);

  // When modal closes, reset states and cleanup
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setError(null);
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setNumPages(0);
      setUseNativePdfViewer(false);

      // Clear timeouts
      if (pdfLoadingTimeout) {
        window.clearTimeout(pdfLoadingTimeout);
        setPdfLoadingTimeout(null);
      }
      if (iframeTimeout) {
        window.clearTimeout(iframeTimeout);
        setIframeTimeout(null);
      }
    }
  }, [isOpen]);

  // Cleanup on component unmount to prevent transport errors
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (pdfLoadingTimeout) {
        window.clearTimeout(pdfLoadingTimeout);
      }
      if (iframeTimeout) {
        window.clearTimeout(iframeTimeout);
      }
    };
  }, [pdfLoadingTimeout, iframeTimeout]);

  // PDF event handlers
  const onDocumentLoadSuccess = ({numPages}: {numPages: number}) => {
    console.log("PDF loaded successfully with react-pdf, pages:", numPages);
    setNumPages(numPages);
    setError(null);

    // Clear timeout on successful load
    if (pdfLoadingTimeout) {
      window.clearTimeout(pdfLoadingTimeout);
      setPdfLoadingTimeout(null);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    // Suppress "Transport destroyed" errors as they're harmless cleanup warnings
    if (error.message && error.message.includes("Transport destroyed")) {
      console.warn("PDF transport destroyed during cleanup - this is expected");
      return;
    }

    console.error("PDF load error with react-pdf:", error);
    console.log("Falling back to native PDF viewer");
    setUseNativePdfViewer(true);

    // Clear timeout on error
    if (pdfLoadingTimeout) {
      window.clearTimeout(pdfLoadingTimeout);
      setPdfLoadingTimeout(null);
    }
  };

  // Add a loading progress handler
  const onDocumentLoadProgress = ({
    loaded,
    total
  }: {
    loaded: number;
    total: number;
  }) => {
    if (total > 0) {
      const progress = Math.round((loaded / total) * 100);
      console.log(
        `PDF loading progress: ${progress}% (${loaded}/${total} bytes)`
      );
    }
  };

  // Handle image load events
  const handleImageLoad = () => {
    console.log("ResourcePreviewModal: Image loaded successfully");
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    console.error("ResourcePreviewModal: Image failed to load");
    setIsLoading(false);
    setError("Failed to load image. Please try opening in a new tab.");
  };

  // Get the appropriate icon based on resource type
  const getResourceIcon = (type: string) => {
    const iconSize = "h-5 w-5";

    switch (type) {
      case "pdf":
        return <FileText className={iconSize} />;
      case "image":
        return <ImageIcon className={iconSize} />;
      case "url":
        return <Globe className={iconSize} />;
      case "other":
      default:
        return <File className={iconSize} />;
    }
  };

  // PDF navigation functions
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const rotatePage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Get content for the modal
  const renderContent = () => {
    if (!resource) return null;

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">
            {resource.type === "pdf"
              ? "Loading PDF document..."
              : "Loading resource..."}
          </p>
          {resource.type === "pdf" && (
            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                If loading takes too long, we'll switch to the browser's PDF
                viewer
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsLoading(false);
                  setUseNativePdfViewer(true);
                }}
              >
                Use Browser PDF Viewer
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-destructive mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium mb-2">Failed to load preview</h3>
          <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
          <div className="flex gap-2">
            <Button asChild>
              <a
                href={ensureAbsoluteUrl(resource.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in new tab
              </a>
            </Button>
            {resource.type === "pdf" && (
              <Button variant="outline" asChild>
                <a href={ensureAbsoluteUrl(resource.url)} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Handle images
    if (
      resource.type === "image" ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(resource.url)
    ) {
      const imageUrl = ensureAbsoluteUrl(resource.url);
      console.log("ResourcePreviewModal: Rendering image", imageUrl);

      return (
        <div className="flex items-center justify-center h-full bg-muted/20 overflow-auto p-4">
          <img
            src={imageUrl}
            alt={resource.title || resource.name || "Image"}
            className="max-w-full max-h-full object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      );
    }

    // Handle PDFs with react-pdf or native viewer
    if (
      resource.type === "pdf" ||
      resource.url.toLowerCase().endsWith(".pdf")
    ) {
      const pdfUrl = ensureAbsoluteUrl(resource.url);
      console.log(
        "ResourcePreviewModal: Rendering PDF",
        useNativePdfViewer ? "with native viewer" : "with react-pdf",
        pdfUrl
      );

      // Use native browser PDF viewer as fallback
      if (useNativePdfViewer) {
        return (
          <div className="relative w-full h-full flex flex-col">
            {/* Native PDF Viewer Header */}
            <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Browser PDF Viewer</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseNativePdfViewer(false);
                  }}
                >
                  Try Enhanced Viewer
                </Button>

                <Button variant="outline" size="sm" asChild>
                  <a href={pdfUrl} download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Native PDF Iframe */}
            <div className="flex-1">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={resource.title || resource.name || "PDF Document"}
                onLoad={() => console.log("Native PDF viewer loaded")}
                onError={() => console.error("Native PDF viewer failed")}
              />
            </div>
          </div>
        );
      }

      // Use react-pdf viewer
      return (
        <div className="relative w-full h-full flex flex-col">
          {/* PDF Controls */}
          <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              {/* Page Navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pageNumber} of {numPages || "?"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>

              {/* Rotate */}
              <Button variant="outline" size="sm" onClick={rotatePage}>
                <RotateCw className="h-4 w-4" />
              </Button>

              {/* Fallback button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseNativePdfViewer(true)}
              >
                Browser Viewer
              </Button>

              {/* Download */}
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            <Document
              key={pdfUrl} // Force remount when URL changes to prevent transport issues
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onLoadProgress={onDocumentLoadProgress}
              options={pdfOptions}
              loading={
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Loading PDF...
                  </span>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="flex items-center justify-center h-96 bg-muted/20 rounded">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center h-96 bg-muted/20 rounded p-4">
                    <X className="h-8 w-8 text-destructive mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Failed to load this page
                    </p>
                  </div>
                }
              />
            </Document>
          </div>
        </div>
      );
    }

    // Handle URLs - simple iframe approach with fallback error message
    if (resource.type === "url" && canBeEmbedded(resource)) {
      const absoluteUrl = ensureAbsoluteUrl(resource.url);
      const embedUrl = shouldUseIframeEmbed(resource.url)
        ? getEmbedUrl(resource)
        : absoluteUrl;

      return (
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              <p className="text-sm text-muted-foreground mt-2">
                Loading website...
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-8">
              <div className="text-muted-foreground mb-6">
                <Globe className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-3 text-center">
                Website Cannot Be Embedded
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg text-center text-sm leading-relaxed">
                {error}
              </p>
              <Button asChild size="lg">
                <a href={absoluteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          )}

          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            onLoad={() => {
              console.log(
                "ResourcePreviewModal: Website loaded successfully via onLoad"
              );
              setIsLoading(false);
              setError(null);

              // Clear the backup timeout since we got a real onLoad event
              if (iframeTimeout) {
                window.clearTimeout(iframeTimeout);
                setIframeTimeout(null);
              }
            }}
            onError={() => {
              console.error("ResourcePreviewModal: Website failed to load");
              setIsLoading(false);
              setError("Website cannot be embedded");

              // Clear the backup timeout
              if (iframeTimeout) {
                window.clearTimeout(iframeTimeout);
                setIframeTimeout(null);
              }
            }}
            title={resource.title || resource.name || "Website Preview"}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; payment; geolocation; camera; microphone"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-top-navigation allow-downloads allow-modals"
          />

          <div className="absolute bottom-4 right-4 z-30">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md opacity-80 hover:opacity-100"
              asChild
            >
              <a href={absoluteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in browser
              </a>
            </Button>
          </div>
        </div>
      );
    }

    // Fallback for non-embeddable resources or direct URLs
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-primary mb-4">
          {getResourceIcon(resource.type)}
        </div>
        <h3 className="text-lg font-medium mb-2">
          {resource.type === "url"
            ? "This website cannot be previewed"
            : "This resource cannot be previewed"}
        </h3>
        <p className="text-muted-foreground mb-4">
          {resource.type === "url"
            ? "Please open the link in a new tab to view it."
            : "Please open the resource in a new tab to view it."}
        </p>
        <Button asChild>
          <a
            href={ensureAbsoluteUrl(resource.url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </a>
        </Button>
      </div>
    );
  };

  if (!resource) return null;

  const displayName = resource.title || resource.name || "Resource";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col",
          fullScreen && isMobile
            ? "w-[100vw] h-[100vh] max-w-none max-h-none p-0 rounded-none border-0"
            : "max-w-7xl max-h-[95vh] h-[90vh]"
        )}
        aria-describedby="resource-preview-description"
        hideCloseButton
      >
        <VisuallyHidden id="resource-preview-description">
          Preview of {displayName}. Press Escape to close or use the Open in new
          tab button to view in browser.
        </VisuallyHidden>
        <DialogHeader
          className={cn(
            "flex flex-row items-center justify-between px-4 py-2 bg-background border-b",
            fullScreen && isMobile ? "sticky top-0 z-10" : ""
          )}
        >
          <div className="flex flex-1 items-center gap-2 truncate">
            {getResourceIcon(resource.type)}
            <DialogTitle className="text-base truncate">
              {displayName}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="rounded-full h-8 w-8"
              aria-label="Open in new tab"
            >
              <a
                href={ensureAbsoluteUrl(resource.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
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

        <div className="flex-1 overflow-auto">{renderContent()}</div>

        {!isMobile && resource.description && (
          <DialogFooter className="px-4 py-2 border-t">
            <DialogDescription className="text-sm text-muted-foreground">
              {resource.description}
            </DialogDescription>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
