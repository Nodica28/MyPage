import React, {useState, useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  Lock,
  FileText,
  ChevronRight
} from "lucide-react";
import {cn} from "@/lib/utils";
import {TabItem} from "@/components/badge-profile/SettingsTab";

// DnD imports
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

interface ManageTabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: TabItem[];
  onSaveTabs: (tabs: TabItem[]) => void;
  onAddTab: () => void;
}

// Sortable tab item component
function SortableTabItem({
  tab,
  onEdit,
  onDelete,
  onPrivacyChange,
  onModalClose
}: {
  tab: TabItem;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onPrivacyChange: (
    id: string,
    privacy: "public" | "password" | "form",
    password?: string
  ) => void;
  onModalClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  const [isExpanded, setIsExpanded] = useState(false);
  const [password, setPassword] = useState(tab.password || "");

  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({
      id: tab.id
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onEdit(tab.id, editName);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(tab.name);
    }
  };

  const handlePrivacyChange = (value: string) => {
    const privacy = value as "public" | "password" | "form";
    onPrivacyChange(
      tab.id,
      privacy,
      privacy === "password" ? password : undefined
    );
  };

  const handlePasswordSave = () => {
    onPrivacyChange(tab.id, "password", password);
  };

  // Get the appropriate privacy badge
  const getPrivacyBadge = () => {
    switch (tab.privacy) {
      case "password":
        return (
          <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1 border border-gray-300">
            <Lock className="h-3 w-3" />
            <span>Password</span>
          </div>
        );
      case "form":
        return (
          <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1 border border-gray-300">
            <FileText className="h-3 w-3" />
            <span>Form Submission</span>
          </div>
        );
      default:
        return (
          <div className="px-2 py-0.5 bg-gray-100 rounded-full text-xs flex items-center gap-1 border border-gray-300">
            <Eye className="h-3 w-3" />
            <span>Public</span>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-4 mb-3 bg-white",
        isDragging ? "border-primary" : "border-gray-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>

          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-7 text-sm w-40"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">{tab.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  setEditName(tab.name);
                }}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getPrivacyBadge()}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(tab.id)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded ? "rotate-90" : ""
              )}
            />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-medium text-gray-700">
            Tab Privacy Settings
          </h4>

          <RadioGroup value={tab.privacy} onValueChange={handlePrivacyChange}>
            <div className="flex items-center space-x-2 bg-white py-4 px-5 rounded-lg border border-gray-200">
              <RadioGroupItem value="public" id={`public-${tab.id}`} />
              <Label htmlFor={`public-${tab.id}`}>Public</Label>
            </div>

            <div className="flex items-center space-x-2 bg-white py-4 px-5 rounded-lg border border-gray-200">
              <RadioGroupItem value="form" id={`form-${tab.id}`} />
              <Label
                htmlFor={`form-${tab.id}`}
                className="flex items-center justify-between gap-2 w-full"
              >
                Require Form Submission
                <span
                  className="text-primary cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(
                      "Form Settings clicked, closing modal and navigating"
                    );
                    // Close the modal
                    onModalClose();
                    // Navigate to the URL with the section parameter
                    window.location.href = "/?section=leadGeneration";
                  }}
                >
                  Form Settings
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2 bg-white py-4 px-5 rounded-lg border border-gray-200">
              <RadioGroupItem value="password" id={`password-${tab.id}`} />
              <Label htmlFor={`password-${tab.id}`}>Require Password</Label>
            </div>
          </RadioGroup>

          {tab.privacy === "password" && (
            <div className="mt-3 space-y-2">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="flex-1"
                />
                <Button onClick={handlePasswordSave}>Save</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ManageTabsModal({
  isOpen,
  onClose,
  tabs,
  onSaveTabs,
  onAddTab
}: ManageTabsModalProps) {
  // Initialize tabs state from props
  const [localTabs, setLocalTabs] = useState<TabItem[]>(tabs);

  // Update local tabs when props change
  useEffect(() => {
    if (isOpen) {
      setLocalTabs(tabs);
    }
  }, [tabs, isOpen]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // 5px movement required before drag starts
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over && active.id !== over.id) {
      setLocalTabs((prevItems) => {
        const oldIndex = prevItems.findIndex((item) => item.id === active.id);
        const newIndex = prevItems.findIndex((item) => item.id === over.id);

        const newTabs = arrayMove(prevItems, oldIndex, newIndex);
        return newTabs;
      });
    }
  };

  const handleEditTab = (id: string, name: string) => {
    setLocalTabs((prevItems) => {
      const newTabs = prevItems.map((item) =>
        item.id === id ? {...item, name} : item
      );
      return newTabs;
    });
  };

  const handleDeleteTab = (id: string) => {
    // Don't allow deleting if only one tab remains
    if (localTabs.length <= 1) {
      return;
    }

    setLocalTabs((prevItems) => {
      const newTabs = prevItems.filter((item) => item.id !== id);
      return newTabs;
    });
  };

  const handlePrivacyChange = (
    id: string,
    privacy: "public" | "password" | "form",
    password?: string
  ) => {
    setLocalTabs((prevItems) => {
      const newTabs = prevItems.map((item) =>
        item.id === id ? {...item, privacy, password} : item
      );
      return newTabs;
    });
  };

  const handleSave = () => {
    onSaveTabs(localTabs);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Page Tabs</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localTabs.map((tab) => tab.id)}
              strategy={verticalListSortingStrategy}
            >
              {localTabs.map((tab) => (
                <SortableTabItem
                  key={tab.id}
                  tab={tab}
                  onEdit={handleEditTab}
                  onDelete={handleDeleteTab}
                  onPrivacyChange={handlePrivacyChange}
                  onModalClose={onClose}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="mt-4">
            <Button variant="outline" className="w-full" onClick={onAddTab}>
              + Add New Tab
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
