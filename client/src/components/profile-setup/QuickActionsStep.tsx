import React, {useState} from "react";
import {UseFormReturn, useFieldArray} from "react-hook-form";
import {ProfileSetupFormData} from "@/schemas/profile-setup";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card} from "@/components/ui/card";
import {Calendar, MessageSquare, UserPlus, X, Plus} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import {cn} from "@/lib/utils";
import {QuickAction} from "@/shared/types/sections";

interface QuickActionsStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
}

type ActionType = "meeting" | "chat" | "leadgen" | "custom" | "demo";

interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea";
  required: boolean;
}

export const QuickActionsStep: React.FC<QuickActionsStepProps> = ({form}) => {
  const {fields, append, remove} = useFieldArray({
    control: form.control,
    name: "quickActions"
  });

  const [selectedType, setSelectedType] = useState<ActionType | null>(null);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);
  const [formHeader, setFormHeader] = useState("Get in touch with me");
  const [formButtonText, setFormButtonText] = useState("Submit");
  const [formFields, setFormFields] = useState<FormField[]>([
    {id: "field-1", label: "Full Name", type: "text", required: false},
    {id: "field-2", label: "Email", type: "email", required: true},
    {id: "field-3", label: "Phone", type: "phone", required: false},
    {id: "field-4", label: "Company Name", type: "text", required: false}
  ]);

  const handleTypeSelect = (type: ActionType) => {
    setSelectedType(type);
    setEditingAction({
      id: `action-${Date.now()}`,
      label:
        type === "meeting"
          ? "Book a meeting"
          : type === "chat"
            ? "Start a conversation"
            : type === "leadgen"
              ? "Lead capture"
              : type === "demo"
                ? "Set up a product demo"
                : "Custom link",
      url: type === "meeting" ? "https://calendly.com/yourusername" : "",
      type,
      icon:
        type === "meeting"
          ? "calendar"
          : type === "chat"
            ? "message"
            : type === "leadgen"
              ? "file"
              : "link",
      settings:
        type === "leadgen"
          ? ({
              fields: formFields,
              formHeader,
              formButtonText
            } as any)
          : {}
    });
  };

  const handleSaveAction = () => {
    if (!editingAction) return;

    // Update form fields for leadgen
    if (editingAction.type === "leadgen") {
      editingAction.settings = {
        fields: formFields,
        formHeader,
        formButtonText
      } as any;
    }

    append(editingAction);
    setSelectedType(null);
    setEditingAction(null);
    setFormHeader("Get in touch with me");
    setFormButtonText("Submit");
    setFormFields([
      {id: "field-1", label: "Full Name", type: "text", required: false},
      {id: "field-2", label: "Email", type: "email", required: true},
      {id: "field-3", label: "Phone", type: "phone", required: false},
      {id: "field-4", label: "Company Name", type: "text", required: false}
    ]);
  };

  const handleCancel = () => {
    setSelectedType(null);
    setEditingAction(null);
  };

  // If no type selected, show type selection
  if (!selectedType || !editingAction) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Add a Quick Action.</h1>
          <p className="text-muted-foreground mt-2">
            Let people take action from your profile in one tap.
          </p>
        </div>

        <div className="space-y-4">
          {/* Lead capture */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary"
            )}
            onClick={() => handleTypeSelect("leadgen")}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Lead capture</div>
                <div className="text-sm text-muted-foreground">
                  Create a form to capture leads from your profile.
                </div>
              </div>
            </div>
          </Card>

          {/* Book a meeting */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary"
            )}
            onClick={() => handleTypeSelect("meeting")}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Book a meeting</div>
                <div className="text-sm text-muted-foreground">
                  Embed your calendar to let visitors book a meeting.
                </div>
              </div>
            </div>
          </Card>

          {/* Open chat */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary"
            )}
            onClick={() => handleTypeSelect("chat")}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Open chat</div>
                <div className="text-sm text-muted-foreground">
                  Create a button that opens up your chat bot.
                </div>
              </div>
            </div>
          </Card>
        </div>

        {fields.length > 0 && (
          <div className="space-y-2">
            <Label>Added Actions</Label>
            <div className="space-y-2">
              {fields.map((field, index) => {
                const action = form.watch(`quickActions.${index}`);
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{action.label}</span>
                      <span className="text-sm text-muted-foreground">
                        ({action.type})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show configuration form based on type
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {selectedType === "meeting"
            ? "Book a Meeting."
            : selectedType === "leadgen"
              ? "Lead Capture."
              : "Configure Action"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {selectedType === "meeting"
            ? "Let others schedule time with you instantly."
            : selectedType === "leadgen"
              ? "Collect names and emails from interested visitors.."
              : "Configure your action settings."}
        </p>
      </div>

      <div className="space-y-4">
        {/* Label field */}
        <div>
          <Label>Label</Label>
          <Input
            value={editingAction.label}
            onChange={(e) =>
              setEditingAction({...editingAction, label: e.target.value})
            }
            placeholder={
              selectedType === "meeting"
                ? "Schedule a meeting"
                : selectedType === "leadgen"
                  ? "Lead capture"
                  : "Action label"
            }
          />
        </div>

        {/* URL field (for meeting and custom) */}
        {(selectedType === "meeting" || selectedType === "custom") && (
          <div>
            <Label>Calendar URL</Label>
            <Input
              value={editingAction.url}
              onChange={(e) =>
                setEditingAction({...editingAction, url: e.target.value})
              }
              placeholder="https://calendly.com/yourusername"
            />
          </div>
        )}

        {/* Lead gen form configuration */}
        {selectedType === "leadgen" && (
          <div className="space-y-4 border rounded-lg p-4">
            <div>
              <Label>Form Header</Label>
              <Input
                value={formHeader}
                onChange={(e) => setFormHeader(e.target.value)}
                placeholder="Get in touch with me"
              />
            </div>

            <div className="space-y-2">
              <Label>Form Inputs</Label>
              <div className="space-y-2">
                {formFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <Input
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
                      className="flex-1"
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
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="textarea">Textarea</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Required</span>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => {
                          setFormFields(
                            formFields.map((f) =>
                              f.id === field.id ? {...f, required: checked} : f
                            )
                          );
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormFields(
                          formFields.filter((f) => f.id !== field.id)
                        );
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </div>

            <div>
              <Label>Button Text</Label>
              <Input
                value={formButtonText}
                onChange={(e) => setFormButtonText(e.target.value)}
                placeholder="Submit"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveAction}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};
