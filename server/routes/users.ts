import {Request, Response, Router} from "express";
import {asyncHandler} from "../utils/error-handler";
import {users, sanitizePath} from "@shared/schema";
import {db} from "../db";
import {eq} from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import {dbImageStorage} from "../services/dbImageStorage";
import {
  handlePathRedirect,
  findPathRedirect,
  findUserByOldPath
} from "../utils/path-redirect-handler";

const router = Router();

// Configure multer for profile image uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {recursive: true});
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "profile-" + uniqueSuffix + ext);
  }
});

const upload = multer({storage: storage});

/**
 * GET /api/users/check-email
 * Check if an email already exists in the database
 */
router.get(
  "/check-email",
  asyncHandler(async (req: Request, res: Response) => {
    const {email} = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({error: "Email is required"});
    }

    try {
      // Check if the email exists
      const [existingUser] = await db
        .select({id: users.id})
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      return res.json({
        exists: !!existingUser
      });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

/**
 * GET /api/users/me
 * Get current authenticated user
 */
router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({error: "Not authenticated"});
    }

    const userId = req.user.id;

    try {
      // Query the user from the database
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({error: "User not found"});
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

/**
 * PATCH /api/users/profile/settings
 * Update user profile settings
 */
router.patch(
  "/profile/settings",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({error: "Not authenticated"});
    }

    const userId = req.user.id;

    try {
      // Get the current user
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({error: "User not found"});
      }

      // Check if firstName or lastName are changing
      const isNameChanging =
        (req.body.firstName !== undefined &&
          req.body.firstName !== user.firstName) ||
        (req.body.lastName !== undefined &&
          req.body.lastName !== user.lastName);

      // Extract fields to update from request body
      const updateData: Record<string, any> = {};

      // Only include fields that are provided in the request
      if (req.body.firstName !== undefined)
        updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined)
        updateData.lastName = req.body.lastName;
      if (req.body.profileImage !== undefined)
        updateData.profileImage = req.body.profileImage;
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.body.phoneNumber !== undefined)
        updateData.phoneNumber = req.body.phoneNumber;

      // Handle beta tester status update
      let isBecomingBetaTester = false;
      if (req.body.isBetaTester !== undefined) {
        updateData.isBetaTester = req.body.isBetaTester === true;
        // Check if user is becoming a beta tester (was false, now true)
        isBecomingBetaTester =
          !user.isBetaTester && req.body.isBetaTester === true;
      }

      // Handle onboarding complete status update
      if (req.body.onboardingComplete !== undefined) {
        updateData.onboardingComplete = req.body.onboardingComplete === true;
      }

      // Enforce email immutability for Slack-auth users
      if (req.body.email !== undefined) {
        if (user.slackId) {
          // Ignore email updates for Slack accounts
        } else {
          updateData.email = req.body.email;
        }
      }

      // Handle publicPath regeneration if name is changing
      if (isNameChanging) {
        const firstName = req.body.firstName || user.firstName;
        const lastName = req.body.lastName || user.lastName;
        const newPublicPath = sanitizePath(
          `${firstName}-${lastName}-${user.uniquePathId}`
        );

        // Save the old path and create redirect
        if (user.publicPath !== newPublicPath) {
          await handlePathRedirect(userId, user.publicPath, newPublicPath);
          updateData.publicPath = newPublicPath;
        }
      }

      // Add updatedAt timestamp
      updateData.updatedAt = new Date();

      // Update the user record
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Send Slack invite link to new beta testers via email using Mailtrap template
      // Environment variables required:
      // - SLACK_INVITE_LINK: The invite link URL for the Slack channel
      // - MAILTRAP_SLACK_INVITATION_TEMPLATE: The Mailtrap template UUID
      // - SLACK_CHANNEL_NAME: (Optional) Name of the Slack channel, defaults to "Beta Testers"
      if (isBecomingBetaTester) {
        const inviteLink = process.env.SLACK_INVITE_LINK;
        const templateUuid = process.env.MAILTRAP_SLACK_INVITATION_TEMPLATE;

        if (inviteLink && templateUuid) {
          try {
            const {sendTemplateEmail} = await import(
              "../services/mailtrap-email"
            );
            await sendTemplateEmail({
              to: updatedUser.email,
              templateUuid,
              templateVariables: {
                invitation_url: inviteLink,
                user_name: updatedUser.firstName || "there",
                app_name: process.env.APP_NAME || "Badge AI",
                company_name: process.env.COMPANY_NAME || "Badge AI",
                slack_channel_name:
                  process.env.SLACK_CHANNEL_NAME || "Beta Testers"
              }
            });
            console.log(
              `[Users] Sent Slack invite link to new beta tester ${updatedUser.email} using template`
            );
          } catch (error) {
            // Log error but don't fail the update
            console.error(
              "[Users] Error sending Slack invite email to new beta tester:",
              error
            );
          }
        } else {
          console.warn(
            "[Users] SLACK_INVITE_LINK or MAILTRAP_SLACK_INVITATION_TEMPLATE not configured, skipping beta tester invitation email"
          );
        }
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile settings:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

/**
 * POST /api/users/profile/image
 * Upload a profile image
 */
router.post(
  "/profile/image",
  upload.single("profileImage"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({error: "Not authenticated"});
    }

    const userId = req.user.id;
    let imageUrl: string;

    try {
      // Get current user to check for existing profile image
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      // Delete previous image if it exists and is a database image
      if (currentUser?.profileImage?.startsWith("/api/db-images/")) {
        const existingImageId = parseInt(
          currentUser.profileImage.replace("/api/db-images/", "")
        );

        if (!isNaN(existingImageId)) {
          // Delete the old image to save space
          console.log(`Deleting previous profile image: ${existingImageId}`);
          await dbImageStorage.deleteImage(existingImageId);
        }
      }

      // Handle database image ID
      if (req.body.dbImageId) {
        // If dbImageId is provided, use it to create a reference to the DB-stored image
        const dbImageId = req.body.dbImageId;
        imageUrl = `/api/db-images/${dbImageId}`;
      }
      // Handle imageUrl
      else if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
      }
      // Handle file upload
      else if (req.file) {
        // This is the legacy path - using local filesystem
        imageUrl = `/uploads/${req.file.filename}`;
      } else {
        return res.status(400).json({error: "No image content provided"});
      }

      // Update the user's profile image in the database
      await db
        .update(users)
        .set({
          profileImage: imageUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({imageUrl});
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

/**
 * POST /api/users/banner
 * Save custom banner configuration
 */
router.post(
  "/banner",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({error: "Not authenticated"});
    }

    const userId = req.user.id;

    try {
      // Get current user
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({error: "User not found"});
      }

      // Validate banner data
      const {
        id,
        name,
        headline,
        subheadline,
        tags,
        backgroundType,
        backgroundValue,
        customUploadUrl,
        setAsActive
      } = req.body;

      if (!headline || !headline.text || !backgroundType || !backgroundValue) {
        return res.status(400).json({
          error: "Missing required banner fields",
          details:
            "headline.text, backgroundType, and backgroundValue are required"
        });
      }

      // Use provided ID for editing, or generate new one for creating
      const bannerId =
        id || `banner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isEditing = !!id;

      // Get current banner settings and theme
      const currentBannerSettings = (user.bannerSettings as any) || {};
      const currentTheme = (user.theme as any) || {};

      // Create/update saved banner object
      const bannerData = {
        id: bannerId,
        name: name || `Banner ${new Date().toLocaleDateString()}`,
        headline: {
          text: headline.text,
          font: headline.font || "font-sans",
          color: headline.color || "#000000"
        },
        subheadline: subheadline
          ? {
              text: subheadline.text,
              font: subheadline.font || "font-sans",
              color: subheadline.color || "#000000"
            }
          : undefined,
        tags: Array.isArray(tags)
          ? tags.filter((tag) => tag.text && tag.text.trim())
          : [],
        backgroundType,
        backgroundValue,
        customUploadUrl,
        createdAt: isEditing
          ? currentBannerSettings.savedBanners?.find(
              (b: any) => b.id === bannerId
            )?.createdAt || new Date().toISOString()
          : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Update saved banners
      const existingBanners = currentBannerSettings.savedBanners || [];
      let updatedBanners;

      if (isEditing) {
        // Update existing banner
        const bannerIndex = existingBanners.findIndex(
          (banner: any) => banner.id === bannerId
        );
        if (bannerIndex === -1) {
          return res.status(404).json({error: "Banner not found for editing"});
        }
        updatedBanners = [...existingBanners];
        updatedBanners[bannerIndex] = bannerData;
      } else {
        // Add new banner (limit to 10 banners)
        updatedBanners = [...existingBanners, bannerData].slice(-10);
      }

      // Update banner settings
      const updatedBannerSettings = {
        ...currentBannerSettings,
        savedBanners: updatedBanners,
        ...(setAsActive || updatedBanners.length === 1
          ? {activeBannerId: bannerId}
          : {})
      };

      // Prepare update data
      const updateData: any = {
        bannerSettings: updatedBannerSettings,
        updatedAt: new Date()
      };

      // If setAsActive is true or this is the first banner, also update theme
      if (setAsActive || updatedBanners.length === 1) {
        updateData.theme = {
          ...currentTheme,
          banner: {
            type: "custom" as const,
            ...bannerData
          }
        };
      }

      // Save to database
      await db.update(users).set(updateData).where(eq(users.id, userId));

      res.json({
        success: true,
        banner: bannerData,
        message: isEditing
          ? "Banner updated successfully"
          : "Banner saved successfully"
      });
    } catch (error) {
      console.error("Error saving banner:", error);
      res.status(500).json({
        error: "Failed to save banner",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

/**
 * DELETE /api/users/banner/:bannerId
 * Delete a custom banner
 */
router.delete(
  "/banner/:bannerId",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({error: "Not authenticated"});
    }

    const userId = req.user.id;
    const {bannerId} = req.params;

    try {
      // Get current user
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({error: "User not found"});
      }

      // Get current banner settings and theme
      const currentBannerSettings = (user.bannerSettings as any) || {};
      const currentTheme = (user.theme as any) || {};
      const savedBanners = currentBannerSettings.savedBanners || [];

      // Check if banner exists in saved banners
      const bannerIndex = savedBanners.findIndex(
        (banner: any) => banner.id === bannerId
      );
      if (bannerIndex === -1) {
        return res.status(404).json({error: "Banner not found"});
      }

      // Remove banner from saved banners
      const updatedBanners = savedBanners.filter(
        (banner: any) => banner.id !== bannerId
      );

      // Update banner settings
      const updatedBannerSettings = {
        ...currentBannerSettings,
        savedBanners: updatedBanners,
        // Clear activeBannerId if this was the active banner
        ...(currentBannerSettings.activeBannerId === bannerId
          ? {activeBannerId: undefined}
          : {})
      };

      // Prepare update data
      const updateData: any = {
        bannerSettings: updatedBannerSettings,
        updatedAt: new Date()
      };

      // If this was the active banner, also clear it from theme
      if (currentTheme.banner?.id === bannerId) {
        updateData.theme = {
          ...currentTheme,
          banner: undefined
        };
      }

      await db.update(users).set(updateData).where(eq(users.id, userId));

      res.json({
        success: true,
        message: "Banner deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({
        error: "Failed to delete banner",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

/**
 * PUT /api/users/banner/:bannerId/activate
 * Set a banner as the active banner
 */
router.put(
  "/banner/:bannerId/activate",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({error: "Not authenticated"});
    }

    const userId = req.user.id;
    const {bannerId} = req.params;

    try {
      // Get current user
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({error: "User not found"});
      }

      // Get current banner settings and theme
      const currentBannerSettings = (user.bannerSettings as any) || {};
      const currentTheme = (user.theme as any) || {};
      const savedBanners = currentBannerSettings.savedBanners || [];

      // Find the banner to activate
      const bannerToActivate = savedBanners.find(
        (banner: any) => banner.id === bannerId
      );
      if (!bannerToActivate) {
        return res.status(404).json({error: "Banner not found"});
      }

      // Update banner settings with active banner ID
      const updatedBannerSettings = {
        ...currentBannerSettings,
        activeBannerId: bannerId
      };

      // Set the banner as active in theme
      const updatedTheme = {
        ...currentTheme,
        banner: {
          type: "custom" as const,
          id: bannerId,
          ...bannerToActivate
        }
      };

      await db
        .update(users)
        .set({
          bannerSettings: updatedBannerSettings,
          theme: updatedTheme,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: "Banner activated successfully"
      });
    } catch (error) {
      console.error("Error activating banner:", error);
      res.status(500).json({
        error: "Failed to activate banner",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

/**
 * GET /api/users/profile/:publicPath*
 * Get public user profile by public path
 * This route uses wildcard matching to handle all parts of the path
 */
router.get(
  "/profile/:publicPath*",
  asyncHandler(async (req: Request, res: Response) => {
    // Get the full path by combining all parts
    const basePath = req.params.publicPath;
    const remainingPath = req.params[0] || "";
    const fullPath = remainingPath ? `${basePath}${remainingPath}` : basePath;

    if (!fullPath) {
      return res.status(400).json({error: "Public path is required"});
    }

    try {
      // Try to find the user by publicPath first
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.publicPath, fullPath));

      if (user) {
        return res.json(user);
      }

      // For backwards compatibility, try uniquePathId
      const [userByPathId] = await db
        .select()
        .from(users)
        .where(eq(users.uniquePathId, fullPath));

      if (userByPathId) {
        return res.json(userByPathId);
      }

      // Check if there's a redirect for this path
      const redirect = await findPathRedirect(fullPath);
      if (redirect) {
        // Use the current path to fetch the user
        const [redirectedUser] = await db
          .select()
          .from(users)
          .where(eq(users.publicPath, redirect.currentPath));

        if (redirectedUser) {
          return res.json({
            ...redirectedUser,
            _redirectedFrom: fullPath // Include metadata about the redirect
          });
        }
      }

      // Check if this path exists in old_public_paths
      const oldPathUser = await findUserByOldPath(fullPath);
      if (oldPathUser) {
        // Fetch the user with their current path
        const [currentUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, oldPathUser.userId));

        if (currentUser) {
          return res.json({
            ...currentUser,
            _redirectedFrom: fullPath // Include metadata about the redirect
          });
        }
      }

      // If nothing found, return 404
      return res.status(404).json({error: "User profile not found"});
    } catch (error) {
      console.error("Error getting public profile:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

/**
 * GET /api/users/badge-profile/:publicPath*
 * Get public badge profile by public path
 * This route uses wildcard matching to handle all parts of the path
 */
router.get(
  "/badge-profile/:publicPath*",
  asyncHandler(async (req: Request, res: Response) => {
    // Get the full path by combining all parts
    const basePath = req.params.publicPath;
    const remainingPath = req.params[0] || "";
    const fullPath = remainingPath ? `${basePath}${remainingPath}` : basePath;

    if (!fullPath) {
      return res.status(400).json({error: "Public path is required"});
    }

    try {
      // Try to find the user by publicPath first
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.publicPath, fullPath));

      let userData: any = user;

      // If not found, try uniquePathId (for backwards compatibility)
      if (!userData) {
        const [userByPathId] = await db
          .select()
          .from(users)
          .where(eq(users.uniquePathId, fullPath));

        userData = userByPathId;
      }

      // If still not found, check for redirects
      if (!userData) {
        const redirect = await findPathRedirect(fullPath);
        if (redirect) {
          // Use the current path to fetch the user
          const [redirectedUser] = await db
            .select()
            .from(users)
            .where(eq(users.publicPath, redirect.currentPath));

          userData = redirectedUser;
        }
      }

      // If still not found, check old paths
      if (!userData) {
        const oldPathUser = await findUserByOldPath(fullPath);
        if (oldPathUser) {
          // Fetch the user with their current path
          const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, oldPathUser.userId));

          userData = currentUser;
        }
      }

      // If no user found after all checks, return 404
      if (!userData) {
        return res.status(404).json({error: "User badge profile not found"});
      }

      // Get organization info if available
      let organization = null;
      if (userData.organizationId) {
        const orgId = userData.organizationId;

        try {
          // Import organizations table from shared schema
          const {organizations} = await import("@shared/schema");

          // Fetch organization data
          const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, orgId));

          organization = org || null;
        } catch (error) {
          console.error("Error fetching organization:", error);
          // Continue without organization data
        }
      }

      // Extract badge profile settings from user data
      const settings = (userData.settings as any) || {};
      const bannerSettings = (userData.banner_settings as any) || {};
      const theme = (userData.theme as any) || {};

      // Helper function to generate a random page ID
      const generateRandomPageId = () =>
        Math.random().toString(36).substring(2, 15);

      // Default pages with random IDs
      const defaultPages = [
        {id: generateRandomPageId(), name: "Home", privacy: "public"},
        {id: generateRandomPageId(), name: "About Me", privacy: "public"},
        {id: generateRandomPageId(), name: "Resources", privacy: "public"}
      ];

      const response: any = {
        userProfile: userData,
        organization,
        // For the public badge profile, we need to check what background the user has actually set
        // This could be from their badge profile settings (settings.theme.background)
        // or we should default to using their active banner if they have one
        background:
          settings.theme?.background ||
          (theme.banner?.type === "custom"
            ? {
                type: "banner",
                customBannerId: theme.banner.id
              }
            : {
                type: "preset",
                preset: "gradient-1"
              }),
        quickLinks: settings.quickLinks || [],
        sections: settings.sections || [],
        chatSettings: settings.chatSettings || {
          enabled: false,
          position: "bottom-right",
          bubbleText: "Chat with me",
          welcomeMessage: "Hello! How can I help you today?",
          chatSettings: {
            defaultPrompts: [],
            knowledgeSources: [],
            includeProfileData: true
          }
        },
        leadSettings: settings.leadSettings || {},
        branding: settings.branding || null,
        pages: settings.pages || defaultPages,
        customBanner: theme.banner?.type === "custom" ? theme.banner : null,
        savedBanners: bannerSettings.savedBanners || []
      };

      // Ensure all sections have pageIds
      if (response.sections && Array.isArray(response.sections)) {
        const firstPageId = response.pages[0]?.id;
        response.sections = response.sections.map((section: any) => {
          if (!section.pageId) {
            return {
              ...section,
              pageId: firstPageId
            };
          }
          return section;
        });
      }

      // Include redirect metadata if the original path was different
      if (userData.publicPath !== fullPath) {
        response._redirectedFrom = fullPath;
      }

      res.json(response);
    } catch (error) {
      console.error("Error getting badge profile:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

export default router;
