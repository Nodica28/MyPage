import React, {useState, useEffect} from "react";
import {v4 as uuidv4} from "uuid";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Plus,
  ExternalLink,
  Trash,
  Globe,
  Phone,
  Mail,
  Linkedin,
  Instagram,
  Eye,
  EyeOff,
  Pencil,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {User, UserProfile} from "@/types/user";
import {cn} from "@/lib/utils";
import {useToast} from "@/hooks/use-toast";
import {Separator} from "@/components/ui/separator";

// Types
export interface QuickLink {
  id: string | number;
  label: string;
  url: string;
  type: "website" | "email" | "phone" | "linkedin" | "instagram" | "custom";
  isUserDefault?: boolean; // Flag for user's default contact info
  isVisible?: boolean; // Flag to control visibility
}

// Structure for available link types
interface AvailableLinkType {
  id: string;
  type: QuickLink["type"];
  label: string;
  icon: React.ReactNode;
  url?: string;
}

interface QuickLinksProps {
  links: QuickLink[];
  onChange: (links: QuickLink[]) => void;
  user?: User | UserProfile;
  organization?: any;
}

// Validation schema
const linkSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().min(1, "Label is required"),
    url: z.string().min(1, "URL is required"),
    type: z.enum([
      "website",
      "email",
      "phone",
      "linkedin",
      "instagram",
      "custom"
    ])
  })
  .refine(
    (data) => {
      const {url, type} = data;

      // Email validation
      if (type === "email") {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.replace("mailto:", ""));
      }

      // Phone validation
      if (type === "phone") {
        const phoneNumber = url.replace("tel:", "").replace(/\D/g, "");
        return phoneNumber.length >= 10;
      }

      // Website URL validation (similar to Register component)
      if (
        type === "website" ||
        type === "linkedin" ||
        type === "instagram" ||
        type === "custom"
      ) {
        try {
          // Normalize URL by adding https:// if no protocol is present
          let normalizedUrl = url;
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            normalizedUrl = `https://${url}`;
          }

          const urlObj = new URL(normalizedUrl);
          // Ensure the hostname contains at least one dot (domain.tld format)
          return urlObj.hostname.includes(".") && urlObj.hostname.length > 3;
        } catch {
          return false;
        }
      }

      return true;
    },
    {
      message: "Please enter a valid URL for this link type"
    }
  );

type LinkFormData = z.infer<typeof linkSchema>;

