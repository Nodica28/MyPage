import express, {Router} from "express";
import multer from "multer";
import {insertContentSchema, type Content} from "@shared/types/content";
import {db} from "../db";
import {content} from "@shared/schema";
import {eq, and} from "drizzle-orm";
import path from "path";
import fs from "fs";
import type {User} from "@shared/types/user";
import {
  createApiError,
  ErrorCodes,
  handleFileUploadError,
  handleValidationError,
  asyncHandler
} from "../utils/error-handler";

const router = Router();
// Configure multer for file uploads
const uploadsPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, {recursive: true});
}

// Define allowed MIME types and their extensions
const ALLOWED_MIME_TYPES: {[key: string]: string[]} = {
  // Image formats
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
  "image/gif": [".gif"],
  "image/svg+xml": [".svg"],

  // Document formats
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx"
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx"
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx"
  ],

  // Text formats
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "text/markdown": [".md"],

  // Archive formats
  "application/zip": [".zip"],
  "application/x-rar-compressed": [".rar"],

  // Video formats (for embed section)
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
  "video/webm": [".webm"],

  // Audio formats
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/ogg": [".ogg"]
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED_MIME_TYPES[file.mimetype] || [];

    // Use original extension if it matches allowed extensions, otherwise use first allowed extension
    let finalExt = ".jpg"; // Default
    if (Array.isArray(allowedExts) && allowedExts.indexOf(ext) >= 0) {
      finalExt = ext;
    } else if (Array.isArray(allowedExts) && allowedExts.length > 0) {
      finalExt = allowedExts[0];
    }
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();

    const uniqueName = `${timestamp}-${baseName}${finalExt}`;
    cb(null, uniqueName);
  }
});

interface UploadError extends Error {
  code?: string;
}

// Error handling middleware is now centralized in utils/error-handler.ts

// Enhanced type-safe request interface
interface RequestWithUser extends express.Request {
  user?: User;
}

// Content cache interface
interface ContentCache {
  data: Content[];
  timestamp: number;
}

// Content cache with proper typing and timestamp
const contentCache = new Map<number, ContentCache>();
const CONTENT_CACHE_TTL = 60 * 1000; // 1 minute

// Helper to get cached content with error handling and cache validation
async function getContentWithCache(userId: number): Promise<Content[]> {
  try {
    const cached = contentCache.get(userId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CONTENT_CACHE_TTL) {
      return cached.data;
    }

    const userContent = await db
      .select()
      .from(content)
      .where(eq(content.userId, userId))
      .orderBy(content.order);

    contentCache.set(userId, {
      data: userContent,
      timestamp: now
    });

    return userContent;
  } catch (error) {
    contentCache.delete(userId);
    console.error("Error fetching content for user:", error);
    throw createApiError(
      "Failed to retrieve content",
      500,
      ErrorCodes.DATABASE_ERROR,
      `Error fetching content for user ${userId}`
    );
  }
}

function invalidateCache(userId: number): void {
  try {
    contentCache.delete(userId);
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

// Authentication middleware
// Import the centralized authentication middleware
import {requireAuth} from "../auth";

// Simple file uploader for direct API calls
const simpleUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.floor(Math.random() * 1000000000);
    const ext = path.extname(file.originalname);
    cb(null, `file-${timestamp}-${randomString}${ext}`);
  }
});

const simpleUpload = multer({
  storage: simpleUploadStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    fieldSize: 15 * 1024 * 1024 // 15MB field size limit
  }
}).single("file");

// Create direct upload endpoint with absolute minimal processing
router.post(
  "/api/upload-simple",
  requireAuth,
  (req: RequestWithUser, res: express.Response) => {
    // We need to disable the Vite middleware for this route
    // This approach bypasses Express's content negotiation completely

    // Use the minimal multer setup
    simpleUpload(req, res, (err) => {
      // Explicitly set JSON content type BEFORE anything else
      res.set("Content-Type", "application/json");

      if (err) {
        console.error("[Simple Upload Error]", err);
        return res.status(400).send(
          JSON.stringify({
            success: false,
            error: err.message
          })
        );
      }

      if (!req.file) {
        console.error("[Simple Upload] No file found in request");
        return res.status(400).send(
          JSON.stringify({
            success: false,
            error: "No file uploaded"
          })
        );
      }

      // Create a simple response
      const fileUrl = `/uploads/${req.file.filename}`;
      console.log("[Simple Upload] File uploaded successfully:", fileUrl);

      // Return a very simple JSON response
      const jsonResponse = JSON.stringify({
        success: true,
        url: fileUrl
      });

      return res.status(200).send(jsonResponse);
    });
  }
);

