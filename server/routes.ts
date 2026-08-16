import express, {type Express, Request, Response, NextFunction} from "express";
import {createServer, type Server} from "http";
import path from "path";
import {setupAuth} from "./auth.ts";
import userRouter from "./routes/users.ts";
import contentRouter from "./routes/content.ts";
import headshotsRouter from "./routes/headshots.ts";
import {router as organizationRouter} from "./routes/organization.ts"; // Added import for organization routes
import badgeProfileRouter from "./routes/badge-profile.ts"; // Added import for badge profile routes
import {router as chatRouter} from "./routes/chat.ts"; // Import for chat API routes
import leadgenRouter from "./routes/leadgen.ts"; // Import for leadgen routes
import dbImageRouter from "./routes/db-image"; // Import for database image storage routes
import userOrganizationsRouter from "./routes/user-organizations.ts"; // Import for user-organizations routes
import teamMembersRouter from "./routes/team-members.ts"; // Import for team members routes
import invitationsRouter from "./routes/invitations"; // Import for invitations routes
import paymentsRouter from "./routes/payments.ts"; // Import for payments and billing
import {apiErrorHandler} from "./utils/error-handler.ts";
import supportRouter from "./routes/support.ts"; // Support contact form
import {truncateForLogging} from "./utils/logging.ts";
import {db} from "./db.ts";
import {users} from "@shared/schema";
import {eq, sql} from "drizzle-orm";
import adminRouter from "./routes/admin.ts";

