import React, {useState, useEffect, useMemo, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {
  Plus,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Link2,
  Pencil,
  X,
  User
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {LazyAvatar} from "@/components/ui/lazy-image";

interface Organization {
  id: string;
  name: string;
  logo?: string | null;
  website?: string | null;
  description?: string | null;
  defaultColor?: string | null;
  domain?: string | null;
  socialProfiles?: Array<any> | null;
  phone?: string | null;
  linkedinProfile?: string | null;
}

interface ContactPill {
  id: string;
  type: "email" | "phone" | "website" | "linkedin" | "custom";
  text: string;
  url: string;
  icon: React.ReactNode;
  showEditControls?: boolean;
}

interface ContactCardProps {
  firstName: string;
  lastName: string;
  title?: string | null;
  organizationId?: string | null;
  organization?: Organization | null;
  bio?: string | null;
  profileImage?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  linkedinProfile?: string | null;
  isPublicView?: boolean;
  onSaveContact?: () => void;
  onFollow?: () => void;
  customPills?: ContactPill[]; // Add support for custom pills
  onChange?: (field: string, value: any) => void; // Callback for pill changes
}

export function ContactCard({
  firstName,
  lastName,
  title,
  organizationId,
  organization,
  bio,
  profileImage,
  email,
  phoneNumber,
  linkedinProfile,
  isPublicView = false,
  onSaveContact,
  onFollow,
  customPills,
  onChange
}: ContactCardProps) {
  const [orgData, setOrgData] = useState<Organization | null>(
    organization || null
  );

  // Fetch organization data if needed
  useEffect(() => {
    const fetchOrganization = async () => {
      if (organizationId && !organization) {
        try {
          const response = await fetch(`/api/organization/${organizationId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch organization: ${response.status}`);
          }
          const data = await response.json();
          setOrgData(data);
        } catch (error) {
          console.error("Error fetching organization:", error);
        }
      } else if (organization) {
        setOrgData(organization);
      }
    };

    fetchOrganization();
  }, [organizationId, organization]);

  // Get organization data properties
  const companyName = orgData?.name || null;
  const companyLogo = orgData?.logo || null;
  const website = orgData?.website || null;
  const companyPhone = orgData?.phone || null;
  const companyLinkedin = orgData?.linkedinProfile || null;

  // Generate contact pills for the initial state and when dependencies change
  const generatedPills = useMemo(() => {
    // Otherwise, generate pills from standard properties
    const pills: ContactPill[] = [];

    if (website) {
      pills.push({
        id: "website",
        type: "website",
        text: website,
        url: website.startsWith("http") ? website : `https://${website}`,
        icon: <Globe className="h-3.5 w-3.5 text-stone-500" />
      });
    }

    if (email) {
      pills.push({
        id: "email",
        type: "email",
        text: email,
        url: `mailto:${email}`,
        icon: <Mail className="h-3.5 w-3.5 text-stone-500" />
      });
    }

    const phone = phoneNumber || companyPhone;
    if (phone) {
      pills.push({
        id: "phone",
        type: "phone",
        text: phone,
        url: `tel:${phone}`,
        icon: <Phone className="h-3.5 w-3.5 text-stone-500" />
      });
    }

    const linkedin = linkedinProfile || companyLinkedin;
    if (linkedin) {
      pills.push({
        id: "linkedin",
        type: "linkedin",
        text: "LinkedIn Profile",
        url: linkedin,
        icon: <Linkedin className="h-3.5 w-3.5 text-stone-500" />
      });
    }

    return pills;
  }, [
    email,
    website,
    phoneNumber,
    linkedinProfile,
    companyPhone,
    companyLinkedin
  ]);

  // Initialize contactPills with either customPills or generatedPills
  const [contactPills, setContactPills] = useState<ContactPill[]>([]);

  // Initialize pills once with a useRef to track initialization
  const isInitialized = useRef(false);

  // Only update contactPills when customPills or generatedPills change
  // and we need to avoid comparing dependency changes against state
  useEffect(() => {
    // Use custom pills if provided
    if (customPills && customPills.length > 0) {
      setContactPills([...customPills]);
      isInitialized.current = true;
    }
    // Only set generatedPills on first render or when they change and no custom pills exist
    else if (!isInitialized.current || generatedPills.length > 0) {
      setContactPills([...generatedPills]);
      isInitialized.current = true;
    }
  }, [customPills, generatedPills]);

  const [isEditingPill, setIsEditingPill] = useState(false);
  const [editedPill, setEditedPill] = useState<ContactPill | null>(null);
  const [newPillType, setNewPillType] = useState<ContactPill["type"]>("email");
  const [newPillText, setNewPillText] = useState("");
  const [newPillUrl, setNewPillUrl] = useState("");

  const handleEditPill = (pill: ContactPill) => {
    setEditedPill(pill);
    setNewPillType(pill.type);
    setNewPillText(pill.text);
    setNewPillUrl(pill.url || "");
    setIsEditingPill(true);
  };

  const handleSavePill = () => {
    const updatedPills = [...contactPills];
    const newPill: ContactPill = {
      id: Date.now().toString(),
      type: newPillType,
      text: newPillText || newPillUrl,
      url: newPillUrl,
      icon: getPillIcon(newPillType),
      showEditControls: true
    };

    if (editedPill) {
      const index = updatedPills.findIndex(
        (p) => p.text === editedPill.text && p.type === editedPill.type
      );
      if (index !== -1) {
        updatedPills[index] = newPill;
      }
    } else {
      updatedPills.push(newPill);
    }

    // Update local state first
    setContactPills(updatedPills);
    setIsEditingPill(false);
    setEditedPill(null);
    resetPillForm();

    // Then notify parent if needed - this is what triggers the parent component's state update
    if (onChange) {
      onChange("pills", updatedPills);
    }
  };

  const getPillIcon = (type: ContactPill["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="h-3.5 w-3.5 text-stone-500" />;
      case "phone":
        return <Phone className="h-3.5 w-3.5 text-stone-500" />;
      case "website":
        return <Globe className="h-3.5 w-3.5 text-stone-500" />;
      case "linkedin":
        return <Linkedin className="h-3.5 w-3.5 text-stone-500" />;
      case "custom":
        return <Link2 className="h-3.5 w-3.5 text-stone-500" />;
    }
  };

  const resetPillForm = () => {
    setNewPillType("email");
    setNewPillText("");
    setNewPillUrl("");
  };

  const displayName = `${firstName} ${lastName}`;

  return (
    <>
      <Card className="w-full shadow-sm border-[#E7E5E4] overflow-hidden relative rounded-xl">
        <CardContent className="pl-7 pr-5 pb-5 pt-3.5 bg-white">
          <div className="flex items-start justify-between">
            {/* Avatar and content section */}
            <div className="flex items-start gap-2.5">
              {/* Avatar with edit button (if not public view) */}
              <div className="relative">
                <LazyAvatar
                  src={profileImage || ""}
                  alt={displayName}
                  className="h-20 w-20 rounded-full bg-gradient-to-b from-white to-neutral-100 p-[3px] shadow-sm outline outline-1 outline-border"
                  fallback="/placeholder/avatar.svg"
                  loadingStrategy="eager"
                />

                {!isPublicView && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-6 h-6 p-1 absolute bottom-0 right-0 rounded-full bg-white shadow-sm"
                    asChild
                  >
                    <a href="/profile-editor">
                      <Pencil className="h-3 w-3 text-stone-500" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Content area (logo, name, title, bio) */}
              <div className="flex-1 py-[5px] flex flex-col gap-2.5">
                {/* Organization logo at top */}
                {companyLogo && companyName && (
                  <div className="h-6 mb-1">
                    <LazyAvatar
                      src={companyLogo}
                      alt={companyName}
                      className="h-full object-contain rounded-none"
                      fallback="/placeholder/company-logo.svg"
                      loadingStrategy="lazy"
                    />
                  </div>
                )}

                {/* Name and title section */}
                <div className="flex flex-col gap-[3px]">
                  {/* Name */}
                  <h2 className="text-lg font-semibold text-primary-text">
                    {displayName}
                  </h2>

                  {/* Title and Organization on same line */}
                  {title && (
                    <div className="flex items-center">
                      <span className="text-sm text-light-text font-normal">
                        {title}
                      </span>
                      {companyName && (
                        <>
                          <span className="text-sm text-light-text font-medium">
                            {" "}
                            at{" "}
                          </span>
                          <span className="text-sm text-light-text font-semibold">
                            {companyName}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Bio if available */}
                {bio && <p className="text-sm text-gray-700 mt-1">{bio}</p>}
              </div>
            </div>

            {/* Action buttons */}
            {isPublicView && onSaveContact && onFollow && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="px-2 py-1.5 rounded-lg h-8 gap-[3px]"
                  onClick={onSaveContact}
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Save</span>
                </Button>
              </div>
            )}
          </div>

          {/* Contact pills section */}
          <div className="mt-5 self-stretch">
            <div className="flex flex-wrap gap-2 content-center">
              {contactPills.map((pill) => (
                <div key={pill.id} className="group relative">
                  <a
                    href={pill.url}
                    target={
                      pill.type === "email" || pill.type === "phone"
                        ? undefined
                        : "_blank"
                    }
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-[65px] text-xs font-normal flex items-center gap-[3px]"
                    onClick={(e) => {
                      if (!isPublicView) {
                        e.preventDefault();
                        handleEditPill(pill);
                      }
                    }}
                  >
                    {pill.icon}
                    <span className="px-0.5">{pill.text}</span>
                    {/* Show edit/delete buttons only when NOT in public view */}
                    {!isPublicView && pill.showEditControls && (
                      <div className="flex items-center">
                        <Pencil className="h-3 w-3 ml-0.5 text-stone-500" />
                        <span
                          className="h-3 w-3 ml-1 flex items-center justify-center text-stone-500 rounded-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Remove this pill
                            const updatedPills = contactPills.filter(
                              (p) => p.id !== pill.id
                            );
                            setContactPills(updatedPills);
                            // If there's a custom onChange handler for the parent component
                            if (onChange) {
                              onChange("pills", updatedPills);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </div>
                    )}
                  </a>
                </div>
              ))}

              {!isPublicView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-6 px-2 py-1 border-dashed border-zinc-400 bg-stone-100 text-stone-500 text-xs font-medium hover:bg-stone-200"
                  onClick={() => {
                    setIsEditingPill(true);
                    setEditedPill(null);
                    resetPillForm();
                  }}
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Add
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditingPill} onOpenChange={setIsEditingPill}>
        <DialogContent>
          <DialogTitle>
            {editedPill ? "Edit Contact Method" : "Add Contact Method"}
          </DialogTitle>
          <DialogDescription>
            Choose the type of contact method and enter the details.
          </DialogDescription>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contact Type</Label>
              <RadioGroup
                value={newPillType}
                onValueChange={(value) =>
                  setNewPillType(value as ContactPill["type"])
                }
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" id="phone" />
                  <Label htmlFor="phone">Phone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="website" id="website" />
                  <Label htmlFor="website">Website</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="linkedin" id="linkedin" />
                  <Label htmlFor="linkedin">LinkedIn</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom Link</Label>
                </div>
              </RadioGroup>
            </div>

            {newPillType === "custom" && (
              <div className="space-y-2">
                <Label>Display Text</Label>
                <Input
                  value={newPillText}
                  onChange={(e) => setNewPillText(e.target.value)}
                  placeholder="Enter display text"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{newPillType === "custom" ? "URL" : "Value"}</Label>
              <Input
                value={newPillUrl}
                onChange={(e) => setNewPillUrl(e.target.value)}
                placeholder={`Enter ${newPillType}`}
                type={
                  newPillType === "phone"
                    ? "tel"
                    : newPillType === "email"
                      ? "email"
                      : "text"
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingPill(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePill}>
              {editedPill ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
