import React, {useState} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {
  X,
  ImagePlus,
  Lightbulb,
  Image,
  XCircle,
  Upload,
  UserPlus,
  Pencil
} from "lucide-react";
import {cn} from "@/lib/utils";
import {Spinner} from "../ui/spinner";
import {Badge} from "../ui/badge";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {FormField} from "@/shared/types/form-field";

// Add the Lead interface
interface Lead {
  id: string;
  formData: Record<
    string,
    {
      value: string;
      type: string;
      label: string;
    }
  >;
  tags?: any[];
  notes?: any[];
  createdAt?: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  uploaded?: boolean;
  failed?: boolean;
  retrying?: boolean;
}

interface UploadLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<Lead[] | undefined>;
  onImportLeads?: (leads: Lead[]) => void;
  formFields?: FormField[];
}

// Add file size limit constant
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export function UploadLeadsModal({
  isOpen,
  onClose,
  onUpload,
  onImportLeads,
  formFields = []
}: UploadLeadsModalProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [editingLeadIndex, setEditingLeadIndex] = useState<number | null>(null);

  // Sample extracted leads from the uploaded images
  const [extractedLeads, setExtractedLeads] = useState<Lead[]>([]);
  const [editedLead, setEditedLead] = useState<Lead | null>(null);

  // Reference to the file input
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Add a state for file size errors
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  // Update the file validation function
  const validateFiles = (newFiles: File[]): File[] => {
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    newFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      const errorMessage = `The following ${oversizedFiles.length > 1 ? "files are" : "file is"} too large (max 10MB): ${oversizedFiles.join(", ")}`;
      setFileSizeError(errorMessage);

      // Clear the error after 5 seconds
      setTimeout(() => setFileSizeError(null), 5000);
    } else {
      setFileSizeError(null);
    }

    return validFiles;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = validateFiles(selectedFiles);

      if (validFiles.length > 0) {
        const newFiles = validFiles.map((file) => ({
          file,
          progress: 0
        }));

        // Append new files to existing ones
        setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(droppedFiles);

      if (validFiles.length > 0) {
        const newFiles = validFiles.map((file) => ({
          file,
          progress: 0
        }));

        // Append new files to existing ones
        setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    console.log("Starting upload process");

    // Define progress increments for a smoother visual feedback
    const progressStages = [
      {target: 15, delay: 300}, // Quick initial progress
      {target: 30, delay: 400},
      {target: 45, delay: 500},
      {target: 60, delay: 600},
      {target: 75, delay: 700},
      {target: 85, delay: 800} // Slow down near the end
    ];

    // Update progress through stages for visual feedback
    for (const stage of progressStages) {
      await new Promise((resolve) => setTimeout(resolve, stage.delay));
      setFiles((prevFiles) => {
        return prevFiles.map((fileData) => ({
          ...fileData,
          progress: stage.target,
          uploaded: false,
          failed: false
        }));
      });
    }

    // Now do the actual upload
    performActualUpload();
  };

  // Function to perform the actual upload
  const performActualUpload = async () => {
    try {
      // Update all files to 90% to indicate processing is starting
      setFiles((prevFiles) => {
        return prevFiles.map((fileData) => ({
          ...fileData,
          progress: 90,
          uploaded: false,
          failed: false
        }));
      });

      // Small delay to show the 90% state
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get all files
      const filesToUpload = files.map((f) => f.file);

      // Call the actual upload function provided by the parent
      const extractedLeadsData = await onUpload(filesToUpload);

      // Mark all files as completed successfully after upload completes
      setFiles((prevFiles) => {
        return prevFiles.map((fileData) => ({
          ...fileData,
          progress: 100,
          uploaded: true,
          failed: false
        }));
      });

      // Set the extracted leads if available
      if (extractedLeadsData && Array.isArray(extractedLeadsData)) {
        setExtractedLeads(extractedLeadsData);
      } else {
        console.warn("No lead data returned from upload");
        // If no leads were extracted, add a message to indicate this
        setExtractedLeads([]);
      }

      // Signal that processing is complete - wait a short delay for animation
      setTimeout(() => {
        setProcessingComplete(true);
      }, 500);
    } catch (error) {
      console.error("Error uploading files:", error);

      // Mark all files as failed
      setFiles((prevFiles) => {
        return prevFiles.map((fileData) => ({
          ...fileData,
          progress: 100,
          uploaded: false,
          failed: true
        }));
      });

      // Signal that processing is complete despite errors
      setProcessingComplete(true);
    }
  };

  // Switch to review mode
  const handleReviewLeads = () => {
    setIsReviewMode(true);
  };

  // Handle importing the leads
  const handleImportLeads = () => {
    console.log("Importing leads:", extractedLeads);
    // Call the parent component's import function if provided
    if (onImportLeads) {
      onImportLeads(extractedLeads);
    }
    // Show success message and close the modal after import
    setTimeout(() => {
      // Reset the files and state
      setFiles([]);
      setIsProcessing(false);
      setProcessingComplete(false);
      setIsReviewMode(false);
      setEditingLeadIndex(null);
      setEditedLead(null);
      setFileSizeError(null); // Clear any file size errors
      onClose();
    }, 500);
  };

  // Start editing a lead
  const handleEditLead = (index: number) => {
    setEditingLeadIndex(index);
    setEditedLead({...extractedLeads[index]});
  };

  // Handle changes to the edited lead
  const handleLeadFieldChange = (fieldId: string, value: string) => {
    if (editedLead) {
      // Create a copy of the current formData
      const updatedFormData = {...editedLead.formData};

      // Update the specific field value
      if (updatedFormData[fieldId]) {
        updatedFormData[fieldId] = {
          ...updatedFormData[fieldId],
          value: value
        };
      } else {
        // If field doesn't exist yet, create it with sensible defaults
        const fieldInfo = formFields.find((f) => f.id === fieldId);
        updatedFormData[fieldId] = {
          value: value,
          type: fieldInfo?.type || "text",
          label:
            fieldInfo?.label ||
            fieldId.charAt(0).toUpperCase() + fieldId.slice(1)
        };
      }

      // Update the edited lead with the new formData
      setEditedLead({
        ...editedLead,
        formData: updatedFormData
      });
    }
  };

  // Save the edited lead
  const handleSaveLeadEdit = () => {
    if (editingLeadIndex !== null && editedLead) {
      const updatedLeads = [...extractedLeads];
      updatedLeads[editingLeadIndex] = editedLead;
      setExtractedLeads(updatedLeads);
      setEditingLeadIndex(null);
      setEditedLead(null);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingLeadIndex(null);
    setEditedLead(null);
  };

  // Add a function to retry a failed upload
  const handleRetryUpload = async (index: number) => {
    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      if (newFiles[index] && newFiles[index].failed) {
        newFiles[index] = {
          ...newFiles[index],
          progress: 0,
          failed: false,
          retrying: true
        };
      }
      return newFiles;
    });

    try {
      // Define retry progress stages
      const retryStages = [
        {target: 15, delay: 200},
        {target: 30, delay: 200},
        {target: 45, delay: 300},
        {target: 60, delay: 300},
        {target: 75, delay: 400},
        {target: 85, delay: 400}
      ];

      // Update progress for visual feedback
      for (const stage of retryStages) {
        await new Promise((resolve) => setTimeout(resolve, stage.delay));
        setFiles((currentFiles) => {
          const updatedFiles = [...currentFiles];
          if (updatedFiles[index]) {
            updatedFiles[index] = {
              ...updatedFiles[index],
              progress: stage.target,
              retrying: true
            };
          }
          return updatedFiles;
        });
      }

      // Perform the actual retry upload
      const fileToRetry = files[index].file;
      const extractedLeadsData = await onUpload([fileToRetry]);

      // Update the file status to success
      setFiles((currentFiles) => {
        const updatedFiles = [...currentFiles];
        if (updatedFiles[index]) {
          updatedFiles[index] = {
            ...updatedFiles[index],
            progress: 100,
            retrying: false,
            uploaded: true,
            failed: false
          };
        }
        return updatedFiles;
      });

      // Set the extracted leads if available
      if (extractedLeadsData && Array.isArray(extractedLeadsData)) {
        setExtractedLeads(extractedLeadsData);
        setProcessingComplete(true);
      } else {
        // If no data was returned, show an error message
        console.warn("No lead data returned from retry upload");
        setExtractedLeads([]);
        setProcessingComplete(true);
      }
    } catch (error) {
      console.error("Error retrying upload:", error);
      // Mark the file as failed again
      setFiles((currentFiles) => {
        const updatedFiles = [...currentFiles];
        if (updatedFiles[index]) {
          updatedFiles[index] = {
            ...updatedFiles[index],
            progress: 100,
            retrying: false,
            uploaded: false,
            failed: true
          };
        }
        return updatedFiles;
      });
    }
  };

  // Format file size in human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Reset the modal state when closed
  const handleClose = () => {
    if (!isProcessing || processingComplete) {
      setFiles([]);
      setIsProcessing(false);
      setProcessingComplete(false);
      setIsReviewMode(false);
      setEditingLeadIndex(null);
      setEditedLead(null);
      setFileSizeError(null); // Clear any file size errors
      onClose();
    }
  };

  // Get the title and description based on the current state
  const getModalTitle = () => {
    if (editingLeadIndex !== null) {
      return "Edit Lead";
    } else if (isReviewMode) {
      return "Review Leads";
    } else if (isProcessing) {
      return processingComplete
        ? "Processing Complete"
        : "Processing Your Leads";
    } else {
      return "Upload Lead Images";
    }
  };

  const getModalDescription = () => {
    if (editingLeadIndex !== null) {
      return "Edit the lead details below.";
    } else if (isReviewMode) {
      return "We identified the following leads. Please review and edit any details before importing.";
    } else if (isProcessing) {
      return processingComplete
        ? "Your files have been processed. Some leads were extracted."
        : "Analyzing images and extracting contact details...";
    } else {
      return "Instantly capture contact information from conference badges or business cards.";
    }
  };

  // Get the button text based on the current state
  const getButtonText = () => {
    if (editingLeadIndex !== null) {
      return "Save Changes";
    } else if (isReviewMode) {
      return "Import Leads";
    } else if (isProcessing && processingComplete) {
      return "Review Leads";
    } else if (isProcessing) {
      return (
        <div className="flex items-center">
          <Spinner size="sm" className="mr-2" />
          <span>Processing...</span>
        </div>
      );
    } else {
      return "Upload Images";
    }
  };

  // Get the button action based on the current state
  const getButtonAction = () => {
    if (editingLeadIndex !== null) {
      return handleSaveLeadEdit;
    } else if (isReviewMode) {
      return handleImportLeads;
    } else if (processingComplete) {
      return handleReviewLeads;
    } else {
      return handleUpload;
    }
  };

  // Helper function to get display values from lead data
  const getLeadDisplayData = (lead: Lead) => {
    const formData = lead.formData;
    
    // Function to find a field that might contain name-like data
    const findFieldByPattern = (patterns: string[]) => {
      for (const fieldId of Object.keys(formData)) {
        const fieldValue = formData[fieldId];
        const label = fieldValue.label?.toLowerCase() || "";
        const id = fieldId.toLowerCase();
        
        if (patterns.some(pattern => 
          label.includes(pattern) || id.includes(pattern)
        )) {
          return fieldValue.value;
        }
      }
      return null;
    };
    
    // Try to find name field
    const name = findFieldByPattern(["name", "full name", "first name", "last name"]) ||
                 Object.values(formData)[0]?.value || // First field as fallback
                 "Unknown";
    
    // Try to find email field
    const email = findFieldByPattern(["email", "e-mail", "mail"]);
    
    // Try to find phone field
    const phone = findFieldByPattern(["phone", "tel", "mobile", "cell"]);
    
    return { name, email, phone };
  };

  // Get all fields that should be editable
  const getEditableFields = (): FormField[] => {
    // If we're editing a lead, use the actual fields from the lead data
    if (editingLeadIndex !== null && extractedLeads[editingLeadIndex]) {
      const leadFormData = extractedLeads[editingLeadIndex].formData;
      const fieldsFromLead: FormField[] = [];
      
      // Create form fields based on what's actually in the lead data
      Object.keys(leadFormData).forEach((fieldId) => {
        const fieldData = leadFormData[fieldId];
        fieldsFromLead.push({
          id: fieldId,
          label: fieldData.label || fieldId.charAt(0).toUpperCase() + fieldId.slice(1),
          type: (fieldData.type as "text" | "email" | "phone" | "textarea") || "text",
          required: false
        });
      });
      
      return fieldsFromLead;
    }

    // Fallback: Add name, email, phone as default fields if not in formFields
    const defaultFields: FormField[] = [
      {id: "name", label: "Full Name", type: "text", required: true},
      {id: "email", label: "Email", type: "email", required: true},
      {id: "phone", label: "Phone", type: "phone", required: false}
    ];

    // Start with default fields
    const fields = [...defaultFields];

    // Add any custom fields from formFields, avoiding duplicates
    if (formFields && formFields.length > 0) {
      formFields.forEach((field) => {
        // Skip if the field is already in our list or it's a date/tags/notes field
        if (
          !fields.some((f) => f.id === field.id) &&
          field.id !== "date" &&
          field.id !== "tags" &&
          field.id !== "notes"
        ) {
          fields.push(field);
        }
      });
    }

    return fields;
  };

  // Get editable fields list
  const editableFields = getEditableFields();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[532px] p-0 gap-0 rounded-xl">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-[25px] font-semibold text-[#1C1917]">
                {getModalTitle()}
              </DialogTitle>
              <DialogDescription className="text-[#57534E] mt-1">
                {getModalDescription()}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handleClose}
              disabled={isProcessing && !processingComplete}
            >
              <X className="h-4 w-4 text-[#A9A29D]" />
            </Button>
          </div>
        </DialogHeader>

        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="p-[30px] px-6 flex flex-col gap-10 w-full">
          {editingLeadIndex !== null && editedLead ? (
            <div className="flex flex-col gap-4 w-full">
              {editableFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label
                    htmlFor={`edit-${field.id}`}
                    className="text-sm font-medium text-[#1C1917]"
                  >
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`edit-${field.id}`}
                      value={editedLead.formData?.[field.id]?.value || ""}
                      onChange={(e) =>
                        handleLeadFieldChange(field.id, e.target.value)
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full"
                    />
                  ) : (
                    <Input
                      id={`edit-${field.id}`}
                      type={field.type === "email" ? "email" : "text"}
                      value={editedLead.formData?.[field.id]?.value || ""}
                      onChange={(e) =>
                        handleLeadFieldChange(field.id, e.target.value)
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : isReviewMode ? (
            <div className="flex flex-col gap-3 w-full">
              {extractedLeads.map((lead, index) => {
                const displayData = getLeadDisplayData(lead);
                return (
                  <div
                    key={index}
                    className="w-full h-20 rounded-xl border border-[#E7E5E4] bg-white relative"
                  >
                    <div className="flex items-center p-3 px-4 h-full">
                      <div className="flex-shrink-0 mr-3">
                        <UserPlus className="h-5 w-5 text-[#A9A29D]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1C1917]">
                          {displayData.name}
                        </p>
                        <p className="text-sm text-[#57534E]">
                          {displayData.email && `email: ${displayData.email}`}
                          {displayData.phone && ` | phone: ${displayData.phone}`}
                        </p>
                      </div>

                      <div className="ml-auto">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg"
                          onClick={() => handleEditLead(index)}
                        >
                          <Pencil className="h-4 w-4 text-[#44403C]" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 w-full">
              {/* File size error display - always visible when there's an error */}
              {fileSizeError && (
                <div className="w-full rounded-lg bg-red-50 border border-red-200 p-3 flex gap-3">
                  <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-sm text-red-700">{fileSizeError}</p>
                </div>
              )}

              {files.length === 0 ? (
                <>
                  <div
                    className={cn(
                      "w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] flex flex-col items-center justify-center p-4 px-6 cursor-pointer",
                      isDragging && "border-primary border-dashed"
                    )}
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="h-10 w-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                        <ImagePlus className="h-5 w-5 text-[#57534E]" />
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <label className="cursor-pointer">
                            <span className="text-sm font-semibold text-primary">
                              Click to upload
                            </span>
                          </label>
                          <span className="text-sm text-[#57534E]">
                            or drag and drop
                          </span>
                        </div>
                        <span className="text-xs text-[#57534E]">
                          SVG, PNG, JPG or GIF (max. 10MB per file)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full rounded-lg bg-primary/10 p-[15px] flex gap-[15px]">
                    <div className="w-6 h-6 flex-shrink-0">
                      <Lightbulb className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-primary">
                      For the best results, use good lighting, avoid glare, and
                      ensure text is clearly visible.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {/* Files list */}
                  {files.map((fileData, index) => (
                    <div
                      key={index}
                      className="w-full h-14 rounded-xl border border-[#E7E5E4] bg-white relative overflow-hidden"
                    >
                      {/* Progress fill - only show if uploading or retrying */}
                      {(isProcessing || fileData.retrying) && (
                        <div
                          className="absolute top-0 left-0 h-full bg-primary/10 transition-all duration-300 ease-out"
                          style={{width: `${fileData.progress}%`}}
                        />
                      )}

                      {/* Content */}
                      <div className="flex items-center p-3 px-4 h-full relative z-10">
                        <div className="flex-shrink-0 mr-2">
                          <Image className="h-5 w-5 text-[#57534E]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1C1917] truncate max-w-[300px]">
                            {fileData.file.name}
                          </p>
                          <p className="text-sm text-[#57534E]">
                            {formatFileSize(fileData.file.size)}
                            {fileData.progress > 0 &&
                              fileData.progress < 100 && (
                                <> – {fileData.progress.toFixed(0)}%</>
                              )}
                          </p>
                        </div>

                        <div className="ml-auto">
                          {!isProcessing ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleRemoveFile(index)}
                            >
                              <XCircle className="h-5 w-5 text-[#A9A29D]" />
                            </Button>
                          ) : fileData.uploaded ? (
                            <Badge
                              variant="outline"
                              className="rounded-full bg-green-100 text-green-600 border-green-200"
                            >
                              Success
                            </Badge>
                          ) : fileData.failed ? (
                            <div className="flex items-center gap-2">
                              <button
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetryUpload(index);
                                }}
                              >
                                Try again
                              </button>
                              <Badge
                                variant="outline"
                                className="rounded-full bg-red-100 text-red-600 border-red-200"
                              >
                                Failed
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Spinner size="sm" className="text-primary" />
                              <span className="ml-2 text-xs text-muted-foreground">
                                {fileData.progress < 90
                                  ? "Uploading"
                                  : "Processing"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add more files button (only when not processing) */}
                  {!isProcessing && (
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const selectedFiles = Array.from(e.target.files);
                            const validFiles = validateFiles(selectedFiles);

                            if (validFiles.length > 0) {
                              const newFiles = validFiles.map((file) => ({
                                file,
                                progress: 0
                              }));
                              setFiles((prevFiles) => [
                                ...prevFiles,
                                ...newFiles
                              ]);
                            }
                          }
                        }}
                        className="hidden"
                        id="additional-file-upload"
                      />
                      <label htmlFor="additional-file-upload">
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          onClick={() =>
                            document
                              .getElementById("additional-file-upload")
                              ?.click()
                          }
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add more files
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            {editingLeadIndex !== null && (
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={getButtonAction()}
              className={cn(
                "w-full justify-center",
                isReviewMode && "bg-primary"
              )}
              disabled={
                (files.length === 0 && !isReviewMode) ||
                (isProcessing && !processingComplete)
              }
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
