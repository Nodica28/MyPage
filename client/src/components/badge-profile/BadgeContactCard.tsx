import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Pencil} from "lucide-react";
import {QuickLink} from "./QuickLinks";
import {QuickLinksPreview} from "./QuickLinksPreview";
import {LeadSettings} from "@/shared/types/lead";
import {LeadGenForm} from "./LeadGenForm";
import {ProfileInfo} from "./ProfileInfo";
import {CompanyInfo} from "./CompanyInfo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {UserProfile} from "@/types/user";
import {useState, useEffect} from "react";

// Custom UserDown icon component
const UserDownIcon = ({ className }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9 11.625H5.625C4.57833 11.625 4.05499 11.625 3.62914 11.7542C2.67034 12.045 1.92003 12.7953 1.62918 13.7541C1.5 14.18 1.5 14.7033 1.5 15.75M12 13.5L14.25 15.75M14.25 15.75L16.5 13.5M14.25 15.75V11.25M10.875 5.625C10.875 7.48896 9.36396 9 7.5 9C5.63604 9 4.125 7.48896 4.125 5.625C4.125 3.76104 5.63604 2.25 7.5 2.25C9.36396 2.25 10.875 3.76104 10.875 5.625Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Define interface for organization
interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  website?: string | null;
  description?: string | null;
  defaultColor?: string | null;
  domain?: string | null;
  isSaved?: boolean;
}

// Props for the BadgeContactCard component
interface BadgeContactCardProps {
  id?: number | string;
  firstName: string;
  lastName: string;
  title?: string | null;
  organization?: Organization | null;
  bio?: string | null;
  profileImage?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  linkedinProfile?: string | null;
  isEditable?: boolean;
  hideEditButton?: boolean;
  onEditProfile?: () => void;
  onProfileUpdate?: (updatedProfile: Partial<UserProfile>) => void;
  onCompanyUpdate?: (updatedOrganization: Partial<Organization>) => void;
  onSaveContact?: () => void;
  quickLinks?: QuickLink[]; // Quick links to display
  iconColor?: string; // Add iconColor prop
  leadSettings?: LeadSettings; // Add leadSettings prop
  showLeadFormInitially?: boolean; // Add prop to show lead form on mount
  onEditQuickLink?: (linkId: string | number) => void;
  onToggleLinkVisibility?: (linkId: string | number) => void;
  onDeleteQuickLink?: (linkId: string | number) => void;
  onAddQuickLink?: () => void;
  showBuiltWithBadge?: boolean; // Add prop to control built with badge visibility
}