// Middleware to ensure JSON responses for API routes
export const ensureJSONResponse = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("[Routes] Starting route registration...");

  try {
    // Add JSON response middleware first
    app.use(ensureJSONResponse);

    // Setup authentication
    console.log("[Routes] Setting up authentication...");
    setupAuth(app);
    console.log("[Routes] Authentication setup complete");

    // Register user routes
    console.log("[Routes] Registering user routes...");
    app.use("/api/users", userRouter);

    // Register support routes
    console.log("[Routes] Registering support routes...");
    app.use("/api/support", supportRouter);
    console.log("[Routes] Support routes registered");

    // Register debug routes directly for easier access during development
    app.get("/api/debug/user-session", (req: Request, res: Response) => {
      try {
        console.log("[Debug API] User object:", truncateForLogging(req.user));
        console.log(
          "[Debug API] Session object:",
          truncateForLogging(req.session)
        );

        // Get all possible user ID sources
        const passportUserId = req.session?.passport?.user;
        const userObjectId = req.user ? req.user.id : undefined;

        console.log(
          "[Debug API] Passport user ID:",
          passportUserId,
          "Type:",
          typeof passportUserId
        );
        console.log(
          "[Debug API] User object ID:",
          userObjectId,
          "Type:",
          typeof userObjectId
        );

        if (!req.user && !passportUserId) {
          return res.status(401).json({error: "Not authenticated"});
        }

        // Extract all methods of getting user ID
        const userIdFromObjectAsNumber = userObjectId
          ? Number(userObjectId)
          : undefined;

        return res.json({
          authenticated: true,
          session: {
            exists: !!req.session,
            hasPassport: !!req.session?.passport,
            passportUserId: passportUserId,
            passportUserIdType: typeof passportUserId
          },
          user: {
            exists: !!req.user,
            id: userObjectId,
            idType: typeof userObjectId,
            idAsNumber: userIdFromObjectAsNumber,
            idAsNumberType: typeof userIdFromObjectAsNumber,
            name: req.user
              ? `${req.user.firstName} ${req.user.lastName}`
              : undefined
          },
          bestUserId: passportUserId || userIdFromObjectAsNumber,
          sessionCookie: req.headers.cookie
        });
      } catch (error) {
        console.error("[Debug API] Error:", error);
        return res.status(500).json({
          error: "Debug endpoint error",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    console.log("[Routes] User routes registered");

    // Public beta tester stats endpoint for Webflow integration
    app.get("/api/beta-testers/stats", async (req: Request, res: Response) => {
      try {
        const MAX_BETA_TESTERS = 500;

        // Count beta testers
        const betaTesterCountResult = await db
          .select({count: sql<number>`count(*)`})
          .from(users)
          .where(eq(users.isBetaTester, true));

        const count = Number(betaTesterCountResult[0]?.count || 0);
        const remaining = Math.max(0, MAX_BETA_TESTERS - count);
        const percentage = Math.round((count / MAX_BETA_TESTERS) * 100);

        // Set CORS headers for Webflow access
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader("Content-Type", "application/json");

        res.json({
          count,
          maxLimit: MAX_BETA_TESTERS,
          remaining,
          percentage,
          isFull: count >= MAX_BETA_TESTERS,
          remainingOutOf: `${remaining} / ${MAX_BETA_TESTERS}`
        });
      } catch (error) {
        console.error("[Beta Testers] Error fetching stats:", error);
        res.status(500).json({
          error: "Failed to fetch beta tester statistics",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Register content routes
    console.log("[Routes] Registering content routes...");
    app.use("/api", contentRouter);
    console.log("[Routes] Content routes registered");

    // Register admin routes
    console.log("[Routes] Registering admin routes...");
    app.use("/api/admin", adminRouter);
    console.log("[Routes] Admin routes registered");
    // console.log("[Routes] Admin routes registered");

    // Register headshots routes
    console.log("[Routes] Registering headshots routes...");
    app.use("/api/headshots", headshotsRouter);
    console.log("[Routes] Headshots routes registered");

    // Register organization routes
    console.log("[Routes] Registering organization routes...");
    app.use("/api/organization", organizationRouter); // Fixed to match client-side API calls
    console.log("[Routes] Organization routes registered");

    // Register badge profile routes
    console.log("[Routes] Registering badge profile routes...");
    app.use("/api/badge-profile", badgeProfileRouter);
    console.log("[Routes] Badge profile routes registered");

    // Register chat API routes
    console.log("[Routes] Registering chat API routes...");
    app.use("/api/chat", chatRouter);
    console.log("[Routes] Chat API routes registered");

    // Register leadgen API routes
    console.log("[Routes] Registering leadgen API routes...");
    app.use("/api/leadgen", leadgenRouter);
    console.log("[Routes] Leadgen API routes registered");

    // Register database image storage routes
    console.log("[Routes] Registering database image storage routes...");
    app.use("/api/db-images", dbImageRouter);
    console.log("[Routes] Database image storage routes registered");

    // Register user-organizations routes
    console.log("[Routes] Registering user-organizations routes...");
    app.use("/api/user-organizations", userOrganizationsRouter);
    console.log("[Routes] User-organizations routes registered");

    // Register team members routes
    console.log("[Routes] Registering team members routes...");
    app.use("/api/team/members", teamMembersRouter);
    console.log("[Routes] Team members routes registered");

    // Register invitations routes
    console.log("[Routes] Registering invitations routes...");
    app.use("/api/invitations", invitationsRouter);
    console.log("[Routes] Invitations routes registered");

    // Register payments and billing routes
    console.log("[Routes] Registering payments and billing routes...");
    app.use("/api/payments", paymentsRouter);
    console.log("[Routes] Payments and billing routes registered");

    // Serve uploads directory statically
    const uploadsPath = path.join(process.cwd(), "uploads");
    console.log(
      "[Routes] Setting up static file serving for uploads directory:",
      uploadsPath
    );
    app.use("/uploads", express.static(uploadsPath));
    console.log(
      "[Routes] Uploads directory configured for static file serving"
    );

    // Health check endpoint
    app.get("/api/health", (req: Request, res: Response) => {
      console.log("[Routes] Health check endpoint accessed");
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        auth: req.isAuthenticated()
      });
    });

    // Test route to verify basic routing works
    app.get("/api/test", (_req: Request, res: Response) => {
      console.log("[Routes] Test endpoint accessed");
      res.json({message: "Basic routing is working"});
    });

    // Register global error handler (must be after all routes)
    console.log("[Routes] Registering global error handler...");
    app.use(apiErrorHandler);
    console.log("[Routes] Global error handler registered");

    // Create the HTTP server
    console.log("[Routes] Creating HTTP server...");
    const server = createServer(app);
    console.log("[Routes] HTTP server created");

    return server;
  } catch (error) {
    console.error("[Routes] Failed to register routes:", error);
    throw error;
  }
}
