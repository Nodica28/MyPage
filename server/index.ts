import express, {type Request, Response} from "express";
import {setupVite, log} from "./vite.js";
import path, {dirname} from "path";
import fs from "fs";
import {createServer} from "http";
import {registerRoutes} from "./routes.ts";
import * as dotenv from "dotenv";
import multer from "multer";
import {dbImageStorage} from "./services/dbImageStorage";
import {fileURLToPath} from "url";

// Define __dirname since it's not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the built client directory across local-prod (dist/index.js + dist/public)
// and serverless (project-root/dist/public) layouts.
function resolvePublicDir(): string {
  const candidates = [
    path.join(__dirname, "public"),
    path.join(process.cwd(), "dist", "public")
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      // ignore and try the next candidate
    }
  }
  return candidates[0];
}

// Load environment variables
dotenv.config();

// Initialize performance tracking
const startTime = Date.now();
let lastCheckpoint = startTime;

function logTiming(step: string) {
  const now = Date.now();
  const sinceLast = now - lastCheckpoint;
  const total = now - startTime;
  log(`[Timing] ${step}: +${sinceLast}ms (total: ${total}ms)`);
  lastCheckpoint = now;
}

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = [
    {
      name: "DATABASE_URL",
      description: "PostgreSQL database connection string"
    },
    {
      name: "OPENAI_API_KEY",
      description: "OpenAI API key for chat functionality",
      optional: true
    },
    {
      name: "RENDERNET_API_KEY",
      description: "RenderNet API key for image generation",
      optional: true
    }
  ];

  const missingVars = requiredVars.filter(
    ({name, optional}) => !process.env[name] && !optional
  );

  if (missingVars.length > 0) {
    const errorMessage = `
Missing required environment variables:
${missingVars.map((v) => `- ${v.name}: ${v.description}`).join("\n")}

Please ensure all required environment variables are set before starting the application.
For production deployment, set these in your deployment environment.
`;
    log("[CRITICAL] Environment validation failed:");
    log(errorMessage);
    return false;
  }

  if (!process.env.OPENAI_API_KEY) {
    log(
      "[Warning] OPENAI_API_KEY not set - chat functionality will be disabled"
    );
    // Don't set a dummy key, let the chat handlers handle the missing key gracefully
  }

  if (!process.env.RENDERNET_API_KEY) {
    log("[Warning] RENDERNET_API_KEY not set - some features will be limited");
  }

  log("[Startup] Environment validation successful");
  return true;
}

// Create Express app
const app = express();
logTiming("Express app created");

// Validate environment before proceeding (don't hard-exit on serverless/Vercel).
if (!validateEnvironment() && !process.env.VERCEL) {
  log("[CRITICAL] Server startup aborted due to missing environment variables");
  process.exit(1);
}

// Health check endpoint - must be registered early
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime
  });
  log("[Health] Health check endpoint accessed");
});

// Essential middleware
app.use(
  express.json({
    limit: "100mb",
    verify: (req: Request, res: Response, buf: Buffer) => {
      // Skip JSON verification for multipart form data (used in file uploads)
      const contentType = req.headers["content-type"] || "";

      // Skip validation for non-JSON content types, particularly multipart/form-data
      if (
        !contentType.includes("application/json") ||
        contentType.includes("multipart/form-data")
      ) {
        return;
      }

      // An empty body is valid for bodyless POSTs (e.g. logout) — nothing to verify.
      if (!buf || buf.length === 0) {
        return;
      }

      // Only proceed with JSON validation for application/json
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        log("[Server] Invalid JSON in request body:", String(e));
        throw new Error("Invalid JSON payload");
      }
    }
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100mb"
  })
);

// Configure for large file uploads with better error handling
app.use((req, res, next) => {
  const MAX_TIMEOUT = 300000; // 5 minutes
  const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

  req.setTimeout(MAX_TIMEOUT, () => {
    log(`[Timeout] Request timed out after ${MAX_TIMEOUT}ms`);
    if (!res.headersSent) {
      res.status(408).json({error: "Request timeout"});
    }
  });

  res.setTimeout(MAX_TIMEOUT, () => {
    log(`[Timeout] Response timed out after ${MAX_TIMEOUT}ms`);
    if (!res.headersSent) {
      res.status(503).json({error: "Service unavailable"});
    }
  });

  if (req.method === "POST" && req.headers["content-length"]) {
    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > MAX_UPLOAD_SIZE) {
      const mbSize = (contentLength / (1024 * 1024)).toFixed(2);
      log(`[Upload] Large file upload rejected: ${mbSize}MB`);
      return res.status(413).json({error: "File too large"});
    }
  }

  next();
});
logTiming("Basic middleware configured");

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, {recursive: true});
    log("[Setup] Created uploads directory");
  }
  log("[Setup] Uploads directory configured");
} catch (error) {
  log("[ERROR] Failed to configure uploads directory:", String(error));
}

