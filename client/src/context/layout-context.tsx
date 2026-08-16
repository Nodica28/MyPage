import React, {createContext, useContext, useState, ReactNode} from "react";
import {AppShell} from "@/components/layout/app-shell";

type LayoutContextType = {
  header: ReactNode | null;
  sidebar: ReactNode | null;
  hideSidebar: boolean;
  hideHeader: boolean;
  contentClassName: string | null;
  setHeader: (header: ReactNode | null) => void;
  setSidebar: (sidebar: ReactNode | null) => void;
  setHideSidebar: (hide: boolean) => void;
  setHideHeader: (hide: boolean) => void;
  setContentClassName: (className: string | null) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

/**
 * Layout Provider component
 * Provides persistent layout state across page navigation
 */
export function LayoutProvider({children}: {children: ReactNode}) {
  const [header, setHeader] = useState<ReactNode | null>(null);
  const [sidebar, setSidebar] = useState<ReactNode | null>(null);
  const [hideSidebar, setHideSidebar] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [contentClassName, setContentClassName] = useState<string | null>(null);

  // Create the context value
  const contextValue: LayoutContextType = {
    header,
    sidebar,
    hideSidebar,
    hideHeader,
    contentClassName,
    setHeader,
    setSidebar,
    setHideSidebar,
    setHideHeader,
    setContentClassName
  };

  // Apply AppShell around children for protected routes
  return (
    <LayoutContext.Provider value={contextValue}>
      <AppShell
        header={header}
        sidebar={sidebar}
        hideSidebar={hideSidebar}
        hideHeader={hideHeader}
        contentClassName={contentClassName || undefined}
      >
        {children}
      </AppShell>
    </LayoutContext.Provider>
  );
}

/**
 * Hook to access the layout context
 */
export function useLayout(): LayoutContextType {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
