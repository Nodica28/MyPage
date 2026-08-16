import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Calendar, MessageSquare, Globe, Link2, UserPlus} from "lucide-react";
import {UpgradeBadge} from "@/components/ui/upgrade-badge";

interface QuickAction {
  id: string;
  label: string;
  url: string;
  type: "meeting" | "chat" | "custom" | "demo" | "leadgen";
  icon?: string;
  settings?: Record<string, any>;
}

interface QuickActionTypeSelectionModalProps {
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onTypeSelect: (type: QuickAction["type"]) => void;
  subscriptionStatus?: string;
  planType?: string;
  hasPremiumAccess?: boolean;
}

export function QuickActionTypeSelectionModal({
  open,
  isSaving,
  onClose,
  onTypeSelect,
  subscriptionStatus,
  planType,
  hasPremiumAccess
}: QuickActionTypeSelectionModalProps) {
  // Check if user has premium access (subscription or beta tester)
  // Use hasPremiumAccess if provided, otherwise fall back to subscription check
  const isProPlan =
    hasPremiumAccess === true ||
    (subscriptionStatus === "active" && planType === "pro");

  const handleTypeSelection = (type: QuickAction["type"]) => {
    // Prevent selection of premium features for non-pro users
    if ((type === "chat" || type === "leadgen") && !isProPlan) {
      return;
    }
    onTypeSelect(type);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !isSaving) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Quick Action Type</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 gap-5">
            {/* Book a meeting */}
            <button
              onClick={() => handleTypeSelection("meeting")}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-accent/40 transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              disabled={isSaving}
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-base text-gray-900">
                  Book a meeting
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Embed your calendar to let visitors book a meeting.
                </div>
              </div>
            </button>

            {/* Open chat */}
            <button
              onClick={() => handleTypeSelection("chat")}
              className={`flex items-center gap-4 p-4 border rounded-lg text-left w-full focus:outline-none transition-colors ${
                !isProPlan
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                  : "border-gray-200 hover:border-primary hover:bg-accent/40 focus:ring-2 focus:ring-primary focus:ring-offset-2"
              }`}
              disabled={isSaving || !isProPlan}
            >
              <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                !isProPlan ? "bg-gray-100" : "bg-primary/10"
              }`}>
                <MessageSquare className={`h-5 w-5 ${!isProPlan ? "text-gray-400" : "text-primary"}`} />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-base ${!isProPlan ? "text-gray-500" : "text-gray-900"}`}>
                  Open chat
                </div>
                <div className={`text-sm mt-1 ${!isProPlan ? "text-gray-400" : "text-gray-600"}`}>
                  Create a button that opens up your chat bot.
                </div>
              </div>
              {!isProPlan && (
                <div className="flex-shrink-0">
                  <UpgradeBadge />
                </div>
              )}
            </button>

            {/* Lead capture */}
            <button
              onClick={() => handleTypeSelection("leadgen")}
              className={`flex items-center gap-4 p-4 border rounded-lg text-left w-full focus:outline-none transition-colors ${
                !isProPlan
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                  : "border-gray-200 hover:border-primary hover:bg-accent/40 focus:ring-2 focus:ring-primary focus:ring-offset-2"
              }`}
              disabled={isSaving || !isProPlan}
            >
              <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                !isProPlan ? "bg-gray-100" : "bg-primary/10"
              }`}>
                <UserPlus className={`h-5 w-5 ${!isProPlan ? "text-gray-400" : "text-primary"}`} />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-base ${!isProPlan ? "text-gray-500" : "text-gray-900"}`}>
                  Lead capture
                </div>
                <div className={`text-sm mt-1 ${!isProPlan ? "text-gray-400" : "text-gray-600"}`}>
                  Create a form to capture leads from your profile.
                </div>
              </div>
              {!isProPlan && (
                <div className="flex-shrink-0">
                  <UpgradeBadge />
                </div>
              )}
            </button>

            {/* Watch a demo */}
            <button
              onClick={() => handleTypeSelection("demo")}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-accent/40 transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              disabled={isSaving}
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-base text-gray-900">
                  Watch a demo
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Share a demo or presentation with your visitors.
                </div>
              </div>
            </button>

            {/* Custom link */}
            <button
              onClick={() => handleTypeSelection("custom")}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-accent/40 transition-colors text-left w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              disabled={isSaving}
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-base text-gray-900">
                  Custom link
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Create a button that opens up any website.
                </div>
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
