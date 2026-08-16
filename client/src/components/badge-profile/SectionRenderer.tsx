import React from "react";
import {
  Section,
  SectionTypeEnum,
  isQuickActionsContent,
  isResourcesContent,
  isCTAContent,
  isEmbedContent
} from "@/shared/types/sections";
import {QuickActionsSection} from "./QuickActionsSection";
import {ResourcesSection} from "./ResourcesSection";
import {CTASection} from "./CTASection";
import {EmbedSection} from "./EmbedSection";
import {GlobalChatSettings} from "@shared/types/chat";
import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  MoreHorizontal
} from "lucide-react";

interface SectionRendererProps {
  section: Section;
  className?: string;
  buttonColor?: string;
  iconColor?: string;
  chatSettings?: GlobalChatSettings;
  userPath?: string;
  userEmail?: string;
  showEditControls?: boolean;
  dragHandlesOnly?: boolean; // New prop: show only drag handles, hide other edit controls
  onEditSection?: (sectionId: string | number) => void;
  onAddSection?: (afterSectionId: string | number) => void;
  onToggleVisibility?: (sectionId: string | number) => void;
  onDeleteSection?: (sectionId: string | number) => void;
  onSectionUpdate?: (updatedSection: Section) => void;
  showAddSectionButton?: boolean;
  // Drag and drop props
  isDragging?: boolean;
  dragHandleProps?: any;
  // Quick Actions specific props
  onEditAction?: (action: any, sectionId?: string | number) => void;
  onAddAction?: (sectionId?: string | number) => void;
  onDeleteAction?: (actionId: string, sectionId?: string | number) => void;
  // Resources specific props
  onEditResource?: (
    resource: any,
    sectionId?: string | number
  ) => Promise<void> | void;
  onAddResource?: (sectionId?: string | number) => void;
  onDeleteResource?: (resourceId: string, sectionId?: string | number) => void;
}

// Add Section Button Component
const AddSectionButton = ({
  onAddSection,
  sectionId
}: {
  onAddSection?: (afterSectionId: string | number) => void;
  sectionId: string | number;
}) => {
  if (!onAddSection) return null;

  return (
    <div className="flex items-center justify-center py-4 group">
      {/* Left dashed line */}
      <div className="flex-1 h-px border-t border-dashed border-stone-300" />

      {/* Add Section Button */}
      <div className="px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddSection(sectionId)}
          className="rounded-full bg-white border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 hover:shadow-md transition-all duration-200 gap-1 px-3 py-3 lg:py-1.5 h-auto text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Right dashed line */}
      <div className="flex-1 h-px border-t border-dashed border-stone-300" />
    </div>
  );
};

