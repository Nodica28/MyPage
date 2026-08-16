import {useState, useEffect} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import {ChromePicker} from "react-color";
import {useToast} from "@/hooks/use-toast";
import {apiRequest, queryClient} from "@/lib/queryClient";
import {useMutation} from "@tanstack/react-query";
import {useLocation} from "wouter";
import {QRCodeDisplay} from "@/components/qr-code-display";
import {
  CheckCircle2,
  Palette,
  Type,
  Tag,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Upload
} from "lucide-react";

// Types
interface TagInterface {
  text: string;
  color: string;
  backgroundColor: string;
}

interface BannerSettings {
  headline: {
    text: string;
    font: string;
    color: string;
  };
  subheadline?: {
    text: string;
    font: string;
    color: string;
  };
  tags: TagInterface[];
  customUploadUrl?: string | null;
}

// Available fonts
const FONTS = [
  {name: "Inter", value: "font-sans"},
  {name: "Serif", value: "font-serif"},
  {name: "Mono", value: "font-mono"}
] as const;

const PRESET_BACKGROUNDS = [
  {name: "Rose Gradient", class: "bg-gradient-to-r from-rose-100 to-rose-200"},
  {name: "Blue Gradient", class: "bg-gradient-to-r from-blue-100 to-blue-200"},
  {
    name: "Purple Gradient",
    class: "bg-gradient-to-r from-purple-100 to-purple-200"
  },
  {
    name: "Green Gradient",
    class: "bg-gradient-to-r from-green-100 to-green-200"
  }
];

