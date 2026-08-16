import React, {useState, useEffect} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {
  Download,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {useToast} from "@/hooks/use-toast";
import {formatDate, cn} from "@/lib/utils";
import {Lead, LeadTag} from "@/shared/types/lead";
import {FormField} from "@/shared/types/form-field";
import {DeleteLeadDialog} from "@/components/leads/DeleteLeadDialog";
import {LeadTagInput} from "@/components/leads/LeadTagInput";
import {LeadNoteInput} from "@/components/leads/LeadNoteInput";
import {UploadLeadsModal} from "@/components/leads/UploadLeadsModal";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {apiRequest} from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {Skeleton} from "@/components/ui/skeleton";

// Define a type for table column
interface TableColumn {
  id: string;
  label: string;
  type: string;
}

// Define API response type
interface LeadsResponse {
  leads: Lead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function LeadsPage() {
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Pagination configuration
  const itemsPerPage = 10;

  // Fetch lead settings
  const {data: leadSettings} = useQuery({
    queryKey: ["/api/badge-profile"],
    queryFn: async () => {
      const response = await apiRequest("/api/badge-profile");
      return response.leadSettings;
    }
  });

  // Fetch leads data
  const {data: leadsData, isLoading} = useQuery<LeadsResponse>({
    queryKey: ["/api/leadgen/leads", currentPage, itemsPerPage],
    queryFn: async () => {
      const response = await apiRequest(
        `/api/leadgen/leads?page=${currentPage}&limit=${itemsPerPage}`
      );
      return response;
    }
  });

  // Set up mutations
  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      await apiRequest(`/api/leadgen/leads/${leadId}`, {
        method: "DELETE"
      });
      return leadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leadgen/leads"]
      });
      toast({
        title: "Success",
        description: "Lead deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addTagMutation = useMutation({
    mutationFn: async ({
      leadId,
      tag
    }: {
      leadId: string;
      tag: Omit<LeadTag, "id">;
    }) => {
      const response = await apiRequest(`/api/leadgen/leads/${leadId}/tags`, {
        method: "POST",
        body: JSON.stringify(tag)
      });
      return {leadId, tag: response};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leadgen/leads"]
      });
      toast({
        title: "Success",
        description: "Tag added successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tag. Please try again.",
        variant: "destructive"
      });
    }
  });

  const removeTagMutation = useMutation({
    mutationFn: async ({leadId, tagId}: {leadId: string; tagId: string}) => {
      await apiRequest(`/api/leadgen/leads/${leadId}/tags/${tagId}`, {
        method: "DELETE"
      });
      return {leadId, tagId};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leadgen/leads"]
      });
      toast({
        title: "Success",
        description: "Tag removed successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove tag. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({
      leadId,
      content
    }: {
      leadId: string;
      content: string;
    }) => {
      const response = await apiRequest(`/api/leadgen/leads/${leadId}/notes`, {
        method: "POST",
        body: JSON.stringify({content})
      });
      return {leadId, note: response};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leadgen/leads"]
      });
      toast({
        title: "Success",
        description: "Note added successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle importing leads from the review modal
  const importLeadsMutation = useMutation({
    mutationFn: async (leads: any[]) => {
      const response = await apiRequest("/api/leadgen/import-leads", {
        method: "POST",
        body: JSON.stringify({leads})
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leadgen/leads"]
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import leads. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update state when lead data is loaded
  useEffect(() => {
    if (leadsData) {
      console.log("Leads data received:", leadsData);
      setLeads(leadsData.leads);
      setTotalPages(leadsData.meta.totalPages);
    }
  }, [leadsData]);

  // Update form fields when lead settings are loaded
  useEffect(() => {
    if (leadSettings?.fields) {
      setFormFields(leadSettings.fields);
    }
  }, [leadSettings]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Handle lead selection
  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(leadId)) {
        newSelection.delete(leadId);
      } else {
        newSelection.add(leadId);
      }
      return newSelection;
    });
  };

  // Handle select all leads
  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((lead) => lead.id)));
    }
  };

  // Handle delete lead
  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    await deleteMutation.mutateAsync(leadToDelete);
    setLeadToDelete(null);
  };

  // Handle delete multiple leads
  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return;

    try {
      const deletePromises = Array.from(selectedLeads).map((id) =>
        deleteMutation.mutateAsync(id)
      );
      await Promise.all(deletePromises);
      setSelectedLeads(new Set());
    } catch (error) {
      console.error("Error deleting leads:", error);
    }
  };

  // Handle add tag to lead
  const handleAddTag = async (leadId: string, tag: Omit<LeadTag, "id">) => {
    await addTagMutation.mutateAsync({leadId, tag});
  };

  // Handle remove tag from lead
  const handleRemoveTag = async (leadId: string, tagId: string) => {
    await removeTagMutation.mutateAsync({leadId, tagId});
  };

  // Handle add note to lead
  const handleAddNote = async (leadId: string, content: string) => {
    await addNoteMutation.mutateAsync({leadId, content});
  };

  // Handle export leads as CSV
  const handleExportLeads = () => {
    // Create CSV data
    const headers = [
      "Date",
      ...formFields.map((field) => field.label),
      "Tags",
      "Notes"
    ];

    const rows = leads.map((lead) => {
      const rowData: string[] = [
        lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "",
        ...formFields.map((field) =>
          String(lead.formData[field.id]?.value || "")
        ),
        lead.tags.map((tag) => String(tag.label || "")).join(", "),
        lead.notes.map((note) => String(note.content || "")).join(" | ")
      ];
      return rowData;
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `leads_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle add new lead
  const handleAddLead = () => {
    setIsUploadModalOpen(true);
  };

  // Handle lead image upload
  const handleUploadLeads = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      // Create form data for the files
      const formData = new FormData();

      // Add files to form data
      files.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("leadFields", JSON.stringify(formFields));

      // Call the API to process the images
      const response = await apiRequest("/api/leadgen/upload-images", {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type, it will be set automatically for FormData
        }
      });

      console.log("Image processing response:", response);

      if (response.success) {
        // Show success message
        toast({
          title: "Success",
          description: `Successfully processed ${response.processed} image${
            response.processed > 1 ? "s" : ""
          }.`
        });

        // Return the extracted leads to be shown in the review modal
        return response.leads;
      } else {
        // Show failure message
        toast({
          title: "Processing Failed",
          description: "Failed to process images. Please try again.",
          variant: "destructive"
        });
      }

      // Show failure message if any files failed
      if (response.failed && response.failed > 0) {
        toast({
          title: "Some Processing Failed",
          description: `Failed to process ${response.failed} image${
            response.failed > 1 ? "s" : ""
          }.`,
          variant: "destructive"
        });

        // Log failures to console for debugging
        console.error("Failed image processing:", response.failures);
      }
    } catch (error) {
      console.error("Error uploading lead images:", error);
      toast({
        title: "Error",
        description: "Failed to process lead images. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle importing leads from review modal
  const handleImportLeads = async (leads: any[]) => {
    try {
      // Send the leads to the API - they already have the correct formData structure
      const response = await importLeadsMutation.mutateAsync(leads);

      // After successful API call, update the local leads state to show new leads at the top
      if (response && response.leads) {
        // Get all leads and sort them by created date
        setLeads((prevLeads) => {
          const allLeads = [...response.leads, ...prevLeads];
          return allLeads.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime(); // Sort in descending order (newest first)
          });
        });
      }

      // Show success toast
      toast({
        title: "Leads Imported",
        description: `Successfully imported ${leads.length} leads.`
      });
    } catch (error) {
      console.error("Error importing leads:", error);
      toast({
        title: "Import Failed",
        description:
          "There was an error importing the leads. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generatePaginationItems = () => {
    // Maximum number of visible page buttons
    const maxVisibleButtons = 6;
    const items: (number | "ellipsis")[] = [];

    // If we have a small number of pages, just show all
    if (totalPages <= maxVisibleButtons) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
      return items;
    }

    // Always show the first page
    items.push(1);

    // Calculate the range of pages to show around the current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust the range if we're near the start or end
    if (currentPage <= 3) {
      // Near the start, show more pages at the beginning
      endPage = Math.min(totalPages - 1, maxVisibleButtons - 1);
    } else if (currentPage >= totalPages - 2) {
      // Near the end, show more pages at the end
      startPage = Math.max(2, totalPages - maxVisibleButtons + 2);
    }

    // Add ellipsis if needed before the range
    if (startPage > 2) {
      items.push("ellipsis");
    }

    // Add the range of pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }

    // Add ellipsis if needed after the range
    if (endPage < totalPages - 1) {
      items.push("ellipsis");
    }

    // Always show the last page
    if (totalPages > 1) {
      items.push(totalPages);
    }

    return items;
  };

  // Generate table columns based on form fields
  const getTableColumns = (): TableColumn[] => {
    // Start with basic columns
    const columns: TableColumn[] = [];

    // Add the dynamic form field columns, excluding name and email which are shown in the Lead column
    formFields.forEach((field) => {
      if (field.id !== "name" && field.id !== "email") {
        columns.push({
          id: field.id,
          label: field.label,
          type: field.type
        });
      }
    });

    return columns;
  };

  const tableColumns = getTableColumns();

  // Helper function to find a field value by pattern matching
  // This is needed because imported leads may have different field IDs
  const findFieldByPattern = (
    formData: Lead["formData"],
    patterns: string[]
  ): string | null => {
    for (const fieldId of Object.keys(formData)) {
      const fieldValue = formData[fieldId];
      if (!fieldValue) continue;
      
      const label = fieldValue.label?.toLowerCase() || "";
      const id = fieldId.toLowerCase();

      if (
        patterns.some(
          (pattern) => label.includes(pattern) || id.includes(pattern)
        )
      ) {
        return fieldValue.value || null;
      }
    }
    return null;
  };

  // Helper function to get the display name from a lead
  const getLeadDisplayName = (lead: Lead): string => {
    const formData = lead.formData;
    // Try to find name field by various patterns
    const name =
      findFieldByPattern(formData, [
        "name",
        "full name",
        "first name",
        "last name"
      ]) ||
      // Fallback to first field value if available
      (Object.values(formData)[0]?.value || null) ||
      // Last resort: "Unknown"
      "Unknown";
    return String(name);
  };

  // Helper function to get the display email from a lead
  const getLeadDisplayEmail = (lead: Lead): string => {
    const formData = lead.formData;
    const email =
      findFieldByPattern(formData, ["email", "e-mail", "mail"]) || "";
    return String(email);
  };

  return (
    <div className="w-full max-w-full min-h-[calc(100vh-48px)] flex flex-col bg-white">
      <div className="py-3 px-4 flex flex-row items-center justify-between border sm:rounded-t-2xl">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Leads</h2>
          {selectedLeads.size > 0 && (
            <span className="text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
              {selectedLeads.size} {selectedLeads.size === 1 ? "lead" : "leads"}{" "}
              selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selectedLeads.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleAddLead}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Leads
          </Button>
          <Button
            size="sm"
            onClick={handleExportLeads}
            disabled={isLoading || leads.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Leads
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-7 px-6 rounded-md border border-t-0 rounded-t-none sm:rounded-b-2xl">
          <div className="rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="w-28">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="w-16">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({length: 8}).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell className="pr-0">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </TableCell>
                    {tableColumns.map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Skeleton className="h-5 w-12 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <>
          <div className="py-7 px-6 rounded-md border border-t-0 rounded-t-none sm:rounded-b-2xl h-full flex-1">
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          leads.length > 0 &&
                          selectedLeads.size === leads.length
                        }
                        onCheckedChange={toggleSelectAll}
                        disabled={leads.length === 0}
                      />
                    </TableHead>
                    <TableHead>Lead</TableHead>

                    {/* Dynamic columns based on form fields */}
                    {tableColumns.map((column) => (
                      <TableHead key={column.id}>{column.label}</TableHead>
                    ))}

                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7 + tableColumns.length}
                        className="text-center py-16"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <h3 className="text-lg font-medium">No leads yet</h3>
                          <p className="text-muted-foreground mt-1">
                            When visitors submit their information through your
                            lead forms, they will appear here.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={String(lead.id)}>
                        <TableCell className="pr-0">
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleSelectLead(lead.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {getLeadDisplayName(lead)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {getLeadDisplayEmail(lead)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Dynamic field columns */}
                        {tableColumns.map((column) => (
                          <TableCell key={column.id}>
                            {column.type === "textarea" ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="max-w-[200px] truncate cursor-default">
                                      {String(
                                        lead.formData[column.id]?.value || "—"
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-md"
                                  >
                                    <div>
                                      <p className="text-sm whitespace-normal break-words">
                                        {String(
                                          lead.formData[column.id]?.value || "—"
                                        )}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="truncate inline-block max-w-[200px]">
                                {String(lead.formData[column.id]?.value || "—")}
                              </span>
                            )}
                          </TableCell>
                        ))}

                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {lead.createdAt ? formatDate(lead.createdAt) : "—"}
                        </TableCell>
                        <TableCell>
                          <LeadTagInput
                            tags={lead.tags}
                            onAddTag={(tag) => handleAddTag(lead.id, tag)}
                            onRemoveTag={(tagId) =>
                              handleRemoveTag(lead.id, tagId)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <LeadNoteInput
                                    onAddNote={(content) =>
                                      handleAddNote(lead.id, content)
                                    }
                                    placeholder={
                                      lead.notes.length > 0
                                        ? String(lead.notes[0].content || "")
                                            .length > 30
                                          ? String(
                                              lead.notes[0].content || ""
                                            ).substring(0, 30) + "..."
                                          : String(lead.notes[0].content || "")
                                        : "Add a note..."
                                    }
                                  />
                                </div>
                              </TooltipTrigger>
                              {lead.notes.length > 0 && (
                                <TooltipContent side="top" className="max-w-md">
                                  <div className="space-y-2">
                                    {lead.notes.map((note) => (
                                      <div
                                        key={String(note.id)}
                                        className="pb-2 border-b border-border last:border-0 last:pb-0"
                                      >
                                        <p className="text-sm whitespace-normal break-words">
                                          {String(note.content || "")}
                                        </p>
                                        <span className="text-xs text-muted-foreground block mt-1">
                                          {note.createdAt
                                            ? formatDate(note.createdAt)
                                            : "—"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLeadToDelete(lead.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 mx-4 my-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {generatePaginationItems().map((item) =>
                      item === "ellipsis" ? (
                        <div
                          key={`ellipsis-${Math.random()}`}
                          className="flex items-center justify-center w-8 h-8"
                        >
                          <span className="text-sm text-muted-foreground">
                            ...
                          </span>
                        </div>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? "default" : "ghost"}
                          size="icon"
                          className={cn(
                            "w-8 h-8 text-sm",
                            currentPage === item
                              ? "bg-muted-foreground/10 text-foreground font-medium"
                              : "text-muted-foreground font-normal"
                          )}
                          onClick={() => handlePageChange(item)}
                          disabled={isLoading}
                        >
                          {item}
                        </Button>
                      )
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <DeleteLeadDialog
        isOpen={!!leadToDelete}
        isDeleting={deleteMutation.isPending}
        onClose={() => setLeadToDelete(null)}
        onConfirm={handleDeleteLead}
      />

      <UploadLeadsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadLeads}
        onImportLeads={handleImportLeads}
        formFields={formFields}
      />
    </div>
  );
}
