import React, {useEffect, useMemo, useState} from "react";
import {useLocation} from "wouter";
import {Button} from "@/components/ui/button";
import {Form} from "@/components/ui/form";
import {StepProgress} from "@/components/ui/step-progress";
import {ChevronLeft, Loader2} from "lucide-react";
import {ProfilePreview} from "@/components/badge-profile/ProfilePreview";
import {useProfileSetup} from "@/hooks/use-profile-setup";
import {validateStep, canSkipStep} from "@/utils/profile-setup-utils";
import {useToast} from "@/hooks/use-toast";
import {useQuery} from "@tanstack/react-query";

// Step Components
import {ProfilePhotoStep} from "@/components/profile-setup/ProfilePhotoStep";
import {AboutMeStep} from "@/components/profile-setup/AboutMeStep";
import {SocialLinksStep} from "@/components/profile-setup/SocialLinksStep";
import {QuickActionsStep} from "@/components/profile-setup/QuickActionsStep";
import {ResourcesStep} from "@/components/profile-setup/ResourcesStep";
import {AnnouncementsStep} from "@/components/profile-setup/AnnouncementsStep";
import {EmbedStep} from "@/components/profile-setup/EmbedStep";

const TOTAL_STEPS = 7;

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const {toast} = useToast();
  const [searchParams] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  const isOnboarding = searchParams.get("onboarding") === "true";
  const returnPath = searchParams.get("return") || "/badge-profile";
  const initialStep = parseInt(searchParams.get("step") || "1", 10);

  const {
    form,
    step,
    setStep,
    isSaving,
    isProfileLoading,
    badgeProfileData,
    setProfileImageFile,
    profileImagePreview,
    setProfileImagePreview,
    saveStep,
    completeOnboarding
  } = useProfileSetup();

  // Set initial step from query param
  useEffect(() => {
    if (initialStep >= 1 && initialStep <= TOTAL_STEPS) {
      setStep(initialStep as any);
    }
  }, [initialStep, setStep]);

  // Fetch organization data for preview
  const {data: organization} = useQuery({
    queryKey: ["/api/organizations/current"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/organizations/current", {
          credentials: "include"
        });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    enabled: !isProfileLoading
  });

  // Get preview data from form
  const previewData = useMemo(() => {
    const formData = form.getValues();
    const userProfile = badgeProfileData?.userProfile || {};
    const settings = badgeProfileData?.settings || {};

    return {
      userProfile: {
        ...userProfile,
        profileImage:
          profileImagePreview ||
          formData.profileImage ||
          userProfile.profileImage ||
          null,
        bio: formData.bio || userProfile.bio || "",
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        title: userProfile.title || "",
        email: userProfile.email || ""
      },
      background: formData.background || settings.background || null,
      quickLinks: formData.socialLinks || settings.quickLinks || [],
      quickActions: formData.quickActions || []
    };
  }, [
    form.watch("profileImage"),
    form.watch("bio"),
    form.watch("background"),
    form.watch("socialLinks"),
    form.watch("quickActions"),
    profileImagePreview,
    badgeProfileData
  ]);

  // Handle profile image file selection
  const handleProfileImageSelect = (file: File) => {
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle continue/next
  const handleContinue = async () => {
    const formData = form.getValues();

    // Validate current step
    if (!validateStep(step, formData)) {
      toast({
        title: "Please complete all required fields",
        description: "Fill in all required information before continuing.",
        variant: "destructive"
      });
      return;
    }

    // Save current step
    const saved = await saveStep(step);
    if (!saved) {
      return;
    }

    // For final step, wait a bit to ensure data is persisted
    if (step === TOTAL_STEPS) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Move to next step or complete
    if (step < TOTAL_STEPS) {
      setStep((step + 1) as any);
    } else {
      // Final step - complete onboarding if needed
      if (isOnboarding) {
        const completed = await completeOnboarding();
        if (completed) {
          // Wait a bit more to ensure all data is saved
          await new Promise((resolve) => setTimeout(resolve, 500));
          setLocation("/");
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setLocation(returnPath);
      }
    }
  };

  // Handle skip
  const handleSkip = async () => {
    if (step < TOTAL_STEPS) {
      setStep((step + 1) as any);
    } else {
      // Final step
      if (isOnboarding) {
        const completed = await completeOnboarding();
        if (completed) {
          setLocation("/");
        }
      } else {
        setLocation(returnPath);
      }
    }
  };

  // Handle back
  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as any);
    }
  };

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <ProfilePhotoStep
            form={form}
            profileImagePreview={profileImagePreview}
            onProfileImageSelect={handleProfileImageSelect}
          />
        );
      case 2:
        return <AboutMeStep form={form} />;
      case 3:
        return <SocialLinksStep form={form} />;
      case 4:
        return <QuickActionsStep form={form} />;
      case 5:
        return <ResourcesStep form={form} />;
      case 6:
        return <AnnouncementsStep form={form} />;
      case 7:
        return <EmbedStep form={form} />;
      default:
        return null;
    }
  };

  // Get button text
  const getButtonText = () => {
    if (isSaving) {
      return "Saving...";
    }
    if (step === TOTAL_STEPS) {
      return isOnboarding ? "Complete" : "Done";
    }
    return "Next";
  };

  const canGoBack = step > 1;
  const showSkipButton = canSkipStep() && step < TOTAL_STEPS;

  // Build background style for preview
  const getBackgroundStyle = (): React.CSSProperties => {
    const background = previewData.background;
    if (!background) return {};

    if (background.type === "preset") {
      const preset = background.preset || "";
      
      // Handle gradient presets
      const gradientMap: Record<string, string> = {
        "gradient-1": "linear-gradient(to right, #bfdbfe, #bbf7d0)",
        "gradient-2": "linear-gradient(to right, #e9d5ff, #bfdbfe)",
        "gradient-3": "linear-gradient(to right, #fef3c7, #fed7aa)",
        "gradient-4": "linear-gradient(to right, #bbf7d0, #fef3c7)",
        "gradient-5": "linear-gradient(to right, #4ade80, #bbf7d0)",
        "gradient-6": "linear-gradient(to right, #facc15, #bbf7d0)",
        "gradient-7": "linear-gradient(to right, #fed7aa, #fef3c7)",
        "gradient-8": "linear-gradient(to right, #fbcfe8, #fed7aa)"
      };
      
      // Handle solid color presets
      const solidColorMap: Record<string, string> = {
        "solid-gray": "#f3f4f6",
        "solid-green": "#dcfce7",
        "solid-blue": "#e0f2fe",
        "solid-yellow": "#fef9c3"
      };
      
      // Check for gradient first
      if (gradientMap[preset]) {
        return {background: gradientMap[preset]};
      }
      
      // Check for solid color
      if (solidColorMap[preset]) {
        return {background: solidColorMap[preset]};
      }
    }

    if (background.type === "custom" && background.customUrl) {
      return {
        backgroundImage: `url(${background.customUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      };
    }

    return {};
  };

  // Build sections for preview (include quick actions, resources, announcements, embeds)
  const getSections = () => {
    const formData = form.getValues();
    const sections = badgeProfileData?.settings?.sections || [];
    let updatedSections = [...sections];

    // Update/add quick actions section
    if (formData.quickActions && formData.quickActions.length > 0) {
      const quickActionsSection = updatedSections.find(
        (s: any) => s.type === "quick_actions"
      );
      if (quickActionsSection) {
        updatedSections = updatedSections.map((s: any) =>
          s.type === "quick_actions"
            ? {
                ...s,
                content: {
                  ...s.content,
                  actions: formData.quickActions
                }
              }
            : s
        );
      } else {
        updatedSections.push({
          id: `section-${Date.now()}`,
          type: "quick_actions",
          name: "Get in touch",
          anchor: "get-in-touch",
          isVisible: true,
          order: updatedSections.length,
          content: {
            title: "Get in touch",
            actions: formData.quickActions
          }
        });
      }
    }

    // Update/add resources section
    if (formData.resources && formData.resources.length > 0) {
      const resourcesSection = updatedSections.find(
        (s: any) => s.type === "resources"
      );
      if (resourcesSection) {
        updatedSections = updatedSections.map((s: any) =>
          s.type === "resources"
            ? {
                ...s,
                content: {
                  ...s.content,
                  resources: formData.resources
                }
              }
            : s
        );
      } else {
        updatedSections.push({
          id: `section-resources-${Date.now()}`,
          type: "resources",
          name: "Resources",
          anchor: "resources",
          isVisible: true,
          order: updatedSections.length,
          content: {
            title: "Resources",
            resources: formData.resources
          }
        });
      }
    }

    // Update/add announcement (CTA) sections
    if (formData.announcements && formData.announcements.length > 0) {
      // Remove existing CTA sections
      updatedSections = updatedSections.filter((s: any) => s.type !== "cta");
      // Add new CTA sections from announcements
      formData.announcements.forEach((announcement, index) => {
        updatedSections.push({
          id: announcement.id || `section-cta-${Date.now()}-${index}`,
          type: "cta",
          name: announcement.title || "Announcement",
          anchor: `announcement-${index}`,
          isVisible: true,
          order: updatedSections.length,
          content: {
            title: announcement.title,
            description: announcement.description,
            buttonText: announcement.buttonText,
            buttonLink: announcement.buttonLink,
            backgroundColor: announcement.backgroundColor || "white",
            customBackgroundColor: announcement.customBackgroundColor,
            buttonColor: announcement.buttonColor || "brand",
            customButtonColor: announcement.customButtonColor,
            template: announcement.template || "text-only",
            image: announcement.image
          }
        });
      });
    }

    // Update/add embed sections
    if (formData.embeds && formData.embeds.length > 0) {
      // Remove existing embed sections
      updatedSections = updatedSections.filter((s: any) => s.type !== "embed");
      // Add new embed sections
      formData.embeds.forEach((embed, index) => {
        updatedSections.push({
          id: embed.id || `section-embed-${Date.now()}-${index}`,
          type: "embed",
          name: embed.title || "Embed",
          anchor: `embed-${index}`,
          isVisible: true,
          order: updatedSections.length,
          content: {
            title: embed.title,
            description: embed.description,
            embedUrl: embed.embedUrl,
            embedType: embed.embedType || "video",
            embedCode: embed.embedCode
          }
        });
      });
    }

    return updatedSections;
  };

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="p-8">
            <div className="mb-6">
              <StepProgress
                currentStep={step}
                totalSteps={TOTAL_STEPS}
                className="w-full"
              />
            </div>

            <div>
              {canGoBack && (
                <ChevronLeft
                  className="-ml-2 h-6 w-6 cursor-pointer text-primary hover:text-primary/80 transition-all duration-200"
                  onClick={handleBack}
                />
              )}

              <Form {...form}>
                <div className="space-y-5">
                  {renderStep()}

                  <div className="flex flex-col justify-between pt-5">
                    <Button
                      type="button"
                      onClick={handleContinue}
                      className="w-full"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {getButtonText()}
                        </>
                      ) : (
                        getButtonText()
                      )}
                    </Button>

                    {showSkipButton && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSkip}
                        className="w-full mt-3"
                        disabled={isSaving}
                      >
                        Skip for now
                      </Button>
                    )}
                  </div>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Preview */}
      <div className="hidden lg:flex flex-1 bg-muted relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gradient-to-r from-cyan-300 to-blue-600 font-semibold p-1 rounded-full">
            <span className="flex w-full bg-white text-black p-2 rounded-full items-center">
              built with{" "}
              <span>
                <img
                  src="/light-mode-logo.svg"
                  alt="Badge"
                  className="h-5 ml-1 mt-1"
                />
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 w-full h-full">
          <ProfilePreview
            userProfile={previewData.userProfile}
            organization={organization}
            quickLinks={previewData.quickLinks as any}
            sections={getSections()}
            backgroundStyle={getBackgroundStyle()}
            backgroundImage={
              previewData.background?.type === "custom"
                ? previewData.background.customUrl || undefined
                : undefined
            }
            backgroundSettings={previewData.background}
            onOpenExternal={() => {}}
            className="w-full h-full max-w-4xl"
            buttonColor={organization?.defaultColor || "#3b82f6"}
            iconColor={organization?.defaultColor || "#3b82f6"}
            isRegister={true}
          />
        </div>
      </div>
    </div>
  );
}
