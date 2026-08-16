"use client";

import * as React from "react";
import {Link, useLocation} from "wouter";
import {
  SquareUser,
  User,
  LogOut,
  ChevronUp,
  ChevronDown,
  CreditCard,
  Bell,
  Sparkle,
  Settings,
  Loader2,
  BadgeCheck,
  UserRoundPlus,
  LifeBuoy,
  Building2,
  Check,
  Plus,
  Shield,
  Users
} from "lucide-react";
import {cn} from "@/lib/utils";
import {useAuth} from "@/hooks/use-auth";
import {
  useCurrentOrganization,
  useCurrentOrganizationRole,
  useUserOrganizations,
  useSwitchPrimaryCompany,
  UserOrganization
} from "@/hooks/use-organizations";
import {
  ControlledDropdown,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/controlled-dropdown";
import {ShareBadgeModal} from "@/components/share-badge-modal";
import {InviteTeamModal} from "@/components/invite-team-modal";
import {SwitchCompanyDialog} from "@/components/switch-company-dialog";
import {Button} from "../ui/button";
import {useToast} from "@/hooks/use-toast";
import {useQuery} from "@tanstack/react-query";

interface AppSidebarProps {
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

// Global image cache to persist images across component remounts
const imageCache = new Map<string, HTMLImageElement>();

// Preload and cache the logo image immediately
const preloadLogo = () => {
  const logoUrl = "/light-mode-logo.svg";
  if (!imageCache.has(logoUrl)) {
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
      imageCache.set(logoUrl, img);
    };
    // Set immediately to prevent flicker
    imageCache.set(logoUrl, img);
  }
  return logoUrl;
};

// Preload the logo immediately when the module loads
const LOGO_URL = preloadLogo();

// Memoized logo component with enhanced persistence
const Logo = React.memo(() => {
  const [logoLoaded, setLogoLoaded] = React.useState(() => {
    // Check if logo is already cached
    const cached = imageCache.get(LOGO_URL);
    return cached && cached.complete;
  });

  React.useEffect(() => {
    // Ensure logo is preloaded
    const cached = imageCache.get(LOGO_URL);
    if (cached && cached.complete) {
      setLogoLoaded(true);
    } else {
      preloadLogo();
    }
  }, []);

  return (
    <div className="flex items-center mt-8 mb-5 mx-7 h-8">
      <a href="/">
        <div className="relative" style={{maxWidth: "100px", height: "auto"}}>
          {/* Persistent logo image with opacity transition */}
          <img
            key="badge-logo-persistent"
            src={LOGO_URL}
            alt="Badge Logo"
            className={cn(
              "h-auto transition-opacity duration-200",
              logoLoaded ? "opacity-100" : "opacity-0"
            )}
            style={{maxWidth: "100px"}}
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoLoaded(true)} // Show even if error to prevent blank space
          />
          {/* Fallback during loading */}
          {!logoLoaded && (
            <div
              className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded"
              style={{width: "100px", height: "32px"}}
            />
          )}
        </div>
      </a>
    </div>
  );
});

Logo.displayName = "Logo";

// Enhanced profile image cache
const profileImageCache = new Map<
  string,
  {img: HTMLImageElement; loaded: boolean}
>();

