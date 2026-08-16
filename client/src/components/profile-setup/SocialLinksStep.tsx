import React, {useState} from "react";
import {UseFormReturn, useFieldArray} from "react-hook-form";
import {ProfileSetupFormData} from "@/schemas/profile-setup";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Plus,
  Instagram,
  Globe,
  X,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {QuickLink} from "@/components/badge-profile/QuickLinks";

interface SocialLinksStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
}

const linkTypes = [
  {
    value: "email",
    label: "Email me",
    displayName: "Email",
    icon: Mail,
    placeholder: "your.email@example.com"
  },
  {
    value: "phone",
    label: "Call me",
    displayName: "Phone",
    icon: Phone,
    placeholder: "+1 (555) 123-4567"
  },
  {
    value: "website",
    label: "Visit my website",
    displayName: "Website",
    icon: Globe,
    placeholder: "www.example.com"
  },
  {
    value: "linkedin",
    label: "Connect on LinkedIn",
    displayName: "LinkedIn",
    icon: Linkedin,
    placeholder: "linkedin.com/in/username"
  },
  {
    value: "instagram",
    label: "Follow me",
    displayName: "Instagram",
    icon: Instagram,
    placeholder: "instagram.com/username"
  },
  {
    value: "custom",
    label: "Learn more",
    displayName: "Custom Link",
    icon: ExternalLink,
    placeholder: "https://example.com"
  }
] as const;

