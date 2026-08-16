import React, {createContext, useContext} from "react";
import {useCurrentOrganization} from "@/hooks/use-organizations";

interface DynamicThemeContextType {
  isDynamicThemeEnabled: boolean;
  companyColor: string | null;
  isLoading: boolean;
}

const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(
  undefined
);

interface DynamicThemeProviderProps {
  children: React.ReactNode;
}

export function DynamicThemeProvider({children}: DynamicThemeProviderProps) {
  const {data: organization, isLoading} = useCurrentOrganization();

  // Get company color from organization
  const companyColor = organization?.defaultColor || null;
  
  // Automatically enable dynamic theme if company has a color
  const isDynamicThemeEnabled = Boolean(companyColor);

  // Note: We no longer apply global theme - colors are applied scoped to profile previews only

  const value: DynamicThemeContextType = {
    isDynamicThemeEnabled,
    companyColor,
    isLoading
  };

  return (
    <DynamicThemeContext.Provider value={value}>
      {children}
    </DynamicThemeContext.Provider>
  );
}

export function useDynamicTheme() {
  const context = useContext(DynamicThemeContext);
  if (context === undefined) {
    // Return default values instead of throwing error to prevent crashes
    return {
      isDynamicThemeEnabled: false,
      companyColor: null,
      isLoading: true
    };
  }
  return context;
}
