import React, {useState} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {ChromePicker} from "react-color";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Upload, FileText, ImageIcon, Loader2} from "lucide-react";

interface Resource {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  type: "pdf" | "url" | "image" | "other";
  url: string;
  thumbnail?: string;
  size?: number;
}

interface ResourceAddModalProps {
  open: boolean;
  sectionId: string | number | undefined;
  isSaving: boolean;
  onClose: () => void;
  onSave: (newResource: Resource) => Promise<void>;
}

export function ResourceAddModal({
  open,
  sectionId,
  isSaving,
  onClose,
  onSave
}: ResourceAddModalProps) {
  // Form state
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingType, setEditingType] = useState<
    "pdf" | "url" | "image" | "other"
  >("url");
  const [editingUrl, setEditingUrl] = useState("");
  const [editingThumbnailType, setEditingThumbnailType] = useState<
    "color" | "image"
  >("color");
  const [editingThumbnailColor, setEditingThumbnailColor] = useState("#3b82f6");
  const [editingThumbnailUrl, setEditingThumbnailUrl] = useState("");

  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [resourceFileName, setResourceFileName] = useState<string | null>(null);
  const [thumbnailFileName, setThumbnailFileName] = useState<string | null>(
    null
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const thumbnailInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setEditingTitle("");
      setEditingDescription("");
      setEditingType("url");
      setEditingUrl("");
      setEditingThumbnailType("color");
      setEditingThumbnailColor("#3b82f6");
      setEditingThumbnailUrl("");
      setResourceFileName(null);
      setThumbnailFileName(null);
      setUploadError(null);
    }
  }, [open, sectionId]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setEditingTitle("");
      setEditingDescription("");
      setEditingType("url");
      setEditingUrl("");
      setEditingThumbnailType("color");
      setEditingThumbnailColor("#3b82f6");
      setEditingThumbnailUrl("");
      setResourceFileName(null);
      setThumbnailFileName(null);
      setUploadError(null);
    }
  }, [open]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (editingType === "image" && !isImage) {
      setUploadError("Please upload an image file");
      return;
    }

    if (editingType === "pdf" && !isPDF) {
      setUploadError("Please upload a PDF document");
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
      setEditingUrl(data.url);
      setResourceFileName(file.name);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    const newResource: Resource = {
      id: `resource-${Date.now()}`,
      title: editingTitle,
      description: editingDescription,
      type: editingType,
      url: editingUrl,
      thumbnail:
        editingThumbnailType === "color"
          ? editingThumbnailColor
          : editingThumbnailUrl || undefined
    };

    await onSave(newResource);
  };

  // Handle cancel
  const handleCancel = () => {
    if (isSaving) {
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !isSaving) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Resource</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="globalAddingTitle">Title</Label>
            <Input
              id="globalAddingTitle"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              placeholder="Resource title"
              disabled={isSaving}
            />
          </div>

          <div>
            <Label htmlFor="globalAddingDescription">
              Description (optional)
            </Label>
            <Textarea
              id="globalAddingDescription"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              placeholder="Brief description of this resource"
              rows={2}
              disabled={isSaving}
            />
          </div>

          <div>
            <Label htmlFor="globalAddingType">Type</Label>
            <Select
              value={editingType}
              onValueChange={(value) =>
                setEditingType(value as "pdf" | "url" | "image" | "other")
              }
              disabled={isSaving}
            >
              <SelectTrigger id="globalAddingType">
                <SelectValue placeholder="Select resource type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="url">URL Link</SelectItem>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="globalAddingUrl">
              {editingType === "url" ? "URL" : "File"}
            </Label>
            {editingType === "url" ? (
              <Input
                id="globalAddingUrl"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="https://example.com/resource"
                disabled={isSaving}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="globalAddingUrl"
                    value={editingUrl}
                    onChange={(e) => setEditingUrl(e.target.value)}
                    placeholder={
                      editingType === "image"
                        ? "Enter an image URL or upload an image file"
                        : editingType === "pdf"
                          ? "Enter a PDF URL or upload a PDF file"
                          : "Enter a resource URL or upload a file"
                    }
                    className="flex-1"
                    disabled={isSaving}
                  />
                  <div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        editingType === "image"
                          ? "image/*"
                          : editingType === "pdf"
                            ? "application/pdf"
                            : "*/*"
                      }
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile || isSaving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-1"
                      disabled={uploadingFile || isSaving}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {resourceFileName && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-primary">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[250px]">
                      {resourceFileName}
                    </span>
                  </div>
                )}
                {uploadError && (
                  <p className="text-xs text-destructive mt-1">{uploadError}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Thumbnail</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                type="button"
                variant={
                  editingThumbnailType === "color" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setEditingThumbnailType("color")}
                disabled={isSaving}
              >
                Color
              </Button>
              <Button
                type="button"
                variant={
                  editingThumbnailType === "image" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setEditingThumbnailType("image")}
                disabled={isSaving}
              >
                Image
              </Button>
            </div>

            {editingThumbnailType === "color" ? (
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
                    className={`h-8 rounded-md ${editingThumbnailColor === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{backgroundColor: color}}
                    onClick={() => setEditingThumbnailColor(color)}
                    aria-label={`Select color ${color}`}
                    disabled={isSaving}
                  />
                ))}
                <Popover modal={true}>
                  <PopoverTrigger asChild className="col-span-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-lg px-4 justify-between font-normal flex"
                      disabled={isSaving}
                    >
                      <div className="flex w-full justify-between gap-3">
                        Custom Color
                        <div className="flex items-center gap-2">
                          <p className="text-sm">
                            {editingThumbnailColor?.toUpperCase()}
                          </p>
                          <div
                            className="h-6 w-6 rounded-md"
                            style={{
                              backgroundColor: editingThumbnailColor
                            }}
                          />
                        </div>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <ChromePicker
                      color={editingThumbnailColor}
                      onChange={(color) => setEditingThumbnailColor(color.hex)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Image URL"
                    value={editingThumbnailUrl}
                    onChange={(e) => setEditingThumbnailUrl(e.target.value)}
                    className="flex-1"
                    disabled={isSaving}
                  />
                  <div>
                    <Input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingFile || isSaving}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !file.type.startsWith("image/")) return;

                        setUploadingFile(true);
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const response = await fetch("/api/upload", {
                            method: "POST",
                            body: formData
                          });
                          const data = await response.json();
                          setEditingThumbnailUrl(data.url);
                          setThumbnailFileName(file.name);
                        } catch (error) {
                          console.error("Thumbnail upload error:", error);
                          setUploadError("Failed to upload thumbnail");
                        } finally {
                          setUploadingFile(false);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-1"
                      disabled={uploadingFile || isSaving}
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload
                        </>
                      )}
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
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Resource"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
