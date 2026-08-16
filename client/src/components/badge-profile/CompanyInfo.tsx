import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Upload, Loader2, LinkIcon, InfoIcon} from "lucide-react";
import {useState, useEffect} from "react";
import {Separator} from "@/components/ui/separator";
import {useToast} from "@/hooks/use-toast";
import {Label} from "@/components/ui/label";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {apiRequest} from "@/lib/queryClient";
import {useCurrentOrganizationRole} from "@/hooks/use-organizations";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

const companySchema = z.object({
  companyName: z.string().nullish(),
  website: z
    .string()
    .transform((val) => {
      if (!val || val.trim() === "") return "";
      // Normalize the URL by adding https:// if no protocol is present
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(
      z
        .string()
        .optional()
        .refine(
          (url) => {
            if (!url || url === "") return true; // Allow empty URLs
            try {
              const urlObj = new URL(url);
              // Ensure the hostname contains at least one dot (domain.tld format)
              return (
                urlObj.hostname.includes(".") && urlObj.hostname.length > 3
              );
            } catch {
              return false;
            }
          },
          {
            message: "Please enter a valid website URL with a proper domain"
          }
        )
    ),
  logo: z.string().optional()
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  defaultColor?: string | null;
  domain?: string | null;
  isSaved?: boolean;
}

export interface CompanyInfoProps {
  organization: Organization;
  onUpdate: (updatedOrganization?: Partial<Organization>) => void;
  buttonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export function CompanyInfo({
  organization,
  onUpdate,
  buttonVariant = "ghost"
}: CompanyInfoProps) {
  const {data: organizationRole} = useCurrentOrganizationRole();
  const isAdmin = organizationRole?.isCompanyAdmin === true;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {toast} = useToast();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: organization?.name || "",
      website: organization?.website || "",
      logo: organization?.logo || ""
    }
  });

  // Watch form values for real-time preview updates
  const companyName = form.watch("companyName");
  const website = form.watch("website");
  const logo = form.watch("logo");

  // Update preview on form field changes
  useEffect(() => {
    if (isEditing) {
      // Create preview data from current form values
      const previewData: Partial<Organization> = {
        name: companyName || "",
        website: website || "",
        logo: logo || null
      };

      // Pass temporary preview data to parent
      onUpdate(previewData);
    }
  }, [companyName, website, logo, isEditing, onUpdate]);

  // When editing is canceled, revert to original values
  useEffect(() => {
    if (!isEditing) {
      // Pass original data back when editing is canceled
      onUpdate();
    }
  }, [isEditing, onUpdate]);

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/svg+xml,image/png,image/jpeg,image/gif";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedFile(file);
        setIsUploading(true);

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: "File size should be less than 5MB.",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("logo", file);

        try {
          const response = await fetch("/api/organization/logo", {
            method: "POST",
            body: formData
          });

          if (!response.ok) {
            throw new Error("Failed to upload logo");
          }

          const data = await response.json();
          form.setValue("logo", data.imageUrl);
          toast({
            title: "Success",
            description: "Company logo uploaded successfully"
          });
        } catch (error) {
          console.error("Error uploading logo:", error);
          toast({
            title: "Error",
            description: "Failed to upload company logo",
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  async function onSubmit(data: CompanyFormData) {
    setIsSaving(true);
    try {
      // If there's a selected file, upload it first
      if (selectedFile && !isUploading) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("logo", selectedFile);

        const response = await fetch("/api/organization/logo", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error("Failed to upload logo");
        }

        const result = await response.json();
        data.logo = result.imageUrl;
        setIsUploading(false);
      }

      // Update the organization with the new data
      await apiRequest("/api/organization", {
        method: "PATCH",
        body: JSON.stringify({
          name: data.companyName,
          website: data.website,
          logo: data.logo
        })
      });

      // Pass the updated data with save flag
      onUpdate({
        name: data.companyName || "",
        website: data.website || "",
        logo: data.logo || null,
        id: organization.id,
        isSaved: true // Add flag to indicate this is a saved update, not just preview
      });

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Company information updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update company information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCancel = () => {
    form.reset({
      companyName: organization?.name || "",
      website: organization?.website || "",
      logo: organization?.logo || ""
    });
    setSelectedFile(null);
    setIsEditing(false);
    // This will trigger the useEffect above to revert preview to original data
  };

  return (
    <Card className="border-none bg-subtle py-4 px-5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-lg">Company Info</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Only company administrators can edit company information.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isAdmin && (
          <Button
            variant={buttonVariant}
            size="sm"
            className="text-sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </CardHeader>
      <Separator className="mb-5 mt-2.5" />
      <CardContent className="p-0">
        {isEditing && isAdmin ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-24 px-1 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    {form.watch("logo") ? (
                      <img
                        src={form.watch("logo") || ""}
                        alt={form.watch("companyName") || "Company"}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
                        {form.watch("companyName")?.[0] || "C"}
                      </div>
                    )}
                  </div>
                  <Dialog
                    open={isImageModalOpen}
                    onOpenChange={setIsImageModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Logo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <Tabs defaultValue="upload" className="w-full mt-7">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="upload">Upload</TabsTrigger>
                          <TabsTrigger value="url">URL</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload">
                          <div className="space-y-4 my-4">
                            <div
                              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={handleFileUpload}
                            >
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                              <p className="text-sm text-muted-foreground mb-2">
                                Click to upload a logo from your device
                              </p>
                              {isUploading ? (
                                <div className="flex justify-center items-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                              ) : selectedFile ? (
                                <p className="text-sm font-medium">
                                  {selectedFile.name}
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileUpload();
                                  }}
                                >
                                  Choose File
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              SVG, PNG, JPG or GIF (max. 5MB)
                            </p>
                          </div>
                        </TabsContent>
                        <TabsContent value="url">
                          <div className="space-y-4 my-4">
                            <div className="space-y-2">
                              <Label htmlFor="logoUrl">Logo URL</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="logoUrl"
                                  placeholder="https://example.com/logo.png"
                                  value={form.watch("logo") || ""}
                                  onChange={(e) => {
                                    form.setValue("logo", e.target.value, {
                                      shouldValidate: true
                                    });
                                  }}
                                />
                                <Button
                                  onClick={() => {
                                    const url = form.watch("logo");
                                    if (url) {
                                      setIsImageModalOpen(false);
                                    }
                                  }}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Company Website</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="https://example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving || isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving || isUploading}>
                  {isSaving || isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Logo
                </p>
                <div className="flex items-center">
                  <div className="h-16 w-24 overflow-hidden flex items-center justify-center">
                    {organization.logo ? (
                      <img
                        src={organization.logo}
                        alt={organization.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
                        {organization.name?.charAt(0) || "C"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Company Name
                </p>
                <p>{organization.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Company Website
                </p>
                {organization.website ? (
                  <a
                    href={
                      organization.website.startsWith("http")
                        ? organization.website
                        : `https://${organization.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {organization.website}
                  </a>
                ) : (
                  <p className="text-muted">-</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
