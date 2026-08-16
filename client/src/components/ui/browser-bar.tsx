import React from "react";
import {cn} from "@/lib/utils";
import {Copy, ArrowUpRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useToast} from "@/hooks/use-toast";

interface BrowserBarProps {
  url: string;
  className?: string;
  onOpenExternal?: () => void;
  isRegister?: boolean;
}

export function BrowserBar({
  url,
  className,
  onOpenExternal,
  isRegister
}: BrowserBarProps) {
  const {toast} = useToast();

  const handleCopyUrl = () => {
    // Always copy the full URL with withbadge.ai domain
    const fullUrl = url.startsWith("http")
      ? url
      : `https://app.withbadge.ai/${url.split("/").slice(3).join("/")}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Copied!",
      description: "URL has been copied to clipboard."
    });
  };

  // Extract the path from the URL
  const getUrlPath = () => {
    if (url.includes("/")) {
      const pathParts = url.split("/").slice(3);
      return pathParts.join("/") || "user";
    }
    return "user";
  };

  return (
    <div className={cn(className)}>
      {/* Mobile Design (Figma-based) - Only show on mobile */}
      <div className="sm:hidden bg-stone-50">
        {/* Browser Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 backdrop-blur-[40px]">
          {/* Browser dots */}
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 border border-red-300 shadow-inner"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-300 shadow-inner"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 border border-green-300 shadow-inner"></div>
          </div>

          {/* Preview Button */}
          {onOpenExternal && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-white border-stone-200 shadow-sm hover:bg-stone-50 px-2"
              onClick={onOpenExternal}
              title="Preview"
            >
              <ArrowUpRight className="h-3.5 w-3.5 mr-1 text-stone-600" />
              <span className="text-stone-600 font-medium text-xs">
                Preview
              </span>
            </Button>
          )}
        </div>

        {/* Browser Bar */}
        <div className="flex items-stretch bg-white border border-stone-200 rounded-lg mx-3 mb-3 overflow-hidden">
          {/* URL Section */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Domain */}
            <div className="flex items-center bg-stone-50 border-r border-stone-200 px-2 py-2 h-full">
              <span className="text-stone-600 font-medium text-xs truncate">
                mypage.com/
              </span>
            </div>

            {/* Path */}
            <div className="flex items-center justify-between flex-1 px-2 py-2 h-full min-w-0">
              <a
                href={
                  url.startsWith("http")
                    ? url
                    : `https://app.withbadge.ai/${url.split("/").slice(3).join("/")}`
                }
                onClick={(e) => {
                  if (isRegister) {
                    e.preventDefault();
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-900 font-normal text-sm leading-[1.33] hover:text-stone-700 transition-colors truncate flex-1 min-w-0"
              >
                {getUrlPath()}
              </a>

              {/* Copy Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1 border border-stone-200 rounded hover:bg-stone-50 flex-shrink-0"
                onClick={handleCopyUrl}
                title="Copy URL"
              >
                <Copy className="h-3 w-3 text-stone-500" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Design (Original) - Only show on sm and above */}
      <div className="hidden sm:flex items-center h-10 p-2 bg-gray-50 border border-stone-200 rounded-md">
        {/* Browser dots */}
        <div className="flex items-center space-x-1.5 mr-3 pl-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        </div>

        {/* URL display */}
        <div className="flex-1 flex items-center">
          <a
            href={
              url.startsWith("http")
                ? url
                : `https://app.withbadge.ai/${url.split("/").slice(3).join("/")}`
            }
            onClick={(e) => {
              if (isRegister) {
                e.preventDefault();
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white text-xs py-1 px-2 rounded border border-gray-200 flex items-center truncate hover:bg-gray-50"
          >
            <span className="text-gray-400">https://app.withbadge.ai/</span>
            {url.includes("/") ? (
              <span className="text-gray-800">
                {url.split("/").slice(3).join("/")}
              </span>
            ) : (
              <span className="text-gray-800">user</span>
            )}
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopyUrl}
            title="Copy URL"
          >
            <Copy className="h-3 w-3 text-gray-500" />
          </Button>
          {onOpenExternal && (
            <Button
              variant="outline"
              size="sm"
              className="h-6"
              onClick={onOpenExternal}
              title="Preview"
            >
              <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
