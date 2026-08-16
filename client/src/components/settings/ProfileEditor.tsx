import React, {useState, useEffect} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useAuth} from "@/hooks/use-auth";
import {useMutation, useQuery} from "@tanstack/react-query";
import {queryClient, apiRequest} from "@/lib/queryClient";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Label} from "@/components/ui/label";
import {Separator} from "@/components/ui/separator";
import {z} from "zod";
import {useToast} from "@/hooks/use-toast";
import {
  Loader2,
  UserPlus,
  Camera,
  Upload,
  LinkIcon,
  Plus,
  Briefcase,
  ChevronDown
} from "lucide-react";
import {PageContainer, PageContent} from "@/components/layout/page-container";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useLocation} from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

const countryCodes: CountryCode[] = [
  {code: "+1", name: "United States", flag: "us"},
  {code: "+44", name: "United Kingdom", flag: "gb"},
  {code: "+1", name: "Canada", flag: "ca"},
  {code: "+61", name: "Australia", flag: "au"}
];

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z
    .string()
    .transform((val) => val.replace(/[^\d+]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^\+?[1-9]\d{1,14}$/,
          "Please enter a valid phone number with country code"
        )
        .optional()
        .or(z.literal(""))
    ),
  title: z.string().optional(),
  bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
  twitterHandle: z.string().optional(),
  linkedinProfile: z.string().optional(),
  profileImage: z
    .union([
      z.string().url("Please enter a valid image URL"),
      z.string().length(0), // Allow empty string
      z.null()
    ])
    .optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  title: string | null;
  bio: string | null;
  twitterHandle: string | null;
  linkedinProfile: string | null;
  profileImage: string | null;
  publicPath: string;
  uniquePathId: string;
}

