import React, {useState} from "react";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {FileText, Loader2} from "lucide-react";
import {cn} from "@/lib/utils";

interface LeadNoteInputProps {
  onAddNote: (content: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  existingNoteContent?: string;
}

export function LeadNoteInput({
  onAddNote,
  placeholder = "Add a note...",
  className,
  existingNoteContent = ""
}: LeadNoteInputProps) {
  const [content, setContent] = useState(existingNoteContent);
  const [isExpanded, setIsExpanded] = useState(!!existingNoteContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddNote(content.trim());
      setContent("");
      setIsExpanded(false);
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Command+Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {isExpanded ? (
        <>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] text-sm"
            placeholder={placeholder}
            disabled={isSubmitting}
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsExpanded(false);
                setContent("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Note"
              )}
            </Button>
          </div>
        </>
      ) : (
        <div
          className="flex items-center gap-2 p-2 text-sm text-muted-foreground border rounded-md cursor-pointer hover:bg-muted/50"
          onClick={() => setIsExpanded(true)}
        >
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{placeholder}</span>
        </div>
      )}
    </div>
  );
}
