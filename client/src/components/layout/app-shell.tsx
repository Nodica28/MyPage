"use client";
import * as React from "react";
import {ReactNode} from "react";
import {useMediaQuery} from "@/hooks/use-media-query";
import {cn} from "@/lib/utils";
import {AppSidebar} from "@/components/layout/app-sidebar";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet";
import {Button} from "@/components/ui/button";
import {Menu} from "lucide-react";
import {SidebarProvider} from "@/components/ui/sidebar";

interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  contentClassName?: string;
}

export function AppShell({
  children,
  header,
  sidebar,
  hideSidebar = false,
  hideHeader = false,
  contentClassName
}: AppShellProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Callback to close mobile sidebar
  const handleMobileNavigate = React.useCallback(() => {
    setOpen(false);
  }, []);

  // Default sidebar content with proper mobile/desktop distinction
  const desktopSidebarContent = sidebar || <AppSidebar isMobile={false} />;
  const mobileSidebarContent = sidebar || (
    <AppSidebar isMobile={true} onNavigate={handleMobileNavigate} />
  );

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen max-w-full bg-gray-50 dark:bg-gray-900">
        {/* Desktop Sidebar */}
        {!hideSidebar && isDesktop && (
          <div className="hidden lg:block w-64 flex-shrink-0 fixed top-0 bottom-0 left-0 h-screen z-10">
            {desktopSidebarContent}
          </div>
        )}

        {/* Mobile Navigation */}
        {!hideSidebar && !isDesktop && (
          <Sheet open={open} onOpenChange={setOpen}>
            <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b bg-white dark:bg-gray-950 px-4 lg:hidden">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <div className="flex-1 flex justify-center">
                <img
                  src="/light-mode-logo.svg"
                  alt="Badge Logo"
                  className="h-auto"
                  style={{maxWidth: "100px"}}
                />
              </div>
              <div className="w-10"></div> {/* Balance the layout */}
            </div>
            <SheetContent
              side="left"
              className="p-0 w-full sm:max-w-xs overflow-hidden"
              onInteractOutside={() => setOpen(false)}
            >
              <div className="h-full overflow-y-auto">
                {mobileSidebarContent}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content Area */}
        <div
          className={cn(
            "flex flex-1 flex-col w-full max-w-full flex-grow",
            !isDesktop && !hideSidebar && "pt-14",
            isDesktop && !hideSidebar && "pl-60" // Add padding on the left equal to sidebar width only when sidebar is visible
          )}
        >
          {/* Main Content Area - Full width */}
          <main className="flex-1 w-full max-w-full">
            {/* Responsive Container - Card on desktop, full-bleed on mobile */}
            <div className="bg-background-smoke dark:bg-gray-950 min-h-screen rounded-none border-0 flex flex-col">
              {/* Header (shown on both mobile and desktop when not hidden) */}
              {!hideHeader && header && (
                <div className="border-b">{header}</div>
              )}
              {/* Page Content */}
              <div className={cn("w-full flex-1 sm:p-5", contentClassName)}>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
