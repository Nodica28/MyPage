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
import {FileText, Link as LinkIcon, Image, File, X, Plus} from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";

interface ResourcesStepProps {
  form: UseFormReturn<ProfileSetupFormData>;
}

export const ResourcesStep: React.FC<ResourcesStepProps> = ({form}) => {
  const {fields, append, remove} = useFieldArray({
    control: form.control,
    name: "resources"
  });

  const [showAddResource, setShowAddResource] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceDescription, setNewResourceDescription] = useState("");
  const [newResourceType, setNewResourceType] = useState<
    "pdf" | "url" | "image" | "other"
  >("url");
  const [newResourceUrl, setNewResourceUrl] = useState("");

  const handleAddResource = () => {
    if (newResourceTitle.trim() && newResourceUrl.trim()) {
      append({
        id: `resource-${Date.now()}`,
        title: newResourceTitle.trim(),
        description: newResourceDescription.trim() || undefined,
        type: newResourceType,
        url: newResourceUrl.trim(),
        thumbnail: undefined
      });
      setNewResourceTitle("");
      setNewResourceDescription("");
      setNewResourceType("url");
      setNewResourceUrl("");
      setShowAddResource(false);
    }
  };

  const getResourceTypeIcon = (
    type: "pdf" | "url" | "image" | "other"
  ) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "url":
        return <LinkIcon className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Share Your Resources.</h1>
        <p className="text-muted-foreground mt-2">
          Add files, links, or documents that visitors can access — optional.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const resourceType = form.watch(`resources.${index}.type`);

          return (
            <div key={field.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getResourceTypeIcon(resourceType)}
                  <div>
                    <FormField
                      control={form.control}
                      name={`resources.${index}.title`}
                      render={({field: titleField}) => (
                        <FormItem>
                          <FormLabel className="sr-only">Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Resource title"
                              {...titleField}
                              className="font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                name={`resources.${index}.description`}
                render={({field: descField}) => (
                  <FormItem>
                    <FormLabel className="sr-only">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description (optional)"
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
                  name={`resources.${index}.type`}
                  render={({field: typeField}) => (
                    <FormItem className="flex-shrink-0 w-[150px]">
                      <FormLabel className="sr-only">Type</FormLabel>
                      <Select
                        value={typeField.value}
                        onValueChange={(value) =>
                          typeField.onChange(
                            value as "pdf" | "url" | "image" | "other"
                          )
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {getResourceTypeIcon(typeField.value)}
                                {typeField.value}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="url">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-4 w-4" />
                              URL Link
                            </div>
                          </SelectItem>
                          <SelectItem value="pdf">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              PDF
                            </div>
                          </SelectItem>
                          <SelectItem value="image">
                            <div className="flex items-center gap-2">
                              <Image className="h-4 w-4" />
                              Image
                            </div>
                          </SelectItem>
                          <SelectItem value="other">
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4" />
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
                  name={`resources.${index}.url`}
                  render={({field: urlField}) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter resource URL"
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

        {showAddResource ? (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Resource title"
                value={newResourceTitle}
                onChange={(e) => setNewResourceTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description"
                rows={2}
                value={newResourceDescription}
                onChange={(e) => setNewResourceDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newResourceType}
                onValueChange={(value) =>
                  setNewResourceType(value as "pdf" | "url" | "image" | "other")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getResourceTypeIcon(newResourceType)}
                      {newResourceType}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      URL Link
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Image
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="Enter resource URL"
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleAddResource}
                disabled={!newResourceTitle.trim() || !newResourceUrl.trim()}
                className="flex-1"
              >
                Add Resource
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddResource(false);
                  setNewResourceTitle("");
                  setNewResourceDescription("");
                  setNewResourceType("url");
                  setNewResourceUrl("");
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
            onClick={() => setShowAddResource(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add resource
          </Button>
        )}
      </div>
    </div>
  );
};

