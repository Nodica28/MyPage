import React, {useState, useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Textarea} from "@/components/ui/textarea";
import {Plus, X, Loader2} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  url: string;
  type: "meeting" | "chat" | "custom" | "demo" | "leadgen";
  icon?: string;
  settings?: Record<string, any>;
}

interface QuickActionAddModalProps {
  open: boolean;
  actionType: QuickAction["type"];
  isSaving: boolean;
  onClose: () => void;
  onSave: (newAction: QuickAction) => Promise<void>;
}

export function QuickActionAddModal({
  open,
  actionType,
  isSaving,
  onClose,
  onSave
}: QuickActionAddModalProps) {
  const [editingLabel, setEditingLabel] = useState("");
  const [editingUrl, setEditingUrl] = useState("");

  // Lead gen form settings
  const [formHeader, setFormHeader] = useState("Get in touch with me");
  const [formButtonText, setFormButtonText] = useState("Submit");
  const [formFields, setFormFields] = useState<
    {
      id: string;
      label: string;
      type: "text" | "email" | "phone" | "textarea";
      required: boolean;
    }[]
  >([
    {id: "field-1", label: "Full Name", type: "text", required: false},
    {id: "field-2", label: "Email", type: "email", required: true},
    {id: "field-3", label: "Phone", type: "phone", required: false},
    {id: "field-4", label: "Company Name", type: "text", required: false}
  ]);

  // Initialize form when modal opens or actionType changes
  useEffect(() => {
    if (open) {
      // Set default values based on type
      switch (actionType) {
        case "meeting":
          setEditingLabel("Book a meeting");
          setEditingUrl("https://calendly.com/yourusername");
          break;
        case "chat":
          setEditingLabel("Open chat");
          setEditingUrl("");
          break;
        case "leadgen":
          setEditingLabel("Lead capture");
          setEditingUrl("");
          break;
        case "demo":
          setEditingLabel("Watch a demo");
          setEditingUrl("https://yourproduct.com/demo");
          break;
        case "custom":
        default:
          setEditingLabel("Custom link");
          setEditingUrl("https://example.com");
          break;
      }

      // Reset form fields for leadgen
      setFormHeader("Get in touch with me");
      setFormButtonText("Submit");
      setFormFields([
        {id: "field-1", label: "Full Name", type: "text", required: false},
        {id: "field-2", label: "Email", type: "email", required: true},
        {id: "field-3", label: "Phone", type: "phone", required: false},
        {id: "field-4", label: "Company Name", type: "text", required: false}
      ]);
    }
  }, [open, actionType]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setEditingLabel("");
      setEditingUrl("");
      setFormHeader("Get in touch with me");
      setFormButtonText("Submit");
      setFormFields([
        {id: "field-1", label: "Full Name", type: "text", required: false},
        {id: "field-2", label: "Email", type: "email", required: true},
        {id: "field-3", label: "Phone", type: "phone", required: false},
        {id: "field-4", label: "Company Name", type: "text", required: false}
      ]);
    }
  }, [open]);

  const handleSave = async () => {
    const newAction: QuickAction = {
      id: `action-${Date.now()}`,
      label: editingLabel,
      url: editingUrl,
      type: actionType,
      icon:
        actionType === "meeting"
          ? "calendar"
          : actionType === "chat"
            ? "message"
            : actionType === "leadgen"
              ? "file"
              : "link",
      settings:
        actionType === "leadgen"
          ? {
              fields: formFields,
              formHeader,
              formButtonText
            }
          : {}
    };

    await onSave(newAction);
  };

  const handleCancel = () => {
    if (isSaving) {
      return;
    }
    onClose();
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Action</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="newActionLabel">Label</Label>
            <Input
              id="newActionLabel"
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              placeholder="Action label"
              disabled={isSaving}
            />
          </div>

          {actionType !== "chat" && actionType !== "leadgen" && (
            <div>
              <Label htmlFor="newActionUrl">URL</Label>
              <Input
                id="newActionUrl"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isSaving}
              />
            </div>
          )}

          {/* Lead Gen Form Configuration */}
          {actionType === "leadgen" && (
            <Tabs defaultValue="setup" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="setup">Set Up</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="setup">
                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <h4 className="text-sm font-medium">
                    Lead Capture Form Settings
                  </h4>

                  <div>
                    <Label htmlFor="newActionFormHeader">Form Header</Label>
                    <Input
                      id="newActionFormHeader"
                      placeholder="Get in touch with me"
                      value={formHeader}
                      onChange={(e) => setFormHeader(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Form Fields</Label>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-medium text-muted-foreground px-2">
                      <div>Field Name</div>
                      <div>Type</div>
                      <div className="text-center">Required</div>
                      <div className="text-right">Actions</div>
                    </div>
                    <div className="space-y-2">
                      {formFields.map((field) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-4 items-center gap-2 p-2 border rounded"
                        >
                          <Input
                            className="h-8 text-sm"
                            value={field.label}
                            onChange={(e) => {
                              setFormFields(
                                formFields.map((f) =>
                                  f.id === field.id
                                    ? {...f, label: e.target.value}
                                    : f
                                )
                              );
                            }}
                            placeholder="Field name"
                            disabled={isSaving}
                          />
                          <select
                            value={field.type}
                            onChange={(e) => {
                              setFormFields(
                                formFields.map((f) =>
                                  f.id === field.id
                                    ? {
                                        ...f,
                                        type: e.target.value as
                                          | "text"
                                          | "email"
                                          | "phone"
                                          | "textarea"
                                      }
                                    : f
                                )
                              );
                            }}
                            className="h-8 text-xs border border-input bg-background px-3 py-2 text-sm rounded-md"
                            disabled={isSaving}
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="textarea">Textarea</option>
                          </select>
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => {
                                setFormFields(
                                  formFields.map((f) =>
                                    f.id === field.id
                                      ? {...f, required: checked}
                                      : f
                                  )
                                );
                              }}
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => {
                                setFormFields(
                                  formFields.filter((f) => f.id !== field.id)
                                );
                              }}
                              disabled={isSaving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setFormFields([
                            ...formFields,
                            {
                              id: `field-${Date.now()}`,
                              label: "New Field",
                              type: "text",
                              required: false
                            }
                          ]);
                        }}
                        disabled={isSaving}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Field
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newActionFormButtonText">Button Text</Label>
                    <Input
                      id="newActionFormButtonText"
                      placeholder="Submit"
                      value={formButtonText}
                      onChange={(e) => setFormButtonText(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <h4 className="text-sm font-medium">Form Preview</h4>

                  {/* Preview of the actual form */}
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                      {formHeader || "Get in touch with me"}
                    </h3>

                    <div className="space-y-3">
                      {formFields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          <Label className="text-sm font-medium">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {field.type === "textarea" ? (
                            <Textarea
                              placeholder={`Enter your ${field.label.toLowerCase()}`}
                              className="resize-none"
                              rows={3}
                              disabled
                            />
                          ) : (
                            <Input
                              type={
                                field.type === "email"
                                  ? "email"
                                  : field.type === "phone"
                                    ? "tel"
                                    : "text"
                              }
                              placeholder={`Enter your ${field.label.toLowerCase()}`}
                              disabled
                            />
                          )}
                        </div>
                      ))}

                      <Button className="w-full mt-4" disabled>
                        {formButtonText || "Submit"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Action"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
