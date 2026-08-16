/**
 * Utility functions for dynamic theme generation based on company colors
 */

// Convert hex color to HSL
export function hexToHsl(hex: string): {h: number; s: number; l: number} {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse hex values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Convert HSL to CSS HSL values (without hsl() wrapper for Tailwind CSS)
export function hslToCss(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

// Generate a complete color palette from a primary color
export function generateColorPalette(primaryColor: string) {
  const {h, s, l} = hexToHsl(primaryColor);

  // Generate variations of the primary color
  const primary = {
    light: hslToCss(h, Math.min(s + 10, 100), Math.min(l + 15, 95)),
    DEFAULT: hslToCss(h, s, l),
    dark: hslToCss(h, Math.min(s + 5, 100), Math.max(l - 10, 5)),
    foreground: {
      light:
        l > 50
          ? hslToCss(h, Math.max(s - 20, 0), Math.max(l - 40, 10))
          : hslToCss(h, Math.max(s - 20, 0), Math.min(l + 40, 90)),
      dark:
        l > 50
          ? hslToCss(h, Math.max(s - 20, 0), Math.max(l - 40, 10))
          : hslToCss(h, Math.max(s - 20, 0), Math.min(l + 40, 90))
    }
  };

  // Generate neutral secondary colors that work well with any primary color
  // Use a neutral gray that complements the primary color's lightness
  const neutralH = 220; // Blue-gray hue
  const neutralS = Math.max(s - 60, 5); // Much lower saturation
  const neutralL = Math.max(l - 20, 15); // Slightly darker than primary

  const secondary = {
    light: hslToCss(
      neutralH,
      Math.max(neutralS - 10, 3),
      Math.min(neutralL + 25, 90)
    ),
    DEFAULT: hslToCss(neutralH, neutralS, neutralL),
    dark: hslToCss(
      neutralH,
      Math.min(neutralS + 5, 15),
      Math.max(neutralL - 15, 5)
    ),
    foreground: {
      light: hslToCss(
        neutralH,
        Math.max(neutralS - 5, 0),
        Math.max(neutralL - 30, 10)
      ),
      dark: hslToCss(
        neutralH,
        Math.max(neutralS - 5, 0),
        Math.min(neutralL + 30, 90)
      )
    }
  };

  // Generate accent color that's a subtle variation of the primary
  // Use a slightly different hue but keep it harmonious
  const accentH = (h + 15) % 360; // Small shift for subtle variation
  const accentS = Math.max(s - 20, 30); // Slightly less saturated
  const accentL = Math.min(l + 10, 80); // Slightly lighter

  const accent = {
    light: hslToCss(
      accentH,
      Math.min(accentS + 5, 100),
      Math.min(accentL + 10, 95)
    ),
    DEFAULT: hslToCss(accentH, accentS, accentL),
    dark: hslToCss(
      accentH,
      Math.min(accentS + 5, 100),
      Math.max(accentL - 10, 5)
    ),
    foreground: {
      light:
        l > 50
          ? hslToCss(
              accentH,
              Math.max(accentS - 20, 0),
              Math.max(accentL - 40, 10)
            )
          : hslToCss(
              accentH,
              Math.max(accentS - 20, 0),
              Math.min(accentL + 40, 90)
            ),
      dark:
        l > 50
          ? hslToCss(
              accentH,
              Math.max(accentS - 20, 0),
              Math.max(accentL - 40, 10)
            )
          : hslToCss(
              accentH,
              Math.max(accentS - 20, 0),
              Math.min(accentL + 40, 90)
            )
    }
  };

  return {
    primary,
    secondary,
    accent
  };
}

// Apply dynamic theme to CSS variables
export function applyDynamicTheme(companyColor: string, isDark = false) {
  const root = document.documentElement;
  const palette = generateColorPalette(companyColor);

  // Apply primary colors
  root.style.setProperty("--primary", palette.primary.DEFAULT);
  root.style.setProperty(
    "--primary-foreground",
    isDark ? palette.primary.foreground.dark : palette.primary.foreground.light
  );

  // Apply secondary colors
  root.style.setProperty("--secondary", palette.secondary.DEFAULT);
  root.style.setProperty(
    "--secondary-foreground",
    isDark
      ? palette.secondary.foreground.dark
      : palette.secondary.foreground.light
  );

  // Apply accent colors
  root.style.setProperty("--accent", palette.accent.DEFAULT);
  root.style.setProperty(
    "--accent-foreground",
    isDark ? palette.accent.foreground.dark : palette.accent.foreground.light
  );

  // Update ring color to match primary
  root.style.setProperty("--ring", palette.primary.DEFAULT);

  // Update sidebar colors to match theme
  root.style.setProperty("--sidebar-primary", palette.primary.DEFAULT);
  root.style.setProperty(
    "--sidebar-primary-foreground",
    isDark ? palette.primary.foreground.dark : palette.primary.foreground.light
  );
  root.style.setProperty("--sidebar-accent", palette.secondary.DEFAULT);
  root.style.setProperty(
    "--sidebar-accent-foreground",
    isDark
      ? palette.secondary.foreground.dark
      : palette.secondary.foreground.light
  );
}

// Reset to default theme
export function resetToDefaultTheme() {
  const root = document.documentElement;

  // Reset to default values from index.css
  root.style.setProperty("--primary", "248.52 100% 64.12%");
  root.style.setProperty("--primary-foreground", "210 40% 98%");
  root.style.setProperty("--secondary", "240 4.8% 95.9%");
  root.style.setProperty("--secondary-foreground", "240 5.9% 10%");
  root.style.setProperty("--accent", "240 4.8% 95.9%");
  root.style.setProperty("--accent-foreground", "240 5.9% 10%");
  root.style.setProperty("--ring", "240 5.9% 10%");
  root.style.setProperty("--sidebar-primary", "240 5.9% 10%");
  root.style.setProperty("--sidebar-primary-foreground", "0 0% 98%");
  root.style.setProperty("--sidebar-accent", "240 4.8% 95.9%");
  root.style.setProperty("--sidebar-accent-foreground", "240 5.9% 10%");
}

// Check if a color is light or dark
export function isLightColor(hex: string): boolean {
  const {l} = hexToHsl(hex);
  return l > 50;
}

// Get contrasting text color for a background
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? "#000000" : "#ffffff";
}
