import {useState, useEffect, useRef} from "react";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/use-auth";
import {apiRequest} from "@/lib/queryClient";
import {useLocation} from "wouter";
import {
  Section as BaseSection,
  SectionType,
  SectionTypeEnum,
  createDefaultSection
} from "@/shared/types/sections";
import {UserProfile} from "@/types/user";

// Components
import {SectionEditor} from "@/components/badge-profile/SectionEditor";
// QuickActionsManager replaced with inline editing
import {AddSectionDialog} from "@/components/badge-profile/modals/AddSectionDialog";
import {AddQuickLinkDialog} from "@/components/badge-profile/modals/AddQuickLinkDialog";
import {EditQuickLinkDialog} from "@/components/badge-profile/modals/EditQuickLinkDialog";
import {QuickLink} from "@/components/badge-profile/QuickLinks";
import {QRCodeDisplay, QRCodeDisplayRef} from "@/components/qr-code-display";
import {ProfilePreview} from "@/components/badge-profile/ProfilePreview";
import {
  PhoneBackgroundGenerator,
  PhoneBackgroundGeneratorRef
} from "@/components/badge-profile/PhoneBackgroundGenerator";
import {Page} from "@/components/badge-profile/SectionNavigation";
import {ManageTabsModal} from "@/components/badge-profile/modals/ManageTabsModal";
import {TabItem} from "@/components/badge-profile/SettingsTab";

// UI Components
import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Download, QrCode, Smartphone} from "lucide-react";

// Interface definitions
interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  defaultColor?: string | null;
  domain?: string | null;
  socialProfiles?: Record<string, any> | null;
  phone?: string | null;
  linkedinProfile?: string | null;
  qrLogoUrl?: string | null;
  qrCodeColor?: string | null;
}

// Extend the Section type to include pageId
interface Section extends BaseSection {
  pageId?: string;
}

// Import GlobalChatSettings from shared types
import {GlobalChatSettings} from "@shared/types/chat";
import {LeadSettings, DEFAULT_LEAD_SETTINGS} from "@/shared/types/lead";

interface PageSettings {
  background: {
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  } | null;
  quickLinks: QuickLink[];
  sections: Section[];
  pages: Page[];
  colors?: {
    useOrgDefault?: boolean;
    buttonColor?: string;
    iconColor?: string;
  };
  branding?: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  };
  chatSettings?: GlobalChatSettings;
  leadSettings?: LeadSettings;
}

// Update the BadgeProfileResponse interface to include pages
interface BadgeProfileResponse {
  background: {
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  } | null;
  quickLinks: QuickLink[];
  sections: Section[];
  userProfile: UserProfile;
  organization: Organization | null;
  chatSettings?: GlobalChatSettings;
  leadSettings?: LeadSettings;
  pages?: Page[]; // Add pages to the response type
  branding?: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  };
  colors?: {
    buttonColor: string;
    iconColor: string;
    useOrgDefault?: boolean;
  };
}

// Generate a simple random ID
const generateRandomId = () => Math.random().toString(36).substring(2, 15);

// Update the createDefaultSectionWithPage function to use a parameter for settings and activePageId
const createDefaultSectionWithPage = (
  sectionType: SectionType,
  id: string | number,
  pageId?: string,
  currentSettings?: PageSettings,
  currentActivePageId?: string
): Section => {
  // Get the base section from the original function
  const baseSection = createDefaultSection(sectionType, id);

  // Use provided pageId, or activePageId, or first page id from settings, or generate a new one
  const actualPageId =
    pageId ||
    currentActivePageId ||
    (currentSettings?.pages && currentSettings.pages.length > 0
      ? currentSettings.pages[0].id
      : generateRandomId());

  // Add the pageId
  return {
    ...baseSection,
    pageId: actualPageId
  };
};

