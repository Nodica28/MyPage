import React, {useState} from "react";
import {
  FileText,
  Image as ImageIcon,
  Globe,
  File,
  ChevronRight,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import {cn} from "@/lib/utils";
import {VisuallyHidden} from "@/components/ui/visually-hidden";
import {ResourcePreviewModal} from "./modals/ResourcePreviewModal";
import {Card} from "@/components/ui/card";
import {InlineTextEditor} from "@/components/ui/inline-text-editor";
import {Button} from "@/components/ui/button";

// Define Resource interface
interface Resource {
  id: string;
  title?: string;
  name?: string; // For backward compatibility
  description?: string;
  type: "pdf" | "url" | "image" | "other";
  url: string;
  thumbnail?: string;
  size?: number;
}

// Props for ResourcesSection component
interface ResourcesSectionProps {
  title?: string;
  description?: string;
  resources: Resource[];
  className?: string;
  buttonColor?: string;
  iconColor?: string;
  showEditControls?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDescriptionChange?: (newDescription: string) => void;
  onEditResource?: (
    resource: Resource,
    sectionId?: string | number
  ) => Promise<void> | void;
  onAddResource?: (sectionId?: string | number) => void;
  onDeleteResource?: (resourceId: string, sectionId?: string | number) => void;
  sectionId?: string | number; // Add section ID prop
}

export function ResourcesSection({
  title,
  description,
  resources,
  className,
  iconColor = "#3b82f6",
  showEditControls = false,
  onTitleChange,
  onDescriptionChange,
  onEditResource,
  onAddResource,
  onDeleteResource,
  sectionId
}: ResourcesSectionProps) {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );

  // Helper to format file size
  const formatFileSize = (sizeInBytes?: number) => {
    if (!sizeInBytes) return null;

    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${Math.round(sizeInBytes / 1024)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Helper to get the appropriate icon based on resource type
  const getResourceIcon = (type: Resource["type"]) => {
    // Use consistent icon size, let CSS handle responsive sizing
    return (
      <div className="h-4 w-4 md:h-5 md:w-5">
        {type === "pdf" && <FileText className="h-full w-full" />}
        {type === "image" && <ImageIcon className="h-full w-full" />}
        {type === "url" && <Globe className="h-full w-full" />}
        {(type === "other" || !["pdf", "image", "url"].includes(type)) && (
          <File className="h-full w-full" />
        )}
      </div>
    );
  };

  // Get type description for better accessibility
  const getTypeDescription = (type: Resource["type"]) => {
    switch (type) {
      case "pdf":
        return "PDF document";
      case "image":
        return "Image";
      case "url":
        return "Web page";
      case "other":
      default:
        return "File";
    }
  };

  // Handle starting edit for a resource
  const handleStartEditResource = (resource: Resource) => {
    onEditResource?.(resource, sectionId);
  };

  return (
    <Card className={cn("py-5 px-4 md:px-6 space-y-4", className)}>
      {/* Title and description if provided */}
      {showEditControls ? (
        <InlineTextEditor
          value={title || ""}
          onSave={(newValue: string) => onTitleChange?.(newValue)}
          placeholder="Enter section title..."
          textClassName="text-lg font-medium"
          showEditButton={true}
        />
      ) : (
        title && <h3 className="text-lg font-medium">{title}</h3>
      )}
      {showEditControls ? (
        <InlineTextEditor
          value={description || ""}
          onSave={(newValue: string) => onDescriptionChange?.(newValue)}
          placeholder="Enter section description..."
          multiline={true}
          textClassName="text-sm text-muted-foreground whitespace-pre-wrap break-words"
          showEditButton={true}
        />
      ) : (
        description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {description}
          </p>
        )
      )}

      {/* Resources list - use CSS-only responsive design */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-4">
        {resources.map((resource) => {
          const displayName = resource.title || resource.name || "Resource";
          const typeDescription = getTypeDescription(resource.type);

          // Handle resource click
          const handleResourceClick = (
            e: React.MouseEvent,
            resource: Resource
          ) => {
            // Don't open preview if we're in edit mode and clicking on buttons
            if (
              showEditControls &&
              (e.target as HTMLElement).closest("button")
            ) {
              return;
            }

            e.preventDefault();
            setSelectedResource(resource);
            setPreviewModalOpen(true);
          };

          return (
            <div key={resource.id} className="relative">
              <a
                href={resource.url}
                onClick={(e) => handleResourceClick(e, resource)}
                className="block cursor-pointer"
                aria-label={`${displayName} - ${typeDescription}`}
              >
                <div className="overflow-hidden transition-shadow border bg-white/90 backdrop-blur-sm rounded-xl hover:shadow-sm md:hover:shadow-md active:shadow-inner">
                  {/* Thumbnail if available */}
                  {resource.thumbnail && (
                    <div className="aspect-[4/3] md:aspect-video w-full overflow-hidden">
                      {resource.thumbnail.startsWith("#") ? (
                        // Render color background for hex code thumbnails
                        <div
                          className="w-full h-full"
                          style={{backgroundColor: resource.thumbnail}}
                          aria-hidden="true"
                        />
                      ) : (
                        // Render image for URL thumbnails
                        <img
                          src={resource.thumbnail}
                          alt=""
                          aria-hidden="true"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  )}

                  {/* Resource details */}
                  <div className="p-4 md:p-3">
                    <div className="flex items-start space-x-3">
                      {/* Icon based on type */}
                      <div
                        className="rounded-full p-3 md:p-2 mt-0 md:mt-1"
                        style={{
                          backgroundColor: `${iconColor}10`,
                          color: iconColor
                        }}
                      >
                        {getResourceIcon(resource.type)}
                      </div>

                      {/* Title, description, and size */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate text-base md:text-sm">
                          {displayName}
                        </h4>

                        {resource.description && (
                          <p className="text-muted-foreground line-clamp-2 text-sm md:text-xs mt-1 md:mt-0.5">
                            {resource.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2 md:mt-1">
                          {resource.size && (
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(resource.size)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop-only chevron */}
                      <div className="hidden md:block ml-auto pl-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
                <VisuallyHidden>
                  Open {typeDescription}: {displayName}
                </VisuallyHidden>
              </a>

              {/* Edit button for each resource - only show when in edit mode */}
              {showEditControls && onEditResource && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8 p-2 rounded-lg bg-stone-50 border-stone-200 shadow-sm hover:bg-white z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartEditResource(resource);
                  }}
                  title="Edit resource"
                >
                  <Pencil className="h-3 w-3 text-stone-600" />
                </Button>
              )}

              {/* Delete button for each resource - only show when in edit mode */}
              {showEditControls && onDeleteResource && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-12 w-8 h-8 p-2 rounded-lg bg-stone-50 border-stone-200 shadow-sm hover:bg-red-50 hover:border-red-200 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteResource(resource.id, sectionId);
                  }}
                  title="Delete resource"
                >
                  <Trash2 className="h-3 w-3 text-stone-600 hover:text-red-600" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {resources.length === 0 && (
        <div className="text-center p-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No resources available
          </p>
        </div>
      )}

      {/* Add resource button - only show when in edit mode */}
      {showEditControls && onAddResource && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddResource?.(sectionId)}
            className="w-full rounded-lg border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        </div>
      )}

      {/* Resource Preview Modal */}
      <ResourcePreviewModal
        isOpen={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        resource={selectedResource}
      />
    </Card>
  );
}