export function SectionRenderer({
  section,
  className,
  buttonColor,
  iconColor,
  chatSettings,
  userPath,
  userEmail,
  showEditControls = false,
  dragHandlesOnly = false,
  onEditSection,
  onAddSection,
  onToggleVisibility,
  onDeleteSection,
  onSectionUpdate,
  showAddSectionButton = false,
  isDragging = false,
  dragHandleProps,
  onEditAction,
  onAddAction,
  onDeleteAction,
  onEditResource,
  onAddResource,
  onDeleteResource
}: SectionRendererProps) {
  // Helper function to get title - use section.name as fallback if content title is missing
  const getTitle = (contentTitle?: string) => {
    return contentTitle || section.name;
  };

  // Helper functions to handle title and description updates
  const handleTitleChange = (newTitle: string) => {
    if (onSectionUpdate) {
      const updatedSection = {
        ...section,
        content: {
          ...section.content,
          title: newTitle
        }
      };
      onSectionUpdate(updatedSection);
    }
  };

  const handleDescriptionChange = (newDescription: string) => {
    if (onSectionUpdate) {
      const updatedSection = {
        ...section,
        content: {
          ...section.content,
          description: newDescription
        }
      };
      onSectionUpdate(updatedSection);
    }
  };

  // Wrapper component for sections with edit controls
  const SectionWrapper = ({children}: {children: React.ReactNode}) => {
    return (
      <div className="space-y-0">
        {/* Section content with edit controls */}
        <div
          className={`${showEditControls ? "relative group" : ""} ${isDragging ? "opacity-30" : ""}`}
        >
          {/* Drag handle positioned absolutely to protrude from the left */}
          {showEditControls && (
            <div
              className="absolute left-0 top-0 -translate-y-8 lg:top-1/2 lg:-translate-y-1/2 lg:-translate-x-8 z-20 p-2 cursor-grab active:cursor-grabbing touch-none bg-white rounded-md shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4 text-stone-400 hover:text-stone-600" />
            </div>
          )}

          {/* Section content takes full width */}
          <div className="w-full overflow-hidden">
            <div
              className={`${
                showEditControls && !section.isVisible
                  ? "opacity-50 grayscale-[0.3]"
                  : ""
              }`}
            >
              {children}
            </div>
          </div>

          {/* Compact edit controls dropdown - only show if not dragHandlesOnly */}
          {showEditControls && !dragHandlesOnly && (
            <div className="absolute -top-8 sm:top-2 right-0 sm:right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 sm:w-9 sm:h-9 p-2 rounded-lg bg-stone-50 border-stone-200 shadow-sm hover:bg-white"
                  >
                    <MoreHorizontal className="h-4 w-4 text-stone-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
                  {/* Visibility toggle */}
                  {onToggleVisibility && (
                    <DropdownMenuItem
                      onClick={() => onToggleVisibility(section.id)}
                      className="cursor-pointer"
                    >
                      {section.isVisible ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          <span>Hide section</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          <span>Show section</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  {/* Edit section */}
                  {onEditSection &&
                    section.type !== SectionTypeEnum.QUICK_ACTIONS && (
                      <DropdownMenuItem
                        onClick={() => onEditSection(section.id)}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Edit section</span>
                      </DropdownMenuItem>
                    )}

                  {/* Delete section */}
                  {onDeleteSection && (
                    <DropdownMenuItem
                      onClick={() => onDeleteSection(section.id)}
                      className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete section</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Add Section Button at the bottom - only show if not dragHandlesOnly */}
        {showAddSectionButton && !dragHandlesOnly && section.isVisible && (
          <AddSectionButton
            onAddSection={onAddSection}
            sectionId={section.id}
          />
        )}
      </div>
    );
  };

  // Render the appropriate section component based on type and content
  switch (section.type) {
    case SectionTypeEnum.QUICK_ACTIONS:
      if (isQuickActionsContent(section.content)) {
        return (
          <SectionWrapper>
            <QuickActionsSection
              title={getTitle(section.content.title)}
              description={section.content.description}
              actions={section.content.actions || []}
              className={className}
              buttonColor={buttonColor}
              iconColor={iconColor}
              chatSettings={chatSettings}
              userPath={userPath}
              userEmail={userEmail}
              showEditControls={showEditControls}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
              onEditAction={(action) => onEditAction?.(action, section.id)}
              onAddAction={() => onAddAction?.(section.id)}
              onDeleteAction={(actionId) =>
                onDeleteAction?.(actionId, section.id)
              }
            />
          </SectionWrapper>
        );
      }
      break;

    case SectionTypeEnum.RESOURCES:
      return (
        <SectionWrapper>
          <ResourcesSection
            key={`resources-${section.id}`}
            title={getTitle(section.content.title)}
            description={section.content.description}
            resources={
              isResourcesContent(section.content)
                ? section.content.resources || []
                : []
            }
            className={className}
            buttonColor={buttonColor}
            iconColor={iconColor}
            showEditControls={showEditControls}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionChange}
            onEditResource={(resource) =>
              onEditResource?.(resource, section.id)
            }
            onAddResource={() => onAddResource?.(section.id)}
            onDeleteResource={(resourceId) =>
              onDeleteResource?.(resourceId, section.id)
            }
            sectionId={section.id}
          />
        </SectionWrapper>
      );

    case SectionTypeEnum.CTA:
      if (isCTAContent(section.content)) {
        return (
          <SectionWrapper>
            <CTASection
              title={getTitle(section.content.title)}
              description={section.content.description}
              buttonText={section.content.buttonText}
              buttonLink={section.content.buttonLink}
              // Legacy theme
              theme={section.content.theme}
              // New properties to match StandardCTASection rendering
              backgroundColor={section.content.backgroundColor}
              customBackgroundColor={section.content.customBackgroundColor}
              buttonColor={
                (section.content.buttonColor || buttonColor) as
                  | "brand"
                  | "white"
                  | "black"
                  | "custom"
              }
              customButtonColor={section.content.customButtonColor}
              template={section.content.template}
              iconLeft={section.content.iconLeft}
              image={section.content.image}
              className={className}
              showEditControls={showEditControls}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
            />
          </SectionWrapper>
        );
      }
      break;

    case SectionTypeEnum.EMBED:
    case SectionTypeEnum.VIDEO: // Handle VIDEO type same as EMBED
      if (isEmbedContent(section.content)) {
        return (
          <SectionWrapper>
            <EmbedSection
              title={getTitle(section.content.title)}
              description={section.content.description}
              embedUrl={section.content.embedUrl}
              embedType={section.content.embedType}
              embedCode={section.content.embedCode}
              buttonText={section.content.buttonText}
              buttonLink={section.content.buttonLink}
              className={className}
              showEditControls={showEditControls}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
            />
          </SectionWrapper>
        );
      }
      break;
  }

  // Fallback for unknown section types or invalid content
  return (
    <SectionWrapper>
      <div className={className}>
        <h3 className="text-lg font-medium">
          {section.name || "Unknown Section Type"}
        </h3>
        <p className="text-sm text-muted-foreground">
          This section type is not supported or has invalid content.
        </p>
      </div>
    </SectionWrapper>
  );
}
