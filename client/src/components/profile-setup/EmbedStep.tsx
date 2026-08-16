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
import {
  PlayCircle,
  Presentation,
  Globe,
  FileText,
  ExternalLink,
  X,
  Plus
} from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";

interface EmbedStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
}

export const EmbedStep: React.FC<EmbedStepProps> = ({form}) => {
  const {fields, append, remove} = useFieldArray({
    control: form.control,
    name: "embeds"
  });

  const [showAddEmbed, setShowAddEmbed] = useState(false);
  const [newEmbedTitle, setNewEmbedTitle] = useState("");
  const [newEmbedDescription, setNewEmbedDescription] = useState("");
  const [newEmbedUrl, setNewEmbedUrl] = useState("");
  const [newEmbedType, setNewEmbedType] = useState<
    "video" | "presentation" | "webpage" | "document" | "other"
  >("video");

  const handleAddEmbed = () => {
    if (newEmbedUrl.trim()) {
      append({
        id: `embed-${Date.now()}`,
        title: newEmbedTitle.trim() || undefined,
        description: newEmbedDescription.trim() || undefined,
        embedUrl: newEmbedUrl.trim(),
        embedType: newEmbedType,
        embedCode: undefined
      });
      setNewEmbedTitle("");
      setNewEmbedDescription("");
      setNewEmbedUrl("");
      setNewEmbedType("video");
      setShowAddEmbed(false);
    }
  };

  const getEmbedTypeIcon = (
    type: "video" | "presentation" | "webpage" | "document" | "other"
  ) => {
    switch (type) {
      case "video":
        return <PlayCircle className="h-4 w-4" />;
      case "presentation":
        return <Presentation className="h-4 w-4" />;
      case "webpage":
        return <Globe className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Embeds.</h1>
        <p className="text-muted-foreground mt-2">
          Embed videos, presentations, or web content — optional.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const embedType = form.watch(`embeds.${index}.embedType`);

          return (
            <div key={field.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getEmbedTypeIcon(embedType || "other")}
                  <FormField
                    control={form.control}
                    name={`embeds.${index}.title`}
                    render={({field: titleField}) => (
                      <FormItem className="flex-1">
                        <FormLabel className="sr-only">Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Embed title (optional)"
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
                name={`embeds.${index}.description`}
                render={({field: descField}) => (
                  <FormItem>
                    <FormLabel className="sr-only">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description (optional)"
                        rows={2}
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
                  name={`embeds.${index}.embedType`}
                  render={({field: typeField}) => (
                    <FormItem className="flex-shrink-0 w-[150px]">
                      <FormLabel className="sr-only">Type</FormLabel>
                      <Select
                        value={typeField.value || "video"}
                        onValueChange={(value) =>
                          typeField.onChange(
                            value as
                              | "video"
                              | "presentation"
                              | "webpage"
                              | "document"
                              | "other"
                          )
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {getEmbedTypeIcon(
                                  (typeField.value as any) || "video"
                                )}
                                {typeField.value || "video"}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">
                            <div className="flex items-center gap-2">
                              <PlayCircle className="h-4 w-4" />
                              Video
                            </div>
                          </SelectItem>
                          <SelectItem value="presentation">
                            <div className="flex items-center gap-2">
                              <Presentation className="h-4 w-4" />
                              Presentation
                            </div>
                          </SelectItem>
                          <SelectItem value="webpage">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Webpage
                            </div>
                          </SelectItem>
                          <SelectItem value="document">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Document
                            </div>
                          </SelectItem>
                          <SelectItem value="other">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Other
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`embeds.${index}.embedUrl`}
                  render={({field: urlField}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Embed URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter embed URL"
                          {...urlField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          );
        })}

        {showAddEmbed ? (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                placeholder="Embed title"
                value={newEmbedTitle}
                onChange={(e) => setNewEmbedTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description"
                rows={2}
                value={newEmbedDescription}
                onChange={(e) => setNewEmbedDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newEmbedType}
                onValueChange={(value) =>
                  setNewEmbedType(
                    value as
                      | "video"
                      | "presentation"
                      | "webpage"
                      | "document"
                      | "other"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getEmbedTypeIcon(newEmbedType)}
                      {newEmbedType}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="presentation">
                    <div className="flex items-center gap-2">
                      <Presentation className="h-4 w-4" />
                      Presentation
                    </div>
                  </SelectItem>
                  <SelectItem value="webpage">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Webpage
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Embed URL</Label>
              <Input
                placeholder="Enter embed URL"
                value={newEmbedUrl}
                onChange={(e) => setNewEmbedUrl(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleAddEmbed}
                disabled={!newEmbedUrl.trim()}
                className="flex-1"
              >
                Add Embed
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddEmbed(false);
                  setNewEmbedTitle("");
                  setNewEmbedDescription("");
                  setNewEmbedUrl("");
                  setNewEmbedType("video");
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
            onClick={() => setShowAddEmbed(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add embed
          </Button>
        )}
      </div>
    </div>
  );
};