// Memoized profile image component with better caching
const ProfileImage = React.memo(
  ({user, size = "small"}: {user: any; size?: "small" | "large"}) => {
    const [isImageLoaded, setIsImageLoaded] = React.useState(() => {
      if (!user?.profileImage) return true;
      const cached = profileImageCache.get(user.profileImage);
      return cached?.loaded || false;
    });

    const sizeClass = size === "large" ? "h-10 w-10" : "h-6 w-6";
    const loaderSize = size === "large" ? "h-5 w-5" : "h-4 w-4";

    React.useEffect(() => {
      if (user?.profileImage && !profileImageCache.has(user.profileImage)) {
        const img = new Image();
        img.src = user.profileImage;
        profileImageCache.set(user.profileImage, {img, loaded: false});

        img.onload = () => {
          profileImageCache.set(user.profileImage, {img, loaded: true});
          setIsImageLoaded(true);
        };

        img.onerror = () => {
          profileImageCache.set(user.profileImage, {img, loaded: true});
          setIsImageLoaded(true);
        };
      } else if (user?.profileImage) {
        const cached = profileImageCache.get(user.profileImage);
        if (cached?.loaded) {
          setIsImageLoaded(true);
        }
      }
    }, [user?.profileImage]);

    if (user?.profileImage) {
      return (
        <div className={`relative ${sizeClass} rounded-full overflow-hidden`}>
          <img
            key={`profile-cached-${user.profileImage}`}
            src={user.profileImage}
            alt={user.firstName || "User"}
            className={cn(
              `${sizeClass} rounded-full object-cover transition-opacity duration-200`,
              isImageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => setIsImageLoaded(true)}
          />
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-full">
              <Loader2 className={`${loaderSize} animate-spin text-primary`} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center`}
      >
        <span className="text-sm font-medium">
          {user?.firstName?.[0] || "U"}
        </span>
      </div>
    );
  }
);

ProfileImage.displayName = "ProfileImage";

// Company logo component with caching
const CompanyLogo = React.memo(
  ({
    logoUrl,
    companyName,
    size = "small"
  }: {
    logoUrl?: string | null;
    companyName?: string;
    size?: "small" | "medium";
  }) => {
    const [isLoaded, setIsLoaded] = React.useState(!logoUrl);
    const sizeClass = size === "medium" ? "h-8 w-8" : "h-6 w-6";
    const fallbackLetter =
      companyName && companyName.length > 0
        ? companyName.charAt(0).toUpperCase()
        : "C";

    if (!logoUrl) {
      return (
        <div
          className={`${sizeClass} rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium`}
        >
          {fallbackLetter}
        </div>
      );
    }

    return (
      <div className={`relative ${sizeClass} rounded overflow-hidden`}>
        <img
          src={logoUrl}
          alt={companyName || "Company"}
          className={cn(
            `${sizeClass} object-contain transition-opacity duration-200`,
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
        {!isLoaded && (
          <div
            className={`absolute inset-0 ${sizeClass} bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium`}
          >
            {fallbackLetter}
          </div>
        )}
      </div>
    );
  }
);

CompanyLogo.displayName = "CompanyLogo";

// Company dropdown component
const CompanyDropdown = React.memo(
  ({onInviteTeam}: {onInviteTeam: () => void}) => {
    const {data: organization, isLoading} = useCurrentOrganization();
    const {data: organizationRole} = useCurrentOrganizationRole();
    const {data: userOrganizations, isLoading: isLoadingOrgs} =
      useUserOrganizations();
    const switchPrimaryCompany = useSwitchPrimaryCompany();
    const {toast} = useToast();

    const [showSwitchDialog, setShowSwitchDialog] = React.useState(false);
    const [targetCompany, setTargetCompany] =
      React.useState<UserOrganization | null>(null);

    const handleSwitchCompany = React.useCallback(
      (org: UserOrganization) => {
        if (org.organizationId === organization?.id) return; // Already primary
        setTargetCompany(org);
        setShowSwitchDialog(true);
      },
      [organization?.id]
    );

    const confirmSwitchCompany = React.useCallback(async () => {
      if (!targetCompany) return;

      try {
        await switchPrimaryCompany.mutateAsync(targetCompany.organizationId);
        toast({
          title: "Company switched",
          description: `${targetCompany.organization.name} is now your primary company`
        });
        setShowSwitchDialog(false);
        setTargetCompany(null);
      } catch (error) {
        toast({
          title: "Error switching company",
          description:
            error instanceof Error ? error.message : "Failed to switch company",
          variant: "destructive"
        });
      }
    }, [targetCompany, switchPrimaryCompany, toast]);

    const otherOrganizations = React.useMemo(() => {
      if (!userOrganizations || !organization) return [];
      return userOrganizations.filter(
        (userOrg) => userOrg.organizationId !== organization.id
      );
    }, [userOrganizations, organization]);

    if (isLoading) {
      return (
        <div className="mx-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-16" />
            </div>
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      );
    }

    // Handle case where user has no organizations
    if (!organization) {
      return (
        <div className="mx-4">
          <div className="flex items-center w-full gap-2 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="h-8 w-8 bg-yellow-200 dark:bg-yellow-800 rounded flex items-center justify-center">
              <Building2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-xs text-yellow-800 dark:text-yellow-200">
                No Organization
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                Join or create a company
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-4">
        <ControlledDropdown
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
          sideOffset={8}
          trigger={
            <button className="flex items-center w-full gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
              <CompanyLogo
                logoUrl={organization.logo}
                companyName={organization.name}
                size="medium"
              />
              <div className="flex-1 text-left w-full">
                <div
                  className="font-medium text-xs truncate max-w-[100px]"
                  title={organization.name || "Company"}
                >
                  {organization.name || "Company"}
                </div>
                <div className="text-xs text-gray-500">
                  {organization.memberCount || 0}{" "}
                  {organization.memberCount === 1 ? "member" : "members"}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          }
        >
          {/* Current company section */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <CompanyLogo
                logoUrl={organization.logo}
                companyName={organization.name}
                size="medium"
              />
              <div className="flex-1">
                <div
                  className="font-medium text-sm truncate max-w-[150px]"
                  title={organization.name || "Company"}
                >
                  {organization.name || "Company"}
                </div>
                <div className="text-xs text-gray-500">
                  {organization.memberCount || 0}{" "}
                  {organization.memberCount === 1 ? "member" : "members"}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={onInviteTeam}
              >
                <Plus className="h-3 w-3 mr-1" />
                Invite team
              </Button>
              {organizationRole?.isCompanyAdmin && (
                <Link href="/settings?tab=company-profile">
                  <Button size="sm" variant="outline" className="h-8 px-3">
                    <Settings className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Workspaces section */}
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              WORKSPACES
            </div>

            {/* Current workspace */}
            <DropdownMenuItem asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex-1 text-left">
                  <div
                    className="font-medium text-xs truncate max-w-[110px]"
                    title={organization.name || "Company"}
                  >
                    {organization.name || "Company"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="bg-green-100 dark:bg-green-900 text-xs p-0.5 rounded text-green-700 dark:text-green-300 font-medium">
                    Primary
                  </div>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              </button>
            </DropdownMenuItem>

            {/* Other organizations */}
            {isLoadingOrgs ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              otherOrganizations.map((userOrg) => (
                <DropdownMenuItem key={userOrg.organizationId} asChild>
                  <button
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 mt-1"
                    onClick={() => handleSwitchCompany(userOrg)}
                  >
                    <div className="flex-1 text-left">
                      <div
                        className="font-medium text-xs truncate max-w-[110px]"
                        title={userOrg.organization.name}
                      >
                        {userOrg.organization.name}
                      </div>
                    </div>
                    {userOrg.isCompanyAdmin && (
                      <div className="bg-blue-100 dark:bg-blue-900 text-xs p-0.5 rounded text-blue-700 dark:text-blue-300">
                        Admin
                      </div>
                    )}
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </ControlledDropdown>

        {/* Switch Company Dialog */}
        <SwitchCompanyDialog
          open={showSwitchDialog}
          onOpenChange={setShowSwitchDialog}
          targetCompany={targetCompany}
          isLoading={switchPrimaryCompany.isPending}
          onConfirm={confirmSwitchCompany}
        />
      </div>
    );
  }
);

CompanyDropdown.displayName = "CompanyDropdown";

// Navigation item type
interface NavigationItem {
  href: string;
  icon: any;
  label: string;
  paths: string[];
}

// Static navigation items definition (outside component to prevent recreation)
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/",
    icon: BadgeCheck,
    label: "My Badge",
    paths: ["/"]
  },
  {
    href: "/headshots",
    icon: SquareUser,
    label: "Headshots",
    paths: ["/headshots"]
  },
  {
    href: "/leads",
    icon: UserRoundPlus,
    label: "Leads",
    paths: ["/leads"]
  }
];

// Memoized navigation link component with better prop comparison
const NavigationLink = React.memo(
  ({
    href,
    icon: Icon,
    label,
    isActive,
    className,
    onClick
  }: {
    href: string;
    icon: any;
    label: string;
    isActive: boolean;
    className?: string;
    onClick?: () => void;
  }) => (
    <Link href={href}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-md p-3 w-full transition-colors duration-150 cursor-pointer",
          isActive
            ? "bg-gray-200 text-gray-900 font-bold dark:bg-gray-800 dark:text-white"
            : "hover:bg-gray-200 dark:hover:bg-gray-800",
          className
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
    </Link>
  ),
  // Custom comparison function to prevent re-renders when only non-critical props change
  (prevProps, nextProps) => {
    return (
      prevProps.href === nextProps.href &&
      prevProps.label === nextProps.label &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.className === nextProps.className
    );
  }
);

NavigationLink.displayName = "NavigationLink";

// Memoized navigation section to prevent re-renders
const NavigationSection = React.memo(
  ({
    location,
    onNavigationClick
  }: {
    location: string;
    onNavigationClick: () => void;
  }) => {
    // Use a more stable way to determine active state
    const activeStates = React.useMemo(() => {
      return NAVIGATION_ITEMS.map((item) => ({
        ...item,
        isActive: item.paths.includes(location)
      }));
    }, [location]);

    return (
      <div className="py-2 mx-4">
        {activeStates.map((item) => (
          <NavigationLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={item.isActive}
            onClick={onNavigationClick}
          />
        ))}
      </div>
    );
  }
);

NavigationSection.displayName = "NavigationSection";

// Persistent state cache for modal states to prevent reset on re-renders
const modalStateCache = new Map<string, boolean>();

// Memoized modal state hook to persist across re-renders
const usePersistentModalState = (
  key: string,
  defaultValue: boolean = false
) => {
  const [state, setState] = React.useState(() => {
    return modalStateCache.get(key) ?? defaultValue;
  });

  const setPersistentState = React.useCallback(
    (value: boolean) => {
      modalStateCache.set(key, value);
      setState(value);
    },
    [key]
  );

  return [state, setPersistentState] as const;
};

// Memoized user data to prevent re-renders when user object changes but critical properties don't
const useUserData = (user: any) => {
  return React.useMemo(() => {
    return user;
  }, [
    user?.id,
    user?.firstName,
    user?.lastName,
    user?.email,
    user?.profileImage,
    user?.isCompanyAdmin
  ]);
};

export const AppSidebar = React.memo(
  ({className, isMobile = false, onNavigate}: AppSidebarProps) => {
    const [location] = useLocation();
    const {user, logout} = useAuth();
    const {data: organizationRole} = useCurrentOrganizationRole();
    const {data: organization} = useCurrentOrganization();

    // Fetch subscription status to check premium access
    const {data: subscriptionData} = useQuery({
      queryKey: ["/api/payments/subscription-status"],
      queryFn: async () => {
        try {
          const response = await fetch("/api/payments/subscription-status", {
            credentials: "include",
            headers: {
              "Content-Type": "application/json"
            }
          });
          if (!response.ok) {
            return {subscriptionStatus: "free", planType: "free", hasPremiumAccess: false};
          }
          return response.json();
        } catch (err) {
          console.error("Error fetching subscription status:", err);
          return {subscriptionStatus: "free", planType: "free", hasPremiumAccess: false};
        }
      },
      enabled: !!user,
      staleTime: 30000 // Cache for 30 seconds
    });

    // Check if user has premium access
    const hasPremiumAccess = 
      subscriptionData?.hasPremiumAccess === true ||
      (subscriptionData?.subscriptionStatus === "active" && subscriptionData?.planType === "pro") ||
      (user as any)?.hasPremiumAccess === true ||
      ((user as any)?.subscriptionStatus === "active" && (user as any)?.planType === "pro");

    // Use persistent modal states that survive re-renders
    const [showShareModal, setShowShareModal] =
      usePersistentModalState("shareModal");
    const [showInviteModal, setShowInviteModal] =
      usePersistentModalState("inviteModal");

    // Memoize user data to prevent unnecessary re-renders
    const userData = useUserData(user);

    // Memoize handlers to prevent recreation on every render
    const handleLogout = React.useCallback(async () => {
      try {
        await logout?.();
        window.location.href = "/auth";
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }, [logout]);

    // Handle navigation - close mobile sidebar if needed
    const handleNavigationClick = React.useCallback(() => {
      if (isMobile && onNavigate) {
        onNavigate();
      }
    }, [isMobile, onNavigate]);

    // Memoize invite modal handler
    const handleInviteTeam = React.useCallback(() => {
      setShowInviteModal(true);
      handleNavigationClick();
    }, [setShowInviteModal, handleNavigationClick]);

    return (
      <div
        className={cn(
          "flex flex-col w-full dark:bg-gray-950 overflow-y-auto",
          isMobile
            ? "h-full p-3" // Mobile: Use full height of container, not screen
            : "h-screen p-3", // Desktop: Use full screen height
          className
        )}
      >
        {/* Header with Logo */}
        <Logo />

        {/* Company Dropdown */}
        <CompanyDropdown onInviteTeam={handleInviteTeam} />

        {/* Navigation Sections */}
        <div className="flex-1">
          {/* Platform Section */}
          <NavigationSection
            location={location}
            onNavigationClick={handleNavigationClick}
          />
        </div>

        {/* Share Modal */}
        {userData && (
          <ShareBadgeModal
            user={userData}
            open={showShareModal}
            onOpenChange={setShowShareModal}
          />
        )}

        {/* Invite Team Modal */}
        <InviteTeamModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
        />
        <div className="mx-4">
          {/* User Profile with Dropdown */}
          <div className="mt-auto">
            {organization && (
              <div className="mb-2 px-4 md:px-0">
                <Button
                  className="w-full justify-center"
                  onClick={handleInviteTeam}
                >
                  Invite Team
                </Button>
              </div>
            )}

            <Link href="/support">
              <div
                onClick={handleNavigationClick}
                className={cn(
                  "flex items-center gap-3 rounded-md p-3 md:mx-0 transition-colors duration-150 cursor-pointer",
                  location === "/support"
                    ? "bg-gray-200 text-gray-900 font-bold dark:bg-gray-800 dark:text-white"
                    : "hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                <LifeBuoy className="h-4 w-4" />
                <span>Support</span>
              </div>
            </Link>

            {organizationRole?.isCompanyAdmin && (
              <Link href="/settings?tab=company-profile">
                <div
                  onClick={handleNavigationClick}
                  className={cn(
                    "flex items-center gap-3 rounded-md p-3 md:mx-0 transition-colors duration-150 cursor-pointer",
                    location.startsWith("/settings") &&
                      window.location.search.includes("tab=company-profile")
                      ? "bg-gray-200 text-gray-900 font-bold dark:bg-gray-800 dark:text-white"
                      : "hover:bg-gray-200 dark:hover:bg-gray-800"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Company</span>
                </div>
              </Link>
            )}

            {/* Super Admin Navigation */}
            {userData?.email?.endsWith("@withbadge.ai") && (
              <>
                <Link href="/admin">
                  <div
                    onClick={handleNavigationClick}
                    className={cn(
                      "flex items-center gap-3 rounded-md p-3 md:mx-0 transition-colors duration-150 cursor-pointer",
                      location === "/admin"
                        ? "bg-red-100 text-red-900 font-bold dark:bg-red-900/20 dark:text-red-400"
                        : "hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400"
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </div>
                </Link>
                <Link href="/super-admin">
                  <div
                    onClick={handleNavigationClick}
                    className={cn(
                      "flex items-center gap-3 rounded-md p-3 md:mx-0 transition-colors duration-150 cursor-pointer",
                      location === "/super-admin"
                        ? "bg-red-100 text-red-900 font-bold dark:bg-red-900/20 dark:text-red-400"
                        : "hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    <span>System Settings</span>
                  </div>
                </Link>
              </>
            )}
            <ControlledDropdown
              className="w-64"
              sideOffset={8}
              trigger={
                <button className="flex items-center w-full cursor-pointer rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                  <div className="flex items-center gap-2 p-3 flex-1">
                    <div className="flex-shrink-0">
                      <ProfileImage user={userData} size="small" />
                    </div>
                    <div className="flex flex-col overflow-hidden">Profile</div>
                  </div>
                  <ChevronUp className="mr-2 h-4 w-4 text-muted-foreground" />
                </button>
              }
            >
              <div className="flex items-center gap-3 p-3 border-b">
                <div className="flex-shrink-0">
                  <ProfileImage user={userData} size="large" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">
                    {userData?.firstName || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {userData?.email || "email@example.com"}
                  </span>
                </div>
              </div>

              {!hasPremiumAccess && (
                <>
                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link href="/settings?tab=billing">
                        <div
                          className="flex items-center gap-3 focus:bg-gray-50 dark:focus:bg-gray-800 cursor-pointer"
                          onClick={handleNavigationClick}
                        >
                          <Sparkle className="h-4 w-4" />
                          <span>Upgrade to Pro</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />
                </>
              )}

              <div className="py-1">
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <div
                      className="flex items-center gap-3 focus:bg-gray-50 dark:focus:bg-gray-800 cursor-pointer"
                      onClick={handleNavigationClick}
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=billing">
                    <div
                      className="flex items-center gap-3 focus:bg-gray-50 dark:focus:bg-gray-800 cursor-pointer"
                      onClick={handleNavigationClick}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Billing</span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=notifications">
                    <div
                      className="flex items-center gap-3 focus:bg-gray-50 dark:focus:bg-gray-800 cursor-pointer"
                      onClick={handleNavigationClick}
                    >
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <div
                      className="flex items-center gap-3 focus:bg-gray-50 dark:focus:bg-gray-800 cursor-pointer"
                      onClick={handleNavigationClick}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              <div className="py-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center p-3 gap-3 text-red-600 focus:bg-gray-50 focus:text-red-600 dark:focus:bg-gray-800 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </div>
            </ControlledDropdown>
          </div>
        </div>
      </div>
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.className === nextProps.className &&
      prevProps.isMobile === nextProps.isMobile &&
      prevProps.onNavigate === nextProps.onNavigate
    );
  }
);

AppSidebar.displayName = "AppSidebar";
