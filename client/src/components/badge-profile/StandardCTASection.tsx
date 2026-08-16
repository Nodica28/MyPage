import React, {useState, useCallback} from "react";
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
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {ChromePicker} from "react-color";
import {Card, CardContent} from "@/components/ui/card";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {ScrollArea} from "@/components/ui/scroll-area";

import {
  UploadCloud,
  Image as ImageIcon,
  ArrowRight,
  FileText,
  MessageSquare
} from "lucide-react";

// Import standardized section types
import {BaseSectionComponentProps} from "../section-management/SectionComponentTypes";

// Define a custom content type that has all the fields we need
// without trying to extend from CTAContent (which causes type errors)
interface ExtendedCTAContent {
  // Base fields from BaseSectionContent
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  status?: "sample" | "connected";

  // Theme fields
  theme?: "default" | "highlight" | "urgent" | "subtle";

  // Background options
  backgroundColor?: "white" | "gray" | "brand" | "custom";
  customBackgroundColor?: string;

  // Button options
  buttonColor?: "brand" | "white" | "black" | "custom";
  customButtonColor?: string;

  // Template options
  template?: "text-only" | "text-with-icon" | "image-inset";
  iconLeft?: string;
  image?: string;
}

// Use the base props interface with extended content type
type CTASectionProps = BaseSectionComponentProps<ExtendedCTAContent>;

