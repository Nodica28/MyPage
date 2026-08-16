import React, {useState} from "react";
import {UseFormReturn} from "react-hook-form";
import {ProfileSetupFormData} from "@/schemas/profile-setup";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Upload, User, Loader2} from "lucide-react";
import {cn} from "@/lib/utils";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/use-auth";

// Background preset options (matching BackgroundSettings.tsx)
const BACKGROUND_PRESETS = [
  {
    id: "gradient-1",
    name: "Gradient 1",
    class: "bg-gradient-to-r from-blue-200 to-cyan-200"
  },
  {
    id: "gradient-2",
    name: "Gradient 2",
    class: "bg-gradient-to-r from-violet-200 to-pink-200"
  },
  {
    id: "gradient-3",
    name: "Gradient 3",
    class: "bg-gradient-to-r from-green-200 to-lime-200"
  },
  {
    id: "gradient-4",
    name: "Gradient 4",
    class: "bg-gradient-to-r from-yellow-200 to-amber-200"
  },
  {id: "solid-gray", name: "Light Gray", class: "bg-gray-100"},
  {id: "solid-green", name: "Light Green", class: "bg-green-100"},
  {id: "solid-blue", name: "Light Blue", class: "bg-blue-100"},
  {id: "solid-yellow", name: "Light Yellow", class: "bg-yellow-100"}
];

// Image presets for landscapes and buildings (matching BackgroundSettings.tsx)
const IMAGE_PRESETS = [
  {
    id: "landscape-1",
    name: "Mountain",
    url: "/backgrounds/banners/mountain.jpg",
    category: "landscape"
  },
  {
    id: "landscape-2",
    name: "Beach",
    url: "/backgrounds/banners/beach.jpg",
    category: "landscape"
  },
  {
    id: "landscape-3",
    name: "Beach 2",
    url: "/backgrounds/banners/beach-2.jpg",
    category: "landscape"
  },
  {
    id: "landscape-4",
    name: "Forest",
    url: "/backgrounds/banners/forest.jpg",
    category: "landscape"
  },
  {
    id: "landscape-5",
    name: "Desert",
    url: "/backgrounds/banners/desert.jpg",
    category: "landscape"
  },
  {
    id: "landscape-6",
    name: "Flower",
    url: "/backgrounds/banners/flower.jpg",
    category: "landscape"
  },
  {
    id: "building-1",
    name: "Modern Office",
    url: "/backgrounds/banners/modern-office.jpg",
    category: "building"
  },
  {
    id: "building-2",
    name: "Skyscraper",
    url: "/backgrounds/banners/skyscraper.jpg",
    category: "building"
  },
  {
    id: "building-3",
    name: "City",
    url: "/backgrounds/banners/city.jpg",
    category: "building"
  },
  {
    id: "building-4",
    name: "Downtown",
    url: "/backgrounds/banners/downtown.jpg",
    category: "building"
  }
];

const ALLOWED_FILE_TYPES = [
  "image/svg+xml",
  "image/jpeg",
  "image/png",
  "image/gif"
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ProfilePhotoStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
  profileImagePreview: string | null;
  onProfileImageSelect: (file: File) => void;
}

