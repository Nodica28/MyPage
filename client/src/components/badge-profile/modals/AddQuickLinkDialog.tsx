import React, {useState} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Globe,
  Mail,
  Phone,
  Linkedin,
  Instagram,
  ExternalLink
} from "lucide-react";
import {QuickLink} from "../QuickLinks";

interface AddQuickLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quickLink: Omit<QuickLink, "id">) => void;
}

const linkTypes = [
  {
    value: "email",
    label: "Email me",
    displayName: "Email",
    icon: Mail,
    placeholder: "your.email@example.com",
    urlPrefix: "mailto:"
  },
  {
    value: "phone",
    label: "Call me",
    displayName: "Phone",
    icon: Phone,
    placeholder: "+1 (555) 123-4567",
    urlPrefix: "tel:"
  },
  {
    value: "website",
    label: "Visit my website",
    displayName: "Website",
    icon: Globe,
    placeholder: "www.example.com",
    urlPrefix: "https://"
  },
  {
    value: "linkedin",
    label: "Connect on LinkedIn",
    displayName: "LinkedIn",
    icon: Linkedin,
    placeholder: "linkedin.com/in/username",
    urlPrefix: "https://"
  },
  {
    value: "instagram",
    label: "Follow me",
    displayName: "Instagram",
    icon: Instagram,
    placeholder: "instagram.com/username",
    urlPrefix: "https://"
  },
  {
    value: "custom",
    label: "Learn more",
    displayName: "Custom Link",
    icon: ExternalLink,
    placeholder: "https://example.com",
    urlPrefix: ""
  }
] as const;

export function AddQuickLinkDialog({
  isOpen,
  onClose,
  onSave
}: AddQuickLinkDialogProps) {
  const [formData, setFormData] = useState({
    type: "" as QuickLink["type"] | "",
    label: "",
    url: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUserEditedLabel, setHasUserEditedLabel] = useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({type: "", label: "", url: ""});
      setErrors({});
      setHasUserEditedLabel(false);
    }
  }, [isOpen]);

  // Auto-generate label based on type (only if user hasn't manually edited it)
  React.useEffect(() => {
    if (formData.type && !hasUserEditedLabel) {
      const typeConfig = linkTypes.find((t) => t.value === formData.type);
      if (typeConfig) {
        setFormData((prev) => ({
          ...prev,
          label: typeConfig.label
        }));
      }
    }
  }, [formData.type, hasUserEditedLabel]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = "Please select a link type";
    }
    if (!formData.label.trim()) {
      newErrors.label = "Please enter a label";
    }
    if (!formData.url.trim()) {
      newErrors.url = "Please enter a URL";
    } else {
      // Basic URL validation
      const urlPattern = /^(https?:\/\/|mailto:|tel:)/;
      if (formData.type === "email") {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(formData.url)) {
          newErrors.url = "Please enter a valid email address";
        }
      } else if (formData.type === "phone") {
        const phonePattern = /^[+]?[1-9][\d\s\-()]{7,}$/;
        if (!phonePattern.test(formData.url)) {
          newErrors.url = "Please enter a valid phone number";
        }
      } else if (
        !urlPattern.test(formData.url) &&
        !formData.url.includes(".")
      ) {
        newErrors.url = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Format URL based on type
    let formattedUrl = formData.url;
    const typeConfig = linkTypes.find((t) => t.value === formData.type);

    if (typeConfig) {
      if (formData.type === "email" && !formattedUrl.startsWith("mailto:")) {
        formattedUrl = `mailto:${formattedUrl}`;
      } else if (
        formData.type === "phone" &&
        !formattedUrl.startsWith("tel:")
      ) {
        formattedUrl = `tel:${formattedUrl}`;
      } else if (
        (formData.type === "website" ||
          formData.type === "linkedin" ||
          formData.type === "instagram" ||
          formData.type === "custom") &&
        !formattedUrl.startsWith("http")
      ) {
        formattedUrl = `https://${formattedUrl}`;
      }
    }

    const newQuickLink: Omit<QuickLink, "id"> = {
      type: formData.type as QuickLink["type"],
      label: formData.label.trim(),
      url: formattedUrl,
      isVisible: true
    };

    onSave(newQuickLink);
    onClose();
  };

  const selectedType = linkTypes.find((t) => t.value === formData.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Quick Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Link Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Link Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  type: value as QuickLink["type"]
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select link type">
                  {selectedType && (
                    <div className="flex items-center gap-2">
                      <selectedType.icon className="h-4 w-4" />
                      {selectedType.displayName}
                    </div>
                  )}
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
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          {/* Label Field */}
          <div className="space-y-2">
            <Label htmlFor="label">Display Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => {
                setFormData((prev) => ({...prev, label: e.target.value}));
                setHasUserEditedLabel(true);
              }}
              placeholder="How this link will appear"
            />
            {errors.label && (
              <p className="text-sm text-red-500">{errors.label}</p>
            )}
          </div>

          {/* URL Field */}
          <div className="space-y-2">
            <Label htmlFor="url">
              {formData.type === "email"
                ? "Email Address"
                : formData.type === "phone"
                  ? "Phone Number"
                  : "URL"}
            </Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) =>
                setFormData((prev) => ({...prev, url: e.target.value}))
              }
              placeholder={selectedType?.placeholder || "Enter URL"}
            />
            {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Add Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
