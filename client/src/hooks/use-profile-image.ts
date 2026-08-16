import {useMutation} from "@tanstack/react-query";
import {queryClient} from "@/lib/queryClient";
import {useToast} from "@/hooks/use-toast";
import {ImageService} from "@/lib/services/image-service";

interface SetProfileImagePayload {
  imageUrl?: string;
  imageFile?: File;
  headshotId?: number;
}

export function useProfileImage() {
  const {toast} = useToast();

  const setProfileImageMutation = useMutation({
    mutationFn: async ({
      imageUrl,
      imageFile,
      headshotId
    }: SetProfileImagePayload) => {
      if (!imageUrl && !imageFile && !headshotId) {
        throw new Error(
          "Either imageUrl, imageFile, or headshotId must be provided"
        );
      }

      let response;

      if (headshotId) {
        // Handle headshot images by using the ImageService
        response = await ImageService.convertHeadshotToProfileImage(headshotId);
      } else if (imageFile) {
        // Handle file upload to database storage
        const formData = new FormData();
        formData.append("file", imageFile);

        // Upload to db-images endpoint with profile type
        response = await fetch("/api/db-images/upload?type=profile", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error?.message || "Failed to upload profile image to database"
          );
        }

        // Get the database image ID from response
        const imageData = await response.json();

        // Update user profile with the database image reference
        response = await fetch("/api/users/profile/image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({dbImageId: imageData.id})
        });
      } else if (imageUrl) {
        // Handle URL-based image
        response = await fetch("/api/users/profile/image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({imageUrl})
        });
      }

      if (!response || !response.ok) {
        const error = await response?.json();
        throw new Error(error?.message || "Failed to update profile image");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      // Invalidate user-related queries to refresh profile data
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      queryClient.invalidateQueries({
        queryKey: ["/api/users/profile/settings"]
      });
      queryClient.invalidateQueries({queryKey: ["/api/users/profile"]});
      queryClient.invalidateQueries({queryKey: ["/api/badge-profile"]});

      toast({
        title: "Success",
        description: "Profile image updated successfully"
      });
    },
    onError: (error: any) => {
      console.error("[Client] Profile image update error:", error);

      toast({
        title: "Error updating profile image",
        description: error.message || "Failed to update profile image",
        variant: "destructive"
      });
    }
  });

  return {
    setProfileImage: setProfileImageMutation.mutate,
    isUpdating: setProfileImageMutation.isPending
  };
}
