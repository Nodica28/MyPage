import {useState, useEffect, useMemo, MouseEvent} from "react";
import {Link} from "wouter";
import {useQuery, useMutation} from "@tanstack/react-query";
import axios from "axios";
import {
  Loader2,
  ImageIcon,
  Camera,
  Download,
  UserCircle2,
  Trash2,
  Bookmark,
  BookmarkX,
  Image,
  Glasses,
  Shirt,
  Sparkles,
  SmilePlus,
  Calendar,
  CreditCard
} from "lucide-react";
import {queryClient} from "@/lib/queryClient";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {ErrorBoundary} from "@/components/error-boundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {useToast} from "@/hooks/use-toast";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Badge} from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {useProfileImage} from "@/hooks/use-profile-image";
import {ImageService} from "@/lib/services/image-service";
import {LazyImage} from "@/components/ui/lazy-image";
import {useDeviceType} from "@/hooks/use-mobile";

// Custom hook to fetch user billing info and credits
function useUserCredits() {
  return useQuery({
    queryKey: ["/api/payments/subscription-status"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/payments/subscription-status");
        return response.data;
      } catch (err) {
        console.error("Error fetching user credits:", err);
        throw err;
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30000 // Cache for 30 seconds
  });
}

// Custom hook to calculate headshot usage
function useHeadshotUsage() {
  const {data: billingInfo} = useUserCredits();

  const credits = billingInfo?.headshotCredits || 0;

  // For pro plan users, they get 5 headshots + additional credits
  const isProPlan = billingInfo?.hasPremiumAccess === true;

  // The user can create as many headshots as they have credits
  const canCreateMore = credits > 0;

  return {
    remainingCredits: credits,
    canCreateMore,
    credits,
    isProPlan
  };
}

// Credit Counter Component
function CreditCounter() {
  const {remainingCredits} = useHeadshotUsage();
  const {data: billingInfo, isLoading, error} = useUserCredits();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !billingInfo) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm text-muted-foreground cursor-help">
            <span className="font-semibold">{remainingCredits}</span>
            <span>credits remaining</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Credits will be consumed when you start generating headshots</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Local type to match backend response structure
type LocalHeadshotRequest = {
  id: number;
  status: "pending" | "processing" | "completed" | "failed";
  output: string | null;
  createdAt: string;
  error?: string;
  setting?: string;
  settingDetails?: string;
  lighting?: string;
  lightingDetails?: string;
  expression?: string;
  generationId?: string;
  isSaved?: boolean;
  settingCategory?: string;
  clothing?: string;
};

interface HeadshotModalProps {
  headshot: LocalHeadshotRequest;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
}

function HeadshotModal({
  headshot,
  isOpen,
  onClose,
  onDelete
}: HeadshotModalProps) {
  const {toast} = useToast();
  const {setProfileImage, isUpdating} = useProfileImage();
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Reset loading state when modal opens or headshot changes
  useEffect(() => {
    if (isOpen && headshot?.output) {
      setIsImageLoading(true);
    }
  }, [isOpen, headshot?.output]);

  const handleSetProfileImage = () => {
    setProfileImage(
      {headshotId: headshot.id},
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  const handleDownload = async () => {
    try {
      const blob = await ImageService.downloadHeadshot(headshot.id);
      ImageService.downloadBlob(blob, `headshot-${headshot.id}.png`);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download image. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Format date nicely
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // Reuse the formatTagText function
  const formatTagText = (text?: string): string => {
    if (!text) return "Unknown";
    return text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Icons for tags
  const getSettingIcon = () => <Image className="h-4 w-4" />;
  const getLightingIcon = () => {
    if (headshot.lighting === "dramatic" || headshot.lighting === "moody") {
      return <Glasses className="h-4 w-4" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };
  const getExpressionIcon = () => <SmilePlus className="h-4 w-4" />;
  const getClothingIcon = () => <Shirt className="h-4 w-4" />;
  const getDateIcon = () => <Calendar className="h-4 w-4" />;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl gap-6 pb-8">
        <DialogHeader className="flex flex-row gap-4 items-center">
          <div className="p-3 rounded-xl border-2">
            <Camera className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-2xl">Headshot Preview</DialogTitle>
            <DialogDescription className="text-lg">
              View and manage your AI-generated professional headshot
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <LazyImage
              src={headshot?.output || ""}
              alt="AI Generated Headshot"
              className="w-full h-full rounded-xl object-cover"
              loadingStrategy="viewport" // Load immediately in modal (already visible)
              placeholder="skeleton"
              onLoadComplete={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
              style={{
                aspectRatio: "1 / 1",
                objectFit: "cover"
              }}
            />
          </div>
          <div className="space-y-7">
            <div className="space-y-5">
              <h3 className="text-xl font-semibold">Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap gap-2.5">
                  <Badge
                    variant="outline"
                    className="flex items-center bg-muted gap-1 px-2 py-1"
                  >
                    {getDateIcon()}
                    <span>{formatDate(headshot.createdAt)}</span>
                  </Badge>

                  {headshot.setting && (
                    <Badge
                      variant="outline"
                      className="flex items-center bg-muted gap-1 px-2 py-1"
                    >
                      {getSettingIcon()}
                      <span>{formatTagText(headshot.setting)}</span>
                    </Badge>
                  )}

                  {headshot.lighting && (
                    <Badge
                      variant="outline"
                      className="flex items-center bg-muted gap-1 px-2 py-1"
                    >
                      {getLightingIcon()}
                      <span>{formatTagText(headshot.lighting)}</span>
                    </Badge>
                  )}

                  {headshot.expression && (
                    <Badge
                      variant="outline"
                      className="flex items-center bg-muted gap-1 px-2 py-1"
                    >
                      {getExpressionIcon()}
                      <span>{formatTagText(headshot.expression)}</span>
                    </Badge>
                  )}

                  {headshot.clothing && (
                    <Badge
                      variant="outline"
                      className="flex items-center bg-muted gap-1 px-2 py-1"
                    >
                      {getClothingIcon()}
                      <span>{formatTagText(headshot.clothing)}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Actions</h3>
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleSetProfileImage}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    <>
                      <UserCircle2 className="h-4 w-4 mr-2" />
                      Set as Profile Picture
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    onDelete(headshot.id);
                    onClose();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Image
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingPlaceholder() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square flex flex-col justify-center items-center bg-muted/50 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 animate-pulse" />
        <Camera className="h-12 w-12 text-primary/20 mb-4" />
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading headshot...
          </span>
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader for generating headshots
function GeneratingPlaceholder() {
  return (
    <Card className="overflow-hidden rounded-xl border-none relative">
      <div className="aspect-square flex flex-col justify-center items-center bg-muted/50 relative">
        <div className="absolute rounded-xl inset-0 bg-gradient-to-br from-primary/5 to-primary/25 animate-pulse" />
        <div className="absolute flex items-center gap-2 z-10 px-3 py-1.5">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-14 w-14 animate-spin text-primary" />
            <span className="text-sm font-medium">Generating headshot...</span>
          </div>
        </div>
      </div>
      <div className="py-4 px-2">
        <div className="flex flex-wrap gap-1.5">
          <div className="w-36 h-5 bg-primary/20 animate-pulse rounded-full"></div>
          <div className="w-24 h-5 bg-primary/20 animate-pulse rounded-full"></div>
          <div className="w-28 h-5 bg-primary/20 animate-pulse rounded-full"></div>
          <div className="w-16 h-5 bg-primary/20 animate-pulse rounded-full"></div>
          <div className="w-20 h-5 bg-primary/20 animate-pulse rounded-full"></div>
        </div>
      </div>
    </Card>
  );
}

function HeadshotGallery({
  onHeadshotsChange
}: {
  onHeadshotsChange: (hasAnyHeadshots: boolean) => void;
}) {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [selectedHeadshot, setSelectedHeadshot] =
    useState<LocalHeadshotRequest | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "saved">("all");
  const {toast} = useToast();
  const [completedHeadshotIds, setCompletedHeadshotIds] = useState<Set<number>>(
    new Set()
  );
  const [showGeneratingFallback, setShowGeneratingFallback] = useState(false);
  const {canCreateMore} = useHeadshotUsage();
  const {isMobile} = useDeviceType();

  // Check if we were just redirected from headshot generation
  useEffect(() => {
    const justGenerated = localStorage.getItem("justGeneratedHeadshot");
    if (justGenerated === "true") {
      // Show a fallback generating UI in case the API hasn't registered the new headshot yet
      setShowGeneratingFallback(true);
      // Clear the flag
      localStorage.removeItem("justGeneratedHeadshot");

      // After some time, we can assume API data should be loaded with real status
      setTimeout(() => {
        setShowGeneratingFallback(false);
      }, 15000); // 15 seconds should be enough for API to reflect the change
    }
  }, []);

  // Fetch all headshots
  const {
    data: allHeadshots,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/headshots/list"],
    queryFn: async () => {
      try {
        const response = await axios.get<LocalHeadshotRequest[]>(
          "/api/headshots/list"
        );

        // Load saved state from localStorage
        const savedHeadshots = JSON.parse(
          localStorage.getItem("savedHeadshots") || "[]"
        );

        // Add isSaved property to each headshot
        return response.data.map((headshot) => ({
          ...headshot,
          isSaved: savedHeadshots.includes(headshot.id)
        }));
      } catch (err) {
        console.error("Error fetching headshots:", err);
        throw err;
      }
    },
    // Force fresh data on initial load and when returning to the page
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0 // Consider data stale immediately so it will refetch
  });

  // Immediately refetch when the component mounts or is redirected to
  useEffect(() => {
    refetch();

    // Use Page Visibility API to pause polling when tab is hidden (mobile-friendly)
    let isPageVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Setup a more aggressive initial polling to catch newly created headshots
    // Use longer intervals on mobile to save battery and bandwidth
    const pollInterval = isMobile ? 4000 : 2000; // 4s on mobile, 2s on desktop
    const initialPolling = setInterval(() => {
      if (isPageVisible) {
        refetch();
      }
    }, pollInterval);

    // Clear the aggressive polling after 10 seconds
    setTimeout(() => {
      clearInterval(initialPolling);
    }, 10000);

    return () => {
      clearInterval(initialPolling);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch, isMobile]);

  // Intelligent polling with exponential backoff and mobile optimization
  useEffect(() => {
    if (!allHeadshots?.length) return;

    const processingHeadshots = allHeadshots.filter(
      (h) => h.status === "processing" && h.generationId
    );

    if (!processingHeadshots.length) return;

    let pollAttempts = 0;
    let pollInterval: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;
    let isPageVisible = !document.hidden;

    // Use Page Visibility API to pause polling when tab is hidden
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const checkProcessingHeadshots = async () => {
      if (!isActive || !isPageVisible) {
        // If page is hidden, schedule next check but don't make requests
        if (isActive) {
          const baseDelay = isMobile ? 5000 : 3000; // Longer delays on mobile
          pollInterval = setTimeout(() => {
            checkProcessingHeadshots();
          }, baseDelay);
        }
        return;
      }

      try {
        // Process headshots concurrently for better performance
        const statusPromises = processingHeadshots.map(async (headshot) => {
          try {
            const response = await axios.get(
              `/api/headshots/status/${headshot.generationId}`,
              {timeout: isMobile ? 15000 : 10000} // Longer timeout on mobile
            );
            return {headshot, response: response.data};
          } catch (error) {
            console.error(`Error polling headshot ${headshot.id}:`, error);
            return {headshot, error};
          }
        });

        const results = await Promise.allSettled(statusPromises);
        let hasCompletedItems = false;

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value.response) {
            const {headshot, response} = result.value;

            // If the status changed to completed, show a notification
            if (
              response.status === "completed" &&
              !completedHeadshotIds.has(headshot.id)
            ) {
              setCompletedHeadshotIds((prev) => new Set(prev).add(headshot.id));
              toast({
                title: "Headshot Ready",
                description:
                  "Your AI-generated headshot is now available to view!",
                duration: 5000
              });
              hasCompletedItems = true;
            }

            if (
              response.status === "completed" ||
              response.status === "failed"
            ) {
              hasCompletedItems = true;
            }
          }
        });

        if (hasCompletedItems) {
          queryClient.invalidateQueries({queryKey: ["/api/headshots/list"]});
        }

        // Exponential backoff: longer delays on mobile
        // Mobile: 4s → 6s → 9s → 15s → 20s (max)
        // Desktop: 2s → 4s → 8s → 12s → 15s (max)
        pollAttempts++;
        const baseDelay = isMobile ? 4000 : 2000;
        const maxDelay = isMobile ? 20000 : 15000;
        const nextDelay = Math.min(
          baseDelay * Math.pow(1.5, pollAttempts - 1),
          maxDelay
        );

        if (isActive) {
          pollInterval = setTimeout(() => {
            checkProcessingHeadshots();
          }, nextDelay);
        }
      } catch (error) {
        console.error("Error in polling cycle:", error);

        // On error, retry with longer delay
        if (isActive) {
          const errorDelay = isMobile ? 15000 : 10000;
          pollInterval = setTimeout(() => {
            checkProcessingHeadshots();
          }, errorDelay);
        }
      }
    };

    // Start polling immediately
    checkProcessingHeadshots();

    return () => {
      isActive = false;
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [allHeadshots, completedHeadshotIds, toast, isMobile]);

  // Get processing headshots
  const processingHeadshots = useMemo(() => {
    if (!allHeadshots) return [];
    return allHeadshots.filter(
      (h) => h.status === "processing" || h.status === "pending"
    );
  }, [allHeadshots]);

  // Filter headshots based on tab selection
  const filteredHeadshots = useMemo(() => {
    const completedHeadshots = Array.isArray(allHeadshots)
      ? allHeadshots.filter(
          (h) => h.status === "completed" || h.status === "failed"
        )
      : [];

    if (selectedTab === "saved") {
      return completedHeadshots.filter((h) => h.isSaved);
    }

    return completedHeadshots;
  }, [allHeadshots, selectedTab]);

  const handleImageError = (id: number) => {
    setFailedImages((prev) => new Set(prev).add(id));
  };

  const handleImageLoadStart = () => {
    // LazyImage handles its own loading state
  };

  const handleImageLoad = () => {
    // LazyImage handles its own loading state
  };

  // Toggle save status
  const toggleSaveHeadshot = (id: number, event?: MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent opening the modal
    }

    // Update local state
    const updatedHeadshots =
      allHeadshots?.map((headshot) => {
        if (headshot.id === id) {
          return {
            ...headshot,
            isSaved: !headshot.isSaved
          };
        }
        return headshot;
      }) || [];

    // Store in localStorage
    const savedIds = updatedHeadshots.filter((h) => h.isSaved).map((h) => h.id);

    localStorage.setItem("savedHeadshots", JSON.stringify(savedIds));

    // Force update
    queryClient.setQueryData(["/api/headshots/list"], updatedHeadshots);

    // Show toast
    const headshot = allHeadshots?.find((h) => h.id === id);
    if (headshot) {
      const isSaved = !headshot.isSaved;
      toast({
        title: isSaved ? "Headshot saved" : "Headshot unsaved",
        description: isSaved
          ? "This headshot has been added to your saved collection"
          : "This headshot has been removed from your saved collection"
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axios.delete(`/api/headshots/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/headshots/list"]});
      toast({
        title: "Success",
        description: "Headshot deleted successfully"
      });
      setSelectedHeadshot(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.response?.data?.error || "Failed to delete headshot",
        variant: "destructive"
      });
    }
  });

  // Helper function to format date nicely
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // Helper function to get icon for setting
  const getSettingIcon = (setting?: string) => {
    if (!setting) return <Image className="h-3 w-3" />;
    return <Image className="h-3 w-3" />;
  };

  // Helper function to get icon for lighting
  const getLightingIcon = (lighting?: string) => {
    if (!lighting) return <Sparkles className="h-3 w-3" />;

    if (lighting === "dramatic" || lighting === "moody") {
      return <Glasses className="h-3 w-3" />;
    }

    return <Sparkles className="h-3 w-3" />;
  };

  // Helper function to get icon for expression
  const getExpressionIcon = (expression?: string) => {
    if (!expression) return <SmilePlus className="h-3 w-3" />;
    return <SmilePlus className="h-3 w-3" />;
  };

  // Helper function to get icon for clothing
  const getClothingIcon = (clothing?: string) => {
    if (!clothing) return <Shirt className="h-3 w-3" />;
    return <Shirt className="h-3 w-3" />;
  };

  // Helper function to format tag text
  const formatTagText = (text?: string): string => {
    if (!text) return "Unknown";
    return text.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Check if there are any headshots (completed, processing, or generating fallback)
  const hasAnyHeadshots = useMemo(() => {
    return (allHeadshots && allHeadshots.length > 0) || showGeneratingFallback;
  }, [allHeadshots, showGeneratingFallback]);

  const hasActiveGenerationBanner =
    processingHeadshots.length > 0 || showGeneratingFallback;

  useEffect(() => {
    onHeadshotsChange(hasAnyHeadshots);
  }, [hasAnyHeadshots, onHeadshotsChange]);

  return (
    <div className="flex flex-col p-7 border-y-0 flex-grow">
      {hasActiveGenerationBanner && (
        <Card className="mb-4 border-dashed bg-muted/40">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Your headshot is generating in the background.
              </p>
            </div>
            <p className="text-xs text-muted-foreground md:ml-4">
              You can safely leave this page and come back later — your finished
              image will appear here automatically once it&apos;s ready.
            </p>
          </div>
        </Card>
      )}
      {hasAnyHeadshots && (
        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as "all" | "saved")}
        >
          <TabsList className="rounded-full border-none">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <div
        className={`container mx-auto flex-grow ${hasAnyHeadshots ? "py-7" : ""}`}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(2)].map((_, i) => (
              <LoadingPlaceholder key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center">
            <p className="text-destructive font-medium mb-2">
              Failed to load headshots
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "An error occurred while loading headshots"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredHeadshots.length === 0 &&
          processingHeadshots.length === 0 &&
          !showGeneratingFallback ? (
          <div
            className={`text-center py-16 border rounded-lg ${
              hasAnyHeadshots ? "" : "bg-muted"
            }`}
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 flex items-center justify-center">
                <img
                  src="/start-images/complete-badge-profile.svg"
                  alt="Complete Badge Profile"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-foreground">
                  {selectedTab === "all"
                    ? "No headshots yet"
                    : "No saved headshots yet."}
                </h3>
              </div>
              {selectedTab === "saved" && filteredHeadshots.length === 0 ? (
                <Button
                  className="mt-2"
                  onClick={() => setSelectedTab("all")}
                  variant="outline"
                >
                  View all headshots
                </Button>
              ) : canCreateMore ? (
                <Link href="/headshot-generator">
                  <Button className="mt-2">Create headshot</Button>
                </Link>
              ) : (
                <Link href="/settings?tab=billing">
                  <Button className="mt-2" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Buy Credits
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Display generating placeholders if there are processing headshots */}
            {(processingHeadshots.length > 0 || !showGeneratingFallback) &&
              selectedTab === "all" && (
                <>
                  {filteredHeadshots.length > 0 && (
                    <h3 className="text-lg font-medium mb-4">All Headshots</h3>
                  )}
                </>
              )}

            {/* Display all headshots in a single grid */}
            {(filteredHeadshots.length > 0 ||
              (processingHeadshots.length > 0 && selectedTab === "all") ||
              (showGeneratingFallback && selectedTab === "all")) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Processing headshots */}
                {selectedTab === "all" &&
                  processingHeadshots.map((headshot) => (
                    <GeneratingPlaceholder key={`generating-${headshot.id}`} />
                  ))}

                {/* Fallback generating placeholder */}
                {selectedTab === "all" &&
                  !processingHeadshots.length &&
                  showGeneratingFallback && (
                    <GeneratingPlaceholder key="fallback" />
                  )}

                {/* Completed headshots */}
                {filteredHeadshots.map((headshot) => (
                  <Card
                    key={headshot.id}
                    className="overflow-hidden cursor-pointer transition-all hover:shadow-lg group border-none"
                  >
                    <div
                      className="aspect-square relative overflow-hidden rounded-xl bg-muted"
                      onClick={() => setSelectedHeadshot(headshot)}
                    >
                      {headshot.status === "completed" ? (
                        <>
                          {headshot.output && !failedImages.has(headshot.id) ? (
                            <>
                              <LazyImage
                                src={headshot.output}
                                alt="AI Generated Headshot"
                                className="w-full h-full object-cover rounded-xl"
                                loadingStrategy="lazy"
                                threshold={0.1}
                                rootMargin={isMobile ? "100px" : "50px"} // Larger margin on mobile for smoother scrolling
                                placeholder="skeleton"
                                onLoadStart={handleImageLoadStart}
                                onLoadComplete={handleImageLoad}
                                onError={() => handleImageError(headshot.id)}
                                style={{
                                  aspectRatio: "1 / 1",
                                  objectFit: "cover"
                                }}
                              />
                              <button
                                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                onClick={(e) =>
                                  toggleSaveHeadshot(headshot.id, e)
                                }
                                aria-label={
                                  headshot.isSaved
                                    ? "Unsave headshot"
                                    : "Save headshot"
                                }
                              >
                                {headshot.isSaved ? (
                                  <BookmarkX className="h-5 w-5 text-primary" />
                                ) : (
                                  <Bookmark className="h-5 w-5 text-gray-700" />
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col justify-center items-center h-full bg-muted">
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground mt-2">
                                Image unavailable
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="aspect-square flex flex-col justify-center items-center bg-destructive/10">
                          <div className="text-center p-4">
                            <p className="text-destructive font-medium">
                              Generation failed
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {headshot.error || "Unknown error"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="py-4 px-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 text-xs"
                        >
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(headshot.createdAt)}</span>
                        </Badge>

                        {headshot.setting && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                          >
                            {getSettingIcon(headshot.setting)}
                            <span>{formatTagText(headshot.setting)}</span>
                          </Badge>
                        )}

                        {headshot.lighting && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                          >
                            {getLightingIcon(headshot.lighting)}
                            <span>{formatTagText(headshot.lighting)}</span>
                          </Badge>
                        )}

                        {headshot.expression && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                          >
                            {getExpressionIcon(headshot.expression)}
                            <span>{formatTagText(headshot.expression)}</span>
                          </Badge>
                        )}

                        {headshot.clothing && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                          >
                            {getClothingIcon(headshot.clothing)}
                            <span>{formatTagText(headshot.clothing)}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {selectedHeadshot && (
              <HeadshotModal
                headshot={selectedHeadshot}
                isOpen={true}
                onClose={() => setSelectedHeadshot(null)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AIHeadshotsPage() {
  const [, setHasAnyHeadshots] = useState(false);
  const {canCreateMore} = useHeadshotUsage();

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-[calc(100vh-48px)] bg-white">
        <div className="flex flex-col border sm:rounded-2xl h-full flex-grow">
          <div className="py-3 px-4 flex flex-row items-center justify-between border-b">
            <div className="h-9 flex items-center gap-4">
              <h2 className="text-lg font-medium">Headshots</h2>
            </div>
            <div className="flex items-center gap-3 self-end">
              <CreditCounter />
              {canCreateMore ? (
                <Link href="/headshot-generator">
                  <Button size="sm">Create headshot</Button>
                </Link>
              ) : (
                <Link href="/settings?tab=billing">
                  <Button size="sm" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Buy Credits
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <HeadshotGallery onHeadshotsChange={setHasAnyHeadshots} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
