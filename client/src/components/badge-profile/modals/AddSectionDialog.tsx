import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {X, MousePointer, FileText, Megaphone, PlayCircle} from "lucide-react";
import {SectionTypeEnum, SectionType} from "@/shared/types/sections";

// Define section type options with display info
interface SectionTypeOption {
  id: SectionType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const sectionTypeOptions: SectionTypeOption[] = [
  {
    id: SectionTypeEnum.QUICK_ACTIONS,
    name: "Action Buttons",
    description: "Add quick action buttons like booking, chat, or lead forms",
    icon: <MousePointer className="h-6 w-6" />
  },
  {
    id: SectionTypeEnum.RESOURCES,
    name: "Resources",
    description: "Share files, case studies, and other downloadable content",
    icon: <FileText className="h-6 w-6" />
  },
  {
    id: SectionTypeEnum.CTA,
    name: "Announcement",
    description: "Add quick action buttons like booking, chat, or lead forms",
    icon: <Megaphone className="h-6 w-6" />
  },
  {
    id: SectionTypeEnum.EMBED,
    name: "Embed",
    description: "Share files, case studies, and other downloadable content",
    icon: <PlayCircle className="h-6 w-6" />
  }
];

// Props for the AddSectionDialog component
interface AddSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSectionTypeSelect: (sectionType: SectionType) => void;
}

export function AddSectionDialog({
  isOpen,
  onClose,
  onSectionTypeSelect
}: AddSectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]" hideCloseButton>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-stone-900">
            Select Section Type
          </DialogTitle>
          <DialogClose asChild>
            <Button
              className="w-8 h-8"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="py-2">
          {/* Section type options in 2x2 grid */}
          <div className="grid grid-cols-2 gap-5 px-1">
            {sectionTypeOptions.map((option) => (
              <button
                key={option.id}
                className="flex flex-col justify-center gap-4 p-5 border border-stone-200 rounded-lg hover:bg-stone-50 text-left transition-colors group"
                onClick={() => onSectionTypeSelect(option.id)}
              >
                <div className="text-stone-600 group-hover:text-stone-700">
                  {option.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg leading-tight text-stone-900">
                    {option.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-600">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
