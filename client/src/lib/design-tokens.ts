export type DesignToken = {
  value: string;
  description?: string;
};

export type ColorToken = DesignToken & {
  variants?: {
    light: string;
    dark: string;
  };
};

export type SpacingToken = DesignToken & {
  px: number;
};

export type TypographyToken = DesignToken & {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
};

export const colors = {
  primary: {
    value: "hsl(221 83% 53%)",
    description: "Primary brand color",
    variants: {
      light: "hsl(221 83% 53%)",
      dark: "hsl(221 83% 65%)"
    }
  },
  secondary: {
    value: "hsl(220 14% 96%)",
    description: "Secondary surface color",
    variants: {
      light: "hsl(220 14% 96%)",
      dark: "hsl(220 14% 20%)"
    }
  },
  accent: {
    value: "hsl(250 95% 76%)",
    description: "Accent color for emphasis",
    variants: {
      light: "hsl(250 95% 76%)",
      dark: "hsl(250 95% 76%)"
    }
  },
  success: {
    value: "hsl(142 76% 36%)",
    description: "Success state color",
    variants: {
      light: "hsl(142 76% 36%)",
      dark: "hsl(142 76% 46%)"
    }
  },
  warning: {
    value: "hsl(38 92% 50%)",
    description: "Warning state color",
    variants: {
      light: "hsl(38 92% 50%)",
      dark: "hsl(38 92% 60%)"
    }
  },
  error: {
    value: "hsl(0 84% 60%)",
    description: "Error state color",
    variants: {
      light: "hsl(0 84% 60%)",
      dark: "hsl(0 84% 70%)"
    }
  }
} as const;

export const spacing = {
  "2xs": {value: "0.25rem", px: 4},
  xs: {value: "0.5rem", px: 8},
  sm: {value: "0.75rem", px: 12},
  md: {value: "1rem", px: 16},
  lg: {value: "1.5rem", px: 24},
  xl: {value: "2rem", px: 32},
  "2xl": {value: "2.5rem", px: 40},
  "3xl": {value: "3rem", px: 48},
  "4xl": {value: "4rem", px: 64}
} as const;

export const typography = {
  display: {
    value: "display",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "3.5rem",
    lineHeight: "1.1",
    fontWeight: 700,
    letterSpacing: "-0.025em"
  },
  heading1: {
    value: "heading1",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "2.5rem",
    lineHeight: "1.2",
    fontWeight: 700,
    letterSpacing: "-0.025em"
  },
  heading2: {
    value: "heading2",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "2rem",
    lineHeight: "1.3",
    fontWeight: 600,
    letterSpacing: "-0.0125em"
  },
  heading3: {
    value: "heading3",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "1.5rem",
    lineHeight: "1.4",
    fontWeight: 600,
    letterSpacing: "-0.0125em"
  },
  body: {
    value: "body",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "1rem",
    lineHeight: "1.5",
    fontWeight: 400,
    letterSpacing: "0"
  },
  small: {
    value: "small",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "0.875rem",
    lineHeight: "1.4",
    fontWeight: 400,
    letterSpacing: "0"
  },
  caption: {
    value: "caption",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "0.75rem",
    lineHeight: "1.3",
    fontWeight: 400,
    letterSpacing: "0.025em"
  },
  code: {
    value: "code",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    fontWeight: 400,
    letterSpacing: "0"
  }
} as const;

export const radii = {
  none: {value: "0"},
  xs: {value: "0.125rem"},
  sm: {value: "0.25rem"},
  md: {value: "0.375rem"},
  lg: {value: "0.5rem"},
  xl: {value: "0.75rem"},
  "2xl": {value: "1rem"},
  full: {value: "9999px"}
} as const;

export const shadows = {
  xs: {value: "0 1px 2px rgba(0, 0, 0, 0.05)"},
  sm: {value: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)"},
  md: {
    value:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
  },
  lg: {
    value:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
  },
  xl: {
    value:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
  },
  "2xl": {value: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"},
  inner: {value: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)"}
} as const;

export const breakpoints = {
  xs: {value: "320px", description: "Extra small devices"},
  sm: {value: "640px", description: "Small devices like phones"},
  md: {value: "768px", description: "Medium devices like tablets"},
  lg: {value: "1024px", description: "Large devices like laptops"},
  xl: {value: "1280px", description: "Extra large devices like desktops"},
  "2xl": {value: "1536px", description: "Very large screens"}
} as const;

export const designTokens = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  breakpoints
} as const;
