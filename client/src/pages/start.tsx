import {useState, useEffect} from "react";
import {Link} from "wouter";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import {Skeleton} from "@/components/ui/skeleton";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

function OnboardingModal({isOpen, onComplete}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [imageLoaded, setImageLoaded] = useState({
    standout: false,
    "grow-reach": false,
    "connect-convert": false,
    "complete-badge-profile": false,
    "create-ai-headshot": false,
    "create-email-signature": false,
    "create-zoom-background": false
  });

  // Preload all images when modal opens
  useEffect(() => {
    if (isOpen) {
      const imageUrls = [
        {url: "/start-images/standout.png", key: "standout"},
        {url: "/start-images/grow-reach.png", key: "grow-reach"},
        {url: "/start-images/connect-convert.png", key: "connect-convert"},
        {
          url: "/start-images/complete-badge-profile.svg",
          key: "complete-badge-profile"
        },
        {
          url: "/start-images/create-ai-headshot.svg",
          key: "create-ai-headshot"
        },
        {
          url: "/start-images/create-email-signature.svg",
          key: "create-email-signature"
        },
        {
          url: "/start-images/create-zoom-background.svg",
          key: "create-zoom-background"
        }
      ];

      imageUrls.forEach(({url, key}) => {
        const img = new Image();
        img.onload = () => {
          setImageLoaded((prev) => ({...prev, [key]: true}));
        };
        img.src = url;
      });
    }
  }, [isOpen]);

  // Reset image loaded state when step changes
  useEffect(() => {
    const imageKeys = ["standout", "grow-reach", "connect-convert"];
    const currentImageKey = imageKeys[currentStep];
    if (
      currentImageKey &&
      !imageLoaded[currentImageKey as keyof typeof imageLoaded]
    ) {
      // Image might already be loaded from preload, check if it's in cache
      const img = new Image();
      img.onload = () => {
        setImageLoaded((prev) => ({...prev, [currentImageKey]: true}));
      };
      img.src = `/start-images/${currentImageKey}.png`;
    }
  }, [currentStep, imageLoaded]);

  const steps = [
    {
      title: "Stand Out with Your Profile",
      content: (
        <div className="flex flex-col h-full space-y-4">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center min-h-0 relative">
            {!imageLoaded.standout && (
              <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
            )}
            <img
              key="standout"
              src="/start-images/standout.png"
              alt="Stand Out with Your Profile"
              className={`w-full h-full object-contain rounded-lg transition-opacity duration-300 ${
                imageLoaded.standout ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
              onLoad={() =>
                setImageLoaded((prev) => ({...prev, standout: true}))
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2 shrink-0">
            <h2 className="text-lg font-semibold">
              Stand Out with Your Profile
            </h2>
            <p className="text-base text-muted-foreground">
              A fully completed profile on Badge showcases your expertise and
              achievements to potential clients and collaborators. The more info
              you share, the higher your chances of getting noticed, attracting
              opportunities, and building trust in your professional network.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Insights",
      content: (
        <div className="flex flex-col h-full space-y-4">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center min-h-0 relative">
            {!imageLoaded["grow-reach"] && (
              <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
            )}
            <img
              key="grow-reach"
              src="/start-images/grow-reach.png"
              alt="Grow Your Reach"
              className={`w-full h-full object-contain rounded-lg transition-opacity duration-300 ${
                imageLoaded["grow-reach"] ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
              onLoad={() =>
                setImageLoaded((prev) => ({...prev, "grow-reach": true}))
              }
            />
          </div>
          <div className="space-y-1 shrink-0">
            <h3 className="text-lg font-semibold">Grow Your Reach!</h3>
            <p className="text-base text-muted-foreground">
              Link your social accounts so interested clients and partners can
              see your work and connect with you easily. This helps you capture
              leads, nurture relationships, and expand your network—turning
              connections into real opportunities.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Connect, Showcase, and Convert",
      content: (
        <div className="flex flex-col h-full space-y-4">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center min-h-0 relative">
            {!imageLoaded["connect-convert"] && (
              <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
            )}
            <img
              key="connect-convert"
              src="/start-images/connect-convert.png"
              alt="Connect, Showcase, and Convert"
              className={`w-full h-full object-contain rounded-lg transition-opacity duration-300 ${
                imageLoaded["connect-convert"] ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
              onLoad={() =>
                setImageLoaded((prev) => ({...prev, "connect-convert": true}))
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2 shrink-0">
            <h2 className="text-lg font-semibold">
              Connect, Showcase, and Convert
            </h2>
            <p className="text-base text-muted-foreground">
              Add your social media links and portfolio so potential clients can
              see your work and reach out directly. By showcasing your expertise
              and staying connected, you capture valuable leads, build lasting
              relationships, and turn opportunities into real growth.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Where do you want to start?",
      content: (
        <div className="flex flex-col h-full space-y-4">
          <h2 className="text-xl font-bold shrink-0">
            Where do you want to start?
          </h2>
          <div className="flex h-full items-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 md:gap-y-3 w-full">
              <Link href="/badge-profile" onClick={onComplete}>
                <Card className="py-3 px-2.5 hover:shadow-lg transition-shadow cursor-pointer">
                  <h3 className="text-sm font-semibold mb-2">
                    Complete Badge Profile
                  </h3>
                  <div className="aspect-video flex items-center justify-center mb-4 relative">
                    <div className="w-full h-full p-3.5 bg-muted/80 rounded-lg flex items-center justify-center relative">
                      {!imageLoaded["complete-badge-profile"] && (
                        <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
                      )}
                      <img
                        src="/start-images/complete-badge-profile.svg"
                        alt="Complete Badge Profile"
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          imageLoaded["complete-badge-profile"]
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                        onLoad={() =>
                          setImageLoaded((prev) => ({
                            ...prev,
                            "complete-badge-profile": true
                          }))
                        }
                      />
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/headshot-generator" onClick={onComplete}>
                <Card className="py-3 px-2.5 hover:shadow-lg transition-shadow cursor-pointer">
                  <h3 className="text-sm font-semibold mb-2">
                    Create AI headshot
                  </h3>
                  <div className="aspect-video flex items-center justify-center mb-4 relative">
                    <div className="w-full h-full p-3.5 bg-muted/80 rounded-lg flex items-center justify-center relative">
                      {!imageLoaded["create-ai-headshot"] && (
                        <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
                      )}
                      <img
                        src="/start-images/create-ai-headshot.svg"
                        alt="Create AI headshot"
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          imageLoaded["create-ai-headshot"]
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                        onLoad={() =>
                          setImageLoaded((prev) => ({
                            ...prev,
                            "create-ai-headshot": true
                          }))
                        }
                      />
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/brand-assets" onClick={onComplete}>
                <Card className="py-3 px-2.5 hover:shadow-lg transition-shadow cursor-pointer">
                  <h3 className="text-sm font-semibold mb-2">
                    Create email signature
                  </h3>
                  <div className="aspect-video flex items-center justify-center mb-4 relative">
                    <div className="w-full h-full p-3.5 bg-muted/80 rounded-lg flex items-center justify-center relative">
                      {!imageLoaded["create-email-signature"] && (
                        <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
                      )}
                      <img
                        src="/start-images/create-email-signature.svg"
                        alt="Create email signature"
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          imageLoaded["create-email-signature"]
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                        onLoad={() =>
                          setImageLoaded((prev) => ({
                            ...prev,
                            "create-email-signature": true
                          }))
                        }
                      />
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/brand-assets" onClick={onComplete}>
                <Card className="py-3 px-2.5 hover:shadow-lg transition-shadow cursor-pointer">
                  <h3 className="text-sm font-semibold mb-2">
                    Create zoom background
                  </h3>
                  <div className="aspect-video flex items-center justify-center mb-4 relative">
                    <div className="w-full h-full p-3.5 bg-muted/80 rounded-lg flex items-center justify-center relative">
                      {!imageLoaded["create-zoom-background"] && (
                        <Skeleton className="w-full h-full rounded-lg absolute inset-0" />
                      )}
                      <img
                        src="/start-images/create-zoom-background.svg"
                        alt="Create zoom background"
                        className={`w-full h-full object-contain transition-opacity duration-300 ${
                          imageLoaded["create-zoom-background"]
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                        onLoad={() =>
                          setImageLoaded((prev) => ({
                            ...prev,
                            "create-zoom-background": true
                          }))
                        }
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-xl w-full flex flex-col p-6"
        hideCloseButton
      >
        {/* Step Content - Scrollable if needed */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div key={currentStep} className="h-full flex flex-col">
            {steps[currentStep].content}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex mt-4 shrink-0">
          {currentStep < steps.length - 1 ? (
            <>
              <Button className="w-full" onClick={handleNext}>
                Next
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <Link href="/" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onComplete}
                >
                  Skip to dashboard
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const StartPage = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();
  const {toast} = useToast();

  // Check if user has completed onboarding
  const {data: user, isLoading: isUserLoading} = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null; // User not authenticated
          }
          return null;
        }

        const responseData = await response.json();
        // Extract user data from response (could be nested or direct)
        return responseData.user || responseData;
      } catch (err) {
        console.error("[StartPage] Error fetching user:", err);
        return null;
      }
    },
    retry: false,
    staleTime: 0 // Always fetch fresh data to check onboarding status
  });

  useEffect(() => {
    // Don't show onboarding while loading
    if (isUserLoading) {
      return;
    }

    // Show onboarding if user exists and hasn't completed it
    // Check both camelCase and snake_case versions
    const onboardingComplete =
      user?.onboardingComplete ?? user?.onboarding_complete;

    if (
      user &&
      (onboardingComplete === false ||
        onboardingComplete === null ||
        onboardingComplete === undefined)
    ) {
      // Redirect to profile setup instead of showing modal
      window.location.href = "/profile/setup?onboarding=true";
    } else {
      setShowOnboarding(false);
    }
  }, [user, isUserLoading]);

  const handleOnboardingComplete = async () => {
    try {
      const response = await fetch("/api/users/profile/settings", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          onboardingComplete: true
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update onboarding status");
      }

      const updatedUser = await response.json();

      // Update the user in the query cache
      queryClient.setQueryData(["user"], updatedUser);

      setShowOnboarding(false);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to save onboarding status. Please try again.",
        variant: "destructive"
      });
      // Still close the modal even if the API call fails
      setShowOnboarding(false);
    }
  };

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
};

export default StartPage;
