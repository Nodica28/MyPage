import React, {useState, useRef, useEffect} from "react";
import {cn} from "@/lib/utils";
import {Card} from "@/components/ui/card";
import {BadgeContactCard} from "@/components/badge-profile/BadgeContactCard";
import {SectionRenderer} from "@/components/badge-profile/SectionRenderer";
import {BannerDisplay} from "@/components/badge-profile/BannerDisplay";
import {Section} from "@/shared/types/sections";
import {QuickLink} from "@/components/badge-profile/QuickLinks";
import {UserProfile} from "@/types/user";
import {GlobalChatSettings} from "@shared/types/chat";
import {LeadSettings} from "@/shared/types/lead";
import {
  SectionNavigation,
  Page
} from "@/components/badge-profile/SectionNavigation";
import {downloadVCard} from "@/shared/types/vcard";
import {Lock, BookMarked, UserPlus, KeyRound} from "lucide-react";
import {Alert} from "@/components/ui/alert";
import {ScopedThemeProvider} from "@/components/badge-profile/ScopedThemeProvider";

interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  defaultColor?: string | null;
}

interface PublicProfilePreviewProps {
  userProfile?: UserProfile;
  organization?: Organization | null;
  quickLinks: QuickLink[];
  sections: Section[];
  pages?: Page[];
  activePage?: string;
  onPageClick?: (pageId: string) => void;
  backgroundStyle: React.CSSProperties;
  backgroundImage?: string | null;
  className?: string;
  buttonColor?: string;
  iconColor?: string;
  chatSettings?: GlobalChatSettings;
  leadSettings?: LeadSettings;
  brandingSettings?: {
    removeBuiltWithBadge?: boolean;
  };
  userPath?: string;
  leadFormSubmitted?: {[key: string]: boolean};
  passwordVerified?: {[key: string]: boolean};
  bannerData?: {
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
    tags: Array<{
      text: string;
      color: string;
      backgroundColor: string;
    }>;
    backgroundType: "preset" | "custom";
    backgroundValue: string;
    customUploadUrl?: string;
  } | null;
}

