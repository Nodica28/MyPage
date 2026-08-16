import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {useDynamicTheme} from "@/components/DynamicThemeProvider";

export function ThemePreview() {
  const {isDynamicThemeEnabled, companyColor, isLoading} = useDynamicTheme();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Theme Preview</CardTitle>
        <CardDescription>
          See how your company colors look in the interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Primary Button</Button>
          <Button variant="secondary" size="sm">
            Secondary Button
          </Button>
          <Button variant="outline" size="sm">
            Outline Button
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>Primary Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
          <Badge variant="outline">Outline Badge</Badge>
        </div>

        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-sm text-primary font-medium">
            This text uses the primary color
          </p>
        </div>

        <div className="p-3 bg-secondary/10 rounded-lg">
          <p className="text-sm text-secondary-foreground">
            This text uses the secondary color
          </p>
        </div>

        {isLoading && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Loading theme information...
            </p>
          </div>
        )}

        {!isLoading && isDynamicThemeEnabled && companyColor && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Company theme active using:{" "}
              <span className="font-mono">{companyColor}</span>
            </p>
          </div>
        )}

        {!isLoading && !isDynamicThemeEnabled && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Using default theme colors (no company color set)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
