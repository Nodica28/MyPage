import React, {useState, useEffect, useCallback} from "react";
import {useLocation} from "wouter";

// Removed local Integrations stub; using dedicated component
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import ProfileEditor from "@/components/settings/ProfileEditor";
import ConnectedApps from "../components/settings/ConnectedApps";
import NotificationsSettings from "../components/settings/NotificationSettings";
import CompanySettings from "../components/settings/CompanySettings";
import TeamSettings from "../components/settings/TeamSettings";
import {useCurrentOrganizationRole} from "@/hooks/use-organizations";
import IntegrationsSettings from "@/components/settings/IntegrationsSettings";
import {DynamicThemeSettings} from "@/components/settings/DynamicThemeSettings";

// Billing hooks moved into `@/components/settings/BillingSettings`

export default function Settings(): React.ReactNode {
  const {data: organizationRole} = useCurrentOrganizationRole();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    undefined
  );
  const [accordionKey, setAccordionKey] = useState(0);

  const isCompanyAdmin = organizationRole?.isCompanyAdmin === true;

  // Define settings categories with sidebar items
  const settingsCategories = [
    {
      label: "PERSONAL",
      items: [
        {id: "profile", label: "Profile"},
        {id: "connected-apps", label: "Connect Apps"},
        {id: "notifications", label: "Notifications"},
        {id: "theme", label: "Theme"}
      ]
    },
    // Only show company settings if user is a company admin
    ...(isCompanyAdmin
      ? [
          {
            label: "COMPANY",
            items: [
              {id: "company-profile", label: "Profile"},
              {id: "team", label: "Team"},
              {id: "integrations", label: "Integrations"}
            ]
          }
        ]
      : [])
  ];

  // Get all valid tab IDs
  const allValidTabs = settingsCategories.flatMap((category) =>
    category.items.map((item) => item.id)
  );

  // Handle tab change and verify admin access
  const handleTabChange = useCallback(
    (tabId: string) => {
      // Check if the tab is valid
      if (!allValidTabs.includes(tabId)) {
        return; // Prevent access to invalid tabs
      }

      // Check if tab is a company tab and user is not an admin
      const isCompanyTab = [
        "company-profile",
        "billing",
        "team",
        "integrations"
      ].includes(tabId);

      if (isCompanyTab && !isCompanyAdmin) {
        return; // Prevent access to company tabs for non-admins
      }

      setAccordionValue(undefined);
      setTimeout(() => {
        setActiveTab(tabId);
        setAccordionKey((prev) => prev + 1);
      }, 200);

      // Update URL with the selected tab
      const url = new URL(window.location.href);
      if (tabId === "profile") {
        // Remove tab parameter for default profile tab to keep URL clean
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tabId);
      }
      window.history.replaceState({}, "", url.toString());
    },
    [allValidTabs, isCompanyAdmin]
  );

  // Sync tab with URL parameter on mount and location changes
  useEffect(() => {
    // Only sync if we're on the settings page
    if (!location.startsWith("/settings")) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    const targetTab = tabParam || "profile";

    if (allValidTabs.includes(targetTab)) {
      const isCompanyTab = [
        "company-profile",
        "billing",
        "team",
        "integrations"
      ].includes(targetTab);

      // Check if user has access to company tabs
      if (!isCompanyTab || isCompanyAdmin) {
        setActiveTab(targetTab);
      } else {
        // If user doesn't have access, redirect to profile
        setActiveTab("profile");
      }
    } else {
      // Invalid tab, set to profile
      setActiveTab("profile");
    }
  }, [location, allValidTabs, isCompanyAdmin]);

  // Get current active item details for mobile display
  const getActiveItemDetails = () => {
    for (const category of settingsCategories) {
      for (const item of category.items) {
        if (item.id === activeTab) {
          return {category: category.label, item: item.label};
        }
      }
    }
    return {category: "PERSONAL", item: "Profile"};
  };

  const activeItemDetails = getActiveItemDetails();

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-3rem)] gap-2">
      {/* Mobile Settings Navigation - Accordion */}
      <div className="md:hidden bg-white dark:bg-gray-900 border border-gray rounded-lg">
        <Accordion
          key={accordionKey}
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          <AccordionItem value="settings-nav" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex flex-col items-start">
                <h2 className="text-lg font-semibold">Settings</h2>
                <p className="text-sm text-muted-foreground">
                  {activeItemDetails.category} → {activeItemDetails.item}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {settingsCategories.map((category) => (
                <div key={category.label} className="mb-6 last:mb-0">
                  <div className="mb-2">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      {category.label}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {category.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => handleTabChange(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                            activeTab === item.id
                              ? "bg-gray-100 dark:bg-gray-800 font-medium"
                              : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Desktop Settings Layout */}
      <div className="hidden md:flex md:flex-row w-full flex-1 min-h-0 gap-2">
        {/* Settings Sidebar - Fixed */}
        <div className="md:w-64 bg-white dark:bg-gray-900 border border-gray rounded-lg shrink-0 flex flex-col">
          <div className="px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>

          {/* Settings Categories - Scrollable */}
          <div className="px-3 py-4 overflow-y-auto flex-1">
            {settingsCategories.map((category) => (
              <div key={category.label} className="mb-6">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    {category.label}
                  </h3>
                </div>
                <ul className="space-y-1">
                  {category.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                          activeTab === item.id
                            ? "bg-gray-100 dark:bg-gray-800 font-medium"
                            : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Content - Scrollable */}
        <div className="flex-1 border border-gray rounded-lg overflow-y-auto bg-white">
          {/* Render the appropriate settings content based on the active tab */}
          {activeTab === "profile" ? (
            <ProfileEditor />
          ) : activeTab === "connected-apps" ? (
            <ConnectedApps />
          ) : activeTab === "notifications" ? (
            <NotificationsSettings />
          ) : activeTab === "theme" ? (
            <DynamicThemeSettings />
          ) : activeTab === "company-profile" && isCompanyAdmin ? (
            <CompanySettings />
          ) : activeTab === "team" && isCompanyAdmin ? (
            <TeamSettings />
          ) : activeTab === "integrations" && isCompanyAdmin ? (
            <IntegrationsSettings />
          ) : (
            <div className="p-8 text-center">
              <h2 className="text-xl font-medium">Settings page not found</h2>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Settings Content */}
      <div className="md:hidden flex-1 border border-gray rounded-lg overflow-y-auto bg-white">
        {/* Render the appropriate settings content based on the active tab */}
        {activeTab === "profile" ? (
          <ProfileEditor />
        ) : activeTab === "connected-apps" ? (
          <ConnectedApps />
        ) : activeTab === "notifications" ? (
          <NotificationsSettings />
        ) : activeTab === "theme" ? (
          <DynamicThemeSettings />
        ) : activeTab === "company-profile" && isCompanyAdmin ? (
          <CompanySettings />
        ) : activeTab === "team" && isCompanyAdmin ? (
          <TeamSettings />
        ) : activeTab === "integrations" && isCompanyAdmin ? (
          <IntegrationsSettings />
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-xl font-medium">Settings page not found</h2>
          </div>
        )}
      </div>
    </div>
  );
}
