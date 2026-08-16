import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Switch} from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {Plus, X, Info, Check} from "lucide-react";
import {FormField} from "@/shared/types/form-field";
import {LeadSettings, DEFAULT_LEAD_FIELDS} from "@/shared/types/lead";
import {UpgradeBadge} from "@/components/ui/upgrade-badge";

interface LeadGenSettingsProps {
  settings: LeadSettings;
  onChange: (settings: LeadSettings) => void;
  subscriptionStatus?: string;
  planType?: string;
  hasPremiumAccess?: boolean;
}

export function LeadGenSettings({
  settings,
  onChange,
  subscriptionStatus,
  planType,
  hasPremiumAccess
}: LeadGenSettingsProps) {
  // Check if user has premium access (subscription or beta tester)
  // Use hasPremiumAccess if provided, otherwise fall back to subscription check
  const isProPlan =
    hasPremiumAccess === true ||
    (subscriptionStatus === "active" && planType === "pro");

  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FormField["type"]>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Local state for thank you message editing
  const [isEditingThankYouMessage, setIsEditingThankYouMessage] =
    useState(false);
  const [draftThankYouMessage, setDraftThankYouMessage] = useState("");

  // Get non-default fields
  const customFields = settings.fields.filter(
    (field) =>
      !DEFAULT_LEAD_FIELDS.some((defaultField) => defaultField.id === field.id)
  );

  // Handle toggling settings
  const handleToggleSetting = (
    setting: keyof Pick<
      LeadSettings,
      "downloadVcard" | "notifyEmail" | "captureFromQr"
    >
  ) => {
    // Only allow enabling captureFromQr if user has pro plan
    if (setting === "captureFromQr" && !settings[setting] && !isProPlan) {
      return;
    }
    
    onChange({
      ...settings,
      [setting]: !settings[setting]
    });
  };

  // Handle field update
  const handleFieldUpdate = (
    fieldId: string,
    property: keyof FormField,
    value: any
  ) => {
    onChange({
      ...settings,
      fields: settings.fields.map((field) =>
        field.id === fieldId ? {...field, [property]: value} : field
      )
    });
  };

  // Handle add new field
  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;

    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired
    };

    onChange({
      ...settings,
      fields: [...settings.fields, newField]
    });

    // Reset the form
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setIsAddingField(false);
  };

  // Handle delete field
  const handleDeleteField = (fieldId: string) => {
    // Check if it's a default field
    const isDefaultField = DEFAULT_LEAD_FIELDS.some(
      (field) => field.id === fieldId
    );

    // Don't allow deleting default fields
    if (isDefaultField) return;

    onChange({
      ...settings,
      fields: settings.fields.filter((field) => field.id !== fieldId)
    });
  };

  // Handle starting to edit thank you message
  const handleStartEditingThankYouMessage = () => {
    setDraftThankYouMessage(settings.customThankYouMessage || "");
    setIsEditingThankYouMessage(true);
  };

  // Handle saving thank you message
  const handleSaveThankYouMessage = () => {
    onChange({
      ...settings,
      customThankYouMessage: draftThankYouMessage
    });
    setIsEditingThankYouMessage(false);
    setDraftThankYouMessage("");
  };

  // Handle canceling thank you message edit
  const handleCancelThankYouMessage = () => {
    setIsEditingThankYouMessage(false);
    setDraftThankYouMessage("");
  };

  return (
    <div>
      {/* Enable/Disable Lead Capture */}
      <div className="flex items-center gap-6">
        <Switch
          id="capture-from-qr"
          checked={settings.captureFromQr}
          onCheckedChange={() => handleToggleSetting("captureFromQr")}
          disabled={!isProPlan}
        />
        <div className="flex items-center gap-2 flex-1 justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="capture-from-qr" className="text-base font-medium">
              Capture leads from QR code scans
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow visitors to submit contact information when scanning your QR
              code
            </p>
          </div>
          {!isProPlan && <UpgradeBadge />}
        </div>
      </div>

      {/* Only show additional settings if lead capture is enabled */}
      {settings.captureFromQr && (
        <div className="border-t border-stone-200 bg-stone-50 p-5 -mx-5 -mb-5 mt-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="download-vcard"
                checked={settings.downloadVcard}
                onCheckedChange={() => handleToggleSetting("downloadVcard")}
              />
              <Label htmlFor="download-vcard">
                Download vCard after submission
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="email-notification"
                checked={settings.notifyEmail}
                onCheckedChange={() => handleToggleSetting("notifyEmail")}
              />
              <Label htmlFor="email-notification">
                Email me when leads are submitted
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thank-you-message">Thank You Message</Label>
            {isEditingThankYouMessage ? (
              <div className="space-y-2">
                <Textarea
                  id="thank-you-message"
                  value={draftThankYouMessage}
                  onChange={(e) => setDraftThankYouMessage(e.target.value)}
                  placeholder="Thank you for submitting your information!"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveThankYouMessage}
                    className="h-8 px-3"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelThankYouMessage}
                    className="h-8 px-3"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="min-h-[80px] p-3 border border-input rounded-md bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleStartEditingThankYouMessage}
              >
                {settings.customThankYouMessage || (
                  <span className="text-muted-foreground">
                    Thank you for submitting your information!
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This message will be displayed after the form is submitted. Click
              to edit.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Form Fields</Label>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground p-2 border-b">
                <div>Field Name</div>
                <div>Type</div>
                <div className="text-center">Required Field</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Default fields (cannot be removed) */}
              {DEFAULT_LEAD_FIELDS.map((field) => {
                // Find the actual field from settings to get current values
                const currentField =
                  settings.fields.find((f) => f.id === field.id) || field;

                return (
                  <div
                    key={field.id}
                    className={`grid grid-cols-4 items-center gap-2 py-1.5 px-2 border-b bg-muted/20 ${
                      currentField.required
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : ""
                    }`}
                  >
                    <div className="text-sm">
                      <Input
                        className="h-7 text-sm"
                        value={currentField.label}
                        onChange={(e) =>
                          handleFieldUpdate(field.id, "label", e.target.value)
                        }
                      />
                    </div>
                    <div className="text-xs">
                      <Select
                        value={currentField.type}
                        onValueChange={(value: FormField["type"]) =>
                          handleFieldUpdate(field.id, "type", value)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={currentField.required}
                        onCheckedChange={(checked) =>
                          handleFieldUpdate(field.id, "required", !!checked)
                        }
                      />
                    </div>
                    <div className="flex justify-end items-center">
                      <div className="px-2 py-1 text-xs rounded-md bg-muted">
                        Default
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Custom fields (can be removed) */}
              {customFields.map((field) => (
                <div
                  key={field.id}
                  className={`grid grid-cols-4 items-center gap-2 py-1.5 px-2 border-b ${
                    field.required
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : ""
                  }`}
                >
                  <div className="text-sm">
                    <Input
                      className="h-7 text-sm"
                      value={field.label}
                      onChange={(e) =>
                        handleFieldUpdate(field.id, "label", e.target.value)
                      }
                    />
                  </div>
                  <div className="text-xs">
                    <Select
                      value={field.type}
                      onValueChange={(value: FormField["type"]) =>
                        handleFieldUpdate(field.id, "type", value)
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        handleFieldUpdate(field.id, "required", !!checked)
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteField(field.id)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Field button (full width, below fields) */}
              {!isAddingField && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setIsAddingField(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              )}

              {/* Add new field form */}
              {isAddingField && (
                <div className="border rounded-md p-3 mt-3 space-y-3 bg-muted/20">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Add New Field</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingField(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="new-field-label">Field Label</Label>
                      <Input
                        id="new-field-label"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="Company Size"
                      />
                    </div>

                    <div>
                      <Label htmlFor="new-field-type">Field Type</Label>
                      <Select
                        value={newFieldType}
                        onValueChange={(value: FormField["type"]) =>
                          setNewFieldType(value)
                        }
                      >
                        <SelectTrigger id="new-field-type">
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="new-field-required"
                        checked={newFieldRequired}
                        onCheckedChange={(checked) =>
                          setNewFieldRequired(!!checked)
                        }
                      />
                      <Label
                        htmlFor="new-field-required"
                        className="text-sm font-normal"
                      >
                        Required
                      </Label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingField(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddField}
                        disabled={!newFieldLabel.trim()}
                      >
                        Add Field
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-start space-x-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                Default fields (Full Name, Email, Phone) cannot be removed but
                can be customized. Add custom fields to collect additional
                information from leads. Required fields are highlighted with a
                colored background.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