// Create a custom uploader that bypasses Express's default content negotiation
const customUploader = (req: express.Request, res: express.Response) => {
  return new Promise<any>((resolve, reject) => {
    try {
      // We use single() here, not any() as before - to get the right type
      const uploadHandler = multer({
        storage,
        limits: {
          fileSize: MAX_FILE_SIZE,
          fieldSize: 10 * 1024 * 1024,
          parts: 20,
          fields: 15
        },
        fileFilter: (req, file, cb) => {
          try {
            console.log(
              `[Upload] File upload attempt: ${file.originalname}, type: ${file.mimetype}`
            );

            if (file.mimetype in ALLOWED_MIME_TYPES) {
              cb(null, true);
            } else {
              const error = new Error(
                `Invalid file type: ${file.mimetype}`
              ) as UploadError;
              error.code = "INVALID_FILE_TYPE";
              cb(error);
            }
          } catch (error) {
            cb(error as Error);
          }
        }
      }).single("file");

      uploadHandler(req, res, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(req.file);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Upload file with enhanced error handling and proper middleware handling
router.post(
  "/api/upload",
  requireAuth,
  async (req: RequestWithUser, res: express.Response) => {
    // Force JSON content type at the beginning
    res.setHeader("Content-Type", "application/json");

    try {
      // Set a generous timeout for large file uploads
      req.setTimeout(600000); // 10 minutes
      res.setTimeout(600000); // 10 minutes

      console.log(
        `[Upload] Starting file upload, content type: ${req.headers["content-type"]}, size: ${req.headers["content-length"] || "unknown"} bytes`
      );

      // Use our Promise-based uploader
      const fileData = await customUploader(req, res);

      if (!fileData) {
        console.error("[Upload Error] No file data found in request");
        return handleFileUploadError(res, "No file uploaded", "NO_FILE");
      }

      console.log("fileData", fileData);

      const fileUrl = `/uploads/${fileData.filename}`;
      if (req.user && req.user.id) {
        invalidateCache(req.user.id);
      }

      const fileSizeInMB = (fileData.size / (1024 * 1024)).toFixed(2);
      console.log(
        `[Upload Success] File "${fileData.originalname}" (${fileSizeInMB}MB) uploaded successfully to ${fileUrl}`
      );

      // Configure response with explicit JSON
      res.setHeader("Content-Type", "application/json");
      res.contentType("application/json");

      // Create our JSON response
      const jsonResponse = JSON.stringify({
        url: fileUrl,
        originalName: fileData.originalname,
        size: fileData.size,
        mimetype: fileData.mimetype
      });

      // Send a 200 response with ONLY our json response, no HTML
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(jsonResponse)
      });

      res.end(jsonResponse);
    } catch (error: any) {
      console.error("[Upload Error]", error);
      // Force the proper content-type again
      res.setHeader("Content-Type", "application/json");
      res.contentType("application/json");

      // Handle specific error types
      if (error instanceof multer.MulterError) {
        return handleFileUploadError(res, error.message, error.code);
      }

      return handleFileUploadError(
        res,
        error.message || "Upload failed",
        error.code || "UPLOAD_ERROR"
      );
    }
  }
);

// Public upload endpoint for registration process - no authentication required
// REMOVED: This functionality is now handled by /api/db-images/public-upload

// Create a dedicated endpoint for background image uploads
router.post(
  "/api/background-upload",
  requireAuth,
  (req: RequestWithUser, res: express.Response) => {
    // Explicitly set JSON content type
    res.set("Content-Type", "application/json");

    // Use the minimal multer setup but with specific validation for backgrounds
    const backgroundUpload = multer({
      storage: simpleUploadStorage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for backgrounds
        fieldSize: 5 * 1024 * 1024
      },
      fileFilter: (req, file, cb) => {
        // Only allow image file types
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/svg+xml"
        ];

        if (allowedTypes.includes(file.mimetype)) {
          return cb(null, true);
        }

        const error = new Error(
          "Only JPEG, PNG, GIF, and SVG files are allowed"
        ) as UploadError;
        error.code = "INVALID_FILE_TYPE";
        cb(error);
      }
    }).single("file");

    backgroundUpload(req, res, (err) => {
      if (err) {
        console.error("[Background Upload Error]", err);
        return res.status(400).send(
          JSON.stringify({
            success: false,
            error: err.message
          })
        );
      }

      if (!req.file) {
        console.error("[Background Upload] No file found in request");
        return res.status(400).send(
          JSON.stringify({
            success: false,
            error: "No file uploaded"
          })
        );
      }

      // Process the image before returning response
      const fileUrl = `/uploads/${req.file.filename}`;
      console.log("[Background Upload] File uploaded successfully:", fileUrl);

      // Return the response
      const jsonResponse = JSON.stringify({
        success: true,
        url: fileUrl,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      return res.status(200).send(jsonResponse);
    });
  }
);

// Get user's content with caching
router.get(
  "/api/content",
  requireAuth,
  asyncHandler(async (req: RequestWithUser, res: express.Response) => {
    // Ensure user ID is defined before passing to getContentWithCache
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({error: "User not authenticated"});
    }

    const userContent = await getContentWithCache(userId);
    res.json(userContent);
  })
);

// Create new content
router.post(
  "/api/content",
  requireAuth,
  asyncHandler(async (req: RequestWithUser, res: express.Response) => {
    try {
      const contentData = {
        ...req.body,
        userId: req.user?.id,
        isPublic: req.body.isPublic ?? true,
        content: {
          ...req.body.content,
          fileUrl: req.body.content?.url || req.body.content?.fileUrl
        }
      };

      const validatedData = insertContentSchema.parse(contentData);

      const [result] = await db
        .insert(content)
        .values(validatedData)
        .returning();

      // Ensure user ID is defined before invalidating cache
      if (req.user?.id !== undefined) {
        invalidateCache(req.user.id);
      }

      res.json(result);
    } catch (error: any) {
      if (error && error.name === "ZodError") {
        return handleValidationError(
          res,
          "Invalid content data",
          error.message || JSON.stringify(error)
        );
      }
      throw error; // Let the asyncHandler handle other errors
    }
  })
);

// Get public content by userId
router.get(
  "/api/content/:userId",
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return handleValidationError(res, "Invalid user ID", "INVALID_USER_ID");
    }

    const userContent = await db
      .select()
      .from(content)
      .where(and(eq(content.userId, userId), eq(content.isPublic, true)))
      .orderBy(content.order);

    res.json(userContent);
  })
);

// Error handling is now managed by the global error middleware in routes.ts

export default router;
