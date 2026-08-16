import * as React from "react";
import {designTokens} from "@/lib/design-tokens";
import {useIsMobile} from "@/hooks/use-mobile";

type ThemeContextType = {
  tokens: typeof designTokens;
  updateToken: (
    category: keyof typeof designTokens,
    tokenName: string,
    value: any
  ) => void;
  isMobileOptimized: boolean;
};

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children
}) => {
  const [tokens, setTokens] = React.useState(designTokens);
  const isMobile = useIsMobile();
  const [isMobileOptimized, setIsMobileOptimized] = React.useState(false);

  // Load saved tokens from localStorage on mount
  React.useEffect(() => {
    const savedTokens = localStorage.getItem("design-tokens");
    if (savedTokens) {
      setTokens(JSON.parse(savedTokens));
    }
    setIsMobileOptimized(true);
  }, []);

  const updateToken = (
    category: keyof typeof designTokens,
    tokenName: string,
    value: any
  ) => {
    setTokens((prev) => {
      const newTokens = {
        ...prev,
        [category]: {
          ...prev[category],
          [tokenName]: {
            ...(prev[category] as any)[tokenName],
            ...value
          }
        }
      };

      localStorage.setItem("design-tokens", JSON.stringify(newTokens));
      return newTokens;
    });
  };

  // Apply tokens to CSS variables with mobile optimizations
  React.useEffect(() => {
    const root = document.documentElement;

    // Mobile optimization
    if (isMobile) {
      root.style.setProperty("--mobile-font-scale", "1.125");
      root.style.setProperty("--touch-target-min-size", "44px");
      root.style.setProperty(
        "--container-padding",
        "var(--container-padding-mobile)"
      );
    } else {
      root.style.setProperty("--mobile-font-scale", "1");
      root.style.setProperty("--touch-target-min-size", "32px");
      root.style.setProperty(
        "--container-padding",
        "var(--container-padding-desktop)"
      );
    }

    // Colors with mobile optimizations
    Object.entries(tokens.colors).forEach(([name, token]) => {
      const value = isMobile
        ? token.value.replace(
            /(\d+)%/,
            (m) => `${Math.min(parseInt(m) + 5, 100)}%`
          )
        : token.value;
      root.style.setProperty(`--color-${name}`, value);
      if (token.variants) {
        root.style.setProperty(`--color-${name}-light`, token.variants.light);
        root.style.setProperty(`--color-${name}-dark`, token.variants.dark);
      }
    });

    // Typography with mobile optimizations
    Object.entries(tokens.typography).forEach(([name, token]) => {
      const fontSize = isMobile
        ? `calc(${token.fontSize} * var(--mobile-font-scale))`
        : token.fontSize;
      root.style.setProperty(
        `--typography-${name}-font-family`,
        token.fontFamily
      );
      root.style.setProperty(`--typography-${name}-font-size`, fontSize);
      root.style.setProperty(
        `--typography-${name}-line-height`,
        token.lineHeight
      );
      root.style.setProperty(
        `--typography-${name}-font-weight`,
        token.fontWeight.toString()
      );
      if (token.letterSpacing) {
        root.style.setProperty(
          `--typography-${name}-letter-spacing`,
          token.letterSpacing
        );
      }
    });

    // Spacing with mobile optimizations
    Object.entries(tokens.spacing).forEach(([name, token]) => {
      const value = isMobile
        ? `calc(${token.value} * var(--mobile-font-scale))`
        : token.value;
      root.style.setProperty(`--spacing-${name}`, value);
    });

    // Radii with mobile optimizations
    Object.entries(tokens.radii).forEach(([name, token]) => {
      const value = isMobile ? `calc(${token.value} * 1.25)` : token.value;
      root.style.setProperty(`--radius-${name}`, value);
    });

    // Shadows
    Object.entries(tokens.shadows).forEach(([name, token]) => {
      root.style.setProperty(`--shadow-${name}`, token.value);
    });
  }, [tokens, isMobile]);

  return (
    <ThemeContext.Provider value={{tokens, updateToken, isMobileOptimized}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
