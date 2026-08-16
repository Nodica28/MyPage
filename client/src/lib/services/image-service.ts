import axios from "axios";

/**
 * Service for handling image-related operations
 */
export const ImageService = {
  /**
   * Downloads a headshot image by ID
   * @param headshotId The ID of the headshot to download
   */
  downloadHeadshot: async (headshotId: number): Promise<Blob> => {
    try {
      const response = await axios.get(
        `/api/headshots/download/${headshotId}`,
        {
          responseType: "blob"
        }
      );

      return response.data;
    } catch (error) {
      console.error("Download error:", error);
      throw new Error("Failed to download image");
    }
  },

  /**
   * Downloads a reference image by its asset ID
   * @param assetId The ID of the reference image asset
   */
  downloadReferenceImage: async (assetId: string): Promise<Blob> => {
    try {
      const response = await axios.get(
        `/api/headshots/reference-image/${assetId}`,
        {
          responseType: "blob"
        }
      );

      return response.data;
    } catch (error) {
      console.error("Reference image download error:", error);
      throw new Error("Failed to download reference image");
    }
  },

  /**
   * Converts a headshot to a profile image
   * @param headshotId The ID of the headshot to use as profile image
   */
  convertHeadshotToProfileImage: async (
    headshotId: number
  ): Promise<Response> => {
    try {
      // First get the headshot image as a blob
      const imageBlob = await ImageService.downloadHeadshot(headshotId);

      // Create a File from the blob
      const imageFile = new File([imageBlob], `headshot-${headshotId}.png`, {
        type: "image/png"
      });

      // Upload to db-images first
      const formData = new FormData();
      formData.append("file", imageFile);

      // Upload to database storage with profile type
      const uploadResponse = await fetch("/api/db-images/upload?type=profile", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(
          error?.message || "Failed to upload headshot to database"
        );
      }

      // Get the database image ID
      const imageData = await uploadResponse.json();
      const dbImageId = imageData.id;

      // Update user profile with the database image reference
      return fetch("/api/users/profile/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({dbImageId})
      });
    } catch (error) {
      console.error("Error converting headshot to profile image:", error);
      throw new Error("Failed to use headshot as profile image");
    }
  },

  /**
   * Triggers a file download from a blob
   * @param blob The blob to download
   * @param filename The filename to use
   */
  downloadBlob: (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Opens a file selector dialog and returns the selected file
   * @param accept File types to accept (e.g. "image/*")
   * @returns Promise that resolves to the selected file or null
   */
  selectFile: (accept: string = "image/*"): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0] || null;
        resolve(file);
      };
      input.click();
    });
  }
};
