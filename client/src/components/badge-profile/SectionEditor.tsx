import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Info,
  X,
  Plus,
  Pencil,
  Trash,
  ImageIcon,
  FileText,
  Link2,
  Upload,
  Loader2
} from "lucide-react";
import {
  Section,
  SectionTypeEnum,
  ResourcesContent,
  Resource
} from "@/shared/types/sections";
import StandardCTASection from "@/components/badge-profile/StandardCTASection";

// Props for the SectionEditor component
interface SectionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  section?: Section; // If provided, we're in edit mode, otherwise add mode
  onSave: (section: Section) => Promise<void> | void;
}

export function SectionEditor({
  isOpen,
  onClose,
  section,
  onSave
}: SectionEditorProps) {
  // State for the section being edited
  const [editedSection, setEditedSection] = useState<Section | null>(null);

  // Loading and error states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // State for inline resource editing
  const [inlineResourceEditing, setInlineResourceEditing] = useState<{
    mode: "add" | "edit";
    resourceId?: string;
  } | null>(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceType, setResourceType] = useState<
    "url" | "pdf" | "docx" | "image" | "other"
  >("url");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceThumbnailType, setResourceThumbnailType] = useState<
    "color" | "image"
  >("color");
  const [resourceThumbnailColor, setResourceThumbnailColor] =
    useState("#3b82f6");
  const [resourceThumbnailUrl, setResourceThumbnailUrl] = useState("");

  // Add upload state and function after the existing state declarations
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add filename display
  const [resourceFileName, setResourceFileName] = useState<string | null>(null);
  const [thumbnailFileName, setThumbnailFileName] = useState<string | null>(
    null
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const thumbnailInputRef = React.useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    const isDocx =
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (resourceType === "image" && !isImage) {
      setUploadError("Please upload an image file");
      return;
    }

    if (resourceType === "pdf" && !isPDF) {
      setUploadError("Please upload a PDF document");
      return;
    }

    if (resourceType === "docx" && !isDocx) {
      setUploadError("Please upload a DOCX document");
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);

      // Upload to server
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();

      // Update resource URL with the uploaded file URL
      setResourceUrl(data.url);
      setResourceFileName(file.name);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Initialize the form with the provided section or create a new one
  useEffect(() => {
    if (isOpen) {
      // Reset states when modal opens, but don't reset isSaving if we're currently saving
      setSaveError(null);

      // Only reset isSaving if we're not currently in the middle of a save operation
      if (!isSaving) {
        setIsSaving(false);
      }

      if (section) {
        // Edit mode - use the provided section
        setEditedSection({...section});
      } else {
        // Add mode - create a new empty section
        setEditedSection(null);
      }
    }
  }, [isOpen, section]); // Note: removed isSaving from dependency array to avoid infinite loops // Helper to create a default name for new sections based on type
  const getDefaultSectionName = (
    type: (typeof SectionTypeEnum)[keyof typeof SectionTypeEnum]
  ) => {
    switch (type) {
      case SectionTypeEnum.QUICK_ACTIONS:
        return "Quick Actions";
      case SectionTypeEnum.RESOURCES:
        return "Resources";
      case SectionTypeEnum.CTA:
        return "Call to Action";
      case SectionTypeEnum.EMBED:
        return "Embed";
      case SectionTypeEnum.VIDEO:
        return "Video";
      default:
        return "New Section";
    }
  };

  // If there's no section to edit, render nothing
  if (!isOpen) return null;

  // Handle saving the section
  const handleSave = async () => {
    if (!editedSection || isSaving) return;

    // Clear any previous errors
    setSaveError(null);
    setIsSaving(true);

    try {
      // Validate required fields based on section type
      if (
        editedSection.type === SectionTypeEnum.EMBED ||
        editedSection.type === SectionTypeEnum.VIDEO
      ) {
        const embedUrl = getContentValue("embedUrl");
        if (!embedUrl || embedUrl.trim() === "") {
          // Focus the embed URL input field
          const embedUrlInput = document.getElementById("embedUrl");
          if (embedUrlInput) {
            embedUrlInput.focus();
            (embedUrlInput as HTMLInputElement).setCustomValidity(
              "Embed URL is required"
            );
            (embedUrlInput as HTMLInputElement).reportValidity();
            setTimeout(() => {
              (embedUrlInput as HTMLInputElement).setCustomValidity("");
            }, 3000);
          }
          setIsSaving(false);
          return;
        }
      }

      // Ensure we have a valid name for every section type
      let sectionName = "";

      if (editedSection.type === SectionTypeEnum.CTA) {
        // For CTA sections, keep the existing name or use a default
        sectionName = editedSection.name || "Call to Action";
      } else {
        // For other sections, use content title as name if available
        sectionName =
          (editedSection.content.title as string) ||
          editedSection.name ||
          getDefaultSectionName(editedSection.type);
      }

      const sectionToSave = {
        ...editedSection,
        name: sectionName
      };

      // Call the parent's onSave function
      await onSave(sectionToSave);

      // Brief delay to ensure UI shows completion, then close
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear loading state and close
      setIsSaving(false);
      onClose();
    } catch (error) {
      console.error("Failed to save section:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save section. Please try again."
      );
      setIsSaving(false);
    }
  };

  // Handle updating section content fields
  const handleContentChange = (field: string, value: any) => {
    if (!editedSection) return;

    setEditedSection({
      ...editedSection,
      content: {
        ...editedSection.content,
        [field]: value
      }
    });
  };

  // Helper function to get field value safely based on section type
  const getContentValue = (field: string, defaultValue: string = "") => {
    if (!editedSection) return defaultValue;

    // Make type-safe access based on section type
    switch (editedSection.type) {
      case SectionTypeEnum.CTA:
        if (field === "theme" && "theme" in editedSection.content) {
          return editedSection.content.theme || defaultValue;
        }
        break;
      case SectionTypeEnum.EMBED:
      case SectionTypeEnum.VIDEO:
        if (field === "embedUrl" && "embedUrl" in editedSection.content) {
          return editedSection.content.embedUrl || defaultValue;
        }
        if (field === "embedType" && "embedType" in editedSection.content) {
          return editedSection.content.embedType || defaultValue;
        }
        break;
    }

    // Common fields are safe to access directly
    return (editedSection.content as any)[field] || defaultValue;
  };

  // Function to render content editor based on section type
  const renderContentEditor = () => {
    if (!editedSection) return null;

    switch (editedSection.type) {
      case SectionTypeEnum.QUICK_ACTIONS:
        // Quick Actions are now edited inline via individual action modals
        // No section-level editing is needed
        return null;

      case SectionTypeEnum.RESOURCES:
        return (
          <div className="mt-4">
            <div className="space-y-4">
              {"resources" in editedSection.content &&
              editedSection.content.resources &&
              editedSection.content.resources.length > 0 ? (
                editedSection.content.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="p-3 border rounded-md shadow-sm bg-background flex items-center justify-between hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-full text-primary">
                        {resource.type === "image" ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : resource.type === "pdf" ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {resource.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {resource.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          // Instead of opening a modal, we'll set the inline editing mode
                          setInlineResourceEditing({
                            mode: "edit",
                            resourceId: resource.id
                          });

                          // Set form values from resource
                          setResourceTitle(resource.title || "");
                          setResourceDescription(resource.description || "");
                          setResourceType(resource.type);
                          setResourceUrl(resource.url);

                          // Handle thumbnail
                          if (resource.thumbnail?.startsWith("#")) {
                            setResourceThumbnailType("color");
                            setResourceThumbnailColor(resource.thumbnail);
                          } else if (resource.thumbnail) {
                            setResourceThumbnailType("image");
                            setResourceThumbnailUrl(resource.thumbnail);
                          } else {
                            setResourceThumbnailType("color");
                            setResourceThumbnailColor("#3b82f6");
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive hover:bg-red-100 hover:text-red-600 hover:border-red-200"
                        onClick={() => {
                          // Delete the resource
                          if (
                            "resources" in editedSection.content &&
                            editedSection.content.resources
                          ) {
                            const updatedResources =
                              editedSection.content.resources.filter(
                                (r) => r.id !== resource.id
                              );

                            setEditedSection({
                              ...editedSection,
                              content: {
                                ...editedSection.content,
                                resources: updatedResources
                              }
                            });
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-3 border border-dashed rounded-md">
                  <p className="text-sm text-muted-foreground">
                    No resources added yet
                  </p>
                </div>
              )}

              {!inlineResourceEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    // Instead of opening a modal, set inline editing mode to 'add'
                    setInlineResourceEditing({mode: "add"});

                    // Reset form values for new resource
                    setResourceTitle("");
                    setResourceDescription("");
                    setResourceType("url");
                    setResourceUrl("");
                    setResourceThumbnailType("color");
                    setResourceThumbnailColor("#3b82f6");
                    setResourceThumbnailUrl("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              )}

              {/* Inline resource editor */}
              {inlineResourceEditing && (
                <div className="border rounded-md p-4 space-y-4 mt-4 bg-muted/20">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">
                      {inlineResourceEditing.mode === "add"
                        ? "Add New Resource"
                        : "Edit Resource"}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInlineResourceEditing(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="resourceTitle">Title</Label>
                      <Input
                        id="resourceTitle"
                        value={resourceTitle}
                        onChange={(e) => setResourceTitle(e.target.value)}
                        placeholder="Resource title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="resourceDescription">
                        Description (optional)
                      </Label>
                      <Textarea
                        id="resourceDescription"
                        value={resourceDescription}
                        onChange={(e) => setResourceDescription(e.target.value)}
                        placeholder="Brief description of this resource"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="resourceType">Type</Label>
                      <Select
                        value={resourceType}
                        onValueChange={(value) => setResourceType(value as any)}
                      >
                        <SelectTrigger id="resourceType">
                          <SelectValue placeholder="Select resource type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">URL Link</SelectItem>
                          <SelectItem value="pdf">PDF Document</SelectItem>
                          <SelectItem value="docx">Word Document</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="resourceUrl">
                        {resourceType === "url" ? "URL" : "File"}
                      </Label>
                      {resourceType === "url" ? (
                        <Input
                          id="resourceUrl"
                          value={resourceUrl}
                          onChange={(e) => setResourceUrl(e.target.value)}
                          placeholder="https://example.com/resource"
                        />
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="resourceUrl"
                              value={resourceUrl}
                              onChange={(e) => setResourceUrl(e.target.value)}
                              placeholder={
                                resourceType === "image"
                                  ? "Enter an image URL or upload an image file"
                                  : resourceType === "pdf"
                                    ? "Enter a PDF URL or upload a PDF file"
                                    : resourceType === "docx"
                                      ? "Enter a Word document URL or upload a DOCX file"
                                      : "Enter a resource URL or upload a file"
                              }
                              className="flex-1"
                            />
                            <div>
                              <Input
                                ref={fileInputRef}
                                type="file"
                                accept={
                                  resourceType === "image"
                                    ? "image/*"
                                    : resourceType === "pdf"
                                      ? "application/pdf"
                                      : resourceType === "docx"
                                        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        : "*/*"
                                }
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploadingFile}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 gap-1 "
                                disabled={uploadingFile}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Upload className="h-4 w-4" />
                                {uploadingFile ? "Uploading..." : "Upload"}
                              </Button>
                            </div>
                          </div>
                          {resourceFileName &&
                            (resourceType === "image" ||
                              resourceType === "pdf" ||
                              resourceType === "docx" ||
                              resourceType === "other") && (
                              <div className="flex items-center gap-2 mt-1.5 text-xs text-primary">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[250px]">
                                  {resourceFileName}
                                </span>
                              </div>
                            )}
                          {uploadError && (
                            <p className="text-xs text-destructive mt-1">
                              {uploadError}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {resourceType === "image"
                              ? "Enter an image URL or upload an image file"
                              : resourceType === "pdf"
                                ? "Enter a PDF URL or upload a PDF file"
                                : resourceType === "docx"
                                  ? "Enter a Word document URL or upload a DOCX file"
                                  : "Enter a resource URL or upload a file"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Thumbnail</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Button
                          type="button"
                          variant={
                            resourceThumbnailType === "color"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setResourceThumbnailType("color")}
                        >
                          Color
                        </Button>
                        <Button
                          type="button"
                          variant={
                            resourceThumbnailType === "image"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setResourceThumbnailType("image")}
                        >
                          Image
                        </Button>
                      </div>

                      {resourceThumbnailType === "color" ? (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {[
                            "#3b82f6",
                            "#ef4444",
                            "#10b981",
                            "#8b5cf6",
                            "#eab308",
                            "#f97316",
                            "#14b8a6",
                            "#ec4899"
                          ].map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`h-8 rounded-md ${resourceThumbnailColor === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                              style={{backgroundColor: color}}
                              onClick={() => setResourceThumbnailColor(color)}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Image URL"
                              value={resourceThumbnailUrl}
                              onChange={(e) =>
                                setResourceThumbnailUrl(e.target.value)
                              }
                              className="flex-1"
                            />
                            <div>
                              <Input
                                ref={thumbnailInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  if (!file.type.startsWith("image/")) {
                                    setUploadError(
                                      "Please upload an image file for thumbnail"
                                    );
                                    return;
                                  }

                                  setUploadingFile(true);
                                  setUploadError(null);

                                  try {
                                    const formData = new FormData();
                                    formData.append("file", file);

                                    const response = await fetch(
                                      "/api/upload",
                                      {
                                        method: "POST",
                                        body: formData
                                      }
                                    );

                                    if (!response.ok) {
                                      throw new Error(
                                        "Failed to upload thumbnail"
                                      );
                                    }

                                    const data = await response.json();
                                    setResourceThumbnailUrl(data.url);
                                    setThumbnailFileName(file.name);
                                  } catch (error) {
                                    console.error(
                                      "Thumbnail upload error:",
                                      error
                                    );
                                    setUploadError(
                                      "Failed to upload thumbnail. Please try again."
                                    );
                                  } finally {
                                    setUploadingFile(false);
                                  }
                                }}
                                disabled={uploadingFile}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 gap-1"
                                disabled={uploadingFile}
                                onClick={() =>
                                  thumbnailInputRef.current?.click()
                                }
                              >
                                <Upload className="h-4 w-4" />
                                {uploadingFile ? "Uploading..." : "Upload"}
                              </Button>
                            </div>
                          </div>
                          {thumbnailFileName && (
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-primary">
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[250px]">
                                {thumbnailFileName}
                              </span>
                            </div>
                          )}
                          {uploadError && resourceThumbnailType === "image" && (
                            <p className="text-xs text-destructive mt-1">
                              {uploadError}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter an image URL or upload an image for the
                            thumbnail
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInlineResourceEditing(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Save the resource
                          const newResource: Resource = {
                            id:
                              inlineResourceEditing.mode === "edit" &&
                              inlineResourceEditing.resourceId
                                ? inlineResourceEditing.resourceId
                                : `resource-${Date.now()}`,
                            title: resourceTitle,
                            description: resourceDescription,
                            type: resourceType as any,
                            url: resourceUrl,
                            thumbnail:
                              resourceThumbnailType === "color"
                                ? resourceThumbnailColor
                                : resourceThumbnailUrl || undefined
                          };

                          // Update resources in section
                          const updatedContent = {
                            ...editedSection.content
                          } as ResourcesContent;

                          if (!("resources" in updatedContent)) {
                            updatedContent.resources = [];
                          }

                          if (
                            inlineResourceEditing.mode === "edit" &&
                            inlineResourceEditing.resourceId
                          ) {
                            // Update existing resource
                            updatedContent.resources =
                              updatedContent.resources?.map((r) =>
                                r.id === inlineResourceEditing.resourceId
                                  ? newResource
                                  : r
                              );
                          } else {
                            // Add new resource
                            updatedContent.resources = [
                              ...(updatedContent.resources || []),
                              newResource
                            ];
                          }

                          // Update section
                          setEditedSection({
                            ...editedSection,
                            content: updatedContent
                          });

                          // Reset inline editing state
                          setInlineResourceEditing(null);
                        }}
                      >
                        {inlineResourceEditing.mode === "add"
                          ? "Add Resource"
                          : "Update Resource"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isSaving && onClose()}
    >
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] p-0 overflow-hidden"
        hideCloseButton
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="bg-background p-6 pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-lg font-semibold">
                {section ? "Edit Section" : "Add Section"}
              </span>
              <DialogClose asChild>
                <Button
                  className="w-8 h-8"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-6 py-4">
            {editedSection ? (
              <div className="space-y-4">
                {/* Hide section title/description for CTA sections */}
                {editedSection.type !== SectionTypeEnum.CTA && (
                  <>
                    <div>
                      <Label htmlFor="sectionTitle">Section Title</Label>
                      <Input
                        id="sectionTitle"
                        value={getContentValue("title")}
                        onChange={(e) => {
                          // Update the content title (this will be used as the section name at save time)
                          handleContentChange("title", e.target.value);
                        }}
                        placeholder={getDefaultSectionName(editedSection.type)}
                        disabled={isSaving}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This title will appear as the section heading on your
                        profile
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="sectionDescription">Description</Label>
                      <Textarea
                        id="sectionDescription"
                        value={getContentValue("description")}
                        onChange={(e) =>
                          handleContentChange("description", e.target.value)
                        }
                        disabled={isSaving}
                      />
                    </div>
                  </>
                )}

                {/* Type-specific fields */}
                {editedSection.type === SectionTypeEnum.CTA && (
                  <div
                    className={
                      editedSection.type === SectionTypeEnum.CTA
                        ? ""
                        : "border-t pt-4"
                    }
                  >
                    {/* Section name editor for CTA sections */}
                    <div className="mb-4">
                      <Label htmlFor="ctaSectionName">Section Name</Label>
                      <Input
                        id="ctaSectionName"
                        value={editedSection.name}
                        onChange={(e) => {
                          setEditedSection({
                            ...editedSection,
                            name: e.target.value
                          });
                        }}
                        placeholder="Call to Action"
                        disabled={isSaving}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This name is used to identify the section in navigation
                      </p>
                    </div>

                    {/* Don't use console.log inside JSX, move it outside if needed */}
                    <StandardCTASection
                      content={editedSection.content as any} // Use any type to bypass TypeScript errors
                      onChange={(updatedContent: any) => {
                        // Update the content but keep the existing section name
                        setEditedSection({
                          ...editedSection,
                          content: updatedContent
                        });
                      }}
                    />
                  </div>
                )}

                {(editedSection.type === SectionTypeEnum.EMBED ||
                  editedSection.type === SectionTypeEnum.VIDEO) && (
                  <>
                    <div>
                      <Label htmlFor="embedType">Embed Type</Label>
                      <Select
                        value={getContentValue("embedType", "video")}
                        onValueChange={(value) =>
                          handleContentChange("embedType", value)
                        }
                        disabled={isSaving}
                      >
                        <SelectTrigger id="embedType">
                          <SelectValue placeholder="Select embed type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="presentation">
                            Presentation
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="embedUrl">Embed URL</Label>
                      <Input
                        id="embedUrl"
                        value={getContentValue("embedUrl")}
                        required
                        onChange={(e) =>
                          handleContentChange("embedUrl", e.target.value)
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div>
                      <Label htmlFor="embedButtonText">Button Text</Label>
                      <Input
                        id="embedButtonText"
                        value={getContentValue("buttonText")}
                        onChange={(e) =>
                          handleContentChange("buttonText", e.target.value)
                        }
                        disabled={isSaving}
                      />
                    </div>
                  </>
                )}

                {/* Render content editor if needed */}
                {editedSection.type === SectionTypeEnum.RESOURCES &&
                  renderContentEditor()}

                {/* Info alerts for section types */}
                {editedSection.type === SectionTypeEnum.RESOURCES && (
                  <Alert className="bg-muted/50 mb-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Resources Section</AlertTitle>
                    <AlertDescription>
                      Add or edit resources that will be showcased on your
                      profile.
                    </AlertDescription>
                  </Alert>
                )}

                {editedSection.type !== SectionTypeEnum.RESOURCES &&
                  editedSection.type !== SectionTypeEnum.CTA && (
                    <Alert className="bg-muted/50 py-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Section Content</AlertTitle>
                      <AlertDescription>
                        For detailed content management like resources and quick
                        actions, please use the dedicated editors that will be
                        available in the next update.
                      </AlertDescription>
                    </Alert>
                  )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p>Loading section editor...</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-background">
            {saveError && (
              <p className="text-sm text-destructive mb-2 w-full text-center">
                {saveError}
              </p>
            )}
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Close Editor
            </Button>
            <Button onClick={handleSave} disabled={!editedSection || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Section"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
