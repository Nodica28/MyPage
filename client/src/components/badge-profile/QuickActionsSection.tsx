import React, {useState} from "react";
import {
  Calendar,
  MessageSquare,
  Globe,
  Link2,
  ChevronRight,
  FilePlus,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import {cn} from "@/lib/utils";
import {MeetingModal} from "./modals/MeetingModal";
import {ChatModal} from "./modals/ChatModal";
import {LeadGenModal} from "./modals/LeadGenModal";
import {VisuallyHidden} from "@/components/ui/visually-hidden";
import {GlobalChatSettings} from "@shared/types/chat";
import {Card} from "@/components/ui/card";
import {InlineTextEditor} from "@/components/ui/inline-text-editor";
import {Button} from "@/components/ui/button";

// Define the QuickAction interface
interface QuickAction {
  id: string;
  label: string;
  url: string;
  type: "meeting" | "chat" | "custom" | "demo" | "leadgen";
  icon?: string;
  settings?: Record<string, any>;
}

// Props for the QuickActionsSection component
interface QuickActionsSectionProps {
  title?: string;
  description?: string;
  actions: QuickAction[];
  className?: string;
  buttonColor?: string;
  iconColor?: string;
  chatSettings?: GlobalChatSettings;
  userPath?: string;
  userEmail?: string;
  showEditControls?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDescriptionChange?: (newDescription: string) => void;
  onEditAction?: (action: QuickAction) => void;
  onAddAction?: () => void;
  onDeleteAction?: (actionId: string) => void;
}

export function QuickActionsSection({
  title,
  description,
  actions,
  className,
  iconColor = "#3b82f6",
  chatSettings,
  userPath,
  userEmail,
  showEditControls = false,
  onTitleChange,
  onDescriptionChange,
  onEditAction,
  onAddAction,
  onDeleteAction
}: QuickActionsSectionProps) {
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<{
    url: string;
    label: string;
  } | null>(null);

  // State for leadgen modal
  const [leadGenModalOpen, setLeadGenModalOpen] = useState(false);
  const [currentLeadGenAction, setCurrentLeadGenAction] =
    useState<QuickAction | null>(null);

  // Helper function to render the appropriate icon based on action type
  const getActionIcon = (type: QuickAction["type"]) => {
    return (
      <div className="h-4 w-4 md:h-5 md:w-5">
        {type === "meeting" && <Calendar className="h-full w-full" />}
        {type === "chat" && <MessageSquare className="h-full w-full" />}
        {type === "leadgen" && <FilePlus className="h-full w-full" />}
        {type === "demo" && <Globe className="h-full w-full" />}
        {(type === "custom" ||
          !["meeting", "chat", "leadgen", "demo"].includes(type)) && (
          <Link2 className="h-full w-full" />
        )}
      </div>
    );
  };

  // Get type description for accessibility and secondary text
  const getTypeDescription = (type: QuickAction["type"]) => {
    switch (type) {
      case "meeting":
        return "Schedule a meeting";
      case "chat":
        return "Start a conversation";
      case "leadgen":
        return "Get in touch";
      case "demo":
        return "Watch a demo";
      case "custom":
      default:
        return "View link";
    }
  };

  // State for chat modal
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [currentChatAction, setCurrentChatAction] =
    useState<QuickAction | null>(null);

  // Handle action click based on type
  const handleActionClick = (action: QuickAction, e: React.MouseEvent) => {
    if (action.type === "meeting") {
      e.preventDefault();
      setCurrentMeeting({
        url: action.url,
        label: action.label
      });
      setMeetingModalOpen(true);
    } else if (action.type === "chat") {
      e.preventDefault();
      setCurrentChatAction(action);
      setChatModalOpen(true);
    } else if (action.type === "leadgen") {
      e.preventDefault();
      setCurrentLeadGenAction(action);
      setLeadGenModalOpen(true);
    }
    // For other action types, the default behavior (opening in new tab) will work
  };

  // Handle chat modal open/close
  const handleChatModalOpenChange = (open: boolean) => {
    setChatModalOpen(open);
    // Clear current chat action when modal is closed
    if (!open) {
      setCurrentChatAction(null);
    }
  };

  // Handle leadgen modal open/close
  const handleLeadGenModalOpenChange = (open: boolean) => {
    setLeadGenModalOpen(open);
    // Clear current leadgen action when modal is closed
    if (!open) {
      setCurrentLeadGenAction(null);
    }
  };

  // Handle starting inline edit for an action
  const handleStartEditAction = (action: QuickAction) => {
    onEditAction?.(action);
  };

  // Handle starting add new action
  const handleStartAddAction = () => {
    onAddAction?.();
  };

  return (
    <Card className={cn("py-5 px-4 md:px-6 space-y-4", className)}>
      {/* Title and description if provided */}
      {showEditControls ? (
        <InlineTextEditor
          value={title || ""}
          onSave={(newValue: string) => onTitleChange?.(newValue)}
          placeholder="Enter section title..."
          textClassName="text-lg font-medium"
          showEditButton={true}
        />
      ) : (
        title && <h3 className="text-lg font-medium">{title}</h3>
      )}
      {showEditControls ? (
        <InlineTextEditor
          value={description || ""}
          onSave={(newValue: string) => onDescriptionChange?.(newValue)}
          placeholder="Enter section description..."
          multiline={true}
          textClassName="text-sm text-muted-foreground whitespace-pre-wrap break-words"
          showEditButton={true}
        />
      ) : (
        description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {description}
          </p>
        )
      )}

      {/* Actions list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action) => {
          const typeDescription = getTypeDescription(action.type);

          return (
            <div key={action.id} className="relative">
              <a
                href={
                  action.type === "chat" || action.type === "leadgen"
                    ? "#"
                    : action.url
                }
                target={
                  action.type === "chat" || action.type === "leadgen"
                    ? "_self"
                    : "_blank"
                }
                rel="noopener noreferrer"
                className="flex items-center rounded-lg border transition-colors p-4 md:p-3 min-h-[60px] md:min-h-0 touch-action-manipulation hover:bg-accent/40 md:hover:bg-muted/50 active:bg-accent/60 w-full"
                onClick={(e) => handleActionClick(action, e)}
                aria-label={`${action.label} - ${typeDescription}`}
              >
                {/* Icon on the left */}
                <div
                  className="rounded-full mr-4 md:mr-3 p-3 md:p-2"
                  style={{
                    backgroundColor: `${iconColor}10`,
                    color: iconColor
                  }}
                >
                  {getActionIcon(action.type)}
                </div>

                {/* Label and description */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-base md:text-sm">
                    {action.label}
                  </div>

                  {/* Show description on mobile devices */}
                  <p className="text-xs text-muted-foreground mt-1 md:hidden">
                    {typeDescription}
                  </p>

                  {/* Show URL for non-chat/leadgen actions on desktop */}
                  {action.type !== "chat" &&
                    action.type !== "leadgen" &&
                    action.url && (
                      <p className="text-xs text-muted-foreground mt-1 truncate hidden md:block">
                        {action.url}
                      </p>
                    )}
                </div>

                {/* Chevron on the right */}
                <div className="ml-auto pl-2">
                  <ChevronRight className="text-muted-foreground h-5 w-5 md:h-4 md:w-4" />
                  <VisuallyHidden>Open {typeDescription}</VisuallyHidden>
                </div>
              </a>

              {/* Edit button for each action - only show when in edit mode */}
              {showEditControls && onEditAction && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8 p-2 rounded-lg bg-stone-50 border-stone-200 shadow-sm hover:bg-white z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartEditAction(action);
                  }}
                  title="Edit action"
                >
                  <Pencil className="h-3 w-3 text-stone-600" />
                </Button>
              )}

              {/* Delete button for each action - only show when in edit mode */}
              {showEditControls && onDeleteAction && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-12 w-8 h-8 p-2 rounded-lg bg-stone-50 border-stone-200 shadow-sm hover:bg-red-50 hover:border-red-200 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteAction(action.id);
                  }}
                  title="Delete action"
                >
                  <Trash2 className="h-3 w-3 text-stone-600 hover:text-red-600" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {actions.length === 0 && (
        <div className="text-center p-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No quick actions available
          </p>
        </div>
      )}

      {/* Add action button - only show when in edit mode */}
      {showEditControls && onAddAction && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartAddAction}
            className="w-full rounded-lg border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}

      {/* Meeting modal */}
      {currentMeeting && (
        <MeetingModal
          isOpen={meetingModalOpen}
          onOpenChange={setMeetingModalOpen}
          meetingUrl={currentMeeting.url}
          meetingLabel={currentMeeting.label}
          fullScreen={false}
        />
      )}

      {/* Chat modal */}
      {currentChatAction && (
        <ChatModal
          isOpen={chatModalOpen}
          onOpenChange={handleChatModalOpenChange}
          action={currentChatAction}
          chatSettings={
            chatSettings ||
            (currentChatAction.settings?.chat
              ? ({
                  enabled: true,
                  welcomeMessage: "Hi there! How can I help you today?",
                  position: "bottom-right",
                  chatSettings: currentChatAction.settings.chat
                } as GlobalChatSettings)
              : undefined)
          }
          userPath={userPath}
          fullScreen={false}
        />
      )}

      {/* LeadGen modal */}
      {currentLeadGenAction && (
        <LeadGenModal
          isOpen={leadGenModalOpen}
          onOpenChange={handleLeadGenModalOpenChange}
          action={currentLeadGenAction}
          fullScreen={false}
          userEmail={userEmail}
        />
      )}
    </Card>
  );
}
