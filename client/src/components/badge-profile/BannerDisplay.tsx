import {cn} from "@/lib/utils";

interface TagInterface {
  text: string;
  color: string;
  backgroundColor: string;
}

interface BannerData {
  id: string;
  name?: string;
  headline: {
    text: string;
    font: string;
    color: string;
  };
  subheadline?: {
    text: string;
    font: string;
    color: string;
  };
  tags: TagInterface[];
  backgroundType: "preset" | "custom";
  backgroundValue: string;
  customUploadUrl?: string;
}

interface BannerDisplayProps {
  banner: BannerData;
  className?: string;
}

export function BannerDisplay({banner, className}: BannerDisplayProps) {
  const isCustomUpload =
    banner.backgroundType === "custom" && banner.customUploadUrl;

  return (
    <div
      className={cn(
        "h-full rounded-lg transition-all duration-300 relative overflow-hidden",
        isCustomUpload ? "" : banner.backgroundValue,
        className
      )}
      style={
        isCustomUpload
          ? {
              backgroundImage: `url(${banner.customUploadUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }
          : {}
      }
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Content container */}
      <div className="relative h-full flex flex-col justify-between p-6">
        {/* Top section: Tags */}
        <div className="flex flex-wrap gap-2 max-w-[70%]">
          {banner.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm"
              style={{
                backgroundColor: tag.backgroundColor,
                color: tag.color
              }}
            >
              {tag.text}
            </span>
          ))}
        </div>

        {/* Middle section: Headlines */}
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
          <h1
            className={cn(
              "text-3xl md:text-4xl font-bold mb-2 break-words max-w-2xl",
              banner.headline.font
            )}
            style={{color: banner.headline.color}}
          >
            {banner.headline.text}
          </h1>
          {banner.subheadline?.text && (
            <p
              className={cn(
                "text-xl md:text-2xl break-words max-w-xl",
                banner.subheadline.font
              )}
              style={{color: banner.subheadline.color}}
            >
              {banner.subheadline.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BannerDisplay;
