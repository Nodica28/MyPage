import React, {useState} from "react";
import {Plus, X} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {LeadTag} from "@/shared/types/lead";
import {cn} from "@/lib/utils";

interface LeadTagInputProps {
  tags: LeadTag[];
  onAddTag: (tag: Omit<LeadTag, "id">) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
  className?: string;
}

export function LeadTagInput({
  tags,
  onAddTag,
  onRemoveTag,
  className
}: LeadTagInputProps) {
  const [newTagLabel, setNewTagLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = async () => {
    if (!newTagLabel.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddTag({
        label: newTagLabel.trim(),
        color: "#6248FF" // Default color for new tags
      });
      setNewTagLabel("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTagLabel("");
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-800 border-purple-200"
        >
          <span>{tag.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-1"
            onClick={() => onRemoveTag(tag.id)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove tag</span>
          </Button>
        </Badge>
      ))}

      {isAdding ? (
        <div className="flex items-center">
          <Input
            value={newTagLabel}
            onChange={(e) => setNewTagLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs min-w-[120px] max-w-[160px]"
            placeholder="Enter tag name"
            autoFocus
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-1"
            onClick={() => {
              setIsAdding(false);
              setNewTagLabel("");
            }}
            disabled={isSubmitting}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
      ) : (
        <Badge
          variant="outline"
          className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-800 border-purple-200 cursor-pointer"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3" />
          <span>add tag</span>
        </Badge>
      )}
    </div>
  );
}
