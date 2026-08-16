import React, {useState, useEffect} from "react";
import {ChromePicker} from "react-color";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {MessageCircleMore, Palette} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";

export interface ColorSettingsProps {
  buttonColor: string;
  iconColor: string;
  onChange: (settings: {buttonColor: string; iconColor: string}) => void;
  useOrgDefault?: boolean;
  onToggleOrgDefault?: (useDefault: boolean) => void;
}

export function ColorSettings({
  buttonColor,
  onChange,
  useOrgDefault = false,
  onToggleOrgDefault
}: ColorSettingsProps) {
  const [tempColor, setTempColor] = useState(buttonColor);

  // Sync tempColor with buttonColor prop when it changes
  useEffect(() => {
    setTempColor(buttonColor);
  }, [buttonColor]);

  const handleColorChange = (color: string) => {
    setTempColor(color);
    onChange({buttonColor: color, iconColor: color});
  };

  const handleOrgDefaultToggle = (value: boolean) => {
    if (onToggleOrgDefault) {
      onToggleOrgDefault(value);
    }
  };

  return (
    <div className="space-y-4">
      {onToggleOrgDefault && (
        <div className="flex items-center space-x-2">
          <Switch
            id="use-org-default"
            checked={useOrgDefault}
            onCheckedChange={handleOrgDefaultToggle}
          />
          <Label htmlFor="use-org-default">
            Use organization default color
          </Label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Theme color picker */}
        <div className="space-y-3">
          <Label className="font-medium">BrandColor</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={useOrgDefault}
                className="w-full py-2.5 px-1 text-base flex items-center justify-between"
              >
                <div className="flex items-center justify-between w-full ml-2.5">
                  <span>{buttonColor.toUpperCase()}</span>
                  <div
                    className="w-20 h-8 rounded-lg"
                    style={{backgroundColor: buttonColor}}
                  />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto" side="bottom" align="end">
              <ChromePicker
                color={tempColor}
                onChange={(color) => {
                  setTempColor(color.hex);
                  handleColorChange(color.hex);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Preview how it looks */}
      <div className="mt-6 bg-subtle rounded-lg p-5">
        <h4 className="text-sm font-medium mb-6">Preview</h4>
        <div className="flex items-center gap-16">
          <div className="text-center">
            <Button
              style={{
                backgroundColor: buttonColor,
                color: "#ffffff"
              }}
            >
              Sample Button
            </Button>
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              Button
            </p>
          </div>
          <div className="text-center">
            <div
              className="rounded-full p-3"
              style={{
                backgroundColor: `${buttonColor}10`,
                color: buttonColor
              }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              Icon
            </p>
          </div>
          <div className="text-center">
            <div
              className="rounded-full p-3"
              style={{
                backgroundColor: `${buttonColor}`,
                color: buttonColor
              }}
            >
              <MessageCircleMore className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              Chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
