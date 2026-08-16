import React, {useState, useEffect} from "react";
import {cn} from "@/lib/utils";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {BadgeContactCard} from "@/components/badge-profile/BadgeContactCard";
import {SectionRenderer} from "@/components/badge-profile/SectionRenderer";
import {BrowserBar} from "@/components/ui/browser-bar";
import {BackgroundSettings} from "@/components/badge-profile/BackgroundSettings";
import {SettingsTab} from "@/components/badge-profile/SettingsTab";
import {BannerDisplay} from "@/components/badge-profile/BannerDisplay";
import {ResourceEditModal} from "@/components/badge-profile/modals/ResourceEditModal";
import {ResourceAddModal} from "@/components/badge-profile/modals/ResourceAddModal";
import {QuickActionEditModal} from "./modals/QuickActionEditModal";
import {QuickActionTypeSelectionModal} from "./modals/QuickActionTypeSelectionModal";
import {QuickActionAddModal} from "./modals/QuickActionAddModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {User, Pencil, Plus} from "lucide-react";
import {Section} from "@/shared/types/sections";
import {QuickLink} from "@/components/badge-profile/QuickLinks";
import {UserProfile} from "@/types/user";
import {Skeleton} from "@/components/ui/skeleton";
import {
  SectionNavigation,
  Page
} from "@/components/badge-profile/SectionNavigation";
import {ContentTab} from "@/components/badge-profile/ContentTab";
import {downloadVCard} from "@/shared/types/vcard";
import {LeadSettings} from "@/shared/types/lead";
import {GlobalChatSettings} from "@shared/types/chat";
import {useLocation} from "wouter";
import {ScopedThemeProvider} from "@/components/badge-profile/ScopedThemeProvider";

// DnD imports
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  defaultColor?: string | null;
}

interface ProfilePreviewProps {
  userProfile?: UserProfile;
  organization?: Organization | null;
  quickLinks: QuickLink[];
  sections: Section[];
  pages?: Page[];
  activePage?: string;
  onPageClick?: (pageId: string) => void;
  onAddPage?: () => void;
  onEditPage?: (pageId: string, newName: string) => void;
  onEditTabs?: () => void;
  backgroundStyle: React.CSSProperties;
  backgroundImage?: string | null;
  onOpenExternal?: () => void;
  className?: string;
  buttonColor?: string;
  iconColor?: string;
  isRegister?: boolean;
  leadSettings?: LeadSettings;
  chatSettings?: GlobalChatSettings;
  // Background settings
  backgroundSettings?: {
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  } | null;
  bannerData?: {
    id: string;
    name?: string;
    headline: {
      text: string;
      font: string;
      color: string;
    };
    subheadline?: {
      text: string;
      font: string;
      color: string;
    };
    tags: Array<{
      text: string;
      color: string;
      backgroundColor: string;
    }>;
    backgroundType: "preset" | "custom";
    backgroundValue: string;
    customUploadUrl?: string;
  } | null;
  onBackgroundChange?: (newBackground: {
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  }) => void;
  onChatSettingsChange?: (settings: GlobalChatSettings) => void;
  onLeadSettingsChange?: (settings: LeadSettings) => void;
  brandingSettings?: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  } | null;
  onBrandingChange?: (settings: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  }) => void;
  colorSettings?: {
    buttonColor: string;
    iconColor: string;
    useOrgDefault?: boolean;
  } | null;
  onColorSettingsChange?: (settings: {
    buttonColor: string;
    iconColor: string;
    useOrgDefault?: boolean;
  }) => void;
  // New unified save handler for batch operations
  onBatchSave?: (allSettings: {
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
  }) => void;
  // Edit handlers
  onEditProfile?: () => void;
  onProfileUpdate?: (updatedProfile: Partial<UserProfile>) => void;
  onCompanyUpdate?: (updatedOrganization: Partial<Organization>) => void;
  onEditSection?: (sectionId: string | number) => void;
  onAddSection?: (afterSectionId?: string | number) => void;
  onToggleVisibility?: (sectionId: string | number) => void;
  onDeleteSection?: (sectionId: string | number) => void;
  onSectionUpdate?: (updatedSection: Section) => void;
  onReorderSections?: (sections: Section[]) => void;
  // Quick link handlers
  onEditQuickLink?: (linkId: string | number) => void;
  onToggleLinkVisibility?: (linkId: string | number) => void;
  onDeleteQuickLink?: (linkId: string | number) => void;
  onAddQuickLink?: () => void;
  // Quick action handlers
  onEditAction?: (action: any, sectionId?: string | number) => void;
  onAddAction?: (sectionId?: string | number) => void;
  onDeleteAction?: (actionId: string, sectionId?: string | number) => void;
  // Resource handlers
  onEditResource?: (
    resource: any,
    sectionId?: string | number
  ) => Promise<void> | void;
  onAddResource?: (sectionId?: string | number) => void;
  onDeleteResource?: (resourceId: string, sectionId?: string | number) => void;
  showEditControls?: boolean;
  // Tab control props
  activeTab?: "content" | "settings";
  onTabChange?: (tab: "content" | "settings") => void;
  // Active section for content tab
  activeSectionId?: string | number | null;
  // Settings section control
  openSettingsSections?: {
    branding?: boolean;
    aiChat?: boolean;
    leadGeneration?: boolean;
    pageVisibility?: boolean;
  };
  onSettingsSectionToggle?: (section: string) => void;
  // Tab management
  onManageTabs?: () => void;
  // Subscription status for Pro features
  subscriptionStatus?: string;
  planType?: string;
  hasPremiumAccess?: boolean;
}