export const SocialLinksStep: React.FC<SocialLinksStepProps> = ({form}) => {
  const {fields, append, remove} = useFieldArray({
    control: form.control,
    name: "socialLinks"
  });

  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkType, setNewLinkType] = useState<QuickLink["type"]>("website");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [expandedLinks, setExpandedLinks] = useState<Set<string | number>>(
    new Set()
  );

  // Initialize default social link fields if empty
  React.useEffect(() => {
    if (fields.length === 0) {
      // Add empty fields for Instagram and Website
      append({
        id: "temp-instagram",
        label: "Follow me",
        url: "",
        type: "instagram",
        isVisible: true
      });
      append({
        id: "temp-website",
        label: "Visit my website",
        url: "",
        type: "website",
        isVisible: true
      });
    }
  }, [fields.length, append]);

  // Auto-update label when type changes (only if label matches old type's default)
  React.useEffect(() => {
    if (newLinkType && !newLinkLabel) {
      const typeConfig = linkTypes.find((t) => t.value === newLinkType);
      if (typeConfig) {
        setNewLinkLabel(typeConfig.label);
      }
    }
  }, [newLinkType, newLinkLabel]);

  const handleAddLink = () => {
    if (newLinkUrl.trim() && newLinkLabel.trim()) {
      // Format URL based on type
      let formattedUrl = newLinkUrl.trim();
      const typeConfig = linkTypes.find((t) => t.value === newLinkType);

      if (typeConfig) {
        if (newLinkType === "email" && !formattedUrl.startsWith("mailto:")) {
          formattedUrl = `mailto:${formattedUrl}`;
        } else if (
          newLinkType === "phone" &&
          !formattedUrl.startsWith("tel:")
        ) {
          formattedUrl = `tel:${formattedUrl}`;
        } else if (
          (newLinkType === "website" ||
            newLinkType === "linkedin" ||
            newLinkType === "instagram" ||
            newLinkType === "custom") &&
          !formattedUrl.startsWith("http")
        ) {
          formattedUrl = `https://${formattedUrl}`;
        }
      }

      const newLinkId = `link-${Date.now()}`;
      append({
        id: newLinkId,
        label: newLinkLabel.trim(),
        url: formattedUrl,
        type: newLinkType,
        isVisible: true
      });

      // Auto-expand the newly added link
      setExpandedLinks((prev) => {
        const newSet = new Set(prev);
        newSet.add(newLinkId);
        return newSet;
      });

      // Reset form
      setNewLinkUrl("");
      setNewLinkLabel("");
      setNewLinkType("website");
      setShowAddLink(false);
    }
  };

  const handleTypeChange = (index: number, newType: QuickLink["type"]) => {
    const currentLabel = form.getValues(`socialLinks.${index}.label`);
    const typeConfig = linkTypes.find((t) => t.value === newType);

    form.setValue(`socialLinks.${index}.type`, newType);

    // Update label if it matches the old type's default label
    if (typeConfig) {
      const oldType = form.getValues(`socialLinks.${index}.type`);
      const oldTypeConfig = linkTypes.find((t) => t.value === oldType);
      if (oldTypeConfig && currentLabel === oldTypeConfig.label) {
        form.setValue(`socialLinks.${index}.label`, typeConfig.label);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Connect Your Socials.</h1>
        <p className="text-muted-foreground mt-2">
          Let people learn more about you — linking socials is optional.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const linkType = form.watch(`socialLinks.${index}.type`);
          const linkLabel = form.watch(`socialLinks.${index}.label`);
          const linkUrl = form.watch(`socialLinks.${index}.url`);
          const selectedType = linkTypes.find((t) => t.value === linkType);
          const isExpanded = expandedLinks.has(field.id);
          const Icon = selectedType?.icon || Globe;

          return (
            <div key={field.id} className="border rounded-lg overflow-hidden">
              {/* Collapsed Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  const newExpanded = new Set(expandedLinks);
                  if (isExpanded) {
                    newExpanded.delete(field.id);
                  } else {
                    newExpanded.add(field.id);
                  }
                  setExpandedLinks(newExpanded);
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {linkLabel.trim() || selectedType?.displayName || "Link"}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {linkUrl.trim() || "No URL added"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(index);
                      }}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="transition-transform duration-300 ease-in-out">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground transition-transform duration-300 rotate-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 rotate-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-4 space-y-3 border-t bg-muted/20">
                  {/* Type Selector */}
                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.type`}
                    render={({field: typeField}) => (
                      <FormItem>
                        <FormLabel>Link Type</FormLabel>
                        <Select
                          value={typeField.value}
                          onValueChange={(value) => {
                            typeField.onChange(value);
                            handleTypeChange(index, value as QuickLink["type"]);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {selectedType && (
                                  <div className="flex items-center gap-2">
                                    <selectedType.icon className="h-4 w-4" />
                                    {selectedType.displayName}
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {linkTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  {type.displayName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Display Label */}
                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.label`}
                    render={({field: labelField}) => (
                      <FormItem>
                        <FormLabel>Display Label</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="How this link will appear"
                            {...labelField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* URL Field */}
                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.url`}
                    render={({field: urlField}) => (
                      <FormItem>
                        <FormLabel>
                          {linkType === "email"
                            ? "Email Address"
                            : linkType === "phone"
                              ? "Phone Number"
                              : "URL"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={selectedType?.placeholder || "Add URL"}
                            {...urlField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {showAddLink ? (
          <div className="border rounded-lg p-4 space-y-4">
            {/* Type Selector */}
            <div className="space-y-2">
              <FormLabel>Link Type</FormLabel>
              <Select
                value={newLinkType}
                onValueChange={(value) => {
                  setNewLinkType(value as QuickLink["type"]);
                  const typeConfig = linkTypes.find((t) => t.value === value);
                  if (typeConfig && !newLinkLabel) {
                    setNewLinkLabel(typeConfig.label);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const typeConfig = linkTypes.find(
                        (t) => t.value === newLinkType
                      );
                      return typeConfig ? (
                        <div className="flex items-center gap-2">
                          <typeConfig.icon className="h-4 w-4" />
                          {typeConfig.displayName}
                        </div>
                      ) : null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {linkTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.displayName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display Label */}
            <div className="space-y-2">
              <FormLabel>Display Label</FormLabel>
              <Input
                placeholder="How this link will appear"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
              />
            </div>

            {/* URL Field */}
            <div className="space-y-2">
              <FormLabel>
                {newLinkType === "email"
                  ? "Email Address"
                  : newLinkType === "phone"
                    ? "Phone Number"
                    : "URL"}
              </FormLabel>
              <Input
                placeholder={
                  linkTypes.find((t) => t.value === newLinkType)?.placeholder ||
                  "Add URL"
                }
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    newLinkUrl.trim() &&
                    newLinkLabel.trim()
                  ) {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleAddLink}
                disabled={!newLinkUrl.trim() || !newLinkLabel.trim()}
                className="flex-1"
              >
                Add Link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddLink(false);
                  setNewLinkUrl("");
                  setNewLinkLabel("");
                  setNewLinkType("website");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowAddLink(true);
              const typeConfig = linkTypes.find((t) => t.value === "website");
              if (typeConfig) {
                setNewLinkLabel(typeConfig.label);
              }
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add social links
          </Button>
        )}
      </div>
    </div>
  );
};