interface BannerEditorProps {
  editingBanner?: {
    id: string;
    name?: string;
    headline: {
      text: string;
      font: string;
      color: string;
    };
    subheadline?: {
      text: string;
      font: string;
      color: string;
    };
    tags: TagInterface[];
    backgroundType: "preset" | "custom";
    backgroundValue: string;
    customUploadUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  onSaveComplete?: () => void;
}

export function BannerEditor({
  editingBanner,
  onSaveComplete
}: BannerEditorProps = {}) {
  const {user} = useAuth();
  const {toast} = useToast();
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBackground, setCurrentBackground] = useState<string>(
    user?.settings?.theme?.banner?.id ||
      "bg-gradient-to-r from-purple-100 to-purple-200"
  );
  const [headline, setHeadline] = useState<BannerSettings["headline"]>({
    text: "Add Your Headline",
    font: "font-sans",
    color: "#000000"
  });
  const [subheadline, setSubheadline] =
    useState<BannerSettings["subheadline"]>();
  const [tags, setTags] = useState<TagInterface[]>([]);
  const [bannerName, setBannerName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Initialize with editing banner data
  useEffect(() => {
    if (editingBanner) {
      setCurrentBackground(editingBanner.backgroundValue);
      setHeadline(editingBanner.headline);
      setSubheadline(editingBanner.subheadline);
      setTags(editingBanner.tags);
      setBannerName(editingBanner.name || "");
      setUploadedImageUrl(editingBanner.customUploadUrl || null);
    }
  }, [editingBanner]);

  const steps = [
    {id: 0, title: "Background", icon: <Palette className="h-5 w-5 mr-2" />},
    {id: 1, title: "Headline", icon: <Type className="h-5 w-5 mr-2" />},
    {id: 2, title: "Subheadline", icon: <Type className="h-5 w-5 mr-2" />},
    {id: 3, title: "Tags", icon: <Tag className="h-5 w-5 mr-2" />},
    {id: 4, title: "Review", icon: <CheckCircle2 className="h-5 w-5 mr-2" />}
  ];

  const updateBannerMutation = useMutation({
    mutationFn: async (bannerSettings: BannerSettings & {id?: string}) => {
      setIsSaving(true);

      // Prepare banner data for the new API
      const bannerData = {
        ...(bannerSettings.id && {id: bannerSettings.id}),
        name: bannerName || `Banner ${new Date().toLocaleDateString()}`,
        headline: bannerSettings.headline,
        subheadline: bannerSettings.subheadline,
        tags: bannerSettings.tags,
        backgroundType: currentBackground.startsWith("bg-")
          ? "preset"
          : "custom",
        backgroundValue: currentBackground,
        customUploadUrl: bannerSettings.customUploadUrl,
        setAsActive: !editingBanner // Set as active for new banners
      };

      const data = await apiRequest("/api/users/banner", {
        method: "POST",
        body: JSON.stringify(bannerData)
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: ["user"]});
      toast({
        title: "Banner saved",
        description: "Your custom banner has been saved successfully."
      });
      setIsSaving(false);

      // Store the banner ID for future reference
      console.log("Banner saved with ID:", data.banner?.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving banner",
        description: error.message,
        variant: "destructive"
      });
      setIsSaving(false);
    }
  });

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size should be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to upload image");
      }

      const {url} = await response.json();

      setCurrentBackground("custom-upload");
      // Store the uploaded URL for later use when saving
      setUploadedImageUrl(url);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const addNewTag = () => {
    if (tags.length < 5) {
      setTags([
        ...tags,
        {
          text: "",
          color: "#FFFFFF",
          backgroundColor: "#000000"
        }
      ]);
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, updates: Partial<TagInterface>) => {
    const newTags = [...tags];
    newTags[index] = {...newTags[index], ...updates};
    setTags(newTags);
  };

  const saveAllChanges = async () => {
    try {
      setIsSaving(true);
      await updateBannerMutation.mutateAsync({
        headline,
        subheadline,
        tags,
        customUploadUrl: uploadedImageUrl || null,
        // Include banner ID if editing existing banner
        ...(editingBanner && {id: editingBanner.id})
      });

      // Call the completion callback if provided (for BannerManager)
      if (onSaveComplete) {
        onSaveComplete();
      } else {
        // After successful save, navigate to the home page (standalone mode)
        setLocation("/");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Preview banner component
  const BannerPreview = () => {
    const isCustomUpload =
      currentBackground === "custom-upload" && uploadedImageUrl;

    return (
      <div
        className={cn(
          "h-48 md:h-64 rounded-lg transition-all duration-300 relative overflow-hidden",
          isCustomUpload ? "" : currentBackground
        )}
        style={
          isCustomUpload
            ? {
                backgroundImage: `url(${uploadedImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }
            : {}
        }
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Content container */}
        <div className="relative h-full flex flex-col justify-between p-6">
          {/* Top section: Tags */}
          <div className="flex flex-wrap gap-2 max-w-[70%]">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm"
                style={{
                  backgroundColor: tag.backgroundColor,
                  color: tag.color
                }}
              >
                {tag.text}
              </span>
            ))}
          </div>

          {/* Middle section: Headlines */}
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
            <h1
              className={cn(
                "text-3xl md:text-4xl font-bold mb-2 break-words max-w-2xl",
                headline.font
              )}
              style={{color: headline.color}}
            >
              {headline.text}
            </h1>
            {subheadline?.text && (
              <p
                className={cn(
                  "text-xl md:text-2xl break-words max-w-xl",
                  subheadline.font
                )}
                style={{color: subheadline.color}}
              >
                {subheadline.text}
              </p>
            )}
          </div>

          {/* Bottom section: QR Code */}
          {user?.id && (
            <div className="absolute bottom-6 right-6">
              <QRCodeDisplay user={user} size="md" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Background
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {PRESET_BACKGROUNDS.map((bg) => (
                <Card
                  key={bg.name}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    currentBackground === bg.class ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setCurrentBackground(bg.class);
                  }}
                >
                  <CardContent className="p-0">
                    <div className={`h-24 w-full ${bg.class} rounded-t-lg`} />
                    <div className="p-2 text-sm font-medium">{bg.name}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Custom Image Upload</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={isUploading}
                  className="flex-1"
                />
                {isUploading ? (
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
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        );

      case 1: // Headline
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="headline-text">Headline Text</Label>
              <Input
                id="headline-text"
                value={headline.text}
                onChange={(e) => {
                  setHeadline({
                    ...headline,
                    text: e.target.value
                  });
                }}
                placeholder="Enter headline text"
                className="mb-4"
              />
            </div>

            <div className="space-y-2">
              <Label>Font Style</Label>
              <div className="flex gap-2">
                {FONTS.map((font) => (
                  <Button
                    key={font.value}
                    variant={
                      headline.font === font.value ? "default" : "outline"
                    }
                    onClick={() => {
                      setHeadline({
                        ...headline,
                        font: font.value
                      });
                    }}
                    className={font.value}
                  >
                    {font.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Text Color</Label>
              <ChromePicker
                color={headline.color}
                onChange={(color) => {
                  setHeadline({
                    ...headline,
                    color: color.hex
                  });
                }}
                className="w-full"
              />
            </div>
          </div>
        );

      case 2: // Subheadline
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subheadline-text">Subheadline Text</Label>
              <Input
                id="subheadline-text"
                value={subheadline?.text || ""}
                onChange={(e) => {
                  setSubheadline({
                    ...(subheadline || {
                      font: "font-sans",
                      color: "#000000",
                      text: ""
                    }),
                    text: e.target.value
                  });
                }}
                placeholder="Enter subheadline text (optional)"
                className="mb-4"
              />
            </div>

            {(subheadline?.text || "").length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Font Style</Label>
                  <div className="flex gap-2">
                    {FONTS.map((font) => (
                      <Button
                        key={font.value}
                        variant={
                          subheadline?.font === font.value
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setSubheadline({
                            ...(subheadline || {
                              font: "font-sans",
                              color: "#000000",
                              text: ""
                            }),
                            font: font.value
                          });
                        }}
                        className={font.value}
                      >
                        {font.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <ChromePicker
                    color={subheadline?.color || "#000000"}
                    onChange={(color) => {
                      setSubheadline({
                        ...(subheadline || {
                          font: "font-sans",
                          color: "#000000",
                          text: ""
                        }),
                        color: color.hex
                      });
                    }}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 3: // Tags
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Banner Tags (Up to 5)</Label>
                {tags.length < 5 && (
                  <Button variant="outline" size="sm" onClick={addNewTag}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tag
                  </Button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Tags help visitors understand what your page is about at a
                glance.
              </p>

              <div className="space-y-4 mt-4">
                {tags.map((tag, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Tag Text</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTag(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <Input
                        value={tag.text}
                        onChange={(e) =>
                          updateTag(index, {text: e.target.value})
                        }
                        placeholder={`Tag ${index + 1}`}
                        maxLength={30}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Text Color</Label>
                          <ChromePicker
                            color={tag.color}
                            onChange={(color) =>
                              updateTag(index, {color: color.hex})
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Background Color</Label>
                          <ChromePicker
                            color={tag.backgroundColor}
                            onChange={(color) =>
                              updateTag(index, {backgroundColor: color.hex})
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Banner Review</h3>
              <p className="text-sm text-muted-foreground">
                Review your banner before saving. Here's how it will appear on
                your page.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="banner-name">Banner Name (Optional)</Label>
                <Input
                  id="banner-name"
                  value={bannerName}
                  onChange={(e) => setBannerName(e.target.value)}
                  placeholder="Enter a name for this banner"
                  className="mb-4"
                />
              </div>

              <div className="space-y-2">
                <Label>Background</Label>
                <div
                  className={`h-12 w-full rounded-md ${currentBackground}`}
                ></div>
              </div>

              <div className="space-y-2">
                <Label>Headline</Label>
                <div
                  className={`p-2 border rounded-md ${headline.font}`}
                  style={{color: headline.color}}
                >
                  {headline.text}
                </div>
              </div>

              {subheadline?.text && (
                <div className="space-y-2">
                  <Label>Subheadline</Label>
                  <div
                    className={`p-2 border rounded-md ${subheadline.font}`}
                    style={{color: subheadline.color}}
                  >
                    {subheadline.text}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: tag.backgroundColor,
                        color: tag.color
                      }}
                    >
                      {tag.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-2">
          {editingBanner ? "Edit Banner" : "Create New Banner"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {editingBanner ? "Customize" : "Create"} your personal banner
        </p>
        <div>
          <div className="max-w-4xl mx-auto">
            {/* Preview */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Banner Preview</CardTitle>
                <CardDescription>
                  This is how your banner will appear on your page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BannerPreview />
              </CardContent>
            </Card>

            {/* Step Navigation */}
            <div className="flex overflow-x-auto pb-4 mb-4 gap-1">
              {steps.map((step) => (
                <Button
                  key={step.id}
                  variant={activeStep === step.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-shrink-0",
                    activeStep > step.id &&
                      "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  )}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="flex items-center">
                    {step.icon}
                    <span>{step.title}</span>
                  </div>
                </Button>
              ))}
            </div>

            {/* Step Content */}
            <Card>
              <CardHeader>
                <CardTitle>{steps[activeStep].title}</CardTitle>
                <CardDescription>
                  {activeStep === 0 && "Choose a background for your banner"}
                  {activeStep === 1 && "Set your headline text, font and color"}
                  {activeStep === 2 && "Add an optional subheadline"}
                  {activeStep === 3 && "Add up to 5 tags to your banner"}
                  {activeStep === 4 && "Review and save your banner"}
                </CardDescription>
              </CardHeader>
              <CardContent>{renderStepContent()}</CardContent>
            </Card>

            {/* Navigation/Action Buttons */}
            <div className="flex justify-between mt-6">
              <div>
                {activeStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep(activeStep - 1)}
                  >
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                {activeStep < steps.length - 1 ? (
                  <Button onClick={() => setActiveStep(activeStep + 1)}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={saveAllChanges} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Finish & Save"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BannerEditor;