// Tab component
interface TabsProps {
  activeTab: "content" | "settings";
  onTabChange: (tab: "content" | "settings") => void;
}

function Tabs({activeTab, onTabChange}: TabsProps) {
  return (
    <div className="flex justify-center mb-6 w-fit mx-auto sm:w-full sm:mb-8 px-4 sm:px-0">
      <div className="bg-stone-100 border border-stone-200 rounded-full p-1 flex gap-1 w-full max-w-xs sm:w-auto">
        <button
          onClick={() => onTabChange("content")}
          className={cn(
            "px-3 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex-1 sm:flex-none",
            activeTab === "content"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-600 hover:text-stone-800"
          )}
        >
          Content
        </button>
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "px-3 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex-1 sm:flex-none",
            activeTab === "settings"
              ? "bg-white text-stone-800 shadow-sm"
              : "text-stone-600 hover:text-stone-800"
          )}
        >
          Settings
        </button>
      </div>
    </div>
  );
}

// Sortable section component
function SortableSection({
  section,
  buttonColor,
  iconColor,
  showEditControls,
  onEditSection,
  onAddSection,
  onToggleVisibility,
  onDeleteSection,
  onSectionUpdate,
  showAddSectionButton,
  onEditAction,
  onAddAction,
  onDeleteAction,
  onEditResource,
  onAddResource,
  onDeleteResource
}: {
  section: Section;
  buttonColor: string;
  iconColor: string;
  showEditControls: boolean;
  onEditSection?: (sectionId: string | number) => void;
  onAddSection?: (afterSectionId?: string | number) => void;
  onToggleVisibility?: (sectionId: string | number) => void;
  onDeleteSection?: (sectionId: string | number) => void;
  onSectionUpdate?: (updatedSection: Section) => void;
  showAddSectionButton: boolean;
  onEditAction?: (action: any, sectionId?: string | number) => void;
  onAddAction?: (sectionId?: string | number) => void;
  onDeleteAction?: (actionId: string, sectionId?: string | number) => void;
  onEditResource?: (
    resource: any,
    sectionId?: string | number
  ) => Promise<void> | void;
  onAddResource?: (sectionId?: string | number) => void;
  onDeleteResource?: (resourceId: string, sectionId?: string | number) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({
      id: section.id.toString()
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionRenderer
        section={section}
        buttonColor={buttonColor}
        iconColor={iconColor}
        showEditControls={showEditControls}
        dragHandlesOnly={true}
        onEditSection={onEditSection}
        onAddSection={onAddSection}
        onToggleVisibility={onToggleVisibility}
        onDeleteSection={onDeleteSection}
        onSectionUpdate={onSectionUpdate}
        showAddSectionButton={false}
        isDragging={isDragging}
        dragHandleProps={{...attributes, ...listeners}}
        onEditAction={onEditAction}
        onAddAction={onAddAction}
        onDeleteAction={onDeleteAction}
        onEditResource={onEditResource}
        onAddResource={onAddResource}
        onDeleteResource={onDeleteResource}
      />
    </div>
  );
}

export function ProfilePreview({
  userProfile,
  organization,
  quickLinks,
  sections,
  pages,
  activePage,
  onPageClick,
  onAddPage,
  onEditPage,
  onEditTabs,
  backgroundStyle,
  backgroundImage,
  bannerData,
  onOpenExternal,
  className,
  buttonColor = organization?.defaultColor || "#3b82f6",
  iconColor = organization?.defaultColor || "#3b82f6",
  isRegister,
  leadSettings,
  chatSettings,
  backgroundSettings,
  onBackgroundChange,
  onChatSettingsChange,
  onLeadSettingsChange,
  brandingSettings,
  onBrandingChange,
  colorSettings,
  onColorSettingsChange,
  onBatchSave,
  onEditProfile,
  onProfileUpdate,
  onCompanyUpdate,
  onEditSection,
  onAddSection,
  onToggleVisibility,
  onDeleteSection,
  onSectionUpdate,
  onReorderSections,
  onEditQuickLink,
  onToggleLinkVisibility,
  onDeleteQuickLink,
  onAddQuickLink,
  onEditAction,
  onDeleteAction,
  onEditResource,
  onDeleteResource,
  showEditControls = false,
  activeTab,
  onTabChange,
  activeSectionId,
  openSettingsSections,
  onSettingsSectionToggle,
  subscriptionStatus,
  planType,
  hasPremiumAccess
}: ProfilePreviewProps) {
  // Hook for client-side navigation
  const [, setLocation] = useLocation();

  // Add state for active tab
  const [activeTabState, setActiveTabState] = useState<"content" | "settings">(
    "content"
  );

  // Global modal state for resource editing (prevents unmounting issues)
  const [globalEditResourceModal, setGlobalEditResourceModal] = useState({
    open: false,
    resource: null as any,
    sectionId: undefined as string | number | undefined,
    isSaving: false
  });

  // Global modal state for adding resources (prevents unmounting issues)
  const [globalAddResourceModal, setGlobalAddResourceModal] = useState({
    open: false,
    sectionId: undefined as string | number | undefined,
    isSaving: false
  });

  // QuickAction interface for modal state
  interface QuickAction {
    id: string;
    label: string;
    url: string;
    type: "meeting" | "chat" | "custom" | "demo" | "leadgen";
    icon?: string;
    settings?: Record<string, any>;
  }

  // Global modal state for QuickAction editing (prevents unmounting issues)
  const [globalQuickActionEditModal, setGlobalQuickActionEditModal] = useState({
    open: false,
    action: null as QuickAction | null,
    sectionId: undefined as string | number | undefined,
    isSaving: false
  });

  // Global modal state for QuickAction type selection
  const [globalQuickActionTypeModal, setGlobalQuickActionTypeModal] = useState({
    open: false,
    sectionId: undefined as string | number | undefined,
    isSaving: false
  });

  // Global modal state for QuickAction adding
  const [globalQuickActionAddModal, setGlobalQuickActionAddModal] = useState({
    open: false,
    actionType: "custom" as QuickAction["type"],
    sectionId: undefined as string | number | undefined,
    isSaving: false
  });

  // Use external tab control if provided, otherwise use internal state
  const currentActiveTab = activeTab !== undefined ? activeTab : activeTabState;
  const handleTabChange = onTabChange || setActiveTabState;

  // Filter and sort sections based on edit mode
  const sortedSections = [...sections]
    .filter((section) => {
      // In edit mode, show all sections (including hidden ones)
      // In preview mode, only show visible sections
      return showEditControls ? true : section.isVisible;
    })
    .sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 0;
      const orderB = typeof b.order === "number" ? b.order : 0;
      return orderA - orderB;
    });

  // Global resource editing handlers to prevent modal state loss during component remounting
  const handleGlobalEditResource = (
    resource: any,
    sectionId?: string | number
  ) => {
    setGlobalEditResourceModal({
      open: true,
      resource: {...resource},
      sectionId: sectionId || undefined,
      isSaving: false
    });
  };

  const handleGlobalSaveResource = async (updatedResource: any) => {
    setGlobalEditResourceModal((prev) => ({...prev, isSaving: true}));

    try {
      if (onEditResource && globalEditResourceModal.sectionId) {
        const result = onEditResource(
          updatedResource,
          globalEditResourceModal.sectionId
        );

        if (result instanceof Promise) {
          await result;
        }
      }

      setGlobalEditResourceModal({
        open: false,
        resource: null,
        sectionId: undefined,
        isSaving: false
      });
    } catch (error) {
      console.error("Error in edit resource:", error);
      setGlobalEditResourceModal((prev) => ({...prev, isSaving: false}));
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleGlobalCancelEdit = () => {
    if (globalEditResourceModal.isSaving) {
      return;
    }
    setGlobalEditResourceModal({
      open: false,
      resource: null,
      sectionId: undefined,
      isSaving: false
    });
  };

  // Global resource adding handlers to prevent modal state loss during component remounting
  const handleGlobalAddResource = (sectionId?: string | number) => {
    setGlobalAddResourceModal({
      open: true,
      sectionId: sectionId || undefined,
      isSaving: false
    });
  };

  const handleGlobalSaveNewResource = async (newResource: any) => {
    setGlobalAddResourceModal((prev) => ({...prev, isSaving: true}));

    try {
      if (onEditResource && globalAddResourceModal.sectionId) {
        const result = onEditResource(
          newResource,
          globalAddResourceModal.sectionId
        );

        if (result instanceof Promise) {
          await result;
        }
      }

      setGlobalAddResourceModal({
        open: false,
        sectionId: undefined,
        isSaving: false
      });
    } catch (error) {
      console.error("Error in add resource:", error);
      setGlobalAddResourceModal((prev) => ({...prev, isSaving: false}));
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleGlobalCancelAdd = () => {
    if (globalAddResourceModal.isSaving) {
      return;
    }
    setGlobalAddResourceModal({
      open: false,
      sectionId: undefined,
      isSaving: false
    });
  };

  // Global QuickAction editing handlers
  const handleGlobalEditAction = (
    action: QuickAction,
    sectionId?: string | number
  ) => {
    setGlobalQuickActionEditModal({
      open: true,
      action: {...action},
      sectionId: sectionId || undefined,
      isSaving: false
    });
  };

  const handleGlobalSaveAction = async (updatedAction: QuickAction) => {
    setGlobalQuickActionEditModal((prev) => ({...prev, isSaving: true}));

    try {
      if (onEditAction && globalQuickActionEditModal.sectionId) {
        await new Promise((resolve) => {
          onEditAction(updatedAction, globalQuickActionEditModal.sectionId);
          setTimeout(resolve, 200);
        });
      }

      // Close modal first, then reset isSaving after a brief delay to prevent button flicker
      setGlobalQuickActionEditModal((prev) => ({...prev, open: false}));

      // Reset remaining state after modal closes
      setTimeout(() => {
        setGlobalQuickActionEditModal({
          open: false,
          action: null,
          sectionId: undefined,
          isSaving: false
        });
      }, 150);
    } catch (error) {
      console.error("Error in edit action:", error);
      setGlobalQuickActionEditModal((prev) => ({...prev, isSaving: false}));
      throw error;
    }
  };

  const handleGlobalCancelEditAction = () => {
    if (globalQuickActionEditModal.isSaving) {
      return;
    }
    setGlobalQuickActionEditModal({
      open: false,
      action: null,
      sectionId: undefined,
      isSaving: false
    });
  };

  // Global QuickAction adding handlers
  const handleGlobalAddAction = (sectionId?: string | number) => {
    setGlobalQuickActionTypeModal({
      open: true,
      sectionId: sectionId || undefined,
      isSaving: false
    });
  };

  const handleGlobalTypeSelection = (selectedType: QuickAction["type"]) => {
    setGlobalQuickActionTypeModal({
      open: false,
      sectionId: globalQuickActionTypeModal.sectionId,
      isSaving: false
    });
    setGlobalQuickActionAddModal({
      open: true,
      actionType: selectedType,
      sectionId: globalQuickActionTypeModal.sectionId,
      isSaving: false
    });
  };

  const handleGlobalCancelTypeSelection = () => {
    setGlobalQuickActionTypeModal({
      open: false,
      sectionId: undefined,
      isSaving: false
    });
  };

  const handleGlobalSaveNewAction = async (newAction: QuickAction) => {
    setGlobalQuickActionAddModal((prev) => ({...prev, isSaving: true}));

    try {
      if (onEditAction && globalQuickActionAddModal.sectionId) {
        await new Promise((resolve) => {
          onEditAction(newAction, globalQuickActionAddModal.sectionId);
          setTimeout(resolve, 200);
        });
      }

      // Close modal first, then reset isSaving after a brief delay to prevent button flicker
      setGlobalQuickActionAddModal((prev) => ({...prev, open: false}));

      // Reset remaining state after modal closes
      setTimeout(() => {
        setGlobalQuickActionAddModal({
          open: false,
          actionType: "custom",
          sectionId: undefined,
          isSaving: false
        });
      }, 150);
    } catch (error) {
      console.error("Error in add action:", error);
      setGlobalQuickActionAddModal((prev) => ({...prev, isSaving: false}));
      throw error;
    }
  };

  const handleGlobalCancelAddAction = () => {
    if (globalQuickActionAddModal.isSaving) {
      return;
    }
    setGlobalQuickActionAddModal({
      open: false,
      actionType: "custom",
      sectionId: undefined,
      isSaving: false
    });
  };

  const publicUrl = userProfile?.publicPath
    ? `https://app.withbadge.ai/${userProfile.publicPath}`
    : "https://app.withbadge.ai/"; // Fallback

  // const [isFollowed, setIsFollowed] = React.useState(false);
  const [showLeadFormFromQr, setShowLeadFormFromQr] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [draftBackgroundSettings, setDraftBackgroundSettings] = useState<{
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  } | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // 5px movement required before drag starts
      }
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end for section reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (active.id !== over?.id && onReorderSections) {
      const oldIndex = sortedSections.findIndex(
        (section) => section.id.toString() === active.id
      );
      const newIndex = sortedSections.findIndex(
        (section) => section.id.toString() === over?.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSections = [...sortedSections];
        const [movedSection] = reorderedSections.splice(oldIndex, 1);
        reorderedSections.splice(newIndex, 0, movedSection);

        // Update order property
        const updatedSections = reorderedSections.map((section, index) => ({
          ...section,
          order: index + 1
        }));

        onReorderSections(updatedSections);
      }
    }

    setActiveId(null);
  };

  // Get the active section for drag overlay
  const activeSection = activeId
    ? sortedSections.find((section) => section.id.toString() === activeId)
    : null;

  // Handle background modal open
  const handleOpenBackgroundModal = () => {
    // Initialize draft settings with current background settings
    setDraftBackgroundSettings(
      backgroundSettings || {type: "preset", preset: "gradient-1"}
    );
    setShowBackgroundModal(true);
  };

  // Handle background settings save
  const handleSaveBackgroundSettings = () => {
    if (draftBackgroundSettings && onBackgroundChange) {
      onBackgroundChange(draftBackgroundSettings);
      setShowBackgroundModal(false);
      setDraftBackgroundSettings(null);
    }
  };

  // Handle background settings cancel
  const handleCancelBackgroundSettings = () => {
    setShowBackgroundModal(false);
    setDraftBackgroundSettings(null);
  };

  // Check URL parameters to see if this is a QR code scan that should trigger lead form
  useEffect(() => {
    if (typeof window !== "undefined" && leadSettings?.captureFromQr) {
      const params = new URLSearchParams(window.location.search);
      const fromQr = params.get("fromQr") === "true";
      setShowLeadFormFromQr(fromQr);
    }
  }, [leadSettings]);

  const handleSaveContact = () => {
    if (!userProfile) return;
    downloadVCard({
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      email: userProfile.email,
      phoneNumber: userProfile.phoneNumber || undefined,
      organization: organization?.name,
      title: userProfile.title || undefined,
      linkedinProfile: userProfile.linkedinProfile || undefined,
      website: userProfile.website || organization?.website || undefined,
      profileImage: userProfile.profileImage || undefined
    });
  };

  // Render content based on active tab
  const renderTabContent = () => {
    if (currentActiveTab === "settings") {
      return (
        <div className="pt-0 pb-12 px-4 sm:px-6 md:px-0">
          <SettingsTab
            organization={organization}
            chatSettings={chatSettings}
            onChatSettingsChange={onChatSettingsChange}
            leadSettings={leadSettings}
            onLeadSettingsChange={onLeadSettingsChange}
            brandingSettings={brandingSettings}
            onBrandingChange={onBrandingChange}
            colorSettings={colorSettings}
            onColorSettingsChange={onColorSettingsChange}
            onBatchSave={onBatchSave}
            openSections={openSettingsSections}
            onSectionToggle={onSettingsSectionToggle}
            tabs={pages?.map((page) => ({
              id: page.id,
              name: String(page.name || ""),
              isVisible: page.isVisible !== false,
              privacy: page.privacy || "public",
              password: page.password
            }))}
            onSaveTabs={(updatedTabs) => {
              if (onEditTabs && updatedTabs) {
                // Just trigger the edit tabs function which will open the modal
                // for more advanced tab management
                onEditTabs();
              }
            }}
            onAddTab={onAddPage}
            subscriptionStatus={subscriptionStatus}
            planType={planType}
            hasPremiumAccess={hasPremiumAccess}
          />
        </div>
      );
    }

    // Content tab - split view with sections list and preview
    // If showEditControls is true, show split view; otherwise show regular preview
    if (showEditControls) {
      return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Left Panel - Sections List */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <ContentTab
              sections={sortedSections}
              activeSectionId={activeSectionId}
              onSectionClick={(sectionId) => {
                if (onEditSection) {
                  onEditSection(sectionId);
                }
              }}
              onAddSection={() => {
                if (onAddSection) {
                  onAddSection(undefined);
                }
              }}
              onReorderSections={onReorderSections}
              className="h-full"
            />
          </div>

          {/* Right Panel - Simplified Preview with drag handles only */}
          <div className="flex-1 min-w-0">
            <ScopedThemeProvider companyColor={organization?.defaultColor || null}>
              <Card className="flex flex-col flex-grow overflow-hidden shadow-md border border-stone-200 mx-auto max-w-[1100px] w-full h-full">
          {/* Browser bar at the top */}
          <BrowserBar
            url={publicUrl}
            className="mb-0 border-b border-t-0 border-x-0 rounded-t-none rounded-b-none"
            onOpenExternal={onOpenExternal}
            isRegister={isRegister}
          />

          <div
            className={`flex-grow overflow-auto bg-gray-50 ${isRegister ? "p-2 sm:p-3" : ""}`}
          >
            {/* Banner Display - only show when banner is configured */}
            {bannerData && backgroundSettings?.type === "banner" ? (
              <div className="h-40 sm:h-48 relative group">
                <BannerDisplay banner={bannerData} />
                {/* Background edit button for banner - hidden in split view */}
                {false && showEditControls && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="flex">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white shadow-sm rounded-r-none text-xs sm:text-sm"
                        onClick={handleOpenBackgroundModal}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        <span className="hidden xs:inline">Background</span>
                        <span className="xs:hidden">Bg</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Regular Background with gradient - only show when not banner */
              <div
                style={backgroundStyle}
                className="h-40 sm:h-48 relative group"
              >
                {/* Background content goes here if needed */}
                {backgroundImage && (
                  <img
                    src={backgroundImage}
                    alt="Background"
                    className={`w-full h-full object-cover bg-no-repeat ${isRegister ? "rounded-t-md" : ""}`}
                  />
                )}
                {/* Background edit button - hidden in split view */}
                {false && showEditControls && (
                  <div className="max-w-3xl mx-auto">
                    <div className="flex justify-end mr-2 sm:mr-4 pt-4 sm:pt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white shadow-sm rounded-r-none text-xs sm:text-sm"
                        onClick={handleOpenBackgroundModal}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        <span className="hidden xs:inline">Background</span>
                        <span className="xs:hidden">Bg</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col max-w-3xl mx-auto">
              {/* Contact card with overlap */}
              <div className="mx-3 sm:mx-4 -mt-5 sm:-mt-6 relative z-10">
                {userProfile ? (
                  <BadgeContactCard
                    firstName={userProfile.firstName}
                    lastName={userProfile.lastName}
                    title={userProfile.title}
                    organization={organization as Organization}
                    bio={userProfile.bio}
                    profileImage={userProfile.profileImage}
                    email={userProfile.email}
                    phoneNumber={userProfile.phoneNumber}
                    linkedinProfile={userProfile.linkedinProfile}
                    quickLinks={quickLinks}
                    hideEditButton={true}
                    isEditable={false}
                    onEditProfile={onEditProfile}
                    onProfileUpdate={onProfileUpdate}
                    onEditQuickLink={onEditQuickLink}
                    onToggleLinkVisibility={onToggleLinkVisibility}
                    onDeleteQuickLink={onDeleteQuickLink}
                    onAddQuickLink={onAddQuickLink}
                    iconColor={iconColor}
                    // onFollow={!isFollowed ? () => setIsFollowed(true) : undefined}
                    onSaveContact={handleSaveContact}
                    leadSettings={leadSettings}
                    showLeadFormInitially={showLeadFormFromQr}
                    onCompanyUpdate={onCompanyUpdate}
                    showBuiltWithBadge={
                      brandingSettings?.removeBuiltWithBadge !== true
                    }
                  />
                ) : (
                  <Card className="w-full overflow-hidden relative mb-4">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <div className="relative">
                            <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                            </div>
                          </div>
                          <div className="flex-1 py-[5px] flex flex-col gap-2.5">
                            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
                            <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-5 flex flex-wrap gap-2">
                        <Skeleton className="h-8 w-20 sm:w-24" />
                        <Skeleton className="h-8 w-20 sm:w-24" />
                        <Skeleton className="h-8 w-20 sm:w-24" />
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Page Navigation - Placed below contact card */}
              {pages && pages.length > 0 && (
                <div className="px-3 sm:px-4 pt-4 pb-0">
                  <SectionNavigation
                    buttonColor={buttonColor}
                    pages={pages}
                    activePage={activePage}
                    onPageClick={onPageClick || (() => {})}
                    className="w-full"
                    showEditControls={showEditControls}
                    onAddPage={showEditControls ? onAddPage : undefined}
                    onEditPage={showEditControls ? onEditPage : undefined}
                    onEditTabs={showEditControls ? onEditTabs : undefined}
                  />
                </div>
              )}

              {/* Section previews */}
              <div
                className={`px-3 lg:pl-8 xl:px-4 pb-14 space-y-2.5 ${
                  pages && pages.length > 0 ? "pt-0" : "pt-4"
                }`}
              >
                {/* Add section button removed - it's in ContentTab now */}

                {/* Sections in preview - no drag handles, just display */}
                {sortedSections.map((section) => (
                  <div key={section.id} className="overflow-hidden">
                    <SectionRenderer
                      section={section}
                      buttonColor={buttonColor}
                      iconColor={iconColor}
                      showEditControls={false}
                      dragHandlesOnly={false}
                      onEditSection={onEditSection}
                      onAddSection={onAddSection}
                      onToggleVisibility={onToggleVisibility}
                      onDeleteSection={onDeleteSection}
                      onSectionUpdate={onSectionUpdate}
                      showAddSectionButton={false}
                      onEditAction={handleGlobalEditAction}
                      onAddAction={handleGlobalAddAction}
                      onDeleteAction={onDeleteAction}
                      onEditResource={handleGlobalEditResource}
                      onAddResource={handleGlobalAddResource}
                      onDeleteResource={onDeleteResource}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </ScopedThemeProvider>
          </div>
        </div>
      );
    }

    // Content tab - regular preview (when showEditControls is false)
    return (
      <ScopedThemeProvider companyColor={organization?.defaultColor || null}>
        <Card className="flex flex-col flex-grow overflow-hidden shadow-md border border-stone-200 mx-auto max-w-[1100px] w-full">
          {/* Browser bar at the top */}
          <BrowserBar
            url={publicUrl}
            className="mb-0 border-b border-t-0 border-x-0 rounded-t-none rounded-b-none"
            onOpenExternal={onOpenExternal}
            isRegister={isRegister}
          />

          <div
            className={`flex-grow overflow-auto bg-gray-50 ${isRegister ? "p-2 sm:p-3" : ""}`}
          >
            {/* Banner Display - only show when banner is configured */}
            {bannerData && backgroundSettings?.type === "banner" ? (
              <div className="h-40 sm:h-48 relative group">
                <BannerDisplay banner={bannerData} />
              </div>
            ) : (
              /* Regular Background with gradient - only show when not banner */
              <div
                style={backgroundStyle}
                className="h-40 sm:h-48 relative group"
              >
                {backgroundImage && (
                  <img
                    src={backgroundImage}
                    alt="Background"
                    className={`w-full h-full object-cover bg-no-repeat ${isRegister ? "rounded-t-md" : ""}`}
                  />
                )}
              </div>
            )}

            <div className="flex flex-col max-w-3xl mx-auto">
              {/* Contact card with overlap */}
              <div className="mx-3 sm:mx-4 -mt-5 sm:-mt-6 relative z-10">
                {userProfile ? (
                  <BadgeContactCard
                    firstName={userProfile.firstName}
                    lastName={userProfile.lastName}
                    title={userProfile.title}
                    organization={organization as Organization}
                    bio={userProfile.bio}
                    profileImage={userProfile.profileImage}
                    email={userProfile.email}
                    phoneNumber={userProfile.phoneNumber}
                    linkedinProfile={userProfile.linkedinProfile}
                    quickLinks={quickLinks}
                    hideEditButton={!showEditControls}
                    isEditable={showEditControls}
                    onEditProfile={onEditProfile}
                    onProfileUpdate={onProfileUpdate}
                    onEditQuickLink={onEditQuickLink}
                    onToggleLinkVisibility={onToggleLinkVisibility}
                    onDeleteQuickLink={onDeleteQuickLink}
                    onAddQuickLink={onAddQuickLink}
                    iconColor={iconColor}
                    onSaveContact={handleSaveContact}
                    leadSettings={leadSettings}
                    showLeadFormInitially={showLeadFormFromQr}
                    onCompanyUpdate={onCompanyUpdate}
                    showBuiltWithBadge={
                      brandingSettings?.removeBuiltWithBadge !== true
                    }
                  />
                ) : (
                  <Card className="w-full overflow-hidden relative mb-4">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <div className="relative">
                            <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                            </div>
                          </div>
                          <div className="flex-1 py-[5px] flex flex-col gap-2.5">
                            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
                            <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-5 flex flex-wrap gap-2">
                        <Skeleton className="h-8 w-20 sm:w-24" />
                        <Skeleton className="h-8 w-20 sm:w-24" />
                        <Skeleton className="h-8 w-20 sm:w-24" />
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Page Navigation - Placed below contact card */}
              {pages && pages.length > 0 && (
                <div className="px-3 sm:px-4 pt-4 pb-0">
                  <SectionNavigation
                    buttonColor={buttonColor}
                    pages={pages}
                    activePage={activePage}
                    onPageClick={onPageClick || (() => {})}
                    className="w-full"
                    showEditControls={showEditControls}
                    onAddPage={showEditControls ? onAddPage : undefined}
                    onEditPage={showEditControls ? onEditPage : undefined}
                    onEditTabs={showEditControls ? onEditTabs : undefined}
                  />
                </div>
              )}

              {/* Section previews */}
              <div
                className={`px-3 lg:pl-8 xl:px-4 pb-14 space-y-2.5 ${
                  pages && pages.length > 0 ? "pt-0" : "pt-4"
                }`}
              >
                {/* Non-draggable sections for preview mode */}
                {sortedSections.map((section) => (
                  <div key={section.id} className="overflow-hidden">
                    <SectionRenderer
                      section={section}
                      buttonColor={buttonColor}
                      iconColor={iconColor}
                      showEditControls={showEditControls}
                      onEditSection={onEditSection}
                      onAddSection={onAddSection}
                      onToggleVisibility={onToggleVisibility}
                      onDeleteSection={onDeleteSection}
                      onSectionUpdate={onSectionUpdate}
                      showAddSectionButton={showEditControls}
                      onEditAction={handleGlobalEditAction}
                      onAddAction={handleGlobalAddAction}
                      onDeleteAction={onDeleteAction}
                      onEditResource={handleGlobalEditResource}
                      onAddResource={handleGlobalAddResource}
                      onDeleteResource={onDeleteResource}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </ScopedThemeProvider>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tabs */}
      {showEditControls && (
        <Tabs activeTab={currentActiveTab} onTabChange={handleTabChange} />
      )}

      {/* Tab Content */}
      {renderTabContent()}

      {/* Global Resource Edit Modal - Survives component remounting */}
      <ResourceEditModal
        open={globalEditResourceModal.open}
        resource={globalEditResourceModal.resource}
        sectionId={globalEditResourceModal.sectionId}
        isSaving={globalEditResourceModal.isSaving}
        onClose={handleGlobalCancelEdit}
        onSave={handleGlobalSaveResource}
      />

      {/* Global Resource Add Modal - Survives component remounting */}
      <ResourceAddModal
        open={globalAddResourceModal.open}
        sectionId={globalAddResourceModal.sectionId}
        isSaving={globalAddResourceModal.isSaving}
        onClose={handleGlobalCancelAdd}
        onSave={handleGlobalSaveNewResource}
      />

      {/* Global QuickAction Edit Modal - Survives component remounting */}
      <QuickActionEditModal
        open={globalQuickActionEditModal.open}
        action={globalQuickActionEditModal.action}
        isSaving={globalQuickActionEditModal.isSaving}
        onClose={handleGlobalCancelEditAction}
        onSave={handleGlobalSaveAction}
      />

      {/* Global QuickAction Type Selection Modal - Survives component remounting */}
      <QuickActionTypeSelectionModal
        open={globalQuickActionTypeModal.open}
        isSaving={globalQuickActionTypeModal.isSaving}
        onClose={handleGlobalCancelTypeSelection}
        onTypeSelect={handleGlobalTypeSelection}
        subscriptionStatus={subscriptionStatus}
        planType={planType}
        hasPremiumAccess={hasPremiumAccess}
      />

      {/* Global QuickAction Add Modal - Survives component remounting */}
      <QuickActionAddModal
        open={globalQuickActionAddModal.open}
        actionType={globalQuickActionAddModal.actionType}
        isSaving={globalQuickActionAddModal.isSaving}
        onClose={handleGlobalCancelAddAction}
        onSave={handleGlobalSaveNewAction}
      />

      {/* Background Settings Modal */}
      <Dialog
        open={showBackgroundModal}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelBackgroundSettings();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Background Settings</DialogTitle>
          </DialogHeader>
          {draftBackgroundSettings && (
            <div className="space-y-4">
              <BackgroundSettings
                settings={draftBackgroundSettings}
                onChange={setDraftBackgroundSettings}
                onEditBanner={() => {
                  // Close the background settings modal first
                  setShowBackgroundModal(false);
                  setDraftBackgroundSettings(null);

                  // Navigate to banner editor using client-side routing
                  setLocation("/brand-assets?tab=banner");
                }}
              />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelBackgroundSettings}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveBackgroundSettings}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
