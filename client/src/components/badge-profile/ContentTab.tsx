import React, {useState} from "react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Plus, MousePointer, FileText, Megaphone, PlayCircle, Eye, EyeOff, ChevronRight, GripVertical} from "lucide-react";
import {Section, SectionTypeEnum} from "@/shared/types/sections";
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

interface ContentTabProps {
  sections: Section[];
  activeSectionId?: string | number | null;
  onSectionClick: (sectionId: string | number) => void;
  onAddSection: () => void;
  onReorderSections?: (sections: Section[]) => void;
  className?: string;
}

// Helper to get section icon
function getSectionIcon(type: string) {
  switch (type) {
    case SectionTypeEnum.QUICK_ACTIONS:
      return <MousePointer className="h-5 w-5" />;
    case SectionTypeEnum.RESOURCES:
      return <FileText className="h-5 w-5" />;
    case SectionTypeEnum.CTA:
      return <Megaphone className="h-5 w-5" />;
    case SectionTypeEnum.EMBED:
    case SectionTypeEnum.VIDEO:
      return <PlayCircle className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

// Helper to get section display name
function getSectionDisplayName(type: string): string {
  switch (type) {
    case SectionTypeEnum.QUICK_ACTIONS:
      return "Action Buttons";
    case SectionTypeEnum.RESOURCES:
      return "Resources";
    case SectionTypeEnum.CTA:
      return "Announcement";
    case SectionTypeEnum.EMBED:
    case SectionTypeEnum.VIDEO:
      return "Embed";
    default:
      return "Section";
  }
}

// Sortable section item component
function SortableSectionItem({
  section,
  activeSectionId,
  onSectionClick,
  getSectionIcon,
  getSectionDisplayName
}: {
  section: Section;
  activeSectionId?: string | number | null;
  onSectionClick: (sectionId: string | number) => void;
  getSectionIcon: (type: string) => React.ReactNode;
  getSectionDisplayName: (type: string) => string;
}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({
      id: section.id.toString()
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const isActive = activeSectionId === section.id;
  const icon = getSectionIcon(section.type);
  const displayName = getSectionDisplayName(section.type);

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <button
        onClick={() => onSectionClick(section.id)}
        className={cn(
          "w-full text-left p-4 rounded-lg border transition-all relative",
          "hover:bg-stone-50 hover:border-stone-300",
          isActive
            ? "bg-blue-50 border-blue-200 shadow-sm"
            : "bg-white border-stone-200"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing touch-none text-stone-400 hover:text-stone-600"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 p-2 rounded-md",
              isActive ? "bg-blue-100 text-blue-600" : "bg-stone-100 text-stone-600"
            )}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-stone-900 text-sm">
                {section.name || displayName}
              </h3>
              {!section.isVisible && (
                <EyeOff className="h-3.5 w-3.5 text-stone-400" />
              )}
            </div>
            <p className="text-xs text-stone-500 line-clamp-1">
              {section.content?.description || displayName}
            </p>
          </div>

          {/* Active indicator / Chevron */}
          <div className="flex-shrink-0">
            {isActive ? (
              <div className="h-2 w-2 rounded-full bg-blue-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-stone-400" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

export function ContentTab({
  sections,
  activeSectionId,
  onSectionClick,
  onAddSection,
  onReorderSections,
  className
}: ContentTabProps) {
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedSections.findIndex(
      (section) => section.id.toString() === active.id
    );
    const newIndex = sortedSections.findIndex(
      (section) => section.id.toString() === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSections = [...sortedSections];
      const [movedSection] = reorderedSections.splice(oldIndex, 1);
      reorderedSections.splice(newIndex, 0, movedSection);

      // Update order property for each section
      const updatedSections = reorderedSections.map((section, index) => ({
        ...section,
        order: index + 1
      }));

      if (onReorderSections) {
        onReorderSections(updatedSections);
      }
    }
  };

  const activeSection = activeId
    ? sortedSections.find((s) => s.id.toString() === activeId)
    : null;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">My Sections</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddSection}
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto">
        {sortedSections.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <p className="text-sm">No sections yet</p>
            <p className="text-xs mt-1">Click "Add Section" to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedSections.map((section) => section.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedSections.map((section) => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    activeSectionId={activeSectionId}
                    onSectionClick={onSectionClick}
                    getSectionIcon={getSectionIcon}
                    getSectionDisplayName={getSectionDisplayName}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeSection ? (
                <div className="bg-white rounded-lg border-2 border-blue-200 shadow-lg opacity-95 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-1 text-stone-400">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-shrink-0 p-2 rounded-md bg-stone-100 text-stone-600">
                      {getSectionIcon(activeSection.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-stone-900 text-sm">
                        {activeSection.name || getSectionDisplayName(activeSection.type)}
                      </h3>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
