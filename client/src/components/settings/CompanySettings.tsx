import React, {useEffect, useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Loader2, Plus, CloudUpload, SparklesIcon} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import {Card, CardContent} from "@/components/ui/card";

import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useQuery, useMutation} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {queryClient} from "@/lib/queryClient";
import {PageContainer, PageContent} from "@/components/layout/page-container";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Organization,
  InsertOrganization,
  insertOrganizationSchema
} from "@shared/tables";
import {ChromePicker} from "react-color";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {QRCodePreview} from "@/components/qr-code-preview";
import axios from "axios";
import {UpgradeBadge} from "@/components/ui/upgrade-badge";

// Custom hook to fetch user billing info and credits
function useUserCredits() {
  return useQuery({
    queryKey: ["/api/payments/subscription-status"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/payments/subscription-status");
        return response.data;
      } catch (err) {
        console.error("Error fetching user credits:", err);
        throw err;
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30000 // Cache for 30 seconds
  });
}

export default function CompanySettings() {
  const {user} = useAuth();
  const {toast} = useToast();

  // Fetch user billing info to check plan status
  const {data: billingInfo} = useUserCredits();
  const isPaidPlan = billingInfo?.hasPremiumAccess === true;

  // Add state for QR code preview
  const [previewColor, setPreviewColor] = useState<string>("#4E5BA6");
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | undefined>(
    undefined
  );
  // Add new state for temporarily uploaded logo (not saved to company yet)
  const [tempQrLogoFile, setTempQrLogoFile] = useState<File | null>(null);
  const [tempQrLogoUrl, setTempQrLogoUrl] = useState<string | undefined>(
    undefined
  );

  // Function to handle QR color change with plan restriction
  const handleQrColorChange = (color: {hex: string}) => {
    if (!isPaidPlan) {
      toast({
        title: "Premium Feature",
        description:
          "Custom QR code colors are available with Badge Pro. Upgrade to customize your QR codes.",
        variant: "default"
      });
      return;
    }
    setPreviewColor(color.hex);
  };

  // Function to handle QR logo upload with plan restriction
  const handleQrLogoUpload = (file: File) => {
    if (!isPaidPlan) {
      toast({
        title: "Premium Feature",
        description:
          "Custom QR code logos are available with Badge Pro. Upgrade to customize your QR codes.",
        variant: "default"
      });
      return;
    }

    // Proceed with the upload logic for pro users
    try {
      // Validate file type
      const validTypes = [
        "image/svg+xml",
        "image/png",
        "image/jpeg",
        "image/gif"
      ];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an SVG, PNG, JPG or GIF file.",
          variant: "destructive"
        });
        return;
      }

      // Create local URL for preview without uploading to server
      const localUrl = URL.createObjectURL(file);
      setTempQrLogoUrl(localUrl);
      setTempQrLogoFile(file);

      toast({
        title: "Logo Selected",
        description: "Click Save Changes to apply this logo."
      });
    } catch (error) {
      console.error("QR logo processing error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process QR logo",
        variant: "destructive"
      });
    }
  };

  const {data: company, isLoading} = useQuery<Organization>({
    queryKey: ["/api/organization"],
    enabled: !!user?.organizationId
  });

  const form = useForm<InsertOrganization>({
    resolver: zodResolver(
      insertOrganizationSchema.omit({domain: true}).extend({
        domain: z.string().optional()
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      domain: "",
      logo: null,
      icon: null,
      defaultColor: "#8ECAE6",
      socialProfiles: ""
    }
  });

  // Update form values when company data loads
  useEffect(() => {
    if (company) {
      // Handle social profiles properly - convert to string if it's an object or array
      let socialProfilesValue = "";
      if (company.socialProfiles) {
        if (typeof company.socialProfiles === "string") {
          socialProfilesValue = company.socialProfiles;
        } else {
          // If it's an object or array, stringify it
          try {
            socialProfilesValue = JSON.stringify(company.socialProfiles);
          } catch (e) {
            console.error("Failed to stringify social profiles:", e);
          }
        }
      }

      form.reset({
        name: company.name,
        description: company.description || "",
        website: company.website || "",
        domain: company.domain,
        logo: company.logo,
        icon: company.icon,
        defaultColor: company.defaultColor || "#8ECAE6",
        socialProfiles: socialProfilesValue
      });

      // Initialize preview states
      setPreviewColor(company.qrCodeColor || company.defaultColor || "#4E5BA6");
      setPreviewLogoUrl(company.qrLogoUrl || undefined);
      // Reset temp logo URL to match the company's saved logo
      setTempQrLogoUrl(company.qrLogoUrl || undefined);
      setTempQrLogoFile(null);
    }
  }, [company, form]);

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: InsertOrganization) => {
      console.log("Submitting company data:", data);

      // Process website URL if provided
      let website = data.website;
      let domain = data.domain || "";

      if (website && !domain) {
        if (!website.startsWith("http://") && !website.startsWith("https://")) {
          website = `https://${website}`;
        }

        try {
          // Extract domain from website URL
          const urlObj = new URL(website);
          domain = urlObj.hostname;
          console.log("Extracted domain from website:", domain);
        } catch (error) {
          console.error("Failed to parse website URL:", error);
          // Fallback domain
          domain = `org-${new Date().getTime()}`;
        }
      } else if (!domain) {
        // Fallback domain if still not set
        domain = `org-${new Date().getTime()}`;
      }

      // Process socialProfiles to ensure it's properly formatted for the server
      // The server expects an object, not an array
      let socialProfiles = {};

      console.log(
        "Processing social profiles:",
        typeof data.socialProfiles,
        data.socialProfiles
      );

      // If socialProfiles is a string, attempt to parse it as JSON
      if (typeof data.socialProfiles === "string") {
        if (data.socialProfiles.trim() !== "") {
          try {
            // Try to parse as JSON
            const parsedProfiles = JSON.parse(data.socialProfiles);

            if (Array.isArray(parsedProfiles)) {
              // If it's an array, convert to object by merging all items
              socialProfiles = parsedProfiles.reduce<Record<string, string>>(
                (acc: Record<string, string>, item: unknown) => {
                  // If item is an object, merge its properties
                  if (item && typeof item === "object") {
                    return {...acc, ...(item as Record<string, string>)};
                  }
                  // If it's a primitive, ignore it
                  return acc;
                },
                {}
              );
            } else if (parsedProfiles && typeof parsedProfiles === "object") {
              // If it's already an object, use it directly
              socialProfiles = parsedProfiles;
            }
            console.log(
              "Successfully parsed social profiles as JSON:",
              socialProfiles
            );
          } catch (e) {
            console.warn("Social profiles is not valid JSON:", e);
            // If it can't be parsed as JSON, use empty object
            socialProfiles = {};
          }
        }
      } else if (Array.isArray(data.socialProfiles)) {
        // If it's an array, convert to object by merging all items
        // Use type assertion to ensure TypeScript knows this is an array type that can use reduce
        socialProfiles = (data.socialProfiles as unknown[]).reduce<
          Record<string, string>
        >((acc: Record<string, string>, item: unknown) => {
          // If item is an object, merge its properties
          if (item && typeof item === "object") {
            return {...acc, ...(item as Record<string, string>)};
          }
          // If it's a primitive, ignore it
          return acc;
        }, {});
        console.log(
          "Converted array social profiles to object:",
          socialProfiles
        );
      } else if (
        data.socialProfiles &&
        typeof data.socialProfiles === "object"
      ) {
        // If it's already an object, use it directly
        socialProfiles = data.socialProfiles;
        console.log("Social profiles is already an object:", socialProfiles);
      }

      // Prepare the form data with domain and properly formatted socialProfiles
      const formData = {
        ...data,
        website,
        domain,
        socialProfiles // Use the processed socialProfiles
      };

      console.log(
        "Prepared form data:",
        formData,
        "Social profiles type:",
        typeof formData.socialProfiles
      );

      try {
        // First, check if the user has an company
        if (!user?.organizationId) {
          console.log("Creating new company because user has no company ID");
        } else {
          console.log(
            "Updating existing company with ID:",
            user.organizationId
          );
        }

        const response = await fetch("/api/organization", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include", // Add credentials to ensure cookies are sent
          body: JSON.stringify(formData)
        });

        // Enhanced logging for debugging
        console.log("Organization update response status:", response.status);
        console.log(
          "Organization update response status text:",
          response.statusText
        );

        // Log response headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log("Response headers:", headers);

        if (!response.ok) {
          let errorMessage;
          try {
            const errorData = await response.json();
            errorMessage =
              errorData.error || "Failed to update company settings";
            console.error("Organization update error details:", errorData);
          } catch (error) {
            console.error("Organization update error:", error);
            // If the response isn't JSON, try to get text
            const errorText = await response.text();
            errorMessage = errorText || "Failed to update company settings";
            console.error("Organization update error text:", errorText);
          }
          throw new Error(errorMessage);
        }

        return await response.json();
      } catch (error) {
        console.error("Organization fetch error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/organization"]});
      toast({
        title: "Success",
        description: "Organization settings have been updated successfully."
      });
    },
    onError: (error: Error) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update company settings",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <PageContainer className="md:p-0 md:max-w-full flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="md:p-0 md:max-w-full">
      <div className="p-8 hidden sm:block">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
          Company Settings
        </h1>
      </div>
      <Separator className="hidden sm:block" />

      <PageContent className="py-10 px-8 bg-white">
        <div className="space-y-6">
          {/* Basic Information Card */}
          <div>
            <p className="font-bold">Basic Profile</p>
            <p className="text-gray-600">Update your company details</p>
          </div>
          <Card>
            <div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => {
                    console.log("Form submission data:", data);
                    updateOrganizationMutation.mutate(data);
                  })}
                  className="space-y-6 p-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of your organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md">
                              https://
                            </span>
                            <Input
                              {...field}
                              placeholder="www.example.com"
                              className="rounded-l-none"
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /^https?:\/\//,
                                  ""
                                );
                                field.onChange(value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your organization's website address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter a description of your organization"
                            className="min-h-[100px] resize-none"
                            maxLength={275}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground text-right">
                          {275 - (field.value?.length || 0)} characters left
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Reset form to the current company values
                        if (company) {
                          form.reset({
                            name: company.name,
                            description: company.description || "",
                            website: company.website || "",
                            domain: company.domain,
                            logo: company.logo,
                            icon: company.icon,
                            defaultColor: company.defaultColor || "#8ECAE6",
                            socialProfiles: company.socialProfiles || ""
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateOrganizationMutation.isPending}
                    >
                      {updateOrganizationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Card>

          {/* Branding Card */}
          <div>
            <p className="font-bold">Branding styles</p>
            <p className="text-gray-600">Tailor your brand presence</p>
          </div>
          <Card>
            <div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) =>
                    updateOrganizationMutation.mutate(data)
                  )}
                  className="space-y-6 p-6"
                >
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Company logo</FormLabel>
                        <FormDescription className="text-sm">
                          Update your company logo and then choose where you
                          want it to display.
                        </FormDescription>
                        <FormControl>
                          <div className="space-y-4 grid grid-cols-2 gap-4">
                            {field.value && (
                              <div className="flex items-center gap-4 p-4">
                                <img
                                  src={field.value}
                                  alt="Organization logo"
                                  className="h-8"
                                />
                                <p className="text-sm text-muted-foreground">
                                  Current logo
                                </p>
                              </div>
                            )}
                            <div
                              className="border-2 bg-muted/50 rounded-lg p-6 text-center relative border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
                              onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files[0];
                                if (file) {
                                  try {
                                    // Validate file type
                                    const validTypes = [
                                      "image/svg+xml",
                                      "image/png",
                                      "image/jpeg",
                                      "image/gif"
                                    ];
                                    if (!validTypes.includes(file.type)) {
                                      toast({
                                        title: "Invalid file type",
                                        description:
                                          "Please upload an SVG, PNG, JPG or GIF file.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }

                                    // Upload the file directly to db-images
                                    const formData = new FormData();
                                    formData.append("file", file);

                                    const response = await fetch(
                                      "/api/db-images/upload?type=logo",
                                      {
                                        method: "POST",
                                        body: formData,
                                        credentials: "include"
                                      }
                                    );

                                    if (!response.ok) {
                                      throw new Error(
                                        "Failed to upload logo to database"
                                      );
                                    }

                                    const data = await response.json();

                                    // Set the logo URL to the database image URL
                                    field.onChange(`/api/db-images/${data.id}`);

                                    toast({
                                      title: "Logo uploaded successfully",
                                      description:
                                        "Click Save Changes to apply this logo."
                                    });
                                  } catch (error) {
                                    console.error("Logo upload error:", error);
                                    toast({
                                      title: "Error",
                                      description:
                                        error instanceof Error
                                          ? error.message
                                          : "Failed to upload logo",
                                      variant: "destructive"
                                    });
                                  }
                                }
                              }}
                            >
                              <input
                                type="file"
                                accept="image/svg+xml,image/png,image/jpeg,image/gif"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      // Validate file type
                                      const validTypes = [
                                        "image/svg+xml",
                                        "image/png",
                                        "image/jpeg",
                                        "image/gif"
                                      ];
                                      if (!validTypes.includes(file.type)) {
                                        toast({
                                          title: "Invalid file type",
                                          description:
                                            "Please upload an SVG, PNG, JPG or GIF file.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }

                                      // Upload the file directly to db-images
                                      const formData = new FormData();
                                      formData.append("file", file);

                                      const response = await fetch(
                                        "/api/db-images/upload?type=logo",
                                        {
                                          method: "POST",
                                          body: formData,
                                          credentials: "include"
                                        }
                                      );

                                      if (!response.ok) {
                                        throw new Error(
                                          "Failed to upload logo to database"
                                        );
                                      }

                                      const data = await response.json();

                                      // Set the logo URL to the database image URL
                                      field.onChange(
                                        `/api/db-images/${data.id}`
                                      );

                                      toast({
                                        title: "Logo uploaded successfully",
                                        description:
                                          "Click Save Changes to apply this logo."
                                      });
                                    } catch (error) {
                                      console.error(
                                        "Logo upload error:",
                                        error
                                      );
                                      toast({
                                        title: "Error",
                                        description:
                                          error instanceof Error
                                            ? error.message
                                            : "Failed to upload logo",
                                        variant: "destructive"
                                      });
                                    }
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="p-2 bg-white rounded-lg border-2 border-muted-foreground/25">
                                  <CloudUpload className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-primary cursor-pointer">
                                      Click to upload
                                    </span>{" "}
                                    or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    SVG or transparent PNG format. Simple icons
                                    work best.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultColor"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormDescription>
                          This color will be used across your organization's
                          branding
                        </FormDescription>
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-[180px] xl:w-[280px] h-28 rounded-lg p-1 gap-2 justify-start text-left font-normal flex flex-col"
                              >
                                <div
                                  className="h-20 w-full rounded-lg"
                                  style={{
                                    backgroundColor: field.value || "#8ECAE6"
                                  }}
                                />
                                {field.value || "#8ECAE6"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <ChromePicker
                                color={field.value || "#8ECAE6"}
                                onChange={(color) => field.onChange(color.hex)}
                              />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Reset form to the current company values
                        if (company) {
                          form.reset({
                            name: company.name,
                            description: company.description || "",
                            website: company.website || "",
                            domain: company.domain,
                            logo: company.logo,
                            icon: company.icon,
                            defaultColor: company.defaultColor || "#8ECAE6",
                            socialProfiles: company.socialProfiles || ""
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateOrganizationMutation.isPending}
                    >
                      {updateOrganizationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </Card>

          {/* QR Code Settings Card */}
          <div>
            <p className="font-bold">QR Code Settings</p>
            <p className="text-gray-600">Customize QR codes for all users</p>
          </div>
          <Card>
            <CardContent className="p-6">
              {!isPaidPlan && (
                <div className="mb-6 p-4 bg-gradient-to-r bg-background-smoke rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SparklesIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">
                          Upgrade to create custom branded QR codes
                        </h4>
                      </div>
                    </div>
                    <UpgradeBadge />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  {/* QR Code Color Picker */}
                  <div className="mb-6">
                    <div className="font-medium mb-2">Color</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Select the color for QR codes used across your
                      organization
                      {!isPaidPlan && (
                        <span className="ml-1 text-xs text-primary font-medium">
                          (Pro feature)
                        </span>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={`w-[180px] xl:w-[280px] h-28 rounded-lg p-1 gap-2 justify-start text-left font-normal flex flex-col ${
                            !isPaidPlan ? "opacity-60 cursor-not-allowed" : ""
                          }`}
                          disabled={!isPaidPlan}
                        >
                          <div
                            className="h-20 w-full rounded-lg"
                            style={{backgroundColor: previewColor}}
                          />
                          {previewColor}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <ChromePicker
                          color={previewColor}
                          onChange={handleQrColorChange}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* QR Code Logo Upload */}
                  <div>
                    <div className="font-medium mb-2">Logo</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Upload a logo to appear in the center of your QR codes
                      {!isPaidPlan && (
                        <span className="ml-1 text-xs text-primary font-medium">
                          (Pro feature)
                        </span>
                      )}
                    </div>
                    <div className="space-y-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {(tempQrLogoUrl || previewLogoUrl) && (
                        <div className="flex items-center gap-4 p-4">
                          <img
                            src={tempQrLogoUrl || previewLogoUrl}
                            alt="QR Logo"
                            className="h-12 w-12 object-contain bg-white rounded-lg p-1"
                          />
                          <p className="text-sm text-muted-foreground">
                            {tempQrLogoUrl && tempQrLogoUrl !== previewLogoUrl
                              ? "New logo (not saved)"
                              : "Current QR logo"}
                          </p>
                        </div>
                      )}
                      <div
                        className={`border-2 bg-muted/50 rounded-lg p-6 text-center relative border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors ${
                          !isPaidPlan ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files[0];
                          if (file) {
                            handleQrLogoUpload(file);
                          }
                        }}
                      >
                        <input
                          type="file"
                          accept="image/svg+xml,image/png,image/jpeg,image/gif"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleQrLogoUpload(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={!isPaidPlan}
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-2 bg-white rounded-lg border-2 border-muted-foreground/25">
                            <CloudUpload className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold text-primary cursor-pointer">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              SVG or transparent PNG format. Simple icons work
                              best.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Settings Card */}
                <div className="border rounded-lg p-4 flex flex-col">
                  <div className="text-sm font-medium mb-2">
                    <span>Preview</span>
                  </div>

                  {/* Use the QRCodePreview component instead of inline implementation */}
                  <div className="mb-4">
                    <QRCodePreview
                      color={previewColor}
                      logoUrl={tempQrLogoUrl || previewLogoUrl}
                    />
                  </div>

                  <div className="text-sm text-muted-foreground mt-2 mb-4 text-center">
                    QR code settings will be saved with your organization
                    profile
                  </div>

                  {/* Combined "Save for all users" button */}
                  <div className="h-full flex flex-col gap-2 justify-end">
                    <Separator />
                    <div className="flex items-end justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Reset QR code settings to current company values
                          if (company) {
                            // Reset color to original company value
                            setPreviewColor(
                              company.qrCodeColor ||
                                company.defaultColor ||
                                "#4E5BA6"
                            );
                            // Reset logo to original company value
                            setPreviewLogoUrl(company.qrLogoUrl || undefined);
                            // Also reset the temporary logo
                            setTempQrLogoUrl(company.qrLogoUrl || undefined);
                            setTempQrLogoFile(null);

                            // Log for debugging
                            console.log("Reset QR settings to:", {
                              color:
                                company.qrCodeColor ||
                                company.defaultColor ||
                                "#4E5BA6",
                              logoUrl: company.qrLogoUrl || undefined
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={async () => {
                          if (!isPaidPlan) {
                            toast({
                              title: "Premium Feature",
                              description:
                                "Custom QR code settings are available with Badge Pro. Upgrade to customize your QR codes.",
                              variant: "default"
                            });
                            return;
                          }

                          try {
                            // Show loading toast
                            toast({
                              title: "Processing",
                              description: "Updating QR codes for all users..."
                            });

                            // If there's a temporary logo file, upload it permanently first
                            let finalLogoUrl = previewLogoUrl;
                            if (tempQrLogoFile && tempQrLogoUrl) {
                              // Show loading toast specifically for the logo upload
                              toast({
                                title: "Uploading Logo",
                                description:
                                  "Saving the logo to your company..."
                              });

                              // Upload the logo to db-images first
                              const logoFormData = new FormData();
                              logoFormData.append("file", tempQrLogoFile);

                              const logoResponse = await fetch(
                                "/api/db-images/upload?type=qrlogo",
                                {
                                  method: "POST",
                                  body: logoFormData,
                                  credentials: "include"
                                }
                              );

                              if (!logoResponse.ok) {
                                throw new Error(
                                  "Failed to save QR logo to database"
                                );
                              }

                              const logoData = await logoResponse.json();
                              // Use the database image ID instead of generating a URL
                              const dbImageId = logoData.id;

                              // Now update the organization with the database image ID
                              const qrLogoResponse = await fetch(
                                "/api/organization/qr-logo",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: JSON.stringify({dbImageId}),
                                  credentials: "include"
                                }
                              );

                              if (!qrLogoResponse.ok) {
                                throw new Error(
                                  "Failed to update organization with QR logo"
                                );
                              }

                              const qrLogoData = await qrLogoResponse.json();
                              finalLogoUrl = qrLogoData.qrLogoUrl;

                              // Clean up the object URL to prevent memory leak
                              if (
                                tempQrLogoUrl &&
                                tempQrLogoUrl.startsWith("blob:")
                              ) {
                                URL.revokeObjectURL(tempQrLogoUrl);
                              }
                            }

                            // Create a payload with current QR code settings
                            const payload = {
                              qrCodeColor: previewColor,
                              qrLogoUrl: finalLogoUrl
                            };

                            // Step 1: Save QR code settings to the organization
                            const saveResponse = await fetch(
                              "/api/organization/qr-settings",
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json"
                                },
                                body: JSON.stringify(payload),
                                credentials: "include"
                              }
                            );

                            if (!saveResponse.ok) {
                              const errorText = await saveResponse.text();
                              let errorMsg = `Failed to save QR code settings: ${saveResponse.status} ${saveResponse.statusText}`;
                              try {
                                const errorData = JSON.parse(errorText);
                                if (errorData.error) errorMsg = errorData.error;
                              } catch (error) {
                                console.error("QR code save error:", error);
                                if (errorText && errorText.trim())
                                  errorMsg = errorText;
                              }
                              throw new Error(errorMsg);
                            }

                            // Update the preview logo URL to match what was saved
                            setPreviewLogoUrl(finalLogoUrl);
                            setTempQrLogoUrl(finalLogoUrl);
                            setTempQrLogoFile(null);

                            // Refresh data for both organization and user
                            queryClient.invalidateQueries({
                              queryKey: ["/api/organization"]
                            });
                            queryClient.invalidateQueries({
                              queryKey: ["/api/user"]
                            });

                            // Show success message
                            toast({
                              title: "Success",
                              description:
                                "QR code settings updated for all users."
                            });
                          } catch (error) {
                            console.error("QR code update error:", error);
                            toast({
                              title: "Error",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Failed to update QR codes",
                              variant: "destructive"
                            });

                            // Reset preview color on error
                            setPreviewColor(
                              company?.qrCodeColor ||
                                company?.defaultColor ||
                                "#4E5BA6"
                            );
                          }
                        }}
                        disabled={!isPaidPlan}
                        className={
                          !isPaidPlan ? "opacity-60 cursor-not-allowed" : ""
                        }
                      >
                        {!isPaidPlan && (
                          <SparklesIcon className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Social Profiles */}
          <div>
            <p className="font-bold">Company Social Profiles</p>
            <p className="text-gray-600">
              Update your company's social profiles
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Social Profiles</h4>

                  <div className="flex border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-3 flex items-center">
                      <span className="text-sm font-medium">x.com/</span>
                    </div>
                    <Input
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Enter your Twitter handle"
                      value={
                        (typeof form.watch("socialProfiles") === "string"
                          ? JSON.parse(form.watch("socialProfiles") || "{}")
                          : form.watch("socialProfiles") || {}
                        ).twitter || ""
                      }
                      onChange={(e) => {
                        const currentProfiles =
                          typeof form.getValues("socialProfiles") === "string"
                            ? JSON.parse(
                                form.getValues("socialProfiles") || "{}"
                              )
                            : form.getValues("socialProfiles") || {};
                        form.setValue(
                          "socialProfiles",
                          JSON.stringify({
                            ...currentProfiles,
                            twitter: e.target.value
                          })
                        );
                      }}
                    />
                  </div>

                  <div className="flex border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-3 flex items-center">
                      <span className="text-sm font-medium">
                        linkedin.com/company/
                      </span>
                    </div>
                    <Input
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Enter your LinkedIn profile"
                      value={
                        (typeof form.watch("socialProfiles") === "string"
                          ? JSON.parse(form.watch("socialProfiles") || "{}")
                          : form.watch("socialProfiles") || {}
                        ).linkedin || ""
                      }
                      onChange={(e) => {
                        const currentProfiles =
                          typeof form.getValues("socialProfiles") === "string"
                            ? JSON.parse(
                                form.getValues("socialProfiles") || "{}"
                              )
                            : form.getValues("socialProfiles") || {};
                        form.setValue(
                          "socialProfiles",
                          JSON.stringify({
                            ...currentProfiles,
                            linkedin: e.target.value
                          })
                        );
                      }}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => {
                      const currentProfiles =
                        typeof form.getValues("socialProfiles") === "string"
                          ? JSON.parse(form.getValues("socialProfiles") || "{}")
                          : form.getValues("socialProfiles") || {};
                      form.setValue(
                        "socialProfiles",
                        JSON.stringify({
                          ...currentProfiles,
                          [`new-${Date.now()}`]: ""
                        })
                      );
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>

                  <Separator className="-mx-6" />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Reset social profiles to current company values
                        if (company) {
                          form.setValue(
                            "socialProfiles",
                            typeof company.socialProfiles === "string"
                              ? company.socialProfiles
                              : JSON.stringify(company.socialProfiles || {})
                          );
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const data = form.getValues();
                        console.log(
                          "Submitting social profiles:",
                          data.socialProfiles
                        );
                        updateOrganizationMutation.mutate(data);
                      }}
                      disabled={updateOrganizationMutation.isPending}
                    >
                      {updateOrganizationMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                          Saving...
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}
