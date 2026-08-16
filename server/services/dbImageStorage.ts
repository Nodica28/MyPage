import { db } from "../db";
import { imageStorage, type ImageStorage, type InsertImageStorage } from "@shared/schema";
import { eq } from "drizzle-orm";

export class DbImageStorage {
  /**
   * Save an image to the database
   * @param data Image data as a base64 string
   * @param metadata Image metadata
   * @returns The saved image record
   */
  async saveImage(
    fileData: Buffer | string,
    metadata: Omit<InsertImageStorage, "data">
  ): Promise<ImageStorage> {
    // Convert Buffer to base64 string if needed
    const base64Data = Buffer.isBuffer(fileData)
      ? fileData.toString("base64")
      : fileData;

    const [result] = await db
      .insert(imageStorage)
      .values({
        ...metadata,
        data: base64Data
      })
      .returning();

    return result;
  }

  /**
   * Get an image by ID
   * @param id Image ID
   * @returns The image data or undefined if not found
   */
  async getImage(id: number): Promise<ImageStorage | undefined> {
    const [result] = await db
      .select()
      .from(imageStorage)
      .where(eq(imageStorage.id, id));
    
    return result;
  }

  /**
   * Get images by user ID
   * @param userId User ID
   * @returns Array of images
   */
  async getImagesByUser(userId: number): Promise<ImageStorage[]> {
    return await db
      .select()
      .from(imageStorage)
      .where(eq(imageStorage.userId, userId));
  }

  /**
   * Delete an image by ID
   * @param id Image ID
   * @returns True if deleted successfully
   */
  async deleteImage(id: number): Promise<boolean> {
    const result = await db
      .delete(imageStorage)
      .where(eq(imageStorage.id, id))
      .returning({ id: imageStorage.id });
    
    return result.length > 0;
  }
}

// Create a singleton instance
export const dbImageStorage = new DbImageStorage();