export default function BadgeProfile() {
  const {user} = useAuth();
  const {toast} = useToast();
  const queryClient = useQueryClient();

  // Ref to track if we've already processed the section parameter
  const processedSectionRef = useRef(false);

  // State management
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [addSectionAfterId, setAddSectionAfterId] = useState<
    string | number | null
  >(null);
  const [showAddQuickLinkDialog, setShowAddQuickLinkDialog] = useState(false);
  const [showEditQuickLinkDialog, setShowEditQuickLinkDialog] = useState(false);
  const [editingQuickLink, setEditingQuickLink] = useState<QuickLink | null>(
    null
  );
  const [editingSectionId, setEditingSectionId] = useState<
    string | number | null
  >(null);
  const [activeSectionId, setActiveSectionId] = useState<
    string | number | null
  >(null);

  // State for the QR code sharing modal
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);

  // State for the manage tabs modal
  const [manageTabsModalOpen, setManageTabsModalOpen] = useState(false);

  // Ref for QR code display component to trigger download
  const qrCodeDisplayRef = useRef<QRCodeDisplayRef>(null);

  // Ref for phone background generator component to trigger download
  const phoneBackgroundRef = useRef<PhoneBackgroundGeneratorRef>(null);

  // State for controlling ProfilePreview tabs and SettingsTab sections
  const [activeProfileTab, setActiveProfileTab] = useState<
    "content" | "settings"
  >("content");
  const [openSettingsSections, setOpenSettingsSections] = useState<{
    branding?: boolean;
    aiChat?: boolean;
    leadGeneration?: boolean;
    pageVisibility?: boolean;
  }>({
    branding: true,
    aiChat: false,
    leadGeneration: false,
    pageVisibility: false
  });

  // New state for page management
  const [activePageId, setActivePageId] = useState<string>("");

  // No longer need separate state for managing quick actions - now done inline
  const [settings, setSettings] = useState<PageSettings>({
    background: {type: "preset", preset: "gradient-1"},
    quickLinks: [],
    sections: [],
    pages: []
  });

  // Add local userProfile state to sync with ProfilePreview
  const [userProfileState, setUserProfileState] = useState<UserProfile | null>(
    null
  );

  // Add local organization state to sync with ProfilePreview
  const [organizationState, setOrganizationState] =
    useState<Organization | null>(null);

  // Get current location from wouter
  const [location] = useLocation();

  // Function to handle section expansion based on URL parameter
  const handleSectionFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get("section");
    console.log("Processing section parameter:", sectionParam);

    if (sectionParam === "leadGeneration" && !processedSectionRef.current) {
      console.log("Lead Generation section detected, activating settings tab");
      // Mark as processed to avoid duplicate handling
      processedSectionRef.current = true;

      // Force switch to settings tab first
      setActiveProfileTab("settings");
      console.log("Set activeProfileTab to 'settings'");

      // Then open the leadGeneration section with a slight delay
      setTimeout(() => {
        setOpenSettingsSections((prev) => {
          console.log("Setting leadGeneration to true in openSettingsSections");
          return {
            ...prev,
            leadGeneration: true
          };
        });

        // Scroll to the leadGeneration section after another delay
        setTimeout(() => {
          console.log("Attempting to scroll to leadGeneration section");
          // Find all divs and check for the data-section attribute
          const elements = document.getElementsByTagName("div");
          let found = false;
          for (let i = 0; i < elements.length; i++) {
            if (elements[i].getAttribute("data-section") === "leadGeneration") {
              console.log("Found leadGeneration section, scrolling");
              elements[i].scrollIntoView({behavior: "smooth", block: "start"});
              found = true;
              break;
            }
          }
          if (!found) {
            console.log("leadGeneration section not found in DOM");
          }
        }, 300);
      }, 100);
    }
  };

  // Check for URL query parameters to control section expansion
  useEffect(() => {
    console.log("Location changed:", location);
    handleSectionFromUrl();
  }, [location]); // Re-run effect when location changes

  // Query to fetch organization data
  const {data: organization, isLoading: isOrganizationLoading} =
    useQuery<Organization>({
      queryKey: ["/api/organization"],
      enabled: !!user
    });

  // Query to fetch subscription status for Pro features
  const {data: subscriptionData} = useQuery({
    queryKey: ["/api/payments/subscription-status"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/payments/subscription-status");
        return response;
      } catch (err) {
        console.error("Error fetching subscription status:", err);
        return {subscriptionStatus: "free", planType: "free"};
      }
    },
    enabled: !!user,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Query to fetch badge profile settings
  const {data: badgeProfileData, isLoading: isUserLoading} =
    useQuery<BadgeProfileResponse>({
      queryKey: ["/api/badge-profile"],
      queryFn: async () => {
        try {
          // First try debug endpoint to understand user ID issues
          console.log("Trying debug endpoint first...");
          const debugResponse = await apiRequest("/api/debug/user-session");
          console.log("Debug user session:", debugResponse);
        } catch (error) {
          console.error("Debug endpoint error:", error);
        }

        // Now try the badge profile endpoint
        const response = await apiRequest("/api/badge-profile");
        return response as BadgeProfileResponse;
      },
      enabled: !!user
    });

  // Handle the case when the component first mounts and data is loaded
  useEffect(() => {
    // Only run this effect when badgeProfileData is loaded
    if (badgeProfileData && !processedSectionRef.current) {
      console.log("Badge profile data loaded, checking for section parameter");
      handleSectionFromUrl();
    }
  }, [badgeProfileData]);

  // Get banner data for BannerDisplay component
  const getBannerData = () => {
    if (
      settings.background?.type === "banner" &&
      settings.background.customBannerId &&
      user?.bannerSettings
    ) {
      const savedBanners = user.bannerSettings?.savedBanners || [];
      const banner = savedBanners.find(
        (b: any) => b.id === settings.background?.customBannerId
      );
      return banner || null;
    }
    return null;
  };

  // Generate background style
  const getBackgroundStyle = () => {
    if (!settings.background) return {};

    // For banner type, return a simple background since BannerDisplay will handle the banner
    if (settings.background.type === "banner") {
      return {background: "#ffffff"};
    }

    if (
      settings.background.type === "custom" &&
      settings.background.customUrl
    ) {
      return {
        backgroundImage: `url(${settings.background.customUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      };
    }

    console.log(user);

    // Return preset styles
    switch (settings.background.preset) {
      case "gradient-1":
        return {background: "linear-gradient(to right, #e0f2fe, #a5f3fc)"};
      case "gradient-2":
        return {background: "linear-gradient(to right, #f3e8ff, #fce7f3)"};
      case "gradient-3":
        return {background: "linear-gradient(to right, #dcfce7, #d9f99d)"};
      case "gradient-4":
        return {background: "linear-gradient(to right, #fef9c3, #fde68a)"};
      case "solid-gray":
        return {background: "#f3f4f6"};
      case "solid-green":
        return {background: "#dcfce7"};
      case "solid-blue":
        return {background: "#e0f2fe"};
      case "solid-yellow":
        return {background: "#fef9c3"};
      default:
        return {background: "#ffffff"};
    }
  };

  // Update settings with badge profile data if available
  useEffect(() => {
    if (badgeProfileData) {
      console.log("Setting up badge profile data:", badgeProfileData);

      // Set userProfile state for preview synchronization
      if (badgeProfileData.userProfile) {
        setUserProfileState(badgeProfileData.userProfile);
      }

      // Set organization state for preview synchronization
      if (badgeProfileData.organization) {
        setOrganizationState(badgeProfileData.organization as Organization);
      }

      // Helper function to migrate legacy fixed page IDs to random IDs if needed
      const convertSectionsToTypedSections = (
        sections: any[] = []
      ): Section[] => {
        return sections.map((section) => {
          // Keep the original pageId - we'll validate and fix it later in migration
          const pageId = section.pageId || "";

          // Convert the type to a valid SectionType
          const sectionType = section.type as SectionType;

          // Create base content object based on section type
          let content;

          if (sectionType === SectionTypeEnum.QUICK_ACTIONS) {
            content = {
              title: section.content?.title || "Connect With Me",
              description: section.content?.description || "",
              buttonText: section.content?.buttonText || "",
              buttonLink: section.content?.buttonLink || "",
              status: section.content?.status || "sample",
              actions: section.content?.actions || []
            };
          } else if (sectionType === SectionTypeEnum.RESOURCES) {
            content = {
              title: section.content?.title || "Featured Resources",
              description: section.content?.description || "",
              buttonText: section.content?.buttonText || "",
              buttonLink: section.content?.buttonLink || "",
              status: section.content?.status || "sample",
              resources: section.content?.resources || []
            };
          } else if (sectionType === SectionTypeEnum.CTA) {
            content = {
              title: section.content?.title || "Call to Action",
              description: section.content?.description || "",
              buttonText: section.content?.buttonText || "Learn More",
              buttonLink: section.content?.buttonLink || "#",
              status: section.content?.status || "sample",
              // Support for both new fields and legacy theme
              theme: section.content?.theme || "default",
              backgroundColor: section.content?.backgroundColor || "white",
              customBackgroundColor:
                section.content?.customBackgroundColor || "",
              buttonColor: section.content?.buttonColor || "brand",
              customButtonColor: section.content?.customButtonColor || "",
              template: section.content?.template || "text-only",
              iconLeft: section.content?.iconLeft || "file",
              image: section.content?.image || undefined
            };
          } else if (sectionType === SectionTypeEnum.EMBED) {
            content = {
              title: section.content?.title || "Embedded Content",
              description: section.content?.description || "",
              buttonText: section.content?.buttonText || "",
              buttonLink: section.content?.buttonLink || "",
              status: section.content?.status || "sample",
              embedUrl: section.content?.embedUrl || "",
              embedType: section.content?.embedType || "video",
              embedCode: section.content?.embedCode || ""
            };
          } else {
            // Fallback content for any section type
            content = {
              title: section.content?.title || "Section Content",
              description: section.content?.description || "",
              buttonText: section.content?.buttonText || "",
              buttonLink: section.content?.buttonLink || "",
              status: section.content?.status || "sample"
            };
          }

          // Create a properly typed section with appropriate content and pageId
          return {
            id: section.id,
            name: section.name,
            type: sectionType,
            anchor: section.anchor,
            isVisible: section.isVisible,
            order: section.order,
            content: content,
            pageId: pageId // Add pageId to each section
          };
        });
      };

      // Default chat settings to use if none are provided
      const defaultChatSettings: GlobalChatSettings = {
        enabled: false,
        position: "bottom-right",
        bubbleText: "Chat with me",
        welcomeMessage: "Hello! How can I help you today?",
        chatSettings: {
          defaultPrompts: [
            {
              id: "default-1",
              text: "Tell me more about your services",
              order: 0
            },
            {id: "default-2", text: "What experience do you have?", order: 1},
            {id: "default-3", text: "How can we work together?", order: 2}
          ],
          knowledgeSources: [],
          includeProfileData: true,
          model: "gpt-3.5-turbo",
          systemPrompt:
            "You are a helpful assistant representing the profile owner. Answer questions based on their profile information."
        }
      };

      // Default pages if none are provided in the data
      const defaultPages: Page[] = [
        {id: generateRandomId(), name: "Home", privacy: "public"},
        {id: generateRandomId(), name: "About Me", privacy: "public"},
        {id: generateRandomId(), name: "Resources", privacy: "public"}
      ];

      // Set state with data from the badge profile endpoint
      const pages = badgeProfileData.pages || defaultPages;
      const sections = convertSectionsToTypedSections(
        badgeProfileData.sections || []
      );
      const profileSettings = {
        background: badgeProfileData.background || {
          type: "preset",
          preset: "gradient-1"
        },
        quickLinks: badgeProfileData.quickLinks || [],
        pages,
        sections,
        chatSettings: badgeProfileData.chatSettings
          ? {
              ...badgeProfileData.chatSettings,
              enabled: badgeProfileData.chatSettings.enabled === true
            }
          : defaultChatSettings,
        leadSettings: badgeProfileData.leadSettings || DEFAULT_LEAD_SETTINGS,
        branding: badgeProfileData.branding || {},
        colors: badgeProfileData.colors || {}
      };
      setSettings(profileSettings);
    }
  }, [badgeProfileData]);

  // Log when settings change
  useEffect(() => {
    // If pages exist but no active page is selected, select the first page
    if (settings.pages && settings.pages.length > 0 && !activePageId) {
      setActivePageId(settings.pages[0].id);
    }
  }, [settings, activePageId]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: PageSettings) => {
      return apiRequest("/api/badge-profile", {
        method: "PUT",
        body: JSON.stringify({
          background: newSettings.background,
          quickLinks: newSettings.quickLinks,
          sections: newSettings.sections,
          colors: newSettings.colors,
          branding: newSettings.branding,
          chatSettings: newSettings.chatSettings,
          leadSettings: newSettings.leadSettings,
          pages: newSettings.pages
        })
      });
    },
    onSuccess: (data) => {
      // Invalidate the query to refresh data from server
      queryClient.invalidateQueries({queryKey: ["/api/badge-profile"]});
      // Also invalidate the public preview query if it exists
      queryClient.invalidateQueries({queryKey: ["/api/users/badge-profile"]});

      // If the response includes updated settings, update our local state
      // But preserve the background that was just set to ensure preview updates immediately
      if (data && data.settings) {
        setSettings((prevSettings) => ({
          ...prevSettings,
          ...data.settings,
          // Ensure background is preserved from the response or keep current if not in response
          background: data.settings.background || prevSettings.background
        }));
      }

      toast({
        title: "Profile saved",
        description: "Your badge profile has been updated."
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving profile",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  });

  // Separate mutation for quick actions to avoid toast conflicts with modals
  const saveQuickActionsMutation = useMutation({
    mutationFn: async (newSettings: PageSettings) => {
      return apiRequest("/api/badge-profile", {
        method: "PUT",
        body: JSON.stringify({
          background: newSettings.background,
          quickLinks: newSettings.quickLinks,
          sections: newSettings.sections,
          colors: newSettings.colors,
          branding: newSettings.branding,
          chatSettings: newSettings.chatSettings,
          leadSettings: newSettings.leadSettings,
          pages: newSettings.pages
        })
      });
    },
    onSuccess: () => {
      // Don't invalidate queries immediately to avoid re-renders that close modals
      // The data will be updated via local state management
      // No toast here - we'll show it manually with a delay to avoid modal conflicts
    },
    onError: (error) => {
      toast({
        title: "Error saving action",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  });

  // Handle section operations
  const handleAddSection = (sectionType: SectionType) => {
    setShowAddSectionDialog(false);

    // Create a new section with default content
    const newSection = createDefaultSectionWithPage(
      sectionType,
      `section-${Date.now()}`,
      activePageId,
      settings,
      activePageId
    );

    // Calculate the order for the new section
    if (addSectionAfterId !== null) {
      // Find the current section and the next section
      const sortedSections = [...settings.sections].sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );

      const currentSectionIndex = sortedSections.findIndex(
        (section) => section.id === addSectionAfterId
      );

      if (currentSectionIndex !== -1) {
        const currentSection = sortedSections[currentSectionIndex];
        const nextSection = sortedSections[currentSectionIndex + 1];

        if (nextSection) {
          // Insert between current and next section
          const currentOrder = currentSection.order || 0;
          const nextOrder = nextSection.order || 0;
          newSection.order = currentOrder + (nextOrder - currentOrder) / 2;
        } else {
          // Insert after the last section
          newSection.order = (currentSection.order || 0) + 1;
        }
      } else {
        // Fallback: add to the end
        newSection.order = settings.sections.length + 1;
      }
    } else {
      // No specific position requested, add to the end
      newSection.order = settings.sections.length + 1;
    }

    // Add to sections array
    const updatedSections = [...settings.sections, newSection];

    // If we have fractional orders or very close orders, renumber all sections
    const needsReordering = updatedSections.some((section, index, arr) => {
      const order = section.order || 0;
      return (
        order % 1 !== 0 || // Has fractional part
        arr.some(
          (other, otherIndex) =>
            otherIndex !== index && Math.abs((other.order || 0) - order) < 0.1
        )
      );
    });

    if (needsReordering) {
      // Sort and renumber all sections
      updatedSections.sort((a, b) => (a.order || 0) - (b.order || 0));
      updatedSections.forEach((section, index) => {
        section.order = index + 1;
      });
    }

    setSettings((prev) => ({
      ...prev,
      sections: updatedSections
    }));

    // Clear the afterSectionId
    setAddSectionAfterId(null);

    // For Quick Actions sections, skip the editor and auto-save with defaults
    if (sectionType === SectionTypeEnum.QUICK_ACTIONS) {
      // Auto-save the section with default values
      saveSettingsMutation.mutate({
        ...settings,
        sections: updatedSections
      });

      toast({
        title: "Quick Actions section added",
        description: "Start adding actions to connect with your visitors."
      });
    } else if (sectionType === SectionTypeEnum.RESOURCES) {
      // For Resources sections, skip the editor and auto-save with defaults
      saveSettingsMutation.mutate({
        ...settings,
        sections: updatedSections
      });

      toast({
        title: "Resources section added",
        description: "Start adding resources to share with your visitors."
      });
    } else {
      // For other section types, open the editor for customization
      setEditingSectionId(newSection.id);
    }
  };

  const handleSaveSection = async (updatedSection: Section) => {
    try {
      // Update the section in local state
      setSettings((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === updatedSection.id ? updatedSection : section
        )
      }));

      // Auto-save to API
      await saveSettingsMutation.mutateAsync({
        ...settings,
        sections: settings.sections.map((section) =>
          section.id === updatedSection.id ? updatedSection : section
        )
      });

      // Don't close here - let SectionEditor handle the closing after successful save
    } catch (error) {
      console.error("Failed to save section:", error);
      // Re-throw error so the SectionEditor can handle it
      throw error;
    }
  };

  const handleDeleteSection = (sectionId: string | number) => {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId)
    }));

    // Auto-save the changes
    const updatedSections = settings.sections.filter(
      (section) => section.id !== sectionId
    );
    saveSettingsMutation.mutate({
      ...settings,
      sections: updatedSections
    });

    toast({
      title: "Section deleted",
      description: "The section has been removed from your profile."
    });
  };

  // Handle visibility toggle for sections
  const handleToggleVisibility = (sectionId: string | number) => {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {...section, isVisible: !section.isVisible}
          : section
      )
    }));

    // Auto-save the changes
    const updatedSections = settings.sections.map((section) =>
      section.id === sectionId
        ? {...section, isVisible: !section.isVisible}
        : section
    );

    saveSettingsMutation.mutate({
      ...settings,
      sections: updatedSections
    });

    const section = settings.sections.find((s) => s.id === sectionId);
    const newVisibility = section ? !section.isVisible : true;

    toast({
      title: newVisibility ? "Section shown" : "Section hidden",
      description: newVisibility
        ? "The section is now visible on your profile."
        : "The section has been hidden from your profile."
    });
  };

  // Handle section reordering
  const handleReorderSections = (reorderedSections: Section[]) => {
    // Update local state
    setSettings((prev) => ({
      ...prev,
      sections: reorderedSections
    }));

    // Auto-save the changes
    saveSettingsMutation.mutate({
      ...settings,
      sections: reorderedSections
    });

    toast({
      title: "Sections reordered",
      description: "Your section order has been updated."
    });
  };

  // Handle section update
  const handleSectionUpdate = (updatedSection: Section) => {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === updatedSection.id ? updatedSection : section
      )
    }));

    // Auto-save the changes
    saveSettingsMutation.mutate({
      ...settings,
      sections: settings.sections.map((section) =>
        section.id === updatedSection.id ? updatedSection : section
      )
    });
  };

  // Handle editing a quick action - this updates the action data from the inline editor
  const handleEditQuickAction = (
    updatedAction: any,
    sectionId?: string | number
  ) => {
    // Use the provided section ID to find the specific section
    const containingSection = sectionId
      ? settings.sections.find((section) => section.id === sectionId)
      : settings.sections.find((section) => {
          if (
            section.type === SectionTypeEnum.QUICK_ACTIONS &&
            "actions" in section.content
          ) {
            const quickActionsContent = section.content as any;
            return quickActionsContent.actions?.some(
              (a: any) => a.id === updatedAction.id
            );
          }
          return false;
        });

    if (
      containingSection &&
      containingSection.type === SectionTypeEnum.QUICK_ACTIONS
    ) {
      // Update the action in the specific section
      const quickActionsContent = containingSection.content as any;
      const existingActionIndex = quickActionsContent.actions?.findIndex(
        (a: any) => a.id === updatedAction.id
      );

      let updatedActions;
      if (existingActionIndex !== -1 && existingActionIndex !== undefined) {
        // Update existing action
        updatedActions =
          quickActionsContent.actions?.map((action: any) =>
            action.id === updatedAction.id ? updatedAction : action
          ) || [];
      } else {
        // Add new action
        updatedActions = [
          ...(quickActionsContent.actions || []),
          updatedAction
        ];
      }

      const updatedSection = {
        ...containingSection,
        content: {
          ...containingSection.content,
          actions: updatedActions
        }
      };

      // Update the section in settings
      setSettings((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === containingSection.id ? updatedSection : section
        )
      }));

      // Auto-save the changes
      saveQuickActionsMutation.mutate({
        ...settings,
        sections: settings.sections.map((section) =>
          section.id === containingSection.id ? updatedSection : section
        )
      });
    }

    // Don't show any toast here - let the UI feedback be implicit
    // This completely eliminates any potential interference with modal state
  };

  // Handle deleting a quick action - this removes an action from the Quick Actions section
  const handleDeleteQuickAction = (
    actionId: string,
    sectionId?: string | number
  ) => {
    // Use the provided section ID to find the specific section
    const containingSection = sectionId
      ? settings.sections.find((section) => section.id === sectionId)
      : settings.sections.find((section) => {
          if (
            section.type === SectionTypeEnum.QUICK_ACTIONS &&
            "actions" in section.content
          ) {
            const quickActionsContent = section.content as any;
            return quickActionsContent.actions?.some(
              (a: any) => a.id === actionId
            );
          }
          return false;
        });

    if (
      containingSection &&
      containingSection.type === SectionTypeEnum.QUICK_ACTIONS
    ) {
      // Remove the action from the specific section
      const quickActionsContent = containingSection.content as any;
      const updatedActions =
        quickActionsContent.actions?.filter((a: any) => a.id !== actionId) ||
        [];

      const updatedSection = {
        ...containingSection,
        content: {
          ...containingSection.content,
          actions: updatedActions
        }
      };

      // Update the section in settings
      setSettings((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === containingSection.id ? updatedSection : section
        )
      }));

      // Auto-save the changes
      saveQuickActionsMutation.mutate({
        ...settings,
        sections: settings.sections.map((section) =>
          section.id === containingSection.id ? updatedSection : section
        )
      });

      // Don't show toast here to avoid interference with subsequent modal operations
      // Visual feedback is provided by the action disappearing from the UI
    }
  };

  // Handle adding a quick action - this adds a new action to an existing Quick Actions section or creates one
  const handleAddQuickAction = (sectionId?: string | number) => {
    // If section ID is provided, ensure that specific section exists
    if (sectionId) {
      const targetSection = settings.sections.find(
        (section) => section.id === sectionId
      );
      if (
        targetSection &&
        targetSection.type === SectionTypeEnum.QUICK_ACTIONS
      ) {
        // Section exists, the QuickActionsSection modal will handle the rest
        return;
      }
    }

    // Fallback: check if there's already a Quick Actions section
    const existingQuickActionsSection = settings.sections.find(
      (section) => section.type === SectionTypeEnum.QUICK_ACTIONS
    );

    if (!existingQuickActionsSection) {
      // Create a new Quick Actions section if none exists
      const newSection = createDefaultSection(
        SectionTypeEnum.QUICK_ACTIONS,
        `section-${Date.now()}`
      );
      newSection.order = settings.sections.length + 1;

      // Add to sections array
      const updatedSections = [...settings.sections, newSection];
      setSettings((prev) => ({
        ...prev,
        sections: updatedSections
      }));

      // Auto-save the new section
      saveSettingsMutation.mutate({
        ...settings,
        sections: updatedSections
      });
    }

    // The actual adding is now handled by the QuickActionsSection component modal
    // This function just ensures a Quick Actions section exists
  };

  // Handle quick link operations
  const handleEditQuickLink = (linkId: string | number) => {
    const linkToEdit = settings.quickLinks.find((link) => link.id === linkId);
    if (linkToEdit) {
      setEditingQuickLink(linkToEdit);
      setShowEditQuickLinkDialog(true);
    }
  };

  // Handle profile updates from the ProfileInfo component
  const handleProfileUpdate = (updatedProfile: Partial<UserProfile>) => {
    // Update the local userProfile state
    setUserProfileState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updatedProfile
      };
    });

    // Also invalidate queries to ensure data consistency
    queryClient.invalidateQueries({queryKey: ["/api/badge-profile"]});
  };

  // Handle company updates from the CompanyInfo component
  const handleCompanyUpdate = (updatedOrganization: Partial<Organization>) => {
    // Update the local organization state
    setOrganizationState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updatedOrganization
      };
    });

    // Also invalidate queries to ensure data consistency
    queryClient.invalidateQueries({queryKey: ["/api/organization"]});
  };

  // Handle background changes from the BackgroundSettings component
  const handleBackgroundChange = (newBackground: {
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  }) => {
    // Update the local settings state immediately for instant preview update
    setSettings((prev) => ({
      ...prev,
      background: newBackground
    }));

    // Auto-save to API with the updated settings
    const updatedSettings = {
      ...settings,
      background: newBackground
    };
    saveSettingsMutation.mutate(updatedSettings);

    toast({
      title: "Background updated",
      description: "Your background has been changed."
    });
  };

  // Handle chat settings changes
  const handleChatSettingsChange = (
    updatedChatSettings: GlobalChatSettings
  ) => {
    // Update the local settings state
    setSettings((prev) => ({
      ...prev,
      chatSettings: updatedChatSettings
    }));

    // Auto-save to API
    const updatedSettings = {
      ...settings,
      chatSettings: updatedChatSettings
    };

    saveSettingsMutation.mutate(updatedSettings);

    toast({
      title: "Chat settings updated",
      description: "Your AI chat settings have been updated."
    });
  };

  // Handle lead settings changes
  const handleLeadSettingsChange = (updatedLeadSettings: LeadSettings) => {
    // Update the local settings state
    setSettings((prev) => ({
      ...prev,
      leadSettings: updatedLeadSettings
    }));

    // Auto-save to API
    const updatedSettings = {
      ...settings,
      leadSettings: updatedLeadSettings
    };

    saveSettingsMutation.mutate(updatedSettings);

    toast({
      title: "Lead settings updated",
      description: "Your lead generation settings have been updated."
    });
  };

  // Handle branding changes
  const handleBrandingChange = (brandingSettings: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  }) => {
    // Check if user has premium access (subscription or beta tester)
    const isProPlan = subscriptionData?.hasPremiumAccess === true;

    if (!isProPlan) {
      // Show premium feature toast for non-pro users
      toast({
        title: "Premium Feature",
        description: "Branding customization is available with an upgrade.",
        variant: "default"
      });
      return;
    }

    // For pro users, actually save the branding settings
    setSettings((prev) => ({
      ...prev,
      branding: brandingSettings
    }));

    // Auto-save to API
    const updatedSettings = {
      ...settings,
      branding: brandingSettings
    };

    saveSettingsMutation.mutate(updatedSettings);

    toast({
      title: "Branding settings updated",
      description: "Your branding preferences have been saved.",
      variant: "default"
    });

    console.log("Branding settings saved:", brandingSettings);
  };

  // Handle color settings changes
  const handleColorSettingsChange = (colorSettings: {
    buttonColor: string;
    iconColor: string;
    useOrgDefault?: boolean;
  }) => {
    // Update the local settings state
    setSettings((prev) => ({
      ...prev,
      colors: colorSettings
    }));

    // Auto-save to API
    const updatedSettings = {
      ...settings,
      colors: colorSettings
    };

    saveSettingsMutation.mutate(updatedSettings);

    toast({
      title: "Color settings updated",
      description: "Your brand colors have been updated."
    });
  };

  // Handle batch save for settings (to avoid race conditions)
  const handleBatchSave = (allSettings: {
    chatSettings?: GlobalChatSettings;
    leadSettings?: LeadSettings;
    brandingSettings?: {
      removeBuiltWithBadge?: boolean;
      customBranding?: boolean;
    };
    colorSettings?: {
      buttonColor: string;
      iconColor: string;
      useOrgDefault?: boolean;
    };
  }) => {
    // Check if user has premium access (subscription or beta tester)
    const isProPlan = subscriptionData?.hasPremiumAccess === true;

    // If branding settings are being changed and user is not pro, show premium message
    if (allSettings.brandingSettings && !isProPlan) {
      toast({
        title: "Premium Feature",
        description: "Branding customization is available with an upgrade.",
        variant: "default"
      });
      // Remove branding settings from the save operation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {brandingSettings, ...otherSettings} = allSettings;
      if (Object.keys(otherSettings).length === 0) {
        return; // Nothing else to save
      }
      allSettings = otherSettings;
    }

    // Update local state with all changes
    setSettings((prev) => ({
      ...prev,
      ...(allSettings.chatSettings && {chatSettings: allSettings.chatSettings}),
      ...(allSettings.leadSettings && {leadSettings: allSettings.leadSettings}),
      ...(allSettings.brandingSettings && {
        branding: allSettings.brandingSettings
      }),
      ...(allSettings.colorSettings && {colors: allSettings.colorSettings})
    }));

    // Build the updated settings object
    const updatedSettings = {
      ...settings,
      ...(allSettings.chatSettings && {chatSettings: allSettings.chatSettings}),
      ...(allSettings.leadSettings && {leadSettings: allSettings.leadSettings}),
      ...(allSettings.brandingSettings && {
        branding: allSettings.brandingSettings
      }),
      ...(allSettings.colorSettings && {colors: allSettings.colorSettings})
    };

    // Make a single API call with all changes
    saveSettingsMutation.mutate(updatedSettings);

    // Show appropriate success message
    const changedCount = Object.keys(allSettings).length;
    const settingTypes = Object.keys(allSettings);

    toast({
      title: "Settings updated",
      description: `${changedCount} setting${changedCount > 1 ? "s" : ""} updated: ${settingTypes
        .join(", ")
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()}`
    });
  };

  const handleSaveQuickLinkEdit = (updatedQuickLink: QuickLink) => {
    // Update the quick link in local state
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.map((link) =>
        link.id === updatedQuickLink.id ? updatedQuickLink : link
      )
    }));

    // Auto-save to API
    const updatedQuickLinks = settings.quickLinks.map((link) =>
      link.id === updatedQuickLink.id ? updatedQuickLink : link
    );
    saveSettingsMutation.mutate({
      ...settings,
      quickLinks: updatedQuickLinks
    });

    toast({
      title: "Quick link updated",
      description: `${updatedQuickLink.label} has been updated.`
    });

    // Close the dialog and clear editing state
    setShowEditQuickLinkDialog(false);
    setEditingQuickLink(null);
  };

  const handleToggleLinkVisibility = (linkId: string | number) => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.map((link) =>
        link.id === linkId ? {...link, isVisible: !link.isVisible} : link
      )
    }));

    // Auto-save the changes
    const updatedQuickLinks = settings.quickLinks.map((link) =>
      link.id === linkId ? {...link, isVisible: !link.isVisible} : link
    );

    saveSettingsMutation.mutate({
      ...settings,
      quickLinks: updatedQuickLinks
    });

    const link = settings.quickLinks.find((l) => l.id === linkId);
    const newVisibility = link ? !link.isVisible : true;

    toast({
      title: newVisibility ? "Quick link shown" : "Quick link hidden",
      description: newVisibility
        ? "The quick link is now visible on your profile."
        : "The quick link has been hidden from your profile."
    });
  };

  const handleDeleteQuickLink = (linkId: string | number) => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.filter((link) => link.id !== linkId)
    }));

    // Auto-save the changes
    const updatedQuickLinks = settings.quickLinks.filter(
      (link) => link.id !== linkId
    );
    saveSettingsMutation.mutate({
      ...settings,
      quickLinks: updatedQuickLinks
    });

    toast({
      title: "Quick link deleted",
      description: "The quick link has been removed from your profile."
    });
  };

  const handleAddQuickLink = () => {
    setShowAddQuickLinkDialog(true);
  };

  const handleOpenAddSectionDialog = (afterSectionId?: string | number) => {
    setAddSectionAfterId(afterSectionId || null);
    setShowAddSectionDialog(true);
  };

  const handleSaveQuickLink = (newQuickLinkData: Omit<QuickLink, "id">) => {
    // Generate a unique ID for the new quick link
    const newQuickLink: QuickLink = {
      ...newQuickLinkData,
      id: generateRandomId()
    };

    // Add to local state
    setSettings((prev) => ({
      ...prev,
      quickLinks: [...prev.quickLinks, newQuickLink]
    }));

    // Auto-save to API
    const updatedQuickLinks = [...settings.quickLinks, newQuickLink];
    saveSettingsMutation.mutate({
      ...settings,
      quickLinks: updatedQuickLinks
    });

    toast({
      title: "Quick link added",
      description: `${newQuickLink.label} has been added to your profile.`
    });
  };

  // Handle editing a resource - this updates the resource data from the inline editor
  const handleEditResource = async (
    updatedResource: any,
    sectionId?: string | number
  ): Promise<void> => {
    let targetSection;

    if (sectionId) {
      // Use the specific section ID provided
      targetSection = settings.sections.find(
        (section) => section.id === sectionId
      );
    } else {
      // Fallback: find the section that contains this resource (for existing resources)
      targetSection = settings.sections.find((section) => {
        if (
          section.type === SectionTypeEnum.RESOURCES &&
          "resources" in section.content
        ) {
          const resourcesContent = section.content as any;
          return resourcesContent.resources?.some(
            (r: any) => r.id === updatedResource.id
          );
        }
        return false;
      });
    }

    if (targetSection && targetSection.type === SectionTypeEnum.RESOURCES) {
      // Update the resource in the specific section
      const resourcesContent = targetSection.content as any;
      const existingResourceIndex = resourcesContent.resources?.findIndex(
        (r: any) => r.id === updatedResource.id
      );

      let updatedResources;
      if (existingResourceIndex !== -1 && existingResourceIndex !== undefined) {
        // Update existing resource
        updatedResources =
          resourcesContent.resources?.map((resource: any) =>
            resource.id === updatedResource.id ? updatedResource : resource
          ) || [];
      } else {
        // Add new resource
        updatedResources = [
          ...(resourcesContent.resources || []),
          updatedResource
        ];
      }

      const updatedSection = {
        ...targetSection,
        content: {
          ...targetSection.content,
          resources: updatedResources
        }
      };

      const newSettings = {
        ...settings,
        sections: settings.sections.map((section) =>
          section.id === targetSection.id ? updatedSection : section
        )
      };
      const result = await saveQuickActionsMutation.mutateAsync(newSettings);

      setSettings(newSettings);

      // Also invalidate React Query cache after a brief delay to ensure fresh data
      setTimeout(() => {
        queryClient.invalidateQueries({queryKey: ["/api/badge-profile"]});
      }, 100);

      return result;
    } else {
      console.error("Target section not found or not a resources section:", {
        targetSection,
        sectionType: targetSection?.type
      });
    }
  };

  // Handle deleting a resource - this removes a resource from the specific Resources section
  const handleDeleteResource = (
    resourceId: string,
    sectionId?: string | number
  ) => {
    let targetSection;

    if (sectionId) {
      // Use the specific section ID provided
      targetSection = settings.sections.find(
        (section) => section.id === sectionId
      );
    } else {
      // Fallback: find the section that contains this resource
      targetSection = settings.sections.find((section) => {
        if (
          section.type === SectionTypeEnum.RESOURCES &&
          "resources" in section.content
        ) {
          const resourcesContent = section.content as any;
          return resourcesContent.resources?.some(
            (r: any) => r.id === resourceId
          );
        }
        return false;
      });
    }

    if (targetSection && targetSection.type === SectionTypeEnum.RESOURCES) {
      // Remove the resource from the specific section
      const resourcesContent = targetSection.content as any;
      const updatedResources =
        resourcesContent.resources?.filter((r: any) => r.id !== resourceId) ||
        [];

      const updatedSection = {
        ...targetSection,
        content: {
          ...targetSection.content,
          resources: updatedResources
        }
      };

      // Update the section in settings
      setSettings((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === targetSection.id ? updatedSection : section
        )
      }));

      // Auto-save the changes
      saveQuickActionsMutation.mutate({
        ...settings,
        sections: settings.sections.map((section) =>
          section.id === targetSection.id ? updatedSection : section
        )
      });
    }
  };

  // Handle adjusting page settings from QR code modal
  const handleAdjustPageSettings = () => {
    // Switch to settings tab
    setActiveProfileTab("settings");

    // Open the lead generation section
    setOpenSettingsSections((prev) => ({
      ...prev,
      leadGeneration: true
    }));

    // Close the QR code modal
    setQrCodeModalOpen(false);

    // Scroll to the lead generation section after a brief delay to allow tab switch
    setTimeout(() => {
      const leadGenSection = document.querySelector(
        "[data-section='leadGeneration']"
      );
      if (leadGenSection) {
        leadGenSection.scrollIntoView({behavior: "smooth", block: "start"});
      }
    }, 100);
  };

  // Handle settings section toggle
  const handleSettingsSectionToggle = (section: string) => {
    const validSections = [
      "branding",
      "aiChat",
      "leadGeneration",
      "pageVisibility"
    ];
    if (validSections.includes(section)) {
      setOpenSettingsSections((prev) => ({
        ...prev,
        [section as keyof typeof openSettingsSections]:
          !prev[section as keyof typeof openSettingsSections]
      }));
    }
  };

  // Derived values
  const editingSection =
    editingSectionId !== null
      ? settings.sections.find((section) => section.id === editingSectionId)
      : null;

  // Filter sections by active page
  const filteredSections = settings.sections.filter((section) => {
    // If activePageId is empty but pages exist, use the first page ID
    const effectivePageId =
      activePageId || (settings.pages.length > 0 ? settings.pages[0].id : "");
    return section.pageId === effectivePageId;
  });

  // Sort sections by order property
  const sortedSections = [...filteredSections].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  // Loading state
  const isLoading = isUserLoading || isOrganizationLoading;

  // Handle page operations
  const handlePageChange = (pageId: string) => {
    setActivePageId(pageId);
  };

  const handleAddPage = () => {
    const newPageId = generateRandomId();
    const newPageName = "New Page";

    // Add the new page to settings with correct typing
    const updatedPages = [
      ...settings.pages,
      {
        id: newPageId,
        name: newPageName,
        privacy: "public" as const
      }
    ];

    setSettings((prev) => ({
      ...prev,
      pages: updatedPages
    }));

    // Auto-save to API
    saveSettingsMutation.mutate({
      ...settings,
      pages: updatedPages
    });

    // Set active page to the new page
    setActivePageId(newPageId);

    toast({
      title: "Page added",
      description: `${newPageName} has been added to your profile.`
    });
  };

  const handleEditPage = (pageId: string, newName: string) => {
    // Update the page name in settings
    const updatedPages = settings.pages.map((page) =>
      page.id === pageId ? {...page, name: newName} : page
    );

    setSettings((prev) => ({
      ...prev,
      pages: updatedPages
    }));

    // Auto-save to API
    saveSettingsMutation.mutate({
      ...settings,
      pages: updatedPages
    });

    toast({
      title: "Page renamed",
      description: `Page has been updated to "${newName}".`
    });
  };

  const handleEditTabs = () => {
    // Open the manage tabs modal
    setManageTabsModalOpen(true);
  };

  const handleSaveTabs = (updatedTabs: TabItem[]) => {
    console.log("Saving tabs:", updatedTabs);

    // Convert TabItem[] to Page[]
    const updatedPages = updatedTabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      isVisible: tab.isVisible !== false,
      privacy: tab.privacy,
      password: tab.password
    }));

    console.log("Converted to pages:", updatedPages);

    // First update local state
    setSettings((prev) => {
      console.log("Previous settings:", prev);
      const newSettings = {
        ...prev,
        pages: updatedPages
      };

      console.log("New settings to save:", newSettings);

      // Then save to server
      saveSettingsMutation.mutate(newSettings);

      return newSettings;
    });

    // Close the modal
    setManageTabsModalOpen(false);

    toast({
      title: "Tabs updated",
      description: "Your page tabs have been updated."
    });
  };

  // Update the active page ID when settings are loaded from the API
  useEffect(() => {
    if (settings.pages && settings.pages.length > 0 && !activePageId) {
      setActivePageId(settings.pages[0].id);
    }
  }, [settings.pages, activePageId]);

  // Add a function to directly activate the lead generation section
  const activateLeadGenerationSection = () => {
    console.log("Directly activating lead generation section");
    // Switch to settings tab
    setActiveProfileTab("settings");

    // Open the leadGeneration section
    setOpenSettingsSections((prev) => ({
      ...prev,
      branding: false,
      aiChat: false,
      leadGeneration: true,
      pageVisibility: false
    }));

    // Scroll to the section
    setTimeout(() => {
      const elements = document.getElementsByTagName("div");
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].getAttribute("data-section") === "leadGeneration") {
          elements[i].scrollIntoView({behavior: "smooth", block: "start"});
          break;
        }
      }
    }, 300);
  };

  // Check URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get("section");

    if (sectionParam === "leadGeneration") {
      // Call the function directly
      activateLeadGenerationSection();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-full sm:rounded-b-2xl">
        {/* Top header skeleton - matches loaded header */}
        <div className="bg-white py-3 px-4 flex flex-row items-center justify-between border border-b-0 sm:rounded-t-2xl">
          <div>
            <h2 className="text-lg font-medium">Badge Profile</h2>
          </div>
          <div className="flex items-center gap-3 self-end">
            <Skeleton className="h-8 w-28" />
          </div>
        </div>

        {/* Main content skeleton - matches loaded content structure */}
        <div className="flex flex-col lg:flex-row bg-white border sm:rounded-b-2xl">
          <div className="w-full">
            <div className="p-4 flex flex-col h-full">
              {/* Tabs skeleton */}
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                  <Skeleton className="h-8 w-16 rounded" />
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
              </div>

              {/* Browser preview frame skeleton */}
              <div className="flex-grow">
                {/* Browser header */}
                <div className="bg-gray-100 px-4 py-2 rounded-t-lg flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <Skeleton className="h-6 w-64 ml-4" />
                  <div className="ml-auto">
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>

                {/* Browser content with background */}
                <div className="bg-background-smoke p-6 rounded-b-lg min-h-[500px] relative">
                  <div className="bg-gradient-to-r from-sky-100 to-cyan-100 absolute top-0 left-0 right-0 h-48 w-full z-0"></div>
                  {/* Background/Branding buttons */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-8 w-20 rounded" />
                  </div>

                  {/* Profile card skeleton */}
                  <div className="bg-white rounded-lg p-6 mx-auto max-w-3xl shadow-sm mt-32 relative z-10">
                    <div className="flex items-end mb-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                    </div>

                    {/* Profile info */}
                    <div className="flex gap-4 mb-6">
                      <Skeleton className="h-20 w-20 rounded-full" />
                      <div className="text-center space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-8 w-20 rounded" />
                      <Skeleton className="h-8 w-20 rounded" />
                      <Skeleton className="h-8 w-24 rounded" />
                      <Skeleton className="h-8 w-20 rounded" />
                    </div>

                    {/* Built with badge */}
                    <div className="text-center">
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  </div>

                  {/* Add section button */}
                  <div className="flex justify-center mt-6">
                    <Skeleton className="h-10 w-36 rounded" />
                  </div>

                  {/* Section skeleton */}
                  <div className="mx-auto max-w-3xl mt-4">
                    <div className="bg-sky-200 rounded-lg p-4 relative">
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                      </div>
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-24 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full sm:rounded-b-2xl">
      {/* Top header with title and share button */}
      <div className="bg-white py-3 px-4 flex flex-row items-center justify-between border border-b-0 sm:rounded-t-2xl">
        <div>
          <h2 className="text-lg font-medium">Badge Profile</h2>
        </div>
        <div className="flex items-center gap-3 self-end">
          {/* Download QR Code dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Download QR Code</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem
                onClick={() => {
                  // Small delay to allow dropdown to close before triggering download
                  setTimeout(() => {
                    if (qrCodeDisplayRef.current) {
                      qrCodeDisplayRef.current.download();
                    } else {
                      toast({
                        title: "Error",
                        description:
                          "QR Code component not ready. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }, 100);
                }}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Small delay to allow dropdown to close before triggering download
                  setTimeout(async () => {
                    if (phoneBackgroundRef.current) {
                      try {
                        await phoneBackgroundRef.current.downloadPhoneBackground();
                        toast({
                          title: "Phone background downloaded",
                          description:
                            "Your phone background image has been saved."
                        });
                      } catch {
                        toast({
                          title: "Error",
                          description:
                            "Failed to generate phone background. Please try again.",
                          variant: "destructive"
                        });
                      }
                    } else {
                      toast({
                        title: "Error",
                        description:
                          "Phone background generator not ready. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }, 100);
                }}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Phone Background
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setQrCodeModalOpen(true)}
          >
            <QrCode className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Main content area with border between panels */}
      <div className="flex flex-col lg:flex-row bg-white border sm:rounded-b-2xl">
        {/* Preview panel */}
        <div className="w-full">
          <div className="p-4 flex flex-col h-full">
            {/* Use the ProfilePreview component */}
            <div className="flex-grow overflow-hidden">
              {badgeProfileData?.userProfile && (
                <ProfilePreview
                  userProfile={userProfileState || badgeProfileData.userProfile}
                  organization={organizationState || organization}
                  quickLinks={settings.quickLinks}
                  leadSettings={settings.leadSettings}
                  chatSettings={settings.chatSettings}
                  sections={sortedSections}
                  pages={settings.pages}
                  activePage={activePageId}
                  onPageClick={handlePageChange}
                  onAddPage={handleAddPage}
                  onEditPage={handleEditPage}
                  onEditTabs={handleEditTabs}
                  backgroundStyle={getBackgroundStyle()}
                  backgroundSettings={settings.background}
                  bannerData={getBannerData()}
                  onBackgroundChange={handleBackgroundChange}
                  onChatSettingsChange={handleChatSettingsChange}
                  onLeadSettingsChange={handleLeadSettingsChange}
                  brandingSettings={settings.branding}
                  onBrandingChange={handleBrandingChange}
                  colorSettings={
                    settings.colors
                      ? {
                          buttonColor: settings.colors.buttonColor || "#3b82f6",
                          iconColor: settings.colors.iconColor || "#3b82f6",
                          useOrgDefault: settings.colors.useOrgDefault
                        }
                      : null
                  }
                  onColorSettingsChange={handleColorSettingsChange}
                  onBatchSave={handleBatchSave}
                  buttonColor={
                    settings.colors?.buttonColor ||
                    organizationState?.defaultColor ||
                    organization?.defaultColor ||
                    "#3b82f6"
                  }
                  iconColor={
                    settings.colors?.buttonColor ||
                    organizationState?.defaultColor ||
                    organization?.defaultColor ||
                    "#3b82f6"
                  }
                  showEditControls={true}
                  activeTab={activeProfileTab}
                  onTabChange={setActiveProfileTab}
                  openSettingsSections={openSettingsSections}
                  onSettingsSectionToggle={handleSettingsSectionToggle}
                  subscriptionStatus={subscriptionData?.subscriptionStatus}
                  planType={subscriptionData?.planType}
                  hasPremiumAccess={subscriptionData?.hasPremiumAccess}
                  onManageTabs={handleEditTabs}
                  onEditProfile={() => {
                    // Profile editing is now handled by the BadgeContactCard component internally
                    // The edit modal will open when the user clicks the edit button
                  }}
                  onProfileUpdate={handleProfileUpdate}
                  onCompanyUpdate={handleCompanyUpdate}
                  onEditQuickLink={handleEditQuickLink}
                  activeSectionId={activeSectionId}
                  onEditSection={(sectionId) => {
                    // Open section editing
                    setEditingSectionId(sectionId);
                    setActiveSectionId(sectionId);
                  }}
                  onAddSection={handleOpenAddSectionDialog}
                  onToggleVisibility={handleToggleVisibility}
                  onDeleteSection={handleDeleteSection}
                  onOpenExternal={() => {
                    const publicPath =
                      badgeProfileData?.userProfile?.publicPath;
                    if (publicPath) {
                      window.open(`/${publicPath}`, "_blank");
                    } else {
                      toast({
                        title: "Public path not set",
                        description:
                          "Please complete your profile settings first.",
                        variant: "destructive"
                      });
                    }
                  }}
                  onReorderSections={handleReorderSections}
                  onToggleLinkVisibility={handleToggleLinkVisibility}
                  onDeleteQuickLink={handleDeleteQuickLink}
                  onAddQuickLink={handleAddQuickLink}
                  onSectionUpdate={handleSectionUpdate}
                  onEditAction={handleEditQuickAction}
                  onAddAction={handleAddQuickAction}
                  onDeleteAction={handleDeleteQuickAction}
                  onEditResource={handleEditResource}
                  onDeleteResource={handleDeleteResource}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add section dialog */}
      <AddSectionDialog
        isOpen={showAddSectionDialog}
        onClose={() => setShowAddSectionDialog(false)}
        onSectionTypeSelect={handleAddSection}
      />

      {/* Add quick link dialog */}
      <AddQuickLinkDialog
        isOpen={showAddQuickLinkDialog}
        onClose={() => setShowAddQuickLinkDialog(false)}
        onSave={handleSaveQuickLink}
      />

      {/* Edit quick link dialog */}
      <EditQuickLinkDialog
        isOpen={showEditQuickLinkDialog}
        onClose={() => {
          setShowEditQuickLinkDialog(false);
          setEditingQuickLink(null);
        }}
        onSave={handleSaveQuickLinkEdit}
        quickLink={editingQuickLink}
      />

      {/* Section editor dialog */}
      {editingSection && (
        <SectionEditor
          isOpen={!!editingSectionId}
          onClose={() => {
            setEditingSectionId(null);
            setActiveSectionId(null);
          }}
          section={editingSection}
          onSave={handleSaveSection}
        />
      )}

      {/* QR Code Sharing Modal - Keep the existing one for the Share button */}
      {badgeProfileData?.userProfile && (
        <QRCodeDisplay
          ref={qrCodeDisplayRef}
          user={badgeProfileData.userProfile}
          size="lg"
          showControls={true}
          showShareButton={true}
          className="hidden" // Hide the actual component, but keep the dialog
          customDialogTitle="Share your Badge"
          customDescription="This is your unique QR code to link to your page"
          dialogOpen={qrCodeModalOpen}
          onDialogOpenChange={setQrCodeModalOpen}
          logoImage={organization?.qrLogoUrl || ""}
          brandColor={organization?.qrCodeColor || "#3b82f6"}
          leadSettings={settings.leadSettings}
          onAdjustPageSettings={handleAdjustPageSettings}
        />
      )}

      {/* Phone Background Generator - Hidden component for downloading backgrounds */}
      {badgeProfileData?.userProfile && (
        <PhoneBackgroundGenerator
          ref={phoneBackgroundRef}
          user={badgeProfileData.userProfile}
          organization={organizationState || organization}
          brandColor={organization?.qrCodeColor || "#6248FF"}
          logoImage={organization?.qrLogoUrl || ""}
        />
      )}

      {/* Manage Tabs Modal */}
      <ManageTabsModal
        isOpen={manageTabsModalOpen}
        onClose={() => setManageTabsModalOpen(false)}
        tabs={settings.pages.map(
          (page) =>
            ({
              id: page.id,
              name: page.name,
              isVisible: page.isVisible !== false,
              privacy:
                (page.privacy as "public" | "password" | "form") || "public",
              password: page.password
            }) as TabItem
        )}
        onSaveTabs={handleSaveTabs}
        onAddTab={handleAddPage}
      />
    </div>
  );
}
