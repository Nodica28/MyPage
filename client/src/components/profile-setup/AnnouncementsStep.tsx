import React, {useState} from "react";
import {UseFormReturn, useFieldArray} from "react-hook-form";
import {ProfileSetupFormData} from "@/schemas/profile-setup";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {Megaphone, X, Plus} from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";

interface AnnouncementsStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
}

export const AnnouncementsStep: React.FC<AnnouncementsStepProps> = ({
  form
}) => {
  const {fields, append, remove} = useFieldArray({
    control: form.control,
    name: "announcements"
  });

  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementDescription, setNewAnnouncementDescription] =
    useState("");
  const [newAnnouncementButtonText, setNewAnnouncementButtonText] =
    useState("");
  const [newAnnouncementButtonLink, setNewAnnouncementButtonLink] =
    useState("");

  const handleAddAnnouncement = () => {
    if (newAnnouncementTitle.trim()) {
      append({
        id: `announcement-${Date.now()}`,
        title: newAnnouncementTitle.trim(),
        description: newAnnouncementDescription.trim() || undefined,
        buttonText: newAnnouncementButtonText.trim() || undefined,
        buttonLink: newAnnouncementButtonLink.trim() || undefined,
        backgroundColor: "white",
        buttonColor: "brand"
      });
      setNewAnnouncementTitle("");
      setNewAnnouncementDescription("");
      setNewAnnouncementButtonText("");
      setNewAnnouncementButtonLink("");
      setShowAddAnnouncement(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Share Announcements.</h1>
        <p className="text-muted-foreground mt-2">
          Highlight important updates or news — optional.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-muted-foreground" />
                <FormField
                  control={form.control}
                  name={`announcements.${index}.title`}
                  render={({field: titleField}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Announcement title"
                          {...titleField}
                          className="font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {fields.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name={`announcements.${index}.description`}
              render={({field: descField}) => (
                <FormItem>
                  <FormLabel className="sr-only">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Announcement description (optional)"
                      rows={3}
                      {...descField}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <FormField
                control={form.control}
                name={`announcements.${index}.buttonText`}
                render={({field: buttonTextField}) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Button Text</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Button text (optional)"
                        {...buttonTextField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`announcements.${index}.buttonLink`}
                render={({field: buttonLinkField}) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Button Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Button link URL (optional)"
                        {...buttonLinkField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}

        {showAddAnnouncement ? (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title"
                value={newAnnouncementTitle}
                onChange={(e) => setNewAnnouncementTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Announcement description"
                rows={3}
                value={newAnnouncementDescription}
                onChange={(e) =>
                  setNewAnnouncementDescription(e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Button Text (optional)</Label>
              <Input
                placeholder="e.g., Learn More"
                value={newAnnouncementButtonText}
                onChange={(e) => setNewAnnouncementButtonText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Button Link (optional)</Label>
              <Input
                placeholder="https://example.com"
                value={newAnnouncementButtonLink}
                onChange={(e) => setNewAnnouncementButtonLink(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleAddAnnouncement}
                disabled={!newAnnouncementTitle.trim()}
                className="flex-1"
              >
                Add Announcement
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddAnnouncement(false);
                  setNewAnnouncementTitle("");
                  setNewAnnouncementDescription("");
                  setNewAnnouncementButtonText("");
                  setNewAnnouncementButtonLink("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddAnnouncement(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add announcement
          </Button>
        )}
      </div>
    </div>
  );
};