export default function ProfileEditor() {
  const {user} = useAuth();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  const {toast} = useToast();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    countryCodes[0]
  );
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Direct query to a verified endpoint (/api/users/me) as a fallback
  const {data: userData} = useQuery<any>({
    queryKey: ["/api/users/me"],
    enabled: !!user
  });

  // Try to get profile data from profile settings endpoint
  const {data: profileData, isLoading: profileLoading} =
    useQuery<ProfileResponse>({
      queryKey: ["/api/users/me"]
    });

  // Use a combined approach to ensure we always have data
  const profile = profileData || userData;
  const isLoading = profileLoading && !userData;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      email: profile?.email ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      title: profile?.title ?? "",
      bio: profile?.bio ?? "",
      twitterHandle: profile?.twitterHandle ?? "",
      linkedinProfile: profile?.linkedinProfile ?? "",
      profileImage: profile?.profileImage ?? ""
    }
  });

  // Reset image loading state when profile image URL changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [form.watch("profileImage")]);

  useEffect(() => {
    if (profile) {
      form.reset(
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber ?? "",
          title: profile.title ?? "",
          bio: profile.bio ?? "",
          twitterHandle: profile.twitterHandle ?? "",
          linkedinProfile: profile.linkedinProfile ?? "",
          profileImage: profile.profileImage ?? ""
        },
        {
          keepDefaultValues: false
        }
      );

      if (profile.phoneNumber) {
        const countryCode = countryCodes.find((cc) =>
          profile.phoneNumber?.startsWith(cc.code)
        );
        if (countryCode) {
          setSelectedCountry(countryCode);
        } else {
          setSelectedCountry(countryCodes[0]);
        }
      }
    }
  }, [profile, form]);

  // Work profile update mutation - specifically for title, bio, companyName
  const updateWorkProfileMutation = useMutation({
    mutationFn: async (data: {
      title?: string;
      bio?: string;
      companyName?: string;
    }) => {
      console.log("Updating work profile with data:", data);

      // Use apiRequest for standardized error handling and consistency
      try {
        const response = await apiRequest("/api/users/profile/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });
        console.log("Work profile update response:", response);
        return response;
      } catch (error) {
        console.error("Work profile update request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update query cache with new work profile data
      queryClient.setQueryData(
        ["/api/users/profile/settings"],
        (oldData: any) => ({
          ...oldData,
          ...data
        })
      );

      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/users/profile/settings"]
      });
      queryClient.invalidateQueries({queryKey: ["/api/users/me"]});

      // Update the form fields to reflect changes
      if (data.title !== undefined) form.setValue("title", data.title || "");
      if (data.bio !== undefined) form.setValue("bio", data.bio || "");

      toast({
        title: "Work profile updated",
        description: "Your work information has been updated successfully."
      });
    },
    onError: (error: Error) => {
      console.error("Work profile update error:", error);
      toast({
        title: "Error updating work profile",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      console.log("Submitting profile update with data:", data);
      console.log(
        "Phone number in submission:",
        data.phoneNumber,
        "Type:",
        typeof data.phoneNumber
      );

      // Create a copy of the data to modify
      const formattedData = {...data};

      // Format the phone number to make sure it includes the country code
      if (formattedData.phoneNumber) {
        if (
          typeof formattedData.phoneNumber === "string" &&
          formattedData.phoneNumber.trim() === ""
        ) {
          // If it's just whitespace, set to undefined explicitly
          formattedData.phoneNumber = undefined;
          console.log("Empty phone number converted to undefined");
        } else if (
          typeof formattedData.phoneNumber === "string" &&
          !formattedData.phoneNumber.startsWith("+")
        ) {
          // Add country code if not present
          formattedData.phoneNumber =
            selectedCountry.code + formattedData.phoneNumber;
          console.log(
            "Formatted phone number with country code:",
            formattedData.phoneNumber
          );
        }
      }

      // Use apiRequest for standardized error handling and consistency
      try {
        const response = await apiRequest("/api/users/profile/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formattedData)
        });

        console.log("Profile update response:", response);
        return response;
      } catch (error) {
        console.error("Profile update request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update query cache with new profile data
      queryClient.setQueryData(
        ["/api/users/profile/settings"],
        (oldData: any) => ({
          ...oldData,
          ...data
        })
      );

      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/users/profile/settings"]
      });
      queryClient.invalidateQueries({queryKey: ["/api/users/me"]});

      // Update profile fields in form (especially for fields like title and bio)
      if (data.title !== undefined) form.setValue("title", data.title || "");
      if (data.bio !== undefined) form.setValue("bio", data.bio || "");
      if (data.profileImage !== undefined)
        form.setValue("profileImage", data.profileImage || "");

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
      });
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If input is empty, set to empty string (will be handled as null in submission)
    if (!e.target.value.trim()) {
      console.log("Phone number cleared, setting to empty string");
      form.setValue("phoneNumber", "", {shouldValidate: true});
      return;
    }

    // Remove any non-digit characters except the '+' if it's at the beginning
    let value = e.target.value;
    if (value.startsWith("+")) {
      // Keep the '+' but remove any non-digit characters after it
      value = "+" + value.substring(1).replace(/[^\d]/g, "");
    } else {
      // Remove any non-digit characters and add country code
      value = e.target.value.replace(/[^\d]/g, "");
      // Ensure country code is included in the phone number
      value = selectedCountry.code + value;
    }

    console.log("Formatted phone number:", value);

    form.setValue("phoneNumber", value, {shouldValidate: true});
  };

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    const currentNumber = form.watch("phoneNumber") || "";
    // Extract digits without country code
    const numberWithoutCode = currentNumber.replace(/^\+\d+/, "");

    // Set the new number with the selected country code
    const newNumber = country.code + numberWithoutCode;
    console.log("Country changed, new number:", newNumber);

    form.setValue("phoneNumber", newNumber, {
      shouldValidate: true
    });
  };

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedFile(file);
        console.log(
          "Selected file:",
          file.name,
          "type:",
          file.type,
          "size:",
          file.size
        );

        const formData = new FormData();
        formData.append("file", file);

        try {
          console.log("Uploading file:", file.name);

          // First upload to db-images endpoint
          const uploadResponse = await fetch(
            "/api/db-images/upload?type=profile",
            {
              method: "POST",
              body: formData
            }
          );

          console.log("Upload response status:", uploadResponse.status);

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(
              errorData.error || "Failed to upload image to database"
            );
          }

          // Get the database image ID
          const imageData = await uploadResponse.json();
          const dbImageId = imageData.id;

          // Update the user's profile with the image ID
          const profileResponse = await fetch("/api/users/profile/image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({dbImageId})
          });

          if (!profileResponse.ok) {
            const errorData = await profileResponse.json();
            throw new Error(
              errorData.error || "Failed to update profile image"
            );
          }

          // Safely parse JSON response
          try {
            const contentType = profileResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await profileResponse.json();
              console.log("Profile update success, image URL:", data.imageUrl);
              updateProfileImageMutation.mutate(data.imageUrl);
            } else {
              console.error("Expected JSON response but got:", contentType);
              const text = await profileResponse.text();
              console.log(
                "Response text:",
                text.substring(0, 200) + (text.length > 200 ? "..." : "")
              );
              throw new Error("Unexpected response format from server");
            }
          } catch (parseError) {
            console.error("Error parsing success response:", parseError);
            throw new Error("Failed to parse server response");
          }
        } catch (error) {
          console.error("Image upload error:", error);
          toast({
            title: "Error uploading image",
            description:
              error instanceof Error ? error.message : "Failed to upload image",
            variant: "destructive"
          });
          setSelectedFile(null);
        }
      }
    };
    input.click();
  };

  const navigateToHeadshots = () => {
    setLocation("/headshots");
    setIsImageModalOpen(false);
  };

  const navigateToHeadshotGenerator = () => {
    setLocation("/headshot-generator");
    setIsImageModalOpen(false);
  };

  const updateProfileImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      console.log("Updating profile image with URL:", imageUrl);

      // Skip the dedicated image endpoint and go directly to the settings endpoint that we know works
      try {
        const response = await fetch("/api/users/profile/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({profileImage: imageUrl})
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Profile settings update failed:", errorText);
          throw new Error("Failed to update profile image: " + errorText);
        }

        return response.json();
      } catch (error) {
        console.error("Profile image update error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(
        "Profile image update successful, invalidating queries. Response:",
        data
      );

      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ["/api/users/profile/settings"]
      });
      queryClient.invalidateQueries({queryKey: ["/api/users/me"]});

      // Force update the local query cache with the new image URL
      const imageUrl = data.profileImage || data.imageUrl;

      // Update profile settings cache
      queryClient.setQueryData(
        ["/api/users/profile/settings"],
        (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              profileImage: imageUrl
            };
          }
          return oldData;
        }
      );

      // Also update the /api/users/me cache
      queryClient.setQueryData(["/api/users/me"], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            profileImage: imageUrl
          };
        }
        return oldData;
      });

      // Update the form value
      form.setValue("profileImage", imageUrl, {
        shouldValidate: true,
        shouldDirty: false
      });

      setIsImageModalOpen(false);
      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile image",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCopyPublicUrl = () => {
    const url = `${window.location.origin}/${profile?.publicPath}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Badge URL has been copied to clipboard."
    });
  };

  return (
    <PageContainer className="md:p-0 md:max-w-full">
      <div className="p-8 hidden sm:block">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
          Profile
        </h1>
      </div>
      <Separator className="hidden sm:block" />

      <PageContent className="py-10 px-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="">
              <p className="text-sm font-semibold">Personal</p>
              <p className="text-sm">Update your personal details.</p>
            </div>
            <div className="border rounded-lg col-span-3 p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const isValid = form.formState.isValid;

                  if (isValid) {
                    const data = form.getValues();
                    console.log("Form submitted with data:", data);
                    updateProfileMutation.mutate(data);
                  } else {
                    console.log(
                      "Form validation failed:",
                      form.formState.errors
                    );
                    // Trigger validation to show errors
                    form.trigger();
                  }
                }}
                className="space-y-6"
              >
                <div className="flex flex-col pt-6 md:pt-4 items-center space-y-4 ">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {isImageLoading && form.watch("profileImage") && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 rounded-full">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      <AvatarImage
                        src={form.watch("profileImage") || ""}
                        alt={`${form.watch("firstName")} ${form.watch("lastName")}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "";
                          setIsImageLoading(false);
                        }}
                        onLoad={() => setIsImageLoading(false)}
                        className="rounded-full object-cover"
                      />
                      <AvatarFallback>
                        {form.watch("firstName")?.[0]?.toUpperCase() || ""}
                        {form.watch("lastName")?.[0]?.toUpperCase() || ""}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <Dialog
                    open={isImageModalOpen}
                    onOpenChange={setIsImageModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-auto"
                      >
                        Change Profile Picture
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <Tabs defaultValue="headshots" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="headshots">Headshots</TabsTrigger>
                          <TabsTrigger value="upload">Upload</TabsTrigger>
                          <TabsTrigger value="url">URL</TabsTrigger>
                        </TabsList>
                        <TabsContent value="headshots">
                          <div className="grid grid-cols-1 gap-4 my-4">
                            <Button
                              onClick={navigateToHeadshotGenerator}
                              className="w-full"
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              Create New Headshot
                            </Button>
                            <Button
                              onClick={navigateToHeadshots}
                              className="w-full"
                              variant="outline"
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Use Existing Headshot
                            </Button>
                          </div>
                        </TabsContent>
                        <TabsContent value="upload">
                          <div className="space-y-4 my-4">
                            <div
                              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={handleFileUpload}
                            >
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                              <p className="text-sm text-muted-foreground mb-2">
                                Click to upload an image from your device
                              </p>
                              {selectedFile ? (
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
                          </div>
                        </TabsContent>
                        <TabsContent value="url">
                          <div className="space-y-4 my-4">
                            <div className="space-y-2">
                              <Label htmlFor="imageUrl">Image URL</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="imageUrl"
                                  placeholder="https://example.com/image.jpg"
                                  value={form.watch("profileImage") || ""}
                                  onChange={(e) => {
                                    const url = e.target.value;
                                    try {
                                      new URL(url);
                                      form.setValue("profileImage", url, {
                                        shouldValidate: true,
                                        shouldDirty: true
                                      });
                                    } catch {
                                      form.setValue("profileImage", url, {
                                        shouldValidate: true,
                                        shouldDirty: true
                                      });
                                    }
                                  }}
                                />
                                <Button
                                  onClick={() => {
                                    const url = form.watch("profileImage");
                                    if (
                                      url &&
                                      !form.formState.errors.profileImage
                                    ) {
                                      updateProfileImageMutation.mutate(url);
                                    }
                                  }}
                                  disabled={
                                    updateProfileImageMutation.isPending ||
                                    !!form.formState.errors.profileImage
                                  }
                                >
                                  {updateProfileImageMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <LinkIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              {form.formState.errors.profileImage && (
                                <p className="text-sm text-destructive">
                                  {form.formState.errors.profileImage.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        {...form.register("firstName")}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        {...form.register("lastName")}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        placeholder="Enter your email"
                        type="email"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone number</Label>
                      <div className="flex">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex items-center gap-2 w-[120px]"
                            >
                              <span className="flex items-center gap-2">
                                <img
                                  src={`https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${selectedCountry.flag}.svg`}
                                  alt={selectedCountry.name}
                                  className="w-4 h-3"
                                />
                                {selectedCountry.code}
                              </span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="w-[280px]"
                          >
                            {countryCodes.map((country) => (
                              <DropdownMenuItem
                                key={`${country.name}-${country.code}`}
                                className="flex items-center gap-2"
                                onSelect={() => handleCountrySelect(country)}
                              >
                                <img
                                  src={`https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${country.flag}.svg`}
                                  alt={country.name}
                                  className="w-4 h-3"
                                />
                                <span>
                                  {country.name} ({country.code})
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          className="flex-1 rounded-l-none"
                          placeholder="123-456-7890"
                          value={form.watch("phoneNumber")}
                          onChange={(e) => handlePhoneNumberChange(e)}
                        />
                      </div>
                      {form.formState.errors.phoneNumber && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.phoneNumber.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Reset personal information to current profile data
                      if (profile) {
                        form.reset({
                          firstName: profile.firstName,
                          lastName: profile.lastName,
                          email: profile.email,
                          phoneNumber: profile.phoneNumber ?? "",
                          profileImage: profile.profileImage ?? ""
                        });
                        // Reset country code if phone number exists
                        if (profile.phoneNumber) {
                          const countryCode = countryCodes.find((cc) =>
                            profile.phoneNumber?.startsWith(cc.code)
                          );
                          if (countryCode) {
                            setSelectedCountry(countryCode);
                          }
                        }
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const data = form.getValues();
                      console.log("Submitting personal information:", data);
                      updateProfileMutation.mutate(data);
                    }}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="">
              <p className="text-sm font-semibold">Work</p>
              <p className="text-sm">Update your work profile.</p>
            </div>
            <div className="border rounded-lg col-span-3 p-6">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between  gap-3">
                  <div className="w-full">
                    <p className="text-sm font-medium">My Badge URL</p>
                    <Input
                      value={`${window.location.origin}/${profile?.publicPath}`}
                      readOnly
                    />
                  </div>
                  <div className="flex self-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={handleCopyPublicUrl}
                    >
                      <span>Copy</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 ">
                  <Label htmlFor="title">Job title</Label>
                  <div className="flex relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="title"
                      placeholder="Enter your job title"
                      className="pl-10"
                      {...form.register("title")}
                    />
                  </div>
                </div>

                <div className="space-y-2 ">
                  <Label htmlFor="bio">Short bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Write a short bio"
                    className="min-h-[100px]"
                    {...form.register("bio")}
                    maxLength={200}
                  />
                  <p className="text-sm text-muted-foreground">
                    {form.watch("bio")?.length || 0}/200 characters
                  </p>
                </div>

                <Separator />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Reset work information to current profile data
                      if (profile) {
                        form.reset({
                          ...form.getValues(), // Keep other fields
                          title: profile.title ?? "",
                          bio: profile.bio ?? ""
                        });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const data = {
                        title: form.getValues("title"),
                        bio: form.getValues("bio")
                      };
                      console.log("Submitting work information:", data);
                      updateWorkProfileMutation.mutate(data);
                    }}
                    disabled={updateWorkProfileMutation.isPending}
                  >
                    {updateWorkProfileMutation.isPending ? (
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="">
              <p className="text-sm font-semibold">Social Profiles</p>
              <p className="text-sm">Connect your social media profiles.</p>
            </div>
            <div className="border rounded-lg col-span-3 p-6">
              <div className="space-y-4">
                <p className="text-sm font-medium">Social Profiles</p>
                <div className="flex border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3 flex items-center">
                    <span className="text-sm font-medium">x.com/</span>
                  </div>
                  <Input
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Enter your Twitter handle"
                    {...form.register("twitterHandle")}
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
                    {...form.register("linkedinProfile")}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>

                <Separator className="-mx-6" />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Reset social profiles to current profile data
                      if (profile) {
                        form.reset({
                          ...form.getValues(), // Keep other fields
                          twitterHandle: profile.twitterHandle ?? "",
                          linkedinProfile: profile.linkedinProfile ?? ""
                        });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const data = {
                        twitterHandle: form.getValues("twitterHandle"),
                        linkedinProfile: form.getValues("linkedinProfile")
                      };
                      console.log("Submitting social links:", data);
                      updateProfileMutation.mutate({
                        ...form.getValues(),
                        ...data
                      });
                    }}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
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
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
