import {useState, useEffect} from "react";
import {useQuery} from "@tanstack/react-query";
import {Loader2, MessageSquare, Lock, UserPlus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {PublicProfilePreview} from "@/components/badge-profile/PublicProfilePreview";
import {ChatModal} from "@/components/badge-profile/modals/ChatModal";
import {QuickLink} from "@/components/badge-profile/QuickLinks";
import {useLayout} from "@/context/layout-context";
import {useLocation} from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {LeadGenForm} from "@/components/badge-profile/LeadGenForm";

// Types
import {Section} from "@shared/types/sections";
import {UserProfile} from "@/types/user";
import {GlobalChatSettings} from "@shared/types/chat";
import {LeadSettings} from "@/shared/types/lead";
import {Page} from "@/components/badge-profile/SectionNavigation";

// Organization interface
interface Organization {
  id: number | string;
  name: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  defaultColor?: string | null;
  domain?: string | null;
}

interface BadgeProfileResponseQuickLink {
  id: string;
  label: string;
  url: string;
  type: string;
  isUserDefault?: boolean;
  isVisible?: boolean;
}

interface BadgeProfileResponse {
  userProfile: UserProfile;
  organization: Organization | null;
  background: {
    type: "preset" | "custom" | "banner";
    preset?: string;
    customUrl?: string;
    customBannerId?: string;
  };
  quickLinks: BadgeProfileResponseQuickLink[];
  sections: Section[];
  chatSettings?: GlobalChatSettings;
  leadSettings?: LeadSettings;
  branding?: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  };
  pages?: Page[];
  customBanner?: {
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
    createdAt: string;
  } | null;
  savedBanners?: Array<{
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
    createdAt: string;
  }>;
}

