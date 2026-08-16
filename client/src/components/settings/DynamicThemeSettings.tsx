import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {useDynamicTheme} from "@/components/DynamicThemeProvider";
import {ThemePreview} from "@/components/ThemePreview";
import {Palette, Sparkles} from "lucide-react";

export function DynamicThemeSettings() {
  const {isDynamicThemeEnabled, companyColor, isLoading} = useDynamicTheme();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Dynamic Theme</CardTitle>
        </div>
        <CardDescription>
          Application colors automatically adapt to match your company's brand
          colors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isDynamicThemeEnabled ? "bg-green-500" : "bg-gray-400"}`}
            />
            <Label className="text-base">
              {isDynamicThemeEnabled
                ? "Dynamic Theme Active"
                : "Using Default Theme"}
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {isDynamicThemeEnabled
              ? "Your company colors are automatically applied throughout the application"
              : "Set a company color in Company Settings to enable dynamic theming"}
          </p>
        </div>

        {companyColor && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div
              className="w-8 h-8 rounded-full border-2 border-border"
              style={{backgroundColor: companyColor}}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Company Color</p>
              <p className="text-xs text-muted-foreground font-mono">
                {companyColor}
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        )}

        {!companyColor && !isLoading && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              No company color set. Set a default color in your company settings
              to use dynamic theming.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Loading company information...
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            When a company color is set, the application automatically generates
            a color palette based on your company's primary color, affecting
            buttons, links, and other UI elements throughout the interface.
          </p>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Preview</h4>
          <ThemePreview />
        </div>
      </CardContent>
    </Card>
  );
}
