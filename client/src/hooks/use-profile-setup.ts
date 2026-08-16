import {useState, useEffect, useCallback} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {
  profileSetupSchema,
  ProfileSetupFormData
} from "@/schemas/profile-setup";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/use-auth";
import {QuickLink} from "@/components/badge-profile/QuickLinks";
import {QuickAction} from "@/shared/types/sections";

export type ProfileSetupStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const useProfileSetup = () => {
  const {user} = useAuth();
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ProfileSetupStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  // Fetch existing profile data
  const {data: badgeProfileData, isLoading: isProfileLoading} = useQuery({
    queryKey: ["/api/badge-profile"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/badge-profile", {
          credentials: "include"
        });
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching profile data:", error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 0
  });

  const form = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      profileImage: null,
      background: null,
      bio: "",
      socialLinks: [],
      quickActions: [],
      resources: [],
      announcements: [],
      embeds: []
    },
    mode: "onChange"
  });

  // Load existing data into form
  useEffect(() => {
    if (badgeProfileData && !isProfileLoading) {
      const userProfile = badgeProfileData.userProfile;
      const settings = badgeProfileData.settings;

      // Set profile image
      if (userProfile?.profileImage) {
        form.setValue("profileImage", userProfile.profileImage);
      }

      // Set background (from badgeProfileData.background which comes from settings.theme.background)
      if (badgeProfileData?.background) {
        form.setValue("background", badgeProfileData.background);
      }

      // Set bio
      if (userProfile?.bio) {
        form.setValue("bio", userProfile.bio);
      }

      // Set social links (quickLinks)
      if (settings?.quickLinks && Array.isArray(settings.quickLinks)) {
        form.setValue(
          "socialLinks",
          settings.quickLinks.map((link: QuickLink) => ({
            id: link.id,
            label: link.label,
            url: link.url,
            type: link.type as any,
            isVisible: link.isVisible !== false
          }))
        );
      }

      // Set quick actions (from sections)
      if (settings?.sections && Array.isArray(settings.sections)) {
        const quickActionsSection = settings.sections.find(
          (section: any) => section.type === "quick_actions"
        );
        if (quickActionsSection?.content?.actions) {
          form.setValue(
            "quickActions",
            quickActionsSection.content.actions.map((action: QuickAction) => ({
              id: action.id,
              label: action.label,
              url: action.url,
              type: action.type,
              icon: action.icon,
              settings: action.settings
            }))
          );
        }

        // Set resources (from resources section)
        const resourcesSection = settings.sections.find(
          (section: any) => section.type === "resources"
        );
        if (resourcesSection?.content?.resources) {
          form.setValue(
            "resources",
            resourcesSection.content.resources.map((resource: any) => ({
              id: resource.id,
              title: resource.title || resource.name || "",
              description: resource.description || "",
              type: resource.type || "url",
              url: resource.url || "",
              thumbnail: resource.thumbnail
            }))
          );
        }

        // Set announcements (from CTA sections)
        const ctaSections = settings.sections.filter(
          (section: any) => section.type === "cta"
        );
        if (ctaSections.length > 0) {
          form.setValue(
            "announcements",
            ctaSections.map((section: any) => ({
              id: section.id,
              title: section.content?.title || section.name || "",
              description: section.content?.description || "",
              buttonText: section.content?.buttonText || "",
              buttonLink: section.content?.buttonLink || "",
              backgroundColor: section.content?.backgroundColor || "white",
              customBackgroundColor: section.content?.customBackgroundColor,
              buttonColor: section.content?.buttonColor || "brand",
              customButtonColor: section.content?.customButtonColor,
              template: section.content?.template || "text-only",
              image: section.content?.image
            }))
          );
        }

        // Set embeds (from embed sections)
        const embedSections = settings.sections.filter(
          (section: any) => section.type === "embed"
        );
        if (embedSections.length > 0) {
          form.setValue(
            "embeds",
            embedSections.map((section: any) => ({
              id: section.id,
              title: section.content?.title || "",
              description: section.content?.description || "",
              embedUrl: section.content?.embedUrl || "",
              embedType: section.content?.embedType || "video",
              embedCode: section.content?.embedCode
            }))
          );
        }
      }
    }
  }, [badgeProfileData, isProfileLoading, form]);

  // Save profile image
  const saveProfileImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/db-images/upload?type=profile", {
          method: "POST",
          body: formData,
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Failed to upload profile image");
        }

        const data = await response.json();

        // Update user profile with image ID
        const profileResponse = await fetch("/api/users/profile/image", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({dbImageId: data.id})
        });

        if (!profileResponse.ok) {
          throw new Error("Failed to update profile image");
        }

        const profileData = await profileResponse.json();
        return profileData.user?.profileImage || data.url || null;
      } catch (error) {
        console.error("Error saving profile image:", error);
        throw error;
      }
    },
    []
  );

  // Helper function to build all sections from form data
  const buildAllSections = async (formData: ProfileSetupFormData) => {
    // Fetch latest sections to preserve any existing sections not in form data
    const latestResponse = await fetch("/api/badge-profile", {
      credentials: "include"
    });
    const latestData = latestResponse.ok ? await latestResponse.json() : null;
    let allSections = latestData?.settings?.sections || [];

    // Remove sections that we're managing in the form (quick_actions, resources, cta, embed)
    allSections = allSections.filter(
      (s: any) =>
        s.type !== "quick_actions" &&
        s.type !== "resources" &&
        s.type !== "cta" &&
        s.type !== "embed"
    );

    // Add quick actions section if present
    if (formData.quickActions && formData.quickActions.length > 0) {
      const quickActionsSection = {
        id: `section-quick-actions-${Date.now()}`,
        type: "quick_actions",
        name: "Get in touch",
        anchor: "get-in-touch",
        isVisible: true,
        order: allSections.length,
        content: {
          title: "Get in touch",
          actions: formData.quickActions
        }
      };
      allSections.push(quickActionsSection);
    }

    // Add resources section if present
    if (formData.resources && formData.resources.length > 0) {
      const resourcesSection = {
        id: `section-resources-${Date.now()}`,
        type: "resources",
        name: "Resources",
        anchor: "resources",
        isVisible: true,
        order: allSections.length,
        content: {
          title: "Resources",
          resources: formData.resources
        }
      };
      allSections.push(resourcesSection);
    }

    // Add announcement (CTA) sections if present
    if (formData.announcements && formData.announcements.length > 0) {
      formData.announcements.forEach((announcement, index) => {
        const ctaSection = {
          id: announcement.id || `section-cta-${Date.now()}-${index}`,
          type: "cta",
          name: announcement.title || "Announcement",
          anchor: `announcement-${index}`,
          isVisible: true,
          order: allSections.length + index,
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
        };
        allSections.push(ctaSection);
      });
    }

    // Add embed sections if present
    if (formData.embeds && formData.embeds.length > 0) {
      formData.embeds.forEach((embed, index) => {
        const embedSection = {
          id: embed.id || `section-embed-${Date.now()}-${index}`,
          type: "embed",
          name: embed.title || "Embed",
          anchor: `embed-${index}`,
          isVisible: true,
          order: allSections.length + index,
          content: {
            title: embed.title,
            description: embed.description,
            embedUrl: embed.embedUrl,
            embedType: embed.embedType || "video",
            embedCode: embed.embedCode
          }
        };
        allSections.push(embedSection);
      });
    }

    return allSections;
  };

  // Save current step data
  const saveStep = useCallback(
    async (stepToSave: ProfileSetupStep) => {
      setIsSaving(true);
      try {
        const formData = form.getValues();

        // Save profile image if uploaded
        if (profileImageFile) {
          const imageUrl = await saveProfileImage(profileImageFile);
          if (imageUrl) {
            form.setValue("profileImage", imageUrl);
            setProfileImageFile(null);
            setProfileImagePreview(null);
          }
        }

        // Save based on step
        switch (stepToSave) {
          case 1: {
            // Save background - use /api/badge-profile endpoint
            if (formData.background) {
              const response = await fetch("/api/badge-profile", {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  background: formData.background
                })
              });

              if (!response.ok) {
                throw new Error("Failed to save background");
              }
            }
            break;
          }
          case 2: {
            // Save bio
            if (formData.bio !== undefined) {
              const response = await fetch("/api/users/profile/settings", {
                method: "PATCH",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  bio: formData.bio
                })
              });

              if (!response.ok) {
                throw new Error("Failed to save bio");
              }
            }
            break;
          }
          case 3: {
            // Save social links (quickLinks) - use /api/badge-profile endpoint
            if (formData.socialLinks) {
              // Use /api/badge-profile endpoint which handles quickLinks
              const response = await fetch("/api/badge-profile", {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  quickLinks: formData.socialLinks
                })
              });

              if (!response.ok) {
                throw new Error("Failed to save social links");
              }
            }
            break;
          }
          case 4:
          case 5:
          case 6:
          case 7: {
            // For steps 4-7, build all sections from form data and save together
            // This ensures we don't lose sections from previous steps
            const allSections = await buildAllSections(formData);

            // Use /api/badge-profile endpoint which handles sections
            const response = await fetch("/api/badge-profile", {
              method: "PUT",
              credentials: "include",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                sections: allSections
              })
            });

            if (!response.ok) {
              throw new Error(`Failed to save step ${stepToSave}`);
            }
            break;
          }
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({queryKey: ["/api/badge-profile"]});
        queryClient.invalidateQueries({queryKey: ["user"]});

        // Refetch to ensure we have latest data
        await queryClient.refetchQueries({queryKey: ["/api/badge-profile"]});

        return true;
      } catch (error) {
        console.error("Error saving step:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to save changes. Please try again.",
          variant: "destructive"
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      form,
      profileImageFile,
      saveProfileImage,
      badgeProfileData,
      queryClient,
      toast
    ]
  );

  // Mark onboarding as complete
  const completeOnboarding = useCallback(async () => {
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
        throw new Error("Failed to complete onboarding");
      }

      queryClient.invalidateQueries({queryKey: ["user"]});
      queryClient.invalidateQueries({queryKey: ["/api/badge-profile"]});

      return true;
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [queryClient, toast]);

  return {
    form,
    step,
    setStep,
    isSaving,
    isProfileLoading,
    badgeProfileData,
    profileImageFile,
    setProfileImageFile,
    profileImagePreview,
    setProfileImagePreview,
    saveStep,
    completeOnboarding
  };
};