export default function PublicBadgeProfile() {
  const [chatOpen, setChatOpen] = useState(false);
  const [activePageId, setActivePageId] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [passwordProtectedPage, setPasswordProtectedPage] =
    useState<Page | null>(null);
  const [formProtectedPage, setFormProtectedPage] = useState<Page | null>(null);
  const [leadFormSubmitted, setLeadFormSubmitted] = useState<{
    [key: string]: boolean;
  }>({});
  const [passwordVerified, setPasswordVerified] = useState<{
    [key: string]: boolean;
  }>({});
  const [isVerifyingPassword, setIsVerifyingPassword] =
    useState<boolean>(false);
  const {setHideSidebar, setHideHeader} = useLayout();
  const [location, setLocation] = useLocation();
  const currentPath = location.slice(1); // Remove the leading slash

  // Hide sidebar and header for public profile view
  useEffect(() => {
    setHideSidebar(true);
    setHideHeader(true);

    // Restore defaults when component unmounts
    return () => {
      setHideSidebar(false);
      setHideHeader(false);
    };
  }, [setHideSidebar, setHideHeader]);

  // Add event listener for the openChat event
  useEffect(() => {
    const handleOpenChat = () => {
      setChatOpen(true);
    };

    // Add event listener for the custom openChat event
    window.addEventListener("openChat", handleOpenChat);

    // Clean up event listener
    return () => {
      window.removeEventListener("openChat", handleOpenChat);
    };
  }, []);

  // Handle page change
  const handlePageChange = (pageId: string) => {
    if (!badgeProfileData) return;

    // Check if the page is password protected
    const pages = badgeProfileData.pages || [
      {id: "home", name: "Home", privacy: "public"}
    ];
    const targetPage = pages.find((page) => page.id === pageId);

    if (targetPage && targetPage.privacy === "password") {
      // If it's password protected and not already verified, show the password dialog
      if (!passwordVerified[targetPage.id]) {
        setPasswordProtectedPage(targetPage);
        return;
      }
    }

    // Check if the page is form protected
    if (targetPage && targetPage.privacy === "form") {
      // Check if form has already been submitted for this page
      if (!leadFormSubmitted[targetPage.id]) {
        // If form not submitted yet, show the form dialog
        setFormProtectedPage(targetPage);
        return;
      }
    }

    // Otherwise, change to the page directly
    setActivePageId(pageId);

    // Update URL without navigating
    const url = new URL(window.location.href);
    url.searchParams.set("page", pageId);
    window.history.pushState({}, "", url);
  };

  // Handle password submission - now using the secure API endpoint
  const handlePasswordSubmit = async () => {
    if (!passwordProtectedPage || !badgeProfileData?.userProfile?.publicPath)
      return;

    setIsVerifyingPassword(true);
    setPasswordError(false);

    try {
      // Call the password verification API
      const response = await fetch("/api/badge-profile/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          publicPath: badgeProfileData.userProfile.publicPath,
          pageId: passwordProtectedPage.id,
          password: passwordInput
        })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // Password is correct - mark this page as verified
        setPasswordVerified((prev) => ({
          ...prev,
          [passwordProtectedPage.id]: true
        }));

        // Password is correct
        setActivePageId(passwordProtectedPage.id);
        setPasswordProtectedPage(null);
        setPasswordInput("");

        // Update URL without navigating
        const url = new URL(window.location.href);
        url.searchParams.set("page", passwordProtectedPage.id);
        window.history.pushState({}, "", url);
      } else {
        // Password is incorrect or API error
        setPasswordError(true);
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      setPasswordError(true);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Handle lead form submission
  const handleLeadFormSubmit = () => {
    if (formProtectedPage) {
      // Mark this page's form as submitted
      setLeadFormSubmitted((prev) => ({
        ...prev,
        [formProtectedPage.id]: true
      }));

      // Wait a bit to allow the success message to be shown before navigating
      setTimeout(() => {
        // Change to the page
        setActivePageId(formProtectedPage.id);
        setFormProtectedPage(null);

        // Update URL without navigating
        const url = new URL(window.location.href);
        url.searchParams.set("page", formProtectedPage.id);
        window.history.pushState({}, "", url);
      }, 2000); // 2 second delay to show success message
    }
  };

  // Function to get position classes for the chat button based on settings
  const getPositionClasses = () => {
    if (!badgeProfileData?.chatSettings?.position) return "bottom-5 right-5";

    switch (badgeProfileData.chatSettings.position) {
      case "bottom-right":
        return "bottom-[1.65rem] right-[6.25rem]";
      case "bottom-left":
        return "bottom-[1.65rem] left-5";
      case "top-right":
        return "top-5 right-5";
      case "top-left":
        return "top-5 left-5";
      default:
        return "bottom-5 right-5";
    }
  };

  // Fetch badge profile data
  const {
    isLoading,
    isError,
    data: badgeProfileData
  } = useQuery<BadgeProfileResponse>({
    queryKey: ["/api/users/badge-profile", currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/users/badge-profile/${currentPath}`);

      if (!response.ok) {
        throw new Error("Failed to fetch badge profile data");
      }

      const data = await response.json();

      // Check if the user's current publicPath is different from the URL path
      // This indicates we accessed via an old path that should redirect
      if (
        data.userProfile?.publicPath &&
        data.userProfile.publicPath !== currentPath
      ) {
        // Update the browser URL to the current path
        setLocation(`/${data.userProfile.publicPath}`, {replace: true});
      }

      return data;
    }
  });

  // Initialize active page ID from URL or first page in data
  useEffect(() => {
    if (!badgeProfileData?.pages || badgeProfileData.pages.length === 0) return;

    // Check URL for page parameter
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");

    let pageToActivate = "";

    if (pageParam) {
      // Make sure the page exists in our data
      const pageExists = badgeProfileData.pages.some(
        (page) => page.id === pageParam
      );
      if (pageExists) {
        pageToActivate = pageParam;
      }
    }

    // Default to first page if no valid page parameter
    if (!pageToActivate) {
      pageToActivate = badgeProfileData.pages[0].id;
    }

    // Set the active page ID
    setActivePageId(pageToActivate);

    // Check if the page is form protected and needs the form dialog to be shown
    const targetPage = badgeProfileData.pages.find(
      (page) => page.id === pageToActivate
    );
    if (
      targetPage &&
      targetPage.privacy === "form" &&
      !leadFormSubmitted[targetPage.id]
    ) {
      setFormProtectedPage(targetPage);
    } else if (
      targetPage &&
      targetPage.privacy === "password" &&
      !passwordVerified[targetPage.id]
    ) {
      setPasswordProtectedPage(targetPage);
    }
  }, [badgeProfileData, leadFormSubmitted, passwordVerified]);

  // Get banner data for BannerDisplay component
  const getBannerData = () => {
    if (
      badgeProfileData?.background?.type === "banner" &&
      badgeProfileData.background.customBannerId
    ) {
      // First check savedBanners
      const banner = badgeProfileData.savedBanners?.find(
        (b) => b.id === badgeProfileData.background.customBannerId
      );
      if (banner) return banner;

      // Then check customBanner
      if (badgeProfileData.customBanner) {
        return badgeProfileData.customBanner;
      }
    }
    return null;
  };

  // Get background style based on background type and preset
  const getBackgroundStyle = () => {
    if (!badgeProfileData) return {background: "#ffffff"};

    console.log("Background data:", {
      backgroundType: badgeProfileData.background?.type,
      backgroundPreset: badgeProfileData.background?.preset,
      customBannerId: badgeProfileData.background?.customBannerId,
      customBanner: badgeProfileData.customBanner,
      savedBanners: badgeProfileData.savedBanners
    });

    // For banner type, return a simple background since BannerDisplay will handle the banner
    if (badgeProfileData.background.type === "banner") {
      return {background: "#ffffff"};
    }

    if (
      badgeProfileData.background.type === "custom" &&
      badgeProfileData.background.customUrl
    ) {
      return {
        backgroundImage: `url(${badgeProfileData.background.customUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      };
    }

    // Handle preset backgrounds
    const preset = badgeProfileData.background.preset || "solid-white";

    switch (preset) {
      case "gradient-1":
        return {background: "linear-gradient(to right, #e0f2fe, #a5f3fc)"};
      case "gradient-2":
        return {background: "linear-gradient(to right, #f3e8ff, #fce7f3)"};
      case "gradient-3":
        return {background: "linear-gradient(to right, #dcfce7, #d9f99d)"};
      case "gradient-4":
        return {background: "linear-gradient(to right, #fef9c3, #fde68a)"};
      case "solid-gray":
        return {background: "#f3f4f6"};
      case "solid-green":
        return {background: "#dcfce7"};
      case "solid-blue":
        return {background: "#e0f2fe"};
      case "solid-yellow":
        return {background: "#fef9c3"};
      default:
        return {background: "#ffffff"};
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !badgeProfileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Profile Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            This badge profile does not exist or is private.
          </p>
        </div>
      </div>
    );
  }

  // Remove debugging logs
  // Filter visible sections and sort by order
  const sortedSections = Array.isArray(badgeProfileData?.sections)
    ? [...badgeProfileData.sections]
        .filter((section) => {
          // Filter by visibility and page ID
          const matches =
            section.isVisible &&
            ((section as any).pageId === activePageId ||
              !(section as any).pageId);
          return matches;
        })
        .sort((a, b) => {
          const orderA = typeof a.order === "number" ? a.order : 0;
          const orderB = typeof b.order === "number" ? b.order : 0;
          return orderA - orderB;
        })
    : [];

  // Convert quick links to the correct format
  const convertedQuickLinks: QuickLink[] = Array.isArray(
    badgeProfileData.quickLinks
  )
    ? badgeProfileData.quickLinks.map((link) => {
        return {
          id: link.id,
          url: link.url,
          label: link.label,
          isVisible: link.isVisible,
          type: link.type as
            | "website"
            | "email"
            | "phone"
            | "linkedin"
            | "instagram"
            | "custom",
          isUserDefault: link.isUserDefault
        };
      })
    : [];

  console.log(badgeProfileData);

  return (
    <>
      {/* Background element that covers the entire viewport */}
      <div
        className="fixed inset-0 w-full h-full -z-10"
        style={getBackgroundStyle()}
        aria-hidden="true"
      />

      <div className="min-h-screen flex flex-col">
        {/* Content wrapper with max width */}
        <div className="flex-grow w-full">
          {/* The PublicProfilePreview component - simplified version of ProfilePreview */}
          <PublicProfilePreview
            userProfile={badgeProfileData.userProfile}
            organization={badgeProfileData.organization}
            quickLinks={convertedQuickLinks}
            sections={sortedSections}
            pages={
              badgeProfileData.pages?.length
                ? badgeProfileData.pages
                : [{id: "default", name: "Home", privacy: "public"}]
            }
            activePage={activePageId}
            onPageClick={(pageId) => handlePageChange(pageId)}
            backgroundStyle={getBackgroundStyle()}
            backgroundImage={
              badgeProfileData.background.type === "custom"
                ? badgeProfileData.background.customUrl
                : null
            }
            className="h-full"
            chatSettings={badgeProfileData.chatSettings}
            userPath={currentPath}
            leadSettings={badgeProfileData.leadSettings}
            brandingSettings={badgeProfileData.branding}
            leadFormSubmitted={leadFormSubmitted}
            passwordVerified={passwordVerified}
            bannerData={getBannerData()}
          />
        </div>

        {/* Chat button if enabled */}
        {badgeProfileData.chatSettings?.enabled && (
          <>
            <Button
              onClick={() => setChatOpen(true)}
              className={`fixed ${getPositionClasses()} z-50 rounded-full h-14 w-14 shadow-lg`}
              size="icon"
              variant="default"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>

            {/* Chat Modal */}
            {chatOpen && (
              <ChatModal
                isOpen={chatOpen}
                onOpenChange={setChatOpen}
                chatSettings={badgeProfileData.chatSettings}
                userPath={currentPath}
              />
            )}
          </>
        )}
      </div>

      {/* Password Protected Page Dialog */}
      <Dialog
        open={!!passwordProtectedPage}
        onOpenChange={(open) => !open && setPasswordProtectedPage(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password Protected Page
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              This page is password protected. Please enter the password to
              continue.
            </p>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !isVerifyingPassword &&
                  handlePasswordSubmit()
                }
                disabled={isVerifyingPassword}
              />

              {passwordError && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>
                    Incorrect password. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordProtectedPage(null)}
              disabled={isVerifyingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={isVerifyingPassword}
            >
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Protected Page - LeadGenForm Modal */}
      {badgeProfileData?.leadSettings && formProtectedPage && (
        <LeadGenForm
          isOpen={!!formProtectedPage}
          onClose={() => setFormProtectedPage(null)}
          formHeader="Contact Information Required"
          headerIcon={<UserPlus className="h-5 w-5" />}
          headerDescription="Please provide your contact information to access this page."
          formFields={badgeProfileData.leadSettings.fields}
          submitButtonText="Continue to Page"
          downloadVcard={false}
          actionId="page-access"
          userProfile={badgeProfileData.userProfile}
          customThankYouMessage="Access granted! Loading page..."
          onSubmitSuccess={handleLeadFormSubmit}
          fromQr={false}
        />
      )}
    </>
  );
}