// Create a dedicated router just for file uploads
const uploadRouter = express.Router();

// Configure multer memory storage for database uploads
const memoryStorage = multer.memoryStorage();

// Unified file upload endpoint - handles all file types with appropriate validation
uploadRouter.post("/upload", (req, res) => {
  // Force the response content type to application/json
  res.set("Content-Type", "application/json");

  // Get file type from query parameter or default to "any"
  const fileType = (req.query.type as string) || "any";

  // Configure upload based on file type
  let fileConfig = {
    limits: {fileSize: 10 * 1024 * 1024}, // Default 10MB limit
    fileFilter: undefined as any
  };

  // Configure based on file type
  switch (fileType) {
    case "background":
      // Background images: smaller size limit, only images
      fileConfig = {
        limits: {fileSize: 5 * 1024 * 1024}, // 5MB for backgrounds
        fileFilter: (req: any, file: any, cb: any) => {
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
          );
          cb(error);
        }
      };
      break;

    case "image":
      // Regular images: medium size limit, only images
      fileConfig = {
        limits: {fileSize: 10 * 1024 * 1024}, // 10MB for regular images
        fileFilter: (req: any, file: any, cb: any) => {
          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/svg+xml",
            "image/webp",
            "image/heic",
            "image/heif"
          ];

          if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
          }

          const error = new Error("Only image files are allowed");
          cb(error);
        }
      };
      break;

    case "document":
      // Documents: larger size limit, only document types
      fileConfig = {
        limits: {fileSize: 50 * 1024 * 1024}, // 50MB for documents
        fileFilter: (req: any, file: any, cb: any) => {
          const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "text/markdown"
          ];

          if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
          }

          const error = new Error("Only document files are allowed");
          cb(error);
        }
      };
      break;

    // Add more file type configurations as needed

    default:
      // Any file type: no special validation
      fileConfig = {
        limits: {fileSize: 100 * 1024 * 1024}, // 100MB generic limit
        fileFilter: undefined
      };
  }

  // Create and use the configured upload middleware with memory storage
  const upload = multer({
    storage: memoryStorage, // Using memory storage to save to database
    limits: fileConfig.limits,
    fileFilter: fileConfig.fileFilter
  }).single("file");

  upload(req, res, async (err) => {
    if (err) {
      console.error(`[Upload:${fileType}] Error:`, err);
      return res.status(400).send(
        JSON.stringify({
          success: false,
          error: err.message || "Upload failed"
        })
      );
    }

    if (!req.file) {
      console.error(`[Upload:${fileType}] No file found in request`);
      return res.status(400).send(
        JSON.stringify({
          success: false,
          error: "No file uploaded"
        })
      );
    }

    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.floor(Math.random() * 1000000000);
      const ext = path.extname(req.file.originalname);
      const filename = `file-${timestamp}-${randomString}${ext}`;

      // Get the user ID if available from the request
      const userId = req.user?.id || null;

      // Save the file to the database
      const {originalname, mimetype, size, buffer} = req.file;
      const savedImage = await dbImageStorage.saveImage(buffer, {
        filename,
        originalName: originalname,
        mimetype,
        size,
        userId,
        type: fileType
      });

      // The URL for the image will now be the database image endpoint
      const fileUrl = `/api/db-images/${savedImage.id}`;
      console.log(
        `[Upload:${fileType}] File uploaded successfully to database:`,
        fileUrl
      );

      // Send the JSON response
      return res.status(200).send(
        JSON.stringify({
          success: true,
          url: fileUrl,
          id: savedImage.id,
          originalName: savedImage.originalName,
          mimetype: savedImage.mimetype,
          size: savedImage.size
        })
      );
    } catch (error) {
      console.error(`[Upload:${fileType}] Database storage error:`, error);
      return res.status(500).send(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Database storage failed"
        })
      );
    }
  });
});

// For backward compatibility, register aliases to the unified endpoint
// These simply redirect to the main endpoint with the appropriate type
uploadRouter.post("/raw-upload", (req, res, next) => {
  req.query.type = "any";
  // Forward to the /upload endpoint
  req.url = "/upload";
  next();
});

uploadRouter.post("/background-upload", (req, res, next) => {
  req.query.type = "background";
  // Forward to the /upload endpoint
  req.url = "/upload";
  next();
});

uploadRouter.post("/upload-simple", (req, res, next) => {
  req.query.type = "any";
  // Forward to the /upload endpoint
  req.url = "/upload";
  next();
});

