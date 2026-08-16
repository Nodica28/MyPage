import React, {useState, useRef, useEffect} from "react";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {Check, X, Pencil} from "lucide-react";
import {cn} from "@/lib/utils";

interface InlineTextEditorProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  showEditButton?: boolean;
  textClassName?: string;
  editButtonClassName?: string;
  maxLength?: number;
}

export function InlineTextEditor({
  value,
  onSave,
  className,
  placeholder = "Click to edit...",
  multiline = false,
  showEditButton = false,
  textClassName = "",
  editButtonClassName = "",
  maxLength
}: InlineTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update temp value when prop value changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, multiline]);

  const handleStartEdit = () => {
    setTempValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(tempValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && multiline && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleClickOutside = () => {
    // Only auto-save if there are changes, otherwise cancel
    if (tempValue.trim() !== value.trim()) {
      handleSave();
    } else {
      handleCancel();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;

    return (
      <div className={cn("relative group flex items-start gap-2", className)}>
        <InputComponent
          ref={inputRef as any}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleClickOutside}
          placeholder={placeholder}
          maxLength={maxLength}
          className="text-inherit bg-transparent border-dashed flex-1 md:max-w-sm xl:max-w-lg"
          rows={multiline ? 3 : undefined}
        />

        {/* Save/Cancel buttons */}
        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleSave}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleCancel}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative group cursor-pointer hover:bg-accent/20 rounded px-2 py-1 -mx-2 -my-1 transition-all duration-200 border border-transparent hover:border-accent/30 hover:shadow-sm",
        className
      )}
      onClick={handleStartEdit}
      title="Click to edit"
    >
      <span
        className={cn(
          textClassName,
          !value && "text-muted-foreground",
          "group-hover:decoration-dashed group-hover:underline group-hover:underline-offset-2 group-hover:decoration-accent/50"
        )}
      >
        {value || placeholder}
      </span>

      {showEditButton && (
        <Button
          size="icon"
          variant="ghost"
          className={cn("h-5 w-5 ml-2 inline-flex", editButtonClassName)}
          onClick={(e) => {
            e.stopPropagation();
            handleStartEdit();
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
