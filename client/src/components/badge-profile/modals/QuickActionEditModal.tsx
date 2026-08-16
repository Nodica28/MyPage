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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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

interface QuickActionEditModalProps {
  open: boolean;
  action: QuickAction | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (updatedAction: QuickAction) => Promise<void>;
}

export function QuickActionEditModal({
  open,
  action,
  isSaving,
  onClose,
  onSave
}: QuickActionEditModalProps) {
  const [editingLabel, setEditingLabel] = useState("");
  const [editingType, setEditingType] = useState<QuickAction["type"]>("custom");
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

  // Initialize form when action changes
  useEffect(() => {
    if (action && open) {
      setEditingLabel(action.label);
      setEditingType(action.type);
      setEditingUrl(action.url);

      // If it's a leadgen action, load the form settings
      if (action.type === "leadgen" && action.settings?.fields) {
        setFormFields(action.settings.fields);
        setFormHeader(action.settings.formHeader || "Get in touch with me");
        setFormButtonText(action.settings.formButtonText || "Submit");
      } else {
        // Reset to default fields for leadgen actions
        setFormFields([
          {id: "field-1", label: "Full Name", type: "text", required: false},
          {id: "field-2", label: "Email", type: "email", required: true},
          {id: "field-3", label: "Phone", type: "phone", required: false},
          {id: "field-4", label: "Company Name", type: "text", required: false}
        ]);
        setFormHeader("Get in touch with me");
        setFormButtonText("Submit");
      }
    }
  }, [action, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setEditingLabel("");
      setEditingType("custom");
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
    if (!action) return;

    const updatedAction: QuickAction = {
      id: action.id,
      label: editingLabel,
      url: editingUrl,
      type: editingType,
      icon:
        editingType === "meeting"
          ? "calendar"
          : editingType === "chat"
            ? "message"
            : editingType === "leadgen"
              ? "file"
              : "link",
      settings:
        editingType === "leadgen"
          ? {
              fields: formFields,
              formHeader,
              formButtonText
            }
          : {}
    };

    await onSave(updatedAction);
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
          <DialogTitle>Edit Action</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="editingLabel">Label</Label>
            <Input
              id="editingLabel"
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              placeholder="Action label"
              disabled={isSaving}
            />
          </div>

          <div>
            <Label htmlFor="editingType">Type</Label>
            <Select
              value={editingType}
              onValueChange={(value) =>
                setEditingType(value as QuickAction["type"])
              }
              disabled={isSaving}
            >
              <SelectTrigger id="editingType">
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Link</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="leadgen">Lead Gen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editingType !== "chat" && editingType !== "leadgen" && (
            <div>
              <Label htmlFor="editingUrl">URL</Label>
              <Input
                id="editingUrl"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isSaving}
              />
            </div>
          )}

          {/* Lead Gen Form Configuration */}
          {editingType === "leadgen" && (
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
                    <Label htmlFor="editingFormHeader">Form Header</Label>
                    <Input
                      id="editingFormHeader"
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
                          <Select
                            value={field.type}
                            onValueChange={(
                              value: "text" | "email" | "phone" | "textarea"
                            ) => {
                              setFormFields(
                                formFields.map((f) =>
                                  f.id === field.id ? {...f, type: value} : f
                                )
                              );
                            }}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                            </SelectContent>
                          </Select>
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
                    <Label htmlFor="editingFormButtonText">Button Text</Label>
                    <Input
                      id="editingFormButtonText"
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
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