// Register the upload router BEFORE the main middleware stack
app.use("/api", uploadRouter);
log("[Setup] Unified upload endpoint registered");

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadsPath));
logTiming("Static file serving configured");

// API Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    log(`[API ${requestId}] ${req.method} ${req.path} started`);
    log(`[API ${requestId}] Headers: ${JSON.stringify(req.headers)}`);

    if (req.method !== "GET") {
      // Skip logging body for multipart/form-data to avoid issues with file uploads
      const contentType = req.headers["content-type"] || "";
      if (!contentType.includes("multipart/form-data")) {
        log(`[API ${requestId}] Request body: ${JSON.stringify(req.body)}`);
      } else {
        log(
          `[API ${requestId}] Request body: [multipart form data - body logging skipped]`
        );
      }
    }

    // Capture original send
    const originalSend = res.send;
    res.send = function (data) {
      // Only try to log JSON responses
      if (typeof data === "object") {
        try {
          // Check if data contains Buffer objects and truncate them
          const safeData = JSON.parse(
            JSON.stringify(data, (key, value) => {
              if (
                value &&
                value.type === "Buffer" &&
                Array.isArray(value.data)
              ) {
                return `[Buffer: ${value.data.length} bytes]`;
              }
              return value;
            })
          );
          log(`[API ${requestId}] Response body: ${JSON.stringify(safeData)}`);
        } catch (error) {
          console.error(
            "[API Logging] Error stringifying response data:",
            error
          );
          log(
            `[API ${requestId}] Response body: [Could not stringify response data]`
          );
        }
      } else if (typeof data === "string") {
        // For string responses, log safely with length info if too long
        const truncatedData =
          data.length > 200 ? data.substring(0, 200) + "..." : data;
        log(
          `[API ${requestId}] Response body: ${truncatedData} (${data.length} bytes)`
        );
      } else {
        log(`[API ${requestId}] Response body: [non-string, non-object data]`);
      }

      // Convert to array and call apply to avoid TypeScript error
      return originalSend.call(res, data);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      log(
        `[API ${requestId}] ${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`
      );
    });
  }
  next();
});
logTiming("API logging middleware configured");

