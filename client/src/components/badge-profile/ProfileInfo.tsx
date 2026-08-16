import {UserProfile} from "@/types/user";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Loader2, Copy, LinkIcon, Upload} from "lucide-react";
import {useState, useEffect, useRef} from "react";
import {Separator} from "@/components/ui/separator";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Label} from "@/components/ui/label";
import {useToast} from "@/hooks/use-toast";
import {apiRequest} from "@/lib/queryClient";
import {useProfileImage} from "@/hooks/use-profile-image";
import {ImageService} from "@/lib/services/image-service";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  profileImage: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  isSaved: z.boolean().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

export interface ProfileInfoProps {
  userProfile: UserProfile;
  onUpdate: (updatedProfile?: Partial<UserProfile>) => void;
  buttonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export function ProfileInfo({
  userProfile: user,
  onUpdate: onChange,
  buttonVariant = "ghost"
}: ProfileInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const {toast} = useToast();
  // Add a ref to track if we need to update the parent
  const formUpdatedRef = useRef(false);
  const {setProfileImage, isUpdating} = useProfileImage();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      profileImage: user?.profileImage || "",
      title: user?.title || "",
      bio: user?.bio || ""
    }
  });

  // Watch form values for real-time preview updates
  const firstName = form.watch("firstName");
  const lastName = form.watch("lastName");
  const profileImage = form.watch("profileImage");
  const title = form.watch("title");
  const bio = form.watch("bio");

  // Update preview on form field changes - fixed to prevent infinite updates
  useEffect(() => {
    if (isEditing) {
      // Mark that a form field was updated
      formUpdatedRef.current = true;
    }
  }, [firstName, lastName, profileImage, title, bio, isEditing]);

  // Separate effect to actually send updates to the parent, only when needed
  useEffect(() => {
    if (isEditing && formUpdatedRef.current) {
      // Create preview data from current form values
      const previewData: Partial<UserProfile> = {
        firstName,
        lastName,
        profileImage,
        title,
        bio
      };

      // Reset the update flag
      formUpdatedRef.current = false;

      // Pass temporary preview data to parent
      onChange(previewData);
    }
  }, [isEditing, firstName, lastName, profileImage, title, bio, onChange]);

  // When editing is canceled, revert to original values
  useEffect(() => {
    if (!isEditing) {
      // Pass original data back when editing is canceled
      onChange();
    }
  }, [isEditing, onChange]);

  const handleFileUpload = async () => {
    try {
      const file = await ImageService.selectFile("image/*");
      if (file) {
        setSelectedFile(file);

        setProfileImage(
          {imageFile: file},
          {
            onSuccess: (data) => {
              form.setValue("profileImage", data.imageUrl);
              setIsImageModalOpen(false);
            }
          }
        );
      }
    } catch (error) {
      console.error("Error uploading profile image:", error);
    }
  };

  async function onSubmit(data: ProfileFormData) {
    setIsSaving(true);
    try {
      // Update the user profile with the new data
      await apiRequest("/api/badge-profile", {
        method: "PUT",
        body: JSON.stringify({
          // We need to preserve the existing settings structure expected by this endpoint
          // while adding the user profile fields we want to update
          firstName: data.firstName,
          lastName: data.lastName,
          profileImage: data.profileImage,
          title: data.title,
          bio: data.bio
        })
      });

      // Create updated profile data to pass back
      const updatedProfile: Partial<UserProfile> = {
        firstName: data.firstName,
        lastName: data.lastName,
        profileImage: data.profileImage,
        title: data.title,
        bio: data.bio,
        isSaved: true // Add flag to indicate this is a saved update, not just preview
      };

      // Call the onUpdate callback to refresh the data and pass the updated profile
      onChange(updatedProfile);
      setIsEditing(false);

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCancel = () => {
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      profileImage: user?.profileImage || "",
      title: user?.title || "",
      bio: user?.bio || ""
    });
    setIsEditing(false);
    // This will trigger the useEffect above to revert preview to original data
  };

  return (
    <Card className="border-none bg-subtle py-4 px-5 ">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-lg">Personal Info</CardTitle>
        </div>
        <Button
          variant={buttonVariant}
          size="sm"
          className="text-sm"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </Button>
      </CardHeader>
      <Separator className="mb-5 mt-2.5" />
      <CardContent className="p-0">
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex gap-3 items-center col-span-2">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={user?.profileImage || ""}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  className="rounded-full object-cover"
                />
                <AvatarFallback>
                  {user?.firstName?.[0] || ""}
                  {user?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-lg">
                  {user?.firstName} {user?.lastName}
                </h3>
                {user?.title && (
                  <p className="text-sm text-muted-foreground">{user.title}</p>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <h4 className="font-medium text-sm mb-1">Profile Bio</h4>
              <p className="text-sm text-muted-foreground">
                {user?.bio || "No bio provided"}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-1">Public Profile URL</h4>
              <div className="flex flex-row items-center text-sm space-x-1">
                <p className="text-muted-foreground truncate max-w-[200px]">
                  withbadge.ai/{user?.publicPath || "your-name"}
                </p>
                {user?.publicPath && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://app.withbadge.ai/${user.publicPath}`
                      );
                      toast({
                        description: "Copied profile URL to clipboard"
                      });
                    }}
                    className="text-primary hover:text-primary/90"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-1">Email</h4>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={form.watch("profileImage") || ""}
                      alt={`${form.watch("firstName")} ${form.watch("lastName")}`}
                    />
                    <AvatarFallback>
                      {form.watch("firstName")?.[0] || ""}
                      {form.watch("lastName")?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <Dialog
                    open={isImageModalOpen}
                    onOpenChange={setIsImageModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Photo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <Tabs defaultValue="upload" className="w-full mt-7">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="upload">Upload</TabsTrigger>
                          <TabsTrigger value="url">URL</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload">
                          <div className="space-y-4 my-4">
                            <div
                              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={handleFileUpload}
                            >
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                              <p className="text-sm text-muted-foreground mb-2">
                                Click to upload an image from your device
                              </p>
                              {isUpdating ? (
                                <div className="flex justify-center items-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                              ) : selectedFile ? (
                                <p className="text-sm font-medium">
                                  {selectedFile.name}
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileUpload();
                                  }}
                                >
                                  Choose File
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              SVG, PNG, JPG or GIF (max. 5MB)
                            </p>
                          </div>
                        </TabsContent>
                        <TabsContent value="url">
                          <div className="space-y-4 my-4">
                            <div className="space-y-2">
                              <Label htmlFor="imageUrl">Image URL</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="imageUrl"
                                  placeholder="https://example.com/image.jpg"
                                  value={form.watch("profileImage") || ""}
                                  onChange={(e) => {
                                    form.setValue(
                                      "profileImage",
                                      e.target.value,
                                      {
                                        shouldValidate: true
                                      }
                                    );
                                  }}
                                />
                                <Button
                                  disabled={isUpdating}
                                  onClick={() => {
                                    const url = form.watch("profileImage");
                                    if (url) {
                                      setProfileImage(
                                        {imageUrl: url},
                                        {
                                          onSuccess: () => {
                                            setIsImageModalOpen(false);
                                          }
                                        }
                                      );
                                    }
                                  }}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <LinkIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Professional title (e.g., Software Engineer)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a bit about yourself"
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