function StandardCTASection({content, onChange}: CTASectionProps) {
  const [activeTab, setActiveTab] = useState("content");

  // Handle file upload for image inset template
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange({
            ...content,
            image: reader.result as string
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [content, onChange]
  );

  // Function to get background color class based on the selection
  const getBackgroundColorClass = () => {
    switch (content.backgroundColor) {
      case "white":
        return "bg-white";
      case "gray":
        return "bg-muted";
      case "brand":
        return "bg-primary/10";
      case "custom":
        return "";
      default:
        return "bg-white";
    }
  };

  // Function to get button color class based on the selection
  const getButtonColorClass = () => {
    switch (content.buttonColor) {
      case "brand":
        return "bg-primary text-primary-foreground hover:bg-primary/90";
      case "white":
        return "bg-white text-black border hover:bg-muted/90";
      case "black":
        return "bg-black text-white hover:bg-black/90";
      case "custom":
        return "";
      default:
        return "bg-primary text-primary-foreground hover:bg-primary/90";
    }
  };

  // Render the preview of the CTA based on current settings
  const renderPreview = () => {
    return (
      <div
        className={`p-6 rounded-md border ${getBackgroundColorClass()}`}
        style={
          content.backgroundColor === "custom" && content.customBackgroundColor
            ? {backgroundColor: content.customBackgroundColor}
            : {}
        }
      >
        <div className="flex items-start">
          {content.template === "image-inset" && content.image && (
            <div className="flex-shrink-0 mr-4 w-24 h-24 rounded overflow-hidden">
              <img
                src={content.image}
                alt="CTA"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div
            className={content.template === "image-inset" ? "flex-1" : "w-full"}
          >
            <div className="flex items-center mb-2">
              {content.template === "text-with-icon" && content.iconLeft && (
                <span className="mr-2 text-primary">
                  {content.iconLeft === "file" && <FileText size={20} />}
                  {content.iconLeft === "message" && (
                    <MessageSquare size={20} />
                  )}
                </span>
              )}
              <h3 className="text-lg font-semibold">
                {content.title || "Ready to get started?"}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground my-2">
              {content.description ||
                "Join thousands of users already using our platform"}
            </p>

            <div className="mt-4">
              <button
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors ${getButtonColorClass()}`}
                style={
                  content.buttonColor === "custom" && content.customButtonColor
                    ? {
                        backgroundColor: content.customButtonColor,
                        color: "#ffffff"
                      }
                    : {}
                }
              >
                {content.buttonText || "Sign Up Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="content"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        {/* Content Tab - Text content fields */}
        <TabsContent value="content" className="pt-4">
          <div className="flex flex-col space-y-6">
            {/* Preview section at the top, full width */}
            <div className="border rounded-md p-4 bg-gray-100">
              <Label className="mb-2 block">Preview</Label>
              {renderPreview()}
            </div>

            {/* Inputs section below */}
            <div className="w-full">
              <ScrollArea className="pr-4 h-[300px] overflow-auto">
                <div className="space-y-4 px-2 pb-4">
                  <div className="space-y-2">
                    <Label htmlFor="cta-title">Headline</Label>
                    <Input
                      id="cta-title"
                      value={content.title || ""}
                      onChange={(e) =>
                        onChange({...content, title: e.target.value})
                      }
                      placeholder="e.g. Ready to get started?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta-description">Description</Label>
                    <Textarea
                      id="cta-description"
                      value={content.description || ""}
                      onChange={(e) =>
                        onChange({...content, description: e.target.value})
                      }
                      placeholder="e.g. Join thousands of users already using our platform"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta-button-text">Button Text</Label>
                    <Input
                      id="cta-button-text"
                      value={content.buttonText || ""}
                      onChange={(e) =>
                        onChange({...content, buttonText: e.target.value})
                      }
                      placeholder="e.g. Sign Up Now"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta-button-link">Button Link</Label>
                    <Input
                      id="cta-button-link"
                      value={content.buttonLink || ""}
                      onChange={(e) =>
                        onChange({...content, buttonLink: e.target.value})
                      }
                      placeholder="e.g. https://example.com/signup"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      variant="default"
                      onClick={() => setActiveTab("theme")}
                    >
                      Next: Theme <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Theme Tab - Styling and template options */}
        <TabsContent value="theme" className="pt-4">
          <div className="flex flex-col space-y-6">
            {/* Preview section at the top, full width */}
            <div className="border rounded-md p-4 bg-gray-100">
              <Label className="mb-2 block">Preview</Label>
              {renderPreview()}
            </div>

            {/* Theme options below */}
            <ScrollArea className="pr-4 h-[320px] overflow-auto">
              <div className="space-y-4 pb-4 mx-1">
                <h3 className="text-md font-medium">Background</h3>
                <RadioGroup
                  value={content.backgroundColor || "white"}
                  onValueChange={(value) =>
                    onChange({
                      ...content,
                      backgroundColor: value as
                        | "white"
                        | "gray"
                        | "brand"
                        | "custom"
                    })
                  }
                  className="grid grid-cols-4 gap-3"
                >
                  <div className="flex flex-col items-center">
                    <RadioGroupItem
                      id="bg-white"
                      value="white"
                      className="sr-only"
                    />
                    <Label
                      htmlFor="bg-white"
                      className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                        content.backgroundColor === "white"
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                    >
                      <div className="w-full h-10 bg-white border rounded mb-2"></div>
                      <span className="text-xs">White</span>
                    </Label>
                  </div>

                  <div className="flex flex-col items-center">
                    <RadioGroupItem
                      id="bg-gray"
                      value="gray"
                      className="sr-only"
                    />
                    <Label
                      htmlFor="bg-gray"
                      className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                        content.backgroundColor === "gray"
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                    >
                      <div className="w-full h-10 bg-muted rounded mb-2"></div>
                      <span className="text-xs">Gray</span>
                    </Label>
                  </div>

                  <div className="flex flex-col items-center">
                    <RadioGroupItem
                      id="bg-brand"
                      value="brand"
                      className="sr-only"
                    />
                    <Label
                      htmlFor="bg-brand"
                      className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                        content.backgroundColor === "brand"
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                    >
                      <div className="w-full h-10 bg-primary/10 rounded mb-2"></div>
                      <span className="text-xs">Brand</span>
                    </Label>
                  </div>

                  <div className="flex flex-col items-center">
                    <RadioGroupItem
                      id="bg-custom"
                      value="custom"
                      className="sr-only"
                    />
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Label
                          htmlFor="bg-custom"
                          className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                            content.backgroundColor === "custom"
                              ? "ring-2 ring-primary"
                              : ""
                          }`}
                        >
                          <div
                            className="w-full h-10 rounded mb-2 border"
                            style={{
                              backgroundColor:
                                content.customBackgroundColor || "#f0f0f0"
                            }}
                          ></div>
                          <span className="text-xs">Custom</span>
                        </Label>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-4"
                        side="left"
                        align="start"
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <h4 className="text-sm font-medium">
                            Background Color
                          </h4>
                          <ChromePicker
                            color={content.customBackgroundColor || "#ffffff"}
                            onChange={(color) =>
                              onChange({
                                ...content,
                                customBackgroundColor: color.hex
                              })
                            }
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </RadioGroup>

                <div className="space-y-4 pt-4 border-t mt-4">
                  <h3 className="text-md font-medium">Button Color</h3>
                  <RadioGroup
                    value={content.buttonColor || "brand"}
                    onValueChange={(value) =>
                      onChange({
                        ...content,
                        buttonColor: value as
                          | "brand"
                          | "white"
                          | "black"
                          | "custom"
                      })
                    }
                    className="grid grid-cols-4 gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <RadioGroupItem
                        id="btn-brand"
                        value="brand"
                        className="sr-only"
                      />
                      <Label
                        htmlFor="btn-brand"
                        className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                          content.buttonColor === "brand"
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <div className="w-full h-10 bg-primary rounded mb-2"></div>
                        <span className="text-xs">Brand</span>
                      </Label>
                    </div>

                    <div className="flex flex-col items-center">
                      <RadioGroupItem
                        id="btn-white"
                        value="white"
                        className="sr-only"
                      />
                      <Label
                        htmlFor="btn-white"
                        className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                          content.buttonColor === "white"
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <div className="w-full h-10 bg-white border rounded mb-2"></div>
                        <span className="text-xs">White</span>
                      </Label>
                    </div>

                    <div className="flex flex-col items-center">
                      <RadioGroupItem
                        id="btn-black"
                        value="black"
                        className="sr-only"
                      />
                      <Label
                        htmlFor="btn-black"
                        className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                          content.buttonColor === "black"
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <div className="w-full h-10 bg-black rounded mb-2"></div>
                        <span className="text-xs">Black</span>
                      </Label>
                    </div>

                    <div className="flex flex-col items-center">
                      <RadioGroupItem
                        id="btn-custom"
                        value="custom"
                        className="sr-only"
                      />
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Label
                            htmlFor="btn-custom"
                            className={`flex flex-col items-center p-2 border rounded-md cursor-pointer w-full ${
                              content.buttonColor === "custom"
                                ? "ring-2 ring-primary"
                                : ""
                            }`}
                          >
                            <div
                              className="w-full h-10 rounded mb-2 border"
                              style={{
                                backgroundColor:
                                  content.customButtonColor || "#000000"
                              }}
                            ></div>
                            <span className="text-xs">Custom</span>
                          </Label>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-4"
                          side="left"
                          align="start"
                        >
                          <div className="flex flex-col items-center space-y-4">
                            <h4 className="text-sm font-medium">
                              Button Color
                            </h4>
                            <ChromePicker
                              color={content.customButtonColor || "#000000"}
                              onChange={(color) =>
                                onChange({
                                  ...content,
                                  customButtonColor: color.hex
                                })
                              }
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-4 pt-4 border-t mt-4">
                  <h3 className="text-md font-medium">Select Template</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Card
                      className={`cursor-pointer hover:border-primary/50 ${
                        content.template === "text-only"
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() =>
                        onChange({...content, template: "text-only"})
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center">
                          <FileText className="h-8 w-8 mb-2 text-primary" />
                          <p className="text-xs text-center">Text Only</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer hover:border-primary/50 ${
                        content.template === "text-with-icon"
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() =>
                        onChange({...content, template: "text-with-icon"})
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center mb-2">
                            <MessageSquare className="h-6 w-6 text-primary" />
                            <ArrowRight className="h-4 w-4 mx-1" />
                            <FileText className="h-8 w-8 text-primary" />
                          </div>
                          <p className="text-xs text-center">Text with Icon</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer hover:border-primary/50 ${
                        content.template === "image-inset"
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() =>
                        onChange({...content, template: "image-inset"})
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center mb-2">
                            <ImageIcon className="h-8 w-8 text-primary" />
                            <ArrowRight className="h-4 w-4 mx-1" />
                            <FileText className="h-8 w-8 text-primary" />
                          </div>
                          <p className="text-xs text-center">Inset Image</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {content.template === "text-with-icon" && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="icon-select">Select Icon</Label>
                      <Select
                        value={content.iconLeft || "file"}
                        onValueChange={(value) =>
                          onChange({...content, iconLeft: value})
                        }
                      >
                        <SelectTrigger id="icon-select">
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="file">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              <span>Document</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="message">
                            <div className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              <span>Message</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {content.template === "image-inset" && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="image-upload">Upload Image</Label>
                      <div className="flex items-center justify-center border-2 border-dashed rounded-md p-4">
                        {content.image ? (
                          <div className="relative w-full">
                            <img
                              src={content.image}
                              alt="Uploaded"
                              className="max-h-32 mx-auto rounded"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-0 right-0 mt-1 mr-1"
                              onClick={() =>
                                onChange({...content, image: undefined})
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-2">
                              Click to upload or drag and drop
                            </p>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            <Button
                              variant="secondary"
                              className="mt-2"
                              onClick={() => {
                                document
                                  .getElementById("image-upload")
                                  ?.click();
                              }}
                            >
                              Select Image
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended size: 400x400 pixels
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("content")}
                  >
                    Back to Content
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StandardCTASection;