async function startServer({
  listen = true,
  retries = 5,
  delay = 1000
}: {listen?: boolean; retries?: number; delay?: number} = {}) {
  try {
    log("[Startup] Starting server initialization...");

    // Create HTTP server first
    const server = createServer(app);
    log("[Setup] HTTP server created");

    // Register API routes
    log("[Routes] Registering API routes...");
    await registerRoutes(app);
    logTiming("API routes registered");

    // Setup Vite middleware for development only
    const isTestingNoVite = process.env.TEST_NO_VITE === "true";
    const isProduction = process.env.NODE_ENV === "production";

    if (!isTestingNoVite && !isProduction && !process.env.VERCEL && listen) {
      log("[Setup] Starting Vite middleware setup...");
      const viteSetupStart = Date.now();
      try {
        await setupVite(app, server);
        const viteSetupDuration = Date.now() - viteSetupStart;
        log(
          `[Setup] Vite middleware setup completed successfully in ${viteSetupDuration}ms`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        log("[CRITICAL] Error setting up Vite middleware:", errorMessage);
        throw error;
      }
    } else {
      log(
        `[Setup] Skipping Vite middleware setup for ${isProduction ? "production" : "testing"}`
      );
    }
    // Serve static files in production (and on Vercel).
    if (isProduction || process.env.VERCEL) {
      const staticPath = resolvePublicDir();
      app.use(express.static(staticPath));
      log("[Setup] Static file serving configured for production");

      // Add a catch-all route handler for client-side routing in production
      // This needs to be registered after API routes but before the error handler
      app.get("*", async (req, res) => {
        // Skip API routes
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({error: "API endpoint not found"});
        }

        // Serve index.html, but inject OG/Twitter meta for public profile routes
        const indexPath = path.join(resolvePublicDir(), "index.html");
        try {
          let html = await fs.promises.readFile(indexPath, "utf-8");

          const pathOnly = req.path.split("?")[0];
          const isReserved = [
            "/",
            "/auth",
            "/logout",
            "/register",
            "/start",
            "/join-company",
            "/settings",
            "/headshots",
            "/headshot-generator",
            "/badge-profile",
            "/brand-assets",
            "/leads",
            "/support"
          ].some((p) => pathOnly === p || pathOnly.startsWith(p + "/"));
          const looksLikeStatic =
            pathOnly.includes(".") ||
            pathOnly.startsWith("/assets/") ||
            pathOnly.startsWith("/uploads/") ||
            pathOnly.startsWith("/icons/") ||
            pathOnly.startsWith("/public/") ||
            pathOnly.startsWith("/start-images/") ||
            pathOnly.startsWith("/backgrounds/") ||
            pathOnly.startsWith("/placeholder/");

          if (!isReserved && !looksLikeStatic) {
            const publicPath = pathOnly.replace(/^\//, "");
            const apiUrl = `${req.protocol}://${req.get("host")}/api/users/badge-profile/${publicPath}`;
            try {
              const resp = await fetch(apiUrl as any);
              if (resp.ok) {
                const data: any = await resp.json();
                const user = data?.userProfile || {};
                const org = data?.organization || null;
                const fullName = [user.firstName, user.lastName]
                  .filter(Boolean)
                  .join(" ");
                const title = user.title
                  ? `${fullName} — ${user.title}`
                  : fullName || "Badge Profile";
                const description =
                  user.bio ||
                  (org?.name
                    ? `Connect with ${fullName} at ${org.name}.`
                    : "Connect with me on my Badge profile.");
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                const imageUrl = user.profileImage
                  ? user.profileImage.startsWith("http")
                    ? user.profileImage
                    : `${baseUrl}${user.profileImage}`
                  : `${baseUrl}/placeholder/placeholder-avatar.jpg`;
                const canonical = `${baseUrl}/${user.publicPath || publicPath}`;

                const escapeHtml = (input: string) =>
                  String(input).replace(/[&<>"']/g, (ch) => {
                    switch (ch) {
                      case "&":
                        return "&amp;";
                      case "<":
                        return "&lt;";
                      case ">":
                        return "&gt;";
                      // eslint-disable-next-line quotes
                      case '"':
                        return "&quot;";
                      case "'":
                        return "&#39;";
                      default:
                        return ch;
                    }
                  });

                const ogTags = `
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Badge" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
                `;
                html = html.replace("</head>", `${ogTags}\n</head>`);
              }
            } catch {
              // no-op in prod, fall through to default html
            }
          }

          res.setHeader("Content-Type", "text/html");
          res.send(html);
        } catch {
          // Fallback to sending file if anything fails
          res.sendFile(indexPath);
        }
      });
      log("[Setup] Client-side routing handler configured for production");
    }

    logTiming("Server middleware setup complete");

    // Global error handler
    app.use((err: Error & {status?: number}, req: Request, res: Response) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";

      log(`[ERROR] ${status} - ${message}`);
      if (err.stack) {
        log(`[ERROR] Stack trace: ${err.stack}`);
      }

      if (req.path.startsWith("/api/")) {
        res.status(status).json({error: message});
      } else {
        res.status(status).send(message);
      }
    });
    logTiming("Error handling configured");

    // On serverless/Vercel the platform owns the listener — configure only.
    if (!listen) {
      logTiming("App configured (no listen)");
      return;
    }

    // Start the server (local / long-running process)
    return await new Promise<void>((resolve, reject) => {
      const PORT = process.env.PORT || 5000;
      log(`[Startup] Attempting to bind to port ${PORT}...`);

      server
        .listen(
          {
            port: PORT,
            host: "0.0.0.0",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
              "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            proxy: true,
            secure: process.env.NODE_ENV === "production"
          },
          () => {
            const totalStartupTime = Date.now() - startTime;
            log(
              `[Startup] Server successfully bound and listening on port ${PORT}`
            );
            log(`[Startup] Total startup time: ${totalStartupTime}ms`);
            logTiming("Server startup complete");
            resolve();
          }
        )
        .on("error", (error: Error & {code?: string}) => {
          if (error.code === "EADDRINUSE") {
            log(`[CRITICAL] Port ${PORT} is already in use`);
          } else {
            log(`[CRITICAL] Server startup error: ${error.message}`);
          }
          reject(error);
        });
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log(`[CRITICAL] Fatal error during server startup: ${err.message}`);
    if (err.stack) {
      log(`[CRITICAL] Error stack trace: ${err.stack}`);
    }

    if (retries > 0) {
      log(
        `[Startup] Retrying server startup in ${delay}ms... (${retries} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return startServer({listen, retries: retries - 1, delay: delay * 2});
    }
    throw err;
  }
}

// Local / long-running process: start listening. Skipped on Vercel, where the
// platform invokes the exported app as a serverless function (see api/index.ts).
if (!process.env.VERCEL) {
  log("[Startup] Beginning server startup sequence");
  startServer().catch((error) => {
    log(`[CRITICAL] Server failed to start: ${error}`);
    process.exit(1);
  });
}

// Memoized accessor used by the serverless entrypoint to get a fully-configured app.
let appReadyPromise: Promise<void> | null = null;
export async function getApp() {
  if (!appReadyPromise) {
    appReadyPromise = startServer({listen: false});
  }
  await appReadyPromise;
  return app;
}

export {app};