export function PublicProfilePreview({
  userProfile,
  organization,
  quickLinks,
  sections,
  pages,
  activePage = "home",
  onPageClick,
  className,
  backgroundStyle,
  backgroundImage,
  buttonColor = organization?.defaultColor || "#3b82f6",
  iconColor = organization?.defaultColor || "#3b82f6",
  chatSettings,
  leadSettings,
  brandingSettings,
  userPath,
  leadFormSubmitted = {},
  passwordVerified = {},
  bannerData
}: PublicProfilePreviewProps) {
  const [isSaved, setIsSaved] = useState(false);
  const sectionRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const [showLeadFormFromQr, setShowLeadFormFromQr] = useState(false);

  // Check if the current active page is form-protected and the form hasn't been submitted
  const isFormProtected = React.useMemo(() => {
    if (!pages || !activePage) return false;
    const currentPage = pages.find((page) => page.id === activePage);
    return currentPage?.privacy === "form" && !leadFormSubmitted[activePage];
  }, [pages, activePage, leadFormSubmitted]);

  // Check if the current active page is password-protected and the password hasn't been verified
  const isPasswordProtected = React.useMemo(() => {
    if (!pages || !activePage) return false;
    const currentPage = pages.find((page) => page.id === activePage);
    return currentPage?.privacy === "password" && !passwordVerified[activePage];
  }, [pages, activePage, passwordVerified]);

  // Filter sections by active page and visibility, then sort by order
  const filteredSections = Array.isArray(sections)
    ? sections.filter((section) => {
        // Make sure section is visible and either:
        // 1. Has a matching pageId for the active page, or
        // 2. Has no pageId (global sections appear on all pages)
        const pageId = (section as any).pageId;
        return section.isVisible && (pageId === activePage || !pageId);
      })
    : [];

  const sortedSections = [...filteredSections].sort((a, b) => {
    const orderA = typeof a.order === "number" ? a.order : 0;
    const orderB = typeof b.order === "number" ? b.order : 0;
    return orderA - orderB;
  });

  // Check URL parameters to see if this is a QR code scan that should trigger lead form
  useEffect(() => {
    if (typeof window !== "undefined" && leadSettings?.captureFromQr) {
      const params = new URLSearchParams(window.location.search);
      const fromQr = params.get("fromQr") === "true";
      setShowLeadFormFromQr(fromQr);
    }
  }, [leadSettings]);

  // Note: Removed scroll position tracking to prevent interference with modals
  // Section navigation is currently disabled, so activeSection tracking is not needed

  // Prepare user data with default values to avoid errors
  const firstName = userProfile?.firstName || "";
  const lastName = userProfile?.lastName || "";

  const handleSaveContact = () => {
    if (!userProfile) return;
    downloadVCard({
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      email: userProfile.email,
      phoneNumber: userProfile.phoneNumber || undefined,
      organization: organization?.name,
      title: userProfile.title || undefined,
      linkedinProfile: userProfile.linkedinProfile || undefined,
      website: userProfile.website || organization?.website || undefined,
      profileImage: userProfile.profileImage || undefined
    });
    setIsSaved(true);
  };

  // Function to render privacy icons alongside page names
  const decoratedPages: Page[] = Array.isArray(pages)
    ? pages.map((page) => ({
        ...page,
        name: (
          <div className="flex items-center gap-1">
            <span>{page.name}</span>
            {page.privacy === "password" && <Lock className="h-3 w-3 ml-1" />}
            {page.privacy === "form" && <BookMarked className="h-3 w-3 ml-1" />}
          </div>
        )
      }))
    : [];

  console.log(brandingSettings);

  return (
    <ScopedThemeProvider companyColor={organization?.defaultColor || null}>
      <div className={cn("flex flex-col h-full relative", className)}>
        {/* Banner Display - only show when banner is configured */}
        {bannerData ? (
          <div className="absolute top-0 left-0 right-0 h-48 w-full z-0">
            <BannerDisplay banner={bannerData} />
          </div>
        ) : (
          /* Regular Background - only show when not banner */
          <div
            className="absolute top-0 left-0 right-0 h-48 w-full z-0"
            style={backgroundStyle}
          >
            {backgroundImage && (
              <img
                src={backgroundImage}
                alt="Background"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* Card wrapper around content */}
        <Card className="flex flex-col flex-grow overflow-hidden shadow-none border-0 w-full max-w-3xl mx-auto bg-transparent">
        {/* Profile information - different margin for banner vs regular background */}
        <div
          className={cn(
            "mx-auto px-4 md:px-0 z-10 w-full",
            bannerData ? "mt-40" : "mt-36"
          )}
        >
          {userProfile && (
            <div className="w-full mx-auto mb-5">
              <BadgeContactCard
                id={userProfile.id}
                firstName={firstName}
                lastName={lastName}
                title={userProfile.title}
                profileImage={userProfile.profileImage}
                email={userProfile.email}
                phoneNumber={userProfile.phoneNumber}
                linkedinProfile={userProfile.linkedinProfile}
                organization={organization}
                bio={userProfile.bio}
                quickLinks={quickLinks}
                hideEditButton={true}
                iconColor={iconColor}
                onSaveContact={!isSaved ? handleSaveContact : undefined}
                leadSettings={leadSettings}
                showLeadFormInitially={showLeadFormFromQr}
                showBuiltWithBadge={
                  brandingSettings?.removeBuiltWithBadge !== true
                }
              />
            </div>
          )}
        </div>

        {/* Page Navigation */}
        {pages && pages.length > 0 && (
          <div className="py-4">
            <SectionNavigation
              buttonColor={buttonColor}
              pages={decoratedPages}
              activePage={activePage}
              onPageClick={onPageClick || (() => {})}
              className="w-full"
            />
          </div>
        )}

        {/* Form Protected Content Notice */}
        {isFormProtected && (
          <div className="px-4 pb-4 md:px-0 w-full mx-auto">
            <Alert className="bg-amber-50 border-amber-200 text-amber-800 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span>
                Please provide your contact information to view this page's
                content.
              </span>
            </Alert>
          </div>
        )}

        {/* Password Protected Content Notice */}
        {isPasswordProtected && (
          <div className="px-4 pb-4 md:px-0 w-full mx-auto">
            <Alert className="bg-blue-50 border-blue-200 text-blue-800 flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span>
                This content is password protected. Please enter the password to
                view it.
              </span>
            </Alert>
          </div>
        )}

        {/* Sections - Only show if not protected or access has been granted */}
        {!isFormProtected && !isPasswordProtected && (
          <div className="px-4 pb-8 md:px-0 w-full mx-auto">
            {sortedSections.length > 0 ? (
              sortedSections.map((section) => (
                <div
                  key={section.id}
                  ref={(el) => (sectionRefs.current[String(section.id)] = el)}
                >
                  <SectionRenderer
                    section={section}
                    className="mb-6"
                    buttonColor={buttonColor}
                    iconColor={iconColor}
                    chatSettings={chatSettings}
                    userPath={userPath}
                    userEmail={userProfile?.email}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm mt-4">
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No content to display
                </h3>
                <p className="text-gray-500">
                  There are no sections available on this page yet.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
      </div>
    </ScopedThemeProvider>
  );
}
