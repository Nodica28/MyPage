import React, {useState} from "react";
import {Card} from "@/components/ui/card";
import {Switch} from "@/components/ui/switch";
import {Button} from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  Lock,
  FileText
} from "lucide-react";
import {UpgradeBadge} from "@/components/ui/upgrade-badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {GlobalChatSettings} from "@shared/types/chat";
import {LeadSettings} from "@/shared/types/lead";
import {ChatSettingsEditor} from "@/components/badge-profile/ChatSettingsEditor";
import {LeadGenSettings} from "@/components/badge-profile/LeadGenSettings";
import {ColorSettings} from "@/components/badge-profile/ColorSettings";
import {Input} from "@/components/ui/input";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";

// DnD imports
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  closestCenter,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
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

export interface TabItem {
  id: string;
  name: string;
  isVisible?: boolean;
  privacy: "public" | "password" | "form";
  password?: string;
}

interface SettingsTabProps {
  organization?: Organization | null;
  chatSettings?: GlobalChatSettings;
  onChatSettingsChange?: (settings: GlobalChatSettings) => void;
  leadSettings?: LeadSettings;
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
  // External section control
  openSections?: {
    branding?: boolean;
    aiChat?: boolean;
    leadGeneration?: boolean;
    pageVisibility?: boolean;
  };
  onSectionToggle?: (section: string) => void;
  // Tab management
  tabs?: TabItem[];
  onSaveTabs?: (tabs: TabItem[]) => void;
  onAddTab?: () => void;
  // Subscription status for Pro features
  subscriptionStatus?: string;
  planType?: string;
  hasPremiumAccess?: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle} className="w-full">
      <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-stone-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-stone-600" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden will-change-auto data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down py-6">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  showUpgrade?: boolean;
  children?: React.ReactNode;
  showContentWhenChecked?: boolean;
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  showUpgrade = false,
  children,
  showContentWhenChecked = false
}: SettingRowProps) {
  return (
    <Card className="p-5 border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
        <div className="flex items-center gap-2 flex-1 justify-between">
          <span className="text-base font-medium text-stone-900 leading-[1.6]">
            {label}
          </span>
          {showUpgrade && <UpgradeBadge />}
        </div>
      </div>
      {description && (
        <p className="text-sm text-stone-600 mt-2">{description}</p>
      )}

      {/* Show children content when toggle is checked and showContentWhenChecked is true */}
      {children && showContentWhenChecked && checked && (
        <div className="mt-4 pt-4 border-t border-stone-200 bg-stone-50 rounded-md -mx-5 -mb-5 px-5 pb-5">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-stone-900 mb-1">
              Color Scheme
            </h4>
            <p className="text-xs text-stone-600">
              Customize your brand colors
            </p>
          </div>
          {children}
        </div>
      )}
    </Card>
  );
}

