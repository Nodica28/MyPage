import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {ChevronRight, Loader2} from "lucide-react";

interface CharacterProfileItem {
  label: string;
  value: string | null | undefined;
}

interface CharacterProfileDisplayProps {
  characterImageUrl: string;
  basicInfo: CharacterProfileItem[];
  hairStyle: CharacterProfileItem[];
  hairColor: CharacterProfileItem[];
  onEdit: () => void;
}

export function CharacterProfileDisplay({
  characterImageUrl,
  basicInfo,
  hairStyle,
  hairColor,
  onEdit
}: CharacterProfileDisplayProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Render a single info item
  const renderInfoItem = ({label, value}: CharacterProfileItem) => (
    <div>
      <div className="flex flex-row items-center">
        <p className="text-sm font-normal text-slate-900">
          {label}{" "}
          <span className="font-medium">
            {value ? value.charAt(0).toUpperCase() + value.slice(1) : "Not set"}
          </span>
        </p>
      </div>
    </div>
  );

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Character Profile</h2>
          <p className="text-sm text-muted-foreground">
            This is your profile that we save to generate realistic headshots.
          </p>
        </div>
        <div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>
      </div>

      {/* Content */}
      <div className="p-7 flex flex-col sm:flex-row gap-4 justify-between">
        {/* Left column - Reference Image */}
        <div className="flex flex-col gap-2 w-1/4">
          <div>
            <h3 className="text-xs font-medium text-slate-500 tracking-wide uppercase mb-2">
              Reference Image
            </h3>
            <div className="w-20 h-20 aspect-square rounded-full overflow-hidden bg-slate-100 relative">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              )}

              {imageError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <p className="text-sm text-slate-500">Failed to load image</p>
                </div>
              ) : (
                <img
                  src={characterImageUrl}
                  alt="Character reference"
                  className={`w-20 h-20 object-cover ${imageLoading ? "opacity-0" : "opacity-100"}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right column - Character details */}
        <div className="flex justify-between gap-2 md:gap-0 md:flex-row md:flex-1 max-w-xl">
          {/* Basic Info */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-slate-500 tracking-wide uppercase">
              Basic Info
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {basicInfo.map((item, index) => (
                <React.Fragment key={`basic-${index}`}>
                  {renderInfoItem(item)}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Hair Style */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-slate-500 tracking-wide uppercase">
              Hair Style
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {hairStyle.map((item, index) => (
                <React.Fragment key={`hair-style-${index}`}>
                  {renderInfoItem(item)}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-slate-500 tracking-wide uppercase">
              Hair Color
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {hairColor.map((item, index) => (
                <React.Fragment key={`hair-color-${index}`}>
                  {renderInfoItem(item)}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        {/* Edit Button */}
        <div className="flex justify-end">
          <Button onClick={onEdit} variant="outline" size="sm">
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