export function BadgeContactCard({
  id,
  firstName,
  lastName,
  title,
  organization,
  bio,
  profileImage,
  email,
  phoneNumber,
  linkedinProfile,
  isEditable = false,
  hideEditButton = false,
  onEditProfile,
  onProfileUpdate,
  onCompanyUpdate,
  onSaveContact,
  quickLinks = [], // Initialize with empty array
  iconColor,
  leadSettings,
  showLeadFormInitially = false,
  onEditQuickLink,
  onToggleLinkVisibility,
  onDeleteQuickLink,
  onAddQuickLink,
  showBuiltWithBadge = true
}: BadgeContactCardProps) {
  const [showLeadForm, setShowLeadForm] = useState(showLeadFormInitially);
  const [showEditModal, setShowEditModal] = useState(false);

  // Effect to handle changes to showLeadFormInitially prop
  useEffect(() => {
    if (showLeadFormInitially) {
      setShowLeadForm(true);
    }
  }, [showLeadFormInitially]);

  // Create a user profile object for the lead form
  const userProfile = {
    id: typeof id === "string" ? parseInt(id) : id,
    firstName,
    lastName,
    email: email || "",
    phoneNumber: phoneNumber || "",
    title: title || "",
    companyName: organization?.name || "",
    linkedinProfile: linkedinProfile || "",
    profileImage: profileImage || ""
  };

  // Prepare data for edit modal - simplified to only include available fields
  const profileData: UserProfile = {
    id: typeof id === "string" ? parseInt(id) : id || 0,
    firstName,
    lastName,
    title,
    bio,
    profileImage,
    email: email || "",
    phoneNumber,
    linkedinProfile,
    uniquePathId: "", // Add required fields with defaults
    publicPath: ""
  };

  // Handle profile save
  const handleProfileSave = (updatedData?: Partial<UserProfile>) => {
    // Only process actual save operations, not preview updates
    if (updatedData?.isSaved) {
      // TODO: Implement actual save functionality
      console.log("Profile data to save:", updatedData);

      // Don't close the modal - let users continue editing or close manually
      // This provides consistent behavior with company info editing

      // For now, just call the existing onEditProfile if available
      if (onEditProfile) {
        onEditProfile();
      }

      // Call onProfileUpdate if it exists
      if (onProfileUpdate) {
        onProfileUpdate(updatedData);
      }
    }
    // For preview updates (when updatedData exists but isSaved is not true),
    // we don't close the modal - just let the preview update happen
  };

  // Handle company save
  const handleCompanyUpdate = (updatedData?: Partial<Organization>) => {
    // Only close modal if this is an actual save operation, not a preview update
    if (updatedData?.isSaved) {
      console.log("Company data to save:", updatedData);

      // Call onCompanyUpdate if it exists
      if (onCompanyUpdate) {
        onCompanyUpdate(updatedData);
      }
    }
    // For preview updates, don't close modal - just let the preview update happen
  };

  // Get the links to display - only show links that were explicitly added
  // Do not create default links from email/phone/organization
  const linksToDisplay = quickLinks || [];

  // Format display name
  const displayName = `${firstName} ${lastName}`;

  // Format job title with organization
  const displayTitle = title || "";

  return (
    <Card className="w-full overflow-hidden relative">
      {/* Top-right edit button */}
      {isEditable && !hideEditButton && (
        <Button
          variant="outline"
          size="icon"
          className="absolute flex items-center gap-1 top-4 right-4 w-auto h-8 px-3 py-1 rounded-lg bg-white shadow-sm border border-stone-200 hover:bg-stone-50 z-10"
          onClick={() => setShowEditModal(true)}
          title="Edit profile"
        >
          <Pencil className="h-3.5 w-3.5 text-stone-600" /> Edit
        </Button>
      )}

      {/* Built with Badge - positioned in lower right corner */}
      {showBuiltWithBadge && (
        <div className="absolute bottom-2 right-3 z-10">
          <img
            src="/free-tier/built-with-badge.svg"
            alt="Built with Badge"
            className="h-4 w-auto opacity-70 hover:opacity-100 transition-opacity duration-200"
          />
        </div>
      )}

      <CardContent className="p-6">
        <div
          className={`grid items-start justify-between w-full gap-6 md:gap-0 ${isEditable ? "grid-cols-1" : "grid-cols-1 md:grid-cols-4"}`}
        >
          {/* Avatar and content section */}
          <div className="flex items-start gap-2.5 flex-col sm:flex-row md:col-span-3">
            {/* Avatar with edit button (if editable) */}
            <div className="relative">
              <Avatar className="h-24 w-24 rounded-full bg-gradient-to-b from-white to-neutral-100 p-[3px] shadow-sm outline outline-1 outline-border">
                <AvatarImage
                  src={profileImage || ""}
                  alt={displayName}
                  className="rounded-full object-cover"
                />
                <AvatarFallback className="text-xl">
                  {firstName?.[0] || ""}
                  {lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>

              {isEditable && !hideEditButton && onEditProfile && (
                <Button
                  variant="outline"
                  size="icon"
                  className="w-6 h-6 p-1 absolute bottom-0 right-0 rounded-full bg-white shadow-sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Pencil className="h-3 w-3 text-stone-500" />
                </Button>
              )}
            </div>

            {/* Content area (name, title, org, bio) */}
            <div className="flex-1 py-[5px] flex flex-col gap-2.5">
              {/* Organization logo at top */}
              {organization?.logo && organization.name && (
                <div className="h-6 mb-1">
                  <img
                    src={organization.logo}
                    alt={organization.name}
                    className="h-full object-contain"
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
                {displayTitle && (
                  <div className="flex items-center">
                    <span className="text-sm text-light-text font-normal">
                      {displayTitle}
                    </span>
                    {organization?.name && (
                      <>
                        <span className="text-sm text-light-text font-medium ml-1">
                          {" "}
                          at{" "}
                        </span>
                        <span className="text-sm text-light-text font-semibold ml-1">
                          {organization.name}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Bio if available */}
              {bio && <p className="text-sm text-gray-700">{bio}</p>}
            </div>
          </div>

          {/* Action buttons in right column */}
          <div
            className={`flex items-center justify-end gap-3 ${
              isEditable ? "w-full" : "w-auto md:w-full"
            }`}
          >
            {/* Save Button */}
            {!isEditable && onSaveContact && (
              <Button
                variant="outline"
                className="px-2 py-1.5 rounded-lg h-8 gap-[3px] border-stone-200"
                size="sm"
                onClick={onSaveContact}
              >
                <UserDownIcon className="h-4 w-4 text-stone-700" />
                <span className="text-sm font-medium text-stone-700">Save</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Links section - using the new component */}
        {linksToDisplay.length > 0 && (
          <div className="mt-6 self-stretch">
            <QuickLinksPreview
              links={linksToDisplay}
              iconColor={iconColor || organization?.defaultColor || "#3b82f6"}
              showEditControls={isEditable}
              onEditQuickLink={onEditQuickLink}
              onToggleLinkVisibility={onToggleLinkVisibility}
              onDeleteQuickLink={onDeleteQuickLink}
              onAddQuickLink={onAddQuickLink}
            />
            {/* Debug log - React safe way */}
            <div style={{display: "none"}} suppressHydrationWarning>
              {typeof window !== "undefined" && (
                <>
                  {iconColor && `Using icon color: ${iconColor}`}
                  {organization?.defaultColor &&
                    `Organization color: ${organization.defaultColor}`}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Lead Generation Form */}
      {leadSettings && (
        <LeadGenForm
          isOpen={showLeadForm}
          onClose={() => setShowLeadForm(false)}
          formHeader="Connect with me"
          formFields={leadSettings.fields}
          submitButtonText="Submit"
          downloadVcard={leadSettings.downloadVcard}
          actionId="lead-form"
          userProfile={userProfile}
          customThankYouMessage={leadSettings.customThankYouMessage}
          redirectUrl={leadSettings.redirectUrl}
          fromQr={showLeadFormInitially}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <ProfileInfo
              userProfile={profileData}
              onUpdate={handleProfileSave}
              buttonVariant="outline"
            />
            {organization && (
              <CompanyInfo
                organization={{
                  id: organization.id || 0,
                  name: organization.name || "Company",
                  logo: organization.logo,
                  website: organization.website,
                  description: organization.description,
                  defaultColor: organization.defaultColor,
                  domain: organization.domain || null
                }}
                onUpdate={handleCompanyUpdate}
                buttonVariant="outline"
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
