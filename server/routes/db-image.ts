import express, {Request} from "express";
import multer from "multer";
import {dbImageStorage} from "../services/dbImageStorage";
import {requireAuth} from "../auth";

const router = express.Router();

// Configure multer to store files in memory
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Test upload endpoint (no auth required)
router.post(
  "/test-upload",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    try {
      // Ensure response is JSON
      res.set("Content-Type", "application/json");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded"
        });
      }

      const {originalname, mimetype, size, buffer} = req.file;

      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.floor(Math.random() * 1000000000);
      const filename = `test-file-${timestamp}-${randomString}`;

      // Save the image to the database with a test user ID
      const savedImage = await dbImageStorage.saveImage(buffer, {
        filename,
        originalName: originalname,
        mimetype,
        size,
        userId: 999, // Test user ID
        type: (req.query.type as string) || "test"
      });

      // Return success response with the image ID for retrieval
      return res.status(200).json({
        success: true,
        id: savedImage.id,
        filename: savedImage.filename,
        url: `/api/db-images/${savedImage.id}`,
        originalName: savedImage.originalName,
        mimetype: savedImage.mimetype,
        size: savedImage.size
      });
    } catch (error) {
      console.error("[DB Image Test Upload] Error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }
);

// Public upload endpoint for registration process - no authentication required
router.post(
  "/public-upload",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    try {
      // Ensure response is JSON
      res.set("Content-Type", "application/json");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded"
        });
      }

      const {originalname, mimetype, size, buffer} = req.file;

      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.floor(Math.random() * 1000000000);
      const filename = `public-file-${timestamp}-${randomString}`;

      // Save the image to the database with a temporary user ID
      // This will be associated with the real user ID after registration
      const savedImage = await dbImageStorage.saveImage(buffer, {
        filename,
        originalName: originalname,
        mimetype,
        size,
        userId: null, // Will be associated with a user later
        type: "registration"
      });

      // Return success response with the image ID for retrieval
      return res.status(200).json({
        success: true,
        id: savedImage.id,
        filename: savedImage.filename,
        url: `/api/db-images/${savedImage.id}`,
        originalName: savedImage.originalName,
        mimetype: savedImage.mimetype,
        size: savedImage.size
      });
    } catch (error) {
      console.error("[DB Image Public Upload] Error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }
);

// Regular upload endpoint (requires authentication)
router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: express.Response) => {
    try {
      // Ensure response is JSON
      res.set("Content-Type", "application/json");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded"
        });
      }

      const {originalname, mimetype, size, buffer} = req.file;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized"
        });
      }

      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.floor(Math.random() * 1000000000);
      const filename = `file-${timestamp}-${randomString}`;

      // Save the image to the database
      const savedImage = await dbImageStorage.saveImage(buffer, {
        filename,
        originalName: originalname,
        mimetype,
        size,
        userId,
        type: (req.query.type as string) || "general"
      });

      // Return success response with the image ID for retrieval
      return res.status(200).json({
        success: true,
        id: savedImage.id,
        filename: savedImage.filename,
        url: `/api/db-images/${savedImage.id}`,
        originalName: savedImage.originalName,
        mimetype: savedImage.mimetype,
        size: savedImage.size
      });
    } catch (error) {
      console.error("[DB Image Upload] Error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }
);

// Get image endpoint
router.get("/:id", async (req: express.Request, res: express.Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid image ID"
      });
    }

    const image = await dbImageStorage.getImage(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        error: "Image not found"
      });
    }

    // Convert base64 string back to Buffer
    const imageBuffer = Buffer.from(image.data, "base64");

    // Set content type header based on mimetype
    res.set("Content-Type", image.mimetype);

    // Send the image data
    return res.send(imageBuffer);
  } catch (error) {
    console.error("[DB Image Retrieval] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Delete image endpoint
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: express.Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid image ID"
        });
      }

      // Get the image to verify ownership
      const image = await dbImageStorage.getImage(id);

      if (!image) {
        return res.status(404).json({
          success: false,
          error: "Image not found"
        });
      }

      // Ensure the user owns the image
      if (image.userId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          error: "You don't have permission to delete this image"
        });
      }

      // Delete the image
      const deleted = await dbImageStorage.deleteImage(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: "Failed to delete image"
        });
      }

      return res.status(200).json({
        success: true
      });
    } catch (error) {
      console.error("[DB Image Delete] Error:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }
);

export default router;