export const ProfilePhotoStep: React.FC<ProfilePhotoStepProps> = ({
  form,
  profileImagePreview,
  onProfileImageSelect
}) => {
  const {toast} = useToast();
  const {user} = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backgroundUploadPreview, setBackgroundUploadPreview] = useState<
    string | null
  >(null);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  const background = form.watch("background");
  const profileImage = form.watch("profileImage");

  // Get user's saved banners and active banner
  const savedBanners = (user?.bannerSettings as any)?.savedBanners || [];
  const activeBanner = (user?.bannerSettings as any)?.activeBannerId;

  // Handle profile image selection
  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "File must be less than 5MB",
          variant: "destructive"
        });
        return;
      }

      onProfileImageSelect(file);
    }
  };

  // Handle background preset selection
  const handlePresetSelect = (presetId: string) => {
    form.setValue("background", {
      type: "preset",
      preset: presetId
    });
  };

  // Handle image preset selection
  const handleImagePresetSelect = (imageUrl: string) => {
    form.setValue("background", {
      type: "custom",
      customUrl: imageUrl
    });
  };

  // Handle custom banner selection
  const handleBannerSelect = (bannerId: string) => {
    form.setValue("background", {
      type: "banner",
      customBannerId: bannerId
    });
  };

  // Handle background file upload
  const handleBackgroundFileSelect = async (file: File) => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an SVG, JPG, PNG, or GIF image",
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "File must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      setBackgroundUploadPreview(URL.createObjectURL(file));

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload?type=background", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to upload background");
      }

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "Failed to parse upload response:",
          responseText,
          parseError
        );

        // Try to extract URL from non-JSON response as fallback
        const urlMatch = responseText.match(
          /\/uploads\/file-[a-zA-Z0-9_.:]?[0-9]+\.[a-zA-Z0-9]+/
        );
        if (urlMatch && urlMatch[0]) {
          data = {success: true, url: urlMatch[0]};
          console.log("Extracted file URL from response:", data.url);
        } else {
          throw new Error("Invalid server response");
        }
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Failed to upload background image");
      }

      form.setValue("background", {
        type: "custom",
        customUrl: data.url
      });

      // Clear preview after successful upload
      setBackgroundUploadPreview(null);
    } catch (error) {
      console.error("Error uploading background:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      setBackgroundUploadPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag events for profile image
  const handleProfileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleProfileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "File must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      onProfileImageSelect(file);
    }
  };

  // Handle drag events for background
  const handleBackgroundDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleBackgroundDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBackgroundFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bring Your Profile to Life</h1>
        <p className="text-muted-foreground mt-2">
          Your profile photo helps people recognize you, and your background
          adds personality.
        </p>
      </div>

      {/* Profile Image Upload */}
      <div className="space-y-2">
        <Label>Upload Profile image</Label>
        <p className="text-sm text-muted-foreground">Clear photos work best.</p>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:bg-muted/50"
          )}
          onDragEnter={handleProfileDrag}
          onDragLeave={handleProfileDrag}
          onDragOver={handleProfileDrag}
          onDrop={handleProfileDrop}
          onClick={() => document.getElementById("profileImageInput")?.click()}
        >
          <input
            id="profileImageInput"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleProfileImageSelect}
          />
          {profileImagePreview || profileImage ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={profileImagePreview || profileImage || ""}
                alt="Profile preview"
                className="w-32 h-32 rounded-full object-cover"
              />
              <Button variant="outline" size="sm" type="button">
                Change photo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  SVG, PNG, JPG or GIF (max. 800x400px)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Background Selection */}
      <div className="space-y-4">
        <div>
          <Label>Choose a background that feels like you.</Label>
          <p className="text-sm text-muted-foreground">
            Choose something that represents you.
          </p>
        </div>

        <Tabs
          defaultValue="gradients"
          className="w-full"
          onValueChange={(value) => {
            if (value === "images") {
              setIsLoadingImages(true);
              // Trigger the image loading
              const loadImages = async () => {
                try {
                  await Promise.all(
                    IMAGE_PRESETS.map((preset) => {
                      return new Promise((resolve, reject) => {
                        const img = new Image();
                        img.src = preset.url;
                        img.onload = resolve;
                        img.onerror = reject;
                      });
                    })
                  );
                } catch (error) {
                  console.error("Failed to load some images:", error);
                } finally {
                  setIsLoadingImages(false);
                }
              };
              loadImages();
            }
          }}
        >
          <TabsList className="grid grid-cols-4 mx-auto">
            <TabsTrigger value="gradients">Gradients</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="banner">Custom Banner</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="gradients" className="pt-4">
            <div className="space-y-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 w-fit mx-auto">
                {BACKGROUND_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className={cn(
                      "h-24 w-24 rounded-xl cursor-pointer border-2",
                      preset.class,
                      background?.type === "preset" &&
                        background?.preset === preset.id &&
                        "border-primary"
                    )}
                    onClick={() => handlePresetSelect(preset.id)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="images"
            className="pt-4 max-h-[70vh] overflow-y-auto"
          >
            {isLoadingImages ? (
              <div className="space-y-4">
                <Label>Landscapes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 w-full rounded-md animate-pulse bg-muted"
                    />
                  ))}
                </div>

                <Label className="mt-4">Buildings</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 w-full rounded-md animate-pulse bg-muted"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Landscapes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_PRESETS.filter(
                    (img) => img.category === "landscape"
                  ).map((image) => (
                    <div
                      key={image.id}
                      className={cn(
                        "h-24 w-full rounded-md cursor-pointer border-2 bg-cover bg-center",
                        background?.type === "custom" &&
                          background?.customUrl === image.url &&
                          "border-primary"
                      )}
                      style={{backgroundImage: `url(${image.url})`}}
                      onClick={() => handleImagePresetSelect(image.url)}
                    >
                      <div className="w-full h-full bg-black/30 flex items-end p-1">
                        <span className="text-xs text-white font-medium">
                          {image.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Label className="mt-4">Buildings</Label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_PRESETS.filter(
                    (img) => img.category === "building"
                  ).map((image) => (
                    <div
                      key={image.id}
                      className={cn(
                        "h-24 w-full rounded-md cursor-pointer border-2 bg-cover bg-center",
                        background?.type === "custom" &&
                          background?.customUrl === image.url &&
                          "border-primary"
                      )}
                      style={{backgroundImage: `url(${image.url})`}}
                      onClick={() => handleImagePresetSelect(image.url)}
                    >
                      <div className="w-full h-full bg-black/30 flex items-end p-1">
                        <span className="text-xs text-white font-medium">
                          {image.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="banner"
            className="pt-4 max-h-[70vh] overflow-y-auto"
          >
            <div className="space-y-4">
              {savedBanners.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {savedBanners.map((banner: any) => {
                      const isSelected =
                        background?.type === "banner" &&
                        background?.customBannerId === banner.id;
                      const isActive = activeBanner === banner.id;

                      return (
                        <div
                          key={banner.id}
                          className={cn(
                            "relative h-32 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                            isSelected
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-gray-200 hover:border-gray-300",
                            banner.backgroundType === "custom" &&
                              banner.customUploadUrl
                              ? ""
                              : banner.backgroundValue
                          )}
                          style={
                            banner.backgroundType === "custom" &&
                            banner.customUploadUrl
                              ? {
                                  backgroundImage: `url(${banner.customUploadUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center"
                                }
                              : {}
                          }
                          onClick={() => handleBannerSelect(banner.id)}
                        >
                          {/* Banner overlay for text readability */}
                          <div className="absolute inset-0 bg-black/10" />

                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              Active
                            </div>
                          )}

                          {/* Banner content preview */}
                          <div className="relative h-full flex flex-col gap-2 p-3">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {banner.tags
                                .slice(0, 3)
                                .map((tag: any, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                                    style={{
                                      backgroundColor: tag.backgroundColor,
                                      color: tag.color
                                    }}
                                  >
                                    {tag.text}
                                  </span>
                                ))}
                            </div>

                            {/* Headlines */}
                            <div className="text-center">
                              <h3
                                className={cn(
                                  "text-sm font-bold",
                                  banner.headline.font
                                )}
                                style={{color: banner.headline.color}}
                              >
                                {banner.headline.text}
                              </h3>
                              {banner.subheadline?.text && (
                                <p
                                  className={cn(
                                    "text-xs",
                                    banner.subheadline.font
                                  )}
                                  style={{color: banner.subheadline.color}}
                                >
                                  {banner.subheadline.text}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* No banners created yet */
                <div className="text-center py-8 space-y-4">
                  <div className="text-muted-foreground">
                    <p className="text-sm">No custom banners created yet</p>
                    <p className="text-xs">
                      Create your first custom banner to use as a background
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="pt-4">
            {backgroundUploadPreview ? (
              <div className="relative">
                <img
                  src={backgroundUploadPreview}
                  className="h-32 w-full object-cover rounded-lg"
                  alt="Background preview"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                  isUploading && "opacity-50 pointer-events-none"
                )}
                onClick={() =>
                  document.getElementById("backgroundUploadInput")?.click()
                }
                onDragEnter={handleBackgroundDrag}
                onDragLeave={handleBackgroundDrag}
                onDragOver={handleBackgroundDrag}
                onDrop={handleBackgroundDrop}
              >
                <input
                  id="backgroundUploadInput"
                  type="file"
                  className="hidden"
                  accept={ALLOWED_FILE_TYPES.join(",")}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleBackgroundFileSelect(file);
                    }
                  }}
                  disabled={isUploading}
                />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isUploading
                    ? "Uploading..."
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  SVG, PNG, JPG or GIF (max 5MB)
                </p>
              </div>
            )}

            {background?.type === "custom" &&
              background.customUrl &&
              !background.customUrl.includes("/assets/backgrounds/") && (
                <div className="mt-4 bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Current background:
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-12 w-12 bg-cover bg-center rounded"
                      style={{
                        backgroundImage: `url(${background.customUrl})`
                      }}
                    />
                    <div className="flex-1 text-sm truncate">
                      {background.customUrl.split("/").pop()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePresetSelect("gradient-1")}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
