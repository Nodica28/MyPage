import React from "react";
import {
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Linkedin,
  Instagram,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  MoreHorizontal
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {QuickLink} from "./QuickLinks";

interface QuickLinksPreviewProps {
  links: QuickLink[];
  iconColor?: string;
  showEditControls?: boolean;
  onEditQuickLink?: (linkId: string | number) => void;
  onToggleLinkVisibility?: (linkId: string | number) => void;
  onDeleteQuickLink?: (linkId: string | number) => void;
  onAddQuickLink?: () => void;
}

export function QuickLinksPreview({
  links,
  iconColor,
  showEditControls = false,
  onEditQuickLink,
  onToggleLinkVisibility,
  onDeleteQuickLink,
  onAddQuickLink
}: QuickLinksPreviewProps) {
  // In edit mode, show all links (including hidden ones)
  // In preview mode, only show visible links
  const visibleLinks = showEditControls
    ? links
    : links.filter((link) => link.isVisible !== false);

  if (!visibleLinks || visibleLinks.length === 0) {
    // Show add button even when no links exist, if in edit mode
    if (showEditControls && onAddQuickLink) {
      return (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddQuickLink}
            className="rounded-full bg-white border-2 border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 hover:shadow-md transition-all duration-200 gap-2 px-4 py-2 h-auto text-sm font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Quick Link
          </Button>
        </div>
      );
    }
    return null;
  }

  const renderIcon = (type: QuickLink["type"]) => {
    const iconProps = {
      className: "h-[1.15rem] w-[1.15rem]",
      style: {color: iconColor || "var(--primary)"}
    };

    switch (type) {
      case "website":
        return <Globe {...iconProps} />;
      case "email":
        return <Mail {...iconProps} />;
      case "phone":
        return <Phone {...iconProps} />;
      case "linkedin":
        return <Linkedin {...iconProps} />;
      case "instagram":
        return <Instagram {...iconProps} />;
      default:
        return <ExternalLink {...iconProps} />;
    }
  };

  // Format URL based on type
  const formatUrl = (url: string, type: QuickLink["type"]) => {
    if (!url) return "";

    switch (type) {
      case "email":
        return url.startsWith("mailto:") ? url : `mailto:${url}`;
      case "phone":
        return url.startsWith("tel:") ? url : `tel:${url}`;
      case "website":
        return url.startsWith("http") ? url : `https://${url}`;
      case "linkedin":
        return url.startsWith("http") ? url : `https://linkedin.com/in/${url}`;
      case "instagram":
        return url.startsWith("http") ? url : `https://instagram.com/${url}`;
      default:
        return url.startsWith("http") ? url : `https://${url}`;
    }
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {visibleLinks.map((link) => (
          <div key={link.id} className="relative group">
            <a
              href={formatUrl(link.url, link.type)}
              target={
                link.type === "email" || link.type === "phone"
                  ? "_self"
                  : "_blank"
              }
              rel="noopener noreferrer"
              className={`inline-flex items-center px-3 py-2 rounded-full gap-2 transition-colors ${
                showEditControls && link.isVisible === false
                  ? "bg-stone-200 text-stone-500 border border-dashed border-stone-300"
                  : "bg-stone-100 hover:bg-stone-200"
              }`}
              title={link.label}
              onClick={(e) => {
                // Handle email and phone links explicitly
                if (link.type === "email" || link.type === "phone") {
                  e.preventDefault();
                  const formattedUrl = formatUrl(link.url, link.type);

                  window.location.href = formattedUrl;
                  return;
                }

                // Prevent navigation when in edit mode to avoid accidental clicks
                if (showEditControls) {
                  e.preventDefault();
                }
              }}
            >
              <div
                className="w-6 h-6 flex items-center justify-center"
                style={{
                  color:
                    showEditControls && link.isVisible === false
                      ? "#9ca3af"
                      : iconColor || "var(--primary)"
                }}
              >
                {renderIcon(link.type)}
              </div>
              <div className="px-0.5 text-[0.8rem] font-medium truncate max-w-[150px]">
                {link.label}
              </div>
            </a>

            {/* Compact edit controls dropdown for each link */}
            {showEditControls && (
              <div className="absolute -top-2 -right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-7 h-7 p-1.5 rounded-full bg-white shadow-md border border-stone-200 hover:bg-stone-50 hover:shadow-lg transition-all duration-200"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-stone-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
                    {/* Visibility toggle */}
                    {onToggleLinkVisibility && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleLinkVisibility(link.id);
                        }}
                        className="cursor-pointer"
                      >
                        {link.isVisible !== false ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            <span>Hide link</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            <span>Show link</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    )}

                    {/* Edit link */}
                    {onEditQuickLink && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditQuickLink(link.id);
                        }}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Edit link</span>
                      </DropdownMenuItem>
                    )}

                    {/* Delete link */}
                    {onDeleteQuickLink && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteQuickLink(link.id);
                        }}
                        className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete link</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}

        {/* Add new link button */}
        {showEditControls && onAddQuickLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddQuickLink}
            className="rounded-full bg-white border-2 border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 hover:shadow-md transition-all duration-200 gap-2 px-4 py-2 h-auto text-sm font-medium self-center shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        )}
      </div>
    </div>
  );
}