// Sortable tab item component
function SortableTabItem({
  tab,
  onEdit,
  onDelete,
  onPrivacyChange
}: {
  tab: TabItem;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onPrivacyChange: (
    id: string,
    privacy: "public" | "password" | "form",
    password?: string
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  const [isExpanded, setIsExpanded] = useState(false);
  const [password, setPassword] = useState(tab.password || "");

  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({
      id: tab.id
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onEdit(tab.id, editName);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(tab.name);
    }
  };

  const handlePrivacyChange = (value: string) => {
    const privacy = value as "public" | "password" | "form";
    onPrivacyChange(
      tab.id,
      privacy,
      privacy === "password" ? password : undefined
    );
  };

  const handlePasswordSave = () => {
    onPrivacyChange(tab.id, "password", password);
  };

  // Get the appropriate privacy badge
  const getPrivacyBadge = () => {
    switch (tab.privacy) {
      case "password":
        return (
          <div className="px-2 py-0.5 bg-gray-100 rounded-md text-xs flex items-center gap-1">
            <Lock className="h-3 w-3" />
            <span>Password</span>
          </div>
        );
      case "form":
        return (
          <div className="px-2 py-0.5 bg-gray-100 rounded-md text-xs flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>Form Submission</span>
          </div>
        );
      default:
        return (
          <div className="px-2 py-0.5 bg-gray-100 rounded-md text-xs flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>Public</span>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-4 mb-3 bg-white",
        isDragging ? "border-primary" : "border-gray-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>

          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-7 text-sm w-40"
            />
          ) : (
            <span className="font-medium">{tab.name}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getPrivacyBadge()}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing(true);
              setEditName(tab.name);
            }}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(tab.id)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn("mt-4 pt-4 border-t", !isExpanded && "hidden")}>
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            Tab Privacy Settings
          </h4>

          <RadioGroup
            value={tab.privacy}
            onValueChange={handlePrivacyChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id={`public-${tab.id}`} />
              <Label htmlFor={`public-${tab.id}`}>Public</Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="form" id={`form-${tab.id}`} />
              <Label htmlFor={`form-${tab.id}`}>Require Form Submission</Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="password" id={`password-${tab.id}`} />
              <Label htmlFor={`password-${tab.id}`}>Require Password</Label>
            </div>
          </RadioGroup>

          {tab.privacy === "password" && (
            <div className="mt-3 space-y-2">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="flex-1"
                />
                <Button onClick={handlePasswordSave}>Save</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
      >
        {isExpanded ? "Hide settings" : "Show settings"}
      </Button>
    </div>
  );
}

export function SettingsTab({
  chatSettings,
  onChatSettingsChange,
  leadSettings,
  onLeadSettingsChange,
  onBrandingChange,
  brandingSettings,
  colorSettings,
  onColorSettingsChange,
  onBatchSave,
  openSections,
  onSectionToggle,
  tabs = [],
  onSaveTabs,
  onAddTab,
  subscriptionStatus,
  planType,
  hasPremiumAccess
}: SettingsTabProps) {
  const [openSectionsState, setOpenSectionsState] = useState<{
    branding: boolean;
    aiChat: boolean;
    leadGeneration: boolean;
    pageVisibility: boolean;
  }>({
    branding: true,
    aiChat: false,
    leadGeneration: false,
    pageVisibility: false
  });

  // State for tab management
  const [tabItems, setTabItems] = useState<TabItem[]>(tabs);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // 5px movement required before drag starts
      }
    })
  );

  // Check if user has premium access (subscription or beta tester)
  // Use hasPremiumAccess if provided, otherwise fall back to subscription check
  const isProPlan =
    hasPremiumAccess === true ||
    (subscriptionStatus === "active" && planType === "pro");

  // Use external section control if provided, otherwise use internal state
  const currentOpenSections = openSections
    ? {
        branding: openSections.branding ?? openSectionsState.branding,
        aiChat: openSections.aiChat ?? openSectionsState.aiChat,
        leadGeneration:
          openSections.leadGeneration ?? openSectionsState.leadGeneration,
        pageVisibility:
          openSections.pageVisibility ?? openSectionsState.pageVisibility
      }
    : openSectionsState;

  const handleSectionToggle =
    onSectionToggle ||
    ((section: keyof typeof openSectionsState) => {
      setOpenSectionsState((prev) => ({
        ...prev,
        [section]: !prev[section]
      }));
    });

  // Saved state (represents what's currently in the database)
  const [savedSettings, setSavedSettings] = useState({
    chat: chatSettings,
    lead: leadSettings,
    branding: brandingSettings,
    color: colorSettings
  });

  // Local state for all settings to track changes
  const [localChatSettings, setLocalChatSettings] = useState<
    GlobalChatSettings | undefined
  >(chatSettings);
  const [localLeadSettings, setLocalLeadSettings] = useState<
    LeadSettings | undefined
  >(leadSettings);
  const [localBrandingSettings, setLocalBrandingSettings] =
    useState(brandingSettings);
  const [localColorSettings, setLocalColorSettings] = useState({
    buttonColor: colorSettings?.buttonColor || "#3b82f6",
    iconColor: colorSettings?.iconColor || "#3b82f6",
    useOrgDefault: colorSettings?.useOrgDefault || false
  });

  // Sync local state with props when they change (represents new saved state)
  React.useEffect(() => {
    setSavedSettings({
      chat: chatSettings,
      lead: leadSettings,
      branding: brandingSettings,
      color: colorSettings
    });
    setLocalChatSettings(chatSettings);
    setLocalLeadSettings(leadSettings);
    setLocalBrandingSettings(brandingSettings);
    if (colorSettings) {
      setLocalColorSettings({
        buttonColor: colorSettings.buttonColor || "#3b82f6",
        iconColor: colorSettings.iconColor || "#3b82f6",
        useOrgDefault: colorSettings.useOrgDefault || false
      });
    }
  }, [chatSettings, leadSettings, brandingSettings, colorSettings]);

  // Sync tabs state with props
  React.useEffect(() => {
    setTabItems(tabs);
  }, [tabs]);

  // Helper function to get normalized saved color settings
  const getSavedColorSettings = () => ({
    buttonColor: savedSettings.color?.buttonColor || "#3b82f6",
    iconColor: savedSettings.color?.iconColor || "#3b82f6",
    useOrgDefault: savedSettings.color?.useOrgDefault || false
  });

  // Helper function to detect which settings have changed
  const getChangedSettings = React.useCallback(() => {
    return {
      chat:
        JSON.stringify(localChatSettings) !==
        JSON.stringify(savedSettings.chat),
      lead:
        JSON.stringify(localLeadSettings) !==
        JSON.stringify(savedSettings.lead),
      branding:
        JSON.stringify(localBrandingSettings) !==
        JSON.stringify(savedSettings.branding),
      color:
        JSON.stringify(localColorSettings) !==
        JSON.stringify(getSavedColorSettings()),
      tabs: JSON.stringify(tabItems) !== JSON.stringify(tabs)
    };
  }, [
    localChatSettings,
    localLeadSettings,
    localBrandingSettings,
    localColorSettings,
    tabItems,
    savedSettings,
    tabs
  ]);

  // Check if there are any unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    const changes = getChangedSettings();
    return Object.values(changes).some(Boolean);
  }, [getChangedSettings]);

  const handleChatSettingsChange = (updatedSettings: GlobalChatSettings) => {
    setLocalChatSettings(updatedSettings);
  };

  const handleLeadSettingsChange = (updatedSettings: LeadSettings) => {
    setLocalLeadSettings(updatedSettings);
  };

  const handlePageVisibilityChange = (published: boolean) => {
    // This would typically update a page visibility setting
    // For now, we'll just log it since we don't have this in the current schema
    console.log("Page visibility changed:", published);
  };

  const handleBrandingToggle = (setting: string, value: boolean) => {
    const currentBranding = localBrandingSettings || {};
    if (setting === "removeBuiltWithBadge") {
      setLocalBrandingSettings({
        ...currentBranding,
        removeBuiltWithBadge: value
      });
    } else if (setting === "customBranding") {
      setLocalBrandingSettings({...currentBranding, customBranding: value});
    }
  };

  const handleColorSettingsChange = (settings: {
    buttonColor: string;
    iconColor: string;
  }) => {
    const updatedSettings = {
      ...settings,
      useOrgDefault: localColorSettings.useOrgDefault
    };
    setLocalColorSettings(updatedSettings);
  };

  const handleToggleOrgDefault = (useDefault: boolean) => {
    const updatedSettings = {
      buttonColor: localColorSettings.buttonColor,
      iconColor: localColorSettings.iconColor,
      useOrgDefault: useDefault
    };
    setLocalColorSettings(updatedSettings);
  };

  // Tab management handlers
  const handleEditTab = (id: string, name: string) => {
    setTabItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? {...item, name} : item))
    );
  };

  const handleDeleteTab = (id: string) => {
    // Don't allow deleting if only one tab remains
    if (tabItems.length <= 1) return;

    setTabItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const handlePrivacyChange = (
    id: string,
    privacy: "public" | "password" | "form",
    password?: string
  ) => {
    setTabItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? {...item, privacy, password} : item
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over && active.id !== over.id) {
      setTabItems((prevItems) => {
        const oldIndex = prevItems.findIndex((item) => item.id === active.id);
        const newIndex = prevItems.findIndex((item) => item.id === over.id);

        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    const changes = getChangedSettings();

    // Check if there are any changes to save
    const hasAnyChanges = Object.values(changes).some(Boolean);

    if (!hasAnyChanges) {
      return;
    }

    // Use batch save if available (preferred method to avoid race conditions)
    if (onBatchSave) {
      const allChangedSettings: {
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
      } = {};

      // Only include settings that have actually changed
      if (changes.chat && localChatSettings) {
        allChangedSettings.chatSettings = localChatSettings;
      }
      if (changes.lead && localLeadSettings) {
        allChangedSettings.leadSettings = localLeadSettings;
      }
      if (changes.branding && localBrandingSettings) {
        allChangedSettings.brandingSettings = localBrandingSettings;
      }
      if (changes.color) {
        allChangedSettings.colorSettings = localColorSettings;
      }

      // Make a single batch save call
      onBatchSave(allChangedSettings);
    } else {
      // Fallback to individual save handlers (legacy support)
      // Call them sequentially to reduce race condition likelihood
      const saveSequentially = async () => {
        if (changes.chat && onChatSettingsChange && localChatSettings) {
          onChatSettingsChange(localChatSettings);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (changes.lead && onLeadSettingsChange && localLeadSettings) {
          onLeadSettingsChange(localLeadSettings);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (changes.branding && onBrandingChange && localBrandingSettings) {
          onBrandingChange(localBrandingSettings);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (changes.color && onColorSettingsChange) {
          onColorSettingsChange(localColorSettings);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      };
      saveSequentially();
    }

    // Save tabs if they've changed
    if (changes.tabs && onSaveTabs) {
      onSaveTabs(tabItems);
    }

    // Update saved settings to match current local settings
    setSavedSettings({
      chat: localChatSettings,
      lead: localLeadSettings,
      branding: localBrandingSettings,
      color: localColorSettings
    });
  };

  const handleCancel = () => {
    // Reset local state to saved state
    setLocalChatSettings(savedSettings.chat);
    setLocalLeadSettings(savedSettings.lead);
    setLocalBrandingSettings(savedSettings.branding);
    setLocalColorSettings(getSavedColorSettings());
    setTabItems(tabs);
  };

  return (
    <div className="w-full max-w-[750px] mx-auto space-y-7">
      {/* Save/Cancel buttons - only show when there are changes */}
      {hasUnsavedChanges && (
        <Card className="p-4 border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 font-medium">
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-stone-600 border-stone-300 hover:bg-stone-50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Branding Section */}
      <CollapsibleSection
        title="Branding"
        isOpen={currentOpenSections.branding}
        onToggle={() => handleSectionToggle("branding")}
      >
        <div className="space-y-6">
          <SettingRow
            label='Remove "Built with Badge"'
            description="Hide the 'Built with Badge' branding from your profile"
            checked={localBrandingSettings?.removeBuiltWithBadge || false}
            onCheckedChange={(checked) => {
              console.log(
                "Remove Built with Badge toggle:",
                checked,
                "isProPlan:",
                isProPlan
              );
              handleBrandingToggle("removeBuiltWithBadge", checked);
            }}
            disabled={!isProPlan}
            showUpgrade={!isProPlan}
          />
          <SettingRow
            label="Custom branding"
            description="Customize your profile's button and icon colors"
            checked={localBrandingSettings?.customBranding || false}
            onCheckedChange={(checked) => {
              console.log(
                "Custom branding toggle:",
                checked,
                "isProPlan:",
                isProPlan
              );
              handleBrandingToggle("customBranding", checked);
            }}
            disabled={!isProPlan}
            showUpgrade={!isProPlan}
            showContentWhenChecked={true}
          >
            {isProPlan && (
              <ColorSettings
                buttonColor={localColorSettings.buttonColor}
                iconColor={localColorSettings.iconColor}
                onChange={handleColorSettingsChange}
                useOrgDefault={localColorSettings.useOrgDefault}
                onToggleOrgDefault={handleToggleOrgDefault}
              />
            )}
          </SettingRow>
        </div>
      </CollapsibleSection>

      {/* AI Chat Section */}
      <CollapsibleSection
        title="AI Chat"
        isOpen={currentOpenSections.aiChat}
        onToggle={() => handleSectionToggle("aiChat")}
      >
        <Card className="p-5 border border-stone-200 shadow-sm">
          <ChatSettingsEditor
            settings={localChatSettings}
            onChange={handleChatSettingsChange}
            subscriptionStatus={subscriptionStatus}
            planType={planType}
            hasPremiumAccess={hasPremiumAccess}
          />
        </Card>
      </CollapsibleSection>

      {/* Lead Generation Section */}
      <div data-section="leadGeneration">
        <CollapsibleSection
          title="Lead Generation (QR Code)"
          isOpen={currentOpenSections.leadGeneration}
          onToggle={() => handleSectionToggle("leadGeneration")}
        >
          <Card className="p-5 border border-stone-200 shadow-sm">
            {localLeadSettings && (
              <LeadGenSettings
                settings={localLeadSettings}
                onChange={handleLeadSettingsChange}
                subscriptionStatus={subscriptionStatus}
                planType={planType}
                hasPremiumAccess={hasPremiumAccess}
              />
            )}
          </Card>
        </CollapsibleSection>
      </div>

      {/* Page Visibility Section */}
      <CollapsibleSection
        title="Page Visibility"
        isOpen={currentOpenSections.pageVisibility}
        onToggle={() => handleSectionToggle("pageVisibility")}
      >
        <Card className="p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between gap-6 mb-6">
            <Switch
              checked={true}
              onCheckedChange={handlePageVisibilityChange}
            />
            <div className="flex-1">
              <span className="text-[15px] font-medium text-stone-900 leading-[1.6]">
                Published
              </span>
            </div>
          </div>

          <div className="border-t pt-6 mt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium">Manage Tabs</h3>
              {onAddTab && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddTab}
                  className="text-xs"
                >
                  + Add Tab
                </Button>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tabItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {tabItems.map((tab) => (
                  <SortableTabItem
                    key={tab.id}
                    tab={tab}
                    onEdit={handleEditTab}
                    onDelete={handleDeleteTab}
                    onPrivacyChange={handlePrivacyChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </Card>
      </CollapsibleSection>
    </div>
  );
}