export function QuickLinks({
  links,
  onChange,
  user,
  organization
}: QuickLinksProps) {
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [localLinks, setLocalLinks] = useState<QuickLink[]>(links);
  const [isSaving, setIsSaving] = useState(false);
  const {toast} = useToast();

  // Lists of available links
  const [activeLinks, setActiveLinks] = useState<QuickLink[]>([]);
  const [hiddenLinks, setHiddenLinks] = useState<QuickLink[]>([]);
  const [availableLinks, setAvailableLinks] = useState<AvailableLinkType[]>([]);

  // Form
  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      label: "",
      url: "",
      type: "custom"
    }
  });

  // Update local links when props change
  useEffect(() => {
    setLocalLinks(links);
  }, [links]);

  // Initialize default links based on user and organization data
  useEffect(() => {
    if (!user) return;

    // Split links into active and hidden
    setActiveLinks(localLinks.filter((link) => link.isVisible !== false));
    setHiddenLinks(localLinks.filter((link) => link.isVisible === false));

    // Gather all default link types
    const defaultLinks: AvailableLinkType[] = [];

    // Get the types already in use in the active links
    const activeTypesUsed = new Set(localLinks.map((link) => link.type));

    // Email (user)
    if (user.email && !activeTypesUsed.has("email")) {
      defaultLinks.push({
        id: "default-email",
        type: "email",
        label: user.email,
        icon: <Mail className="h-4 w-4" />,
        url: `mailto:${user.email}`
      });
    }

    // Phone (user)
    if (user.phoneNumber && !activeTypesUsed.has("phone")) {
      defaultLinks.push({
        id: "default-phone",
        type: "phone",
        label: user.phoneNumber,
        icon: <Phone className="h-4 w-4" />,
        url: `tel:${user.phoneNumber}`
      });
    }

    // Website (organization)
    if (organization?.website && !activeTypesUsed.has("website")) {
      defaultLinks.push({
        id: "default-website",
        type: "website",
        label: organization.website,
        icon: <Globe className="h-4 w-4" />,
        url: organization.website.startsWith("http")
          ? organization.website
          : `https://${organization.website}`
      });
    }

    // LinkedIn (user)
    if (user.linkedinProfile && !activeTypesUsed.has("linkedin")) {
      defaultLinks.push({
        id: "default-linkedin",
        type: "linkedin",
        label: "LinkedIn",
        icon: <Linkedin className="h-4 w-4" />,
        url: user.linkedinProfile
      });
    }

    // Add Instagram only if not already in use
    if (!activeTypesUsed.has("instagram")) {
      defaultLinks.push({
        id: "add-instagram",
        type: "instagram",
        label: "Follow",
        icon: <Instagram className="h-4 w-4" />
      });
    }

    // Add a custom link option - always available
    defaultLinks.push({
      id: "add-custom",
      type: "custom",
      label: "Add New",
      icon: <ExternalLink className="h-4 w-4" />
    });

    setAvailableLinks(defaultLinks);
  }, [user, organization, localLinks]);

  // Handle adding a predefined link
  const handleAddPredefinedLink = (linkType: AvailableLinkType) => {
    if (!linkType.url) {
      form.reset({
        label: linkType.label,
        url: "",
        type: linkType.type
      });
      setEditingLink(null);
      setShowAddLinkDialog(true);
      return;
    }

    setIsSaving(true);
    const newLink: QuickLink = {
      id: uuidv4(),
      label: linkType.label,
      url: linkType.url,
      type: linkType.type,
      isUserDefault: true,
      isVisible: true
    };
    const newLinks = [...localLinks, newLink];
    setLocalLinks(newLinks);

    // Call onChange with a slight delay to allow UI to update
    setTimeout(() => {
      onChange(newLinks);
      setIsSaving(false);
      toast({
        title: "Quick link added",
        description: `Added ${linkType.label} to your quick links`
      });
    }, 300);
  };

  // Handle edit existing link
  const handleEditLink = (link: QuickLink) => {
    form.reset({
      id: link.id.toString(),
      label: link.label,
      url: link.url,
      type: link.type
    });
    setEditingLink(link);
    setShowAddLinkDialog(true);
  };

  // Delete a link
  const handleDeleteLink = (id: string | number) => {
    setIsSaving(true);
    const linkToDelete = localLinks.find((link) => link.id === id);
    const newLinks = localLinks.filter((link) => link.id !== id);
    setLocalLinks(newLinks);

    // Call onChange with a slight delay to allow UI to update
    setTimeout(() => {
      onChange(newLinks);
      setIsSaving(false);
      toast({
        title: "Quick link removed",
        description: linkToDelete
          ? `Removed ${linkToDelete.label} from your quick links`
          : "Link removed"
      });
    }, 300);
  };

  // Handle visibility toggle
  const handleToggleVisibility = (linkId: string | number) => {
    setIsSaving(true);
    // Find the link in either active or hidden lists
    const activeLink = activeLinks.find((link) => link.id === linkId);
    const hiddenLink = hiddenLinks.find((link) => link.id === linkId);

    // Toggle visibility
    const updatedLinks = localLinks.map((link) => {
      if (link.id === linkId) {
        return {
          ...link,
          isVisible: link.isVisible === false ? true : false
        };
      }
      return link;
    });

    setLocalLinks(updatedLinks);

    // Call onChange with a slight delay to allow UI to update
    setTimeout(() => {
      onChange(updatedLinks);
      setIsSaving(false);

      // Show toast based on action
      if (activeLink) {
        toast({
          title: "Quick link hidden",
          description: `${activeLink.label} has been hidden from your profile`
        });
      } else if (hiddenLink) {
        toast({
          title: "Quick link shown",
          description: `${hiddenLink.label} is now visible on your profile`
        });
      }
    }, 300);
  };

  const onSubmit = (data: LinkFormData) => {
    setIsSaving(true);

    let newLinks: QuickLink[];

    const newLink: QuickLink = {
      id: editingLink ? editingLink.id : uuidv4(),
      label: data.label,
      url: data.url,
      type: data.type,
      isVisible: true
    };

    if (editingLink) {
      // Update existing link
      newLinks = localLinks.map((link) =>
        link.id === editingLink.id ? newLink : link
      );
      toast({
        title: "Quick link updated",
        description: `Updated ${data.label} in your quick links`
      });
    } else {
      // Add new link
      newLinks = [...localLinks, newLink];
      toast({
        title: "Quick link added",
        description: `Added ${data.label} to your quick links`
      });
    }

    setLocalLinks(newLinks);
    onChange(newLinks);
    setShowAddLinkDialog(false);
    setEditingLink(null);
    form.reset();
    setIsSaving(false);
  };

  // Get icon based on link type
  const getLinkIcon = (type: QuickLink["type"]) => {
    switch (type) {
      case "website":
        return <Globe className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      case "instagram":
        return <Instagram className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <div>
        <div className="space-y-6">
          {/* Active Links Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Active Links</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  form.reset({
                    label: "",
                    url: "",
                    type: "custom"
                  });
                  setEditingLink(null);
                  setShowAddLinkDialog(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Link
              </Button>
            </div>
            <div className="flex flex-wrap">
              {activeLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active links. Add links from below or create custom links.
                </p>
              ) : (
                activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="inline-flex items-center px-2.5 py-2 bg-stone-100 rounded-full gap-1.5 mr-2 mb-2"
                  >
                    <div className="w-5 h-5 flex items-center justify-center text-primary">
                      {getLinkIcon(link.type)}
                    </div>
                    <div className="px-0.5 text-sm font-medium">
                      {link.label}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditLink(link)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-stone-200 rounded-full"
                        title="Edit link"
                        disabled={isSaving}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(link.id)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-stone-200 rounded-full"
                        title="Hide link"
                        disabled={isSaving}
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-red-100 text-red-500 rounded-full"
                        title="Delete link"
                        disabled={isSaving}
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hidden Links Section */}
          {hiddenLinks.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Hidden</h3>
              <div className="flex flex-wrap">
                {hiddenLinks.map((link) => (
                  <div
                    key={link.id}
                    className="inline-flex items-center px-2.5 py-2 bg-stone-100 rounded-full gap-1.5 mr-2 mb-2 opacity-50"
                  >
                    <div className="w-5 h-5 flex items-center justify-center text-primary">
                      {getLinkIcon(link.type)}
                    </div>
                    <div className="px-0.5 text-sm font-medium">
                      {link.label}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditLink(link)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-stone-200 rounded-full"
                        title="Edit link"
                        disabled={isSaving}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(link.id)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-stone-200 rounded-full"
                        title="Show link"
                        disabled={isSaving}
                      >
                        <EyeOff className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-red-100 text-red-500 rounded-full"
                        title="Delete link"
                        disabled={isSaving}
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-3">Add Quick Link</h3>
            <div className="flex flex-wrap">
              {availableLinks.map((linkType) => (
                <div
                  key={linkType.id}
                  className={cn(
                    "inline-flex items-center px-2.5 py-2 bg-stone-100 rounded-full gap-1.5 mr-2 mb-2 cursor-pointer hover:bg-stone-200",
                    isSaving && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => !isSaving && handleAddPredefinedLink(linkType)}
                >
                  <div className="w-5 h-5 flex items-center justify-center text-primary">
                    {linkType.icon}
                  </div>
                  <div className="px-0.5 text-sm font-medium">
                    {linkType.label}
                  </div>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add/Edit Link Dialog */}
        <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Edit Link" : "Add New Link"}
              </DialogTitle>
              <DialogDescription>
                {editingLink
                  ? "Update the details of this quick link."
                  : "Add a new quick link to your badge profile."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="type"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Link Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a link type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="label"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            form.watch("type") === "website"
                              ? "My Website"
                              : form.watch("type") === "email"
                                ? "Email Me"
                                : form.watch("type") === "phone"
                                  ? "Call Me"
                                  : form.watch("type") === "linkedin"
                                    ? "LinkedIn"
                                    : form.watch("type") === "instagram"
                                      ? "Instagram"
                                      : "Custom Link"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="url"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            form.watch("type") === "website"
                              ? "https://example.com"
                              : form.watch("type") === "email"
                                ? "mailto:you@example.com"
                                : form.watch("type") === "phone"
                                  ? "tel:+1234567890"
                                  : form.watch("type") === "linkedin"
                                    ? "https://linkedin.com/in/username"
                                    : form.watch("type") === "instagram"
                                      ? "https://instagram.com/username"
                                      : "https://"
                          }
                          {...field}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Add appropriate prefix for email and phone if missing
                            if (
                              form.watch("type") === "email" &&
                              value &&
                              !value.startsWith("mailto:")
                            ) {
                              value = "mailto:" + value;
                            } else if (
                              form.watch("type") === "phone" &&
                              value &&
                              !value.startsWith("tel:")
                            ) {
                              value = "tel:" + value;
                            } else if (
                              form.watch("type") === "website" &&
                              value &&
                              !value.startsWith("http://") &&
                              !value.startsWith("https://")
                            ) {
                              value = "https://" + value;
                            }
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("type") === "email"
                          ? "Email links should start with mailto:"
                          : form.watch("type") === "phone"
                            ? "Phone links should start with tel:"
                            : form.watch("type") === "website"
                              ? "Website links should start with https://"
                              : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddLinkDialog(false);
                      setEditingLink(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingLink ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{editingLink ? "Update" : "Add"}</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
