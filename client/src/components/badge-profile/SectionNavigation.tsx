import React, {useState} from "react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Plus, Pencil} from "lucide-react";

// Utility function to determine if a color is dark
const isColorDark = (color: string): boolean => {
  // Handle hex colors
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate luminance - standard formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5; // Dark if luminance is less than 0.5
  }
  
  // Default to assuming the color is light
  return false;
};

// Define the Page type for navigation
export interface Page {
  id: string;
  name: string | React.ReactNode;
  isVisible?: boolean;
  privacy?: "public" | "password" | "form";
  password?: string;
}

interface SectionNavigationProps {
  buttonColor?: string;
  pages: Page[];
  activePage?: string;
  onPageClick: (pageId: string) => void;
  className?: string;
  showEditControls?: boolean;
  onAddPage?: () => void;
  onEditPage?: (pageId: string, newName: string) => void;
  onEditTabs?: () => void;
}

export function SectionNavigation({
  buttonColor = "#3b82f6",
  pages,
  activePage,
  onPageClick,
  className,
  showEditControls,
  onAddPage,
  onEditPage,
  onEditTabs
}: SectionNavigationProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState<string>("");
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);

  // Determine active page - if not specified or doesn't exist in pages, use the first page
  const activePageId = activePage && pages.some(page => page.id === activePage) 
    ? activePage 
    : (pages.length > 0 ? pages[0].id : "");

  // Determine if the button color is dark to set text color
  const isDark = isColorDark(buttonColor);

  const handleEditClick = (page: Page) => {
    setEditingPageId(page.id);
    setEditingPageName(page.name?.toString() || "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingPageName(e.target.value);
  };

  const handleSaveName = (pageId: string) => {
    if (editingPageName.trim() && onEditPage) {
      onEditPage(pageId, editingPageName);
    }
    setEditingPageId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === "Enter") {
      handleSaveName(pageId);
    } else if (e.key === "Escape") {
      setEditingPageId(null);
    }
  };

  // Render nothing if no pages
  if (!pages || pages.length === 0) return null;

  // If only one page and not in edit mode, don't render navigation
  if (pages.length === 1 && !showEditControls) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Edit Tabs button - only in edit mode */}
      {showEditControls && onEditTabs && (
        <div className="absolute right-0 top-0 flex items-center">
          <Button 
            variant="outline"
            size="sm"
            onClick={onEditTabs}
            className="text-xs"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit tabs
          </Button>
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {pages
          .filter(page => page.isVisible !== false) // Only show visible pages
          .map((page) => (
            <React.Fragment key={page.id}>
              {editingPageId === page.id ? (
                <div className="flex items-center">
                  <Input
                    value={editingPageName}
                    onChange={handleNameChange}
                    onBlur={() => handleSaveName(page.id)}
                    onKeyDown={(e) => handleKeyDown(e, page.id)}
                    className="h-8 text-sm w-32"
                    autoFocus
                  />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageClick(page.id)}
                  onMouseEnter={() => setHoveredPageId(page.id)}
                  onMouseLeave={() => setHoveredPageId(null)}
                  style={
                    page.id === activePageId
                      ? {
                          backgroundColor: hoveredPageId === page.id 
                            ? `${buttonColor}90` // Add 80 (50% opacity) to create a lighter version
                            : buttonColor,
                          color: isDark ? "#ffffff" : "#1f2937",
                        }
                      : undefined
                  }
                  className={cn(
                    "h-8 px-4 text-sm font-medium whitespace-nowrap transition-colors",
                    page.id === activePageId
                      ? "shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100",
                    showEditControls && "pr-8 relative"
                  )}
                >
                  {page.name || "Unnamed"}
                  
                  {/* Edit icon - only in edit mode */}
                  {showEditControls && onEditPage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(page);
                      }}
                      className="absolute right-2 opacity-60 hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </Button>
              )}
            </React.Fragment>
          ))}
        
        {/* Add page button - only in edit mode */}
        {showEditControls && onAddPage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddPage}
            className="h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>Add</span>
          </Button>
        )}
      </div>
    </div>
  );
}
