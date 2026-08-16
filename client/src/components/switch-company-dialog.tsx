import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Loader2, Building2} from "lucide-react";
import {UserOrganization} from "@/hooks/use-organizations";

interface SwitchCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCompany: UserOrganization | null;
  isLoading?: boolean;
  onConfirm: () => void;
}

// Company logo component
const CompanyLogo = React.memo(
  ({
    logoUrl,
    companyName,
    size = "medium"
  }: {
    logoUrl?: string | null;
    companyName?: string;
    size?: "medium" | "large";
  }) => {
    const [isLoaded, setIsLoaded] = React.useState(!logoUrl);
    const sizeClass = size === "large" ? "h-12 w-12" : "h-8 w-8";
    const fallbackLetter =
      companyName && companyName.length > 0
        ? companyName.charAt(0).toUpperCase()
        : "C";

    if (!logoUrl) {
      return (
        <div
          className={`${sizeClass} rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium`}
        >
          {fallbackLetter}
        </div>
      );
    }

    return (
      <div className={`relative ${sizeClass} rounded overflow-hidden`}>
        <img
          src={logoUrl}
          alt={companyName || "Company"}
          className={`${sizeClass} object-contain transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
        {!isLoaded && (
          <div
            className={`absolute inset-0 ${sizeClass} bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium`}
          >
            {fallbackLetter}
          </div>
        )}
      </div>
    );
  }
);

CompanyLogo.displayName = "CompanyLogo";

export function SwitchCompanyDialog({
  open,
  onOpenChange,
  targetCompany,
  isLoading,
  onConfirm
}: SwitchCompanyDialogProps) {
  if (!targetCompany) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Primary Company
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to switch your primary company? This will
            change your default workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <CompanyLogo
            logoUrl={targetCompany.organization.logo}
            companyName={targetCompany.organization.name}
            size="large"
          />
          <div className="flex-1">
            <h3 className="font-medium text-lg">
              {targetCompany.organization.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {targetCompany.organization.memberCount}{" "}
              {targetCompany.organization.memberCount === 1
                ? "member"
                : "members"}
            </p>
            {targetCompany.isCompanyAdmin && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Company Admin
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch Company"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
