import express, {Request, Response} from "express";
import {db} from "../db";
import {users, sanitizePath} from "../../shared/schema";
import {eq} from "drizzle-orm";
import {asyncHandler} from "../utils/error-handler";
import {storage} from "../storage";
import {Session} from "express-session";
import {truncateForLogging} from "../utils/logging";
import {DEFAULT_LEAD_SETTINGS, LeadSettings} from "../../shared/types/lead";
import {User} from "../../shared/types/user";
import {handlePathRedirect} from "../utils/path-redirect-handler";
import crypto from "crypto";

// Create router
export const router = express.Router();

// Define the extended request type with User
interface RequestWithUser extends Omit<Request, "isAuthenticated"> {
  session: Session & {
    passport?: {user: number};
  };
  user?: User;
  isAuthenticated(): boolean;
}

// Enhanced User Settings interface that includes leadSettings and pages
interface EnhancedUserSettings {
  theme?: {
    banner?: {
      type: "gradient" | "solid" | "pattern";
      id: string;
    };
    background?: {
      type: "preset" | "custom";
      preset?: string;
      customUrl?: string;
    };
  };
  quickLinks?: Array<{
    id: string;
    label: string;
    url: string;
    type: "website" | "email" | "phone" | "custom";
  }>;
  sections?: Array<{
    id: string;
    type: string;
    name: string;
    anchor: string;
    isVisible: boolean;
    order: number;
    content?: {
      title?: string;
      description?: string;
      buttonText?: string;
      buttonLink?: string;
      image?: string;
      status?: "connected" | "sample";
    };
    pageId?: string;
  }>;
  chatSettings?: {
    enabled: boolean;
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    bubbleText?: string;
    welcomeMessage?: string;
    chatSettings: {
      defaultPrompts: Array<{
        id: string;
        text: string;
        order: number;
      }>;
      knowledgeSources: Array<{
        id: string;
        type: "url" | "file";
        content: string;
        name?: string;
        size?: number;
      }>;
      includeProfileData: boolean;
      model?: string;
      systemPrompt?: string;
    };
  };
  leadSettings?: LeadSettings;
  branding?: {
    removeBuiltWithBadge?: boolean;
    customBranding?: boolean;
  };
  pages?: Array<{
    id: string;
    name: string;
    isVisible?: boolean;
    privacy?: "public" | "password" | "form";
    password?: string;
    passwordHash?: string;
    passwordSalt?: string;
  }>;
}

/**
 * Get Badge Profile Page Settings API
 * This route retrieves badge profile page settings for the authenticated user
 */
router.get(
  "/",
  asyncHandler(async (req: RequestWithUser, res: Response) => {
    try {
      console.log("[Badge Profile] Retrieving page settings");

      // Check authentication
      if (!req.isAuthenticated()) {
        console.log("[Badge Profile] User not authenticated");
        return res.status(401).json({error: "Not authenticated"});
      }

      // Get user ID
      let userId: number;
      if (req.session?.passport?.user) {
        userId = req.session.passport.user;
        console.log("[Badge Profile] Using userId from session:", userId);
      } else if (req.user && typeof req.user === "object" && "id" in req.user) {
        userId = Number(req.user.id);
        console.log("[Badge Profile] Using userId from user object:", userId);
      } else {
        console.error("[Badge Profile] Could not determine user ID");
        return res.status(400).json({
          error: "Invalid user ID",
          details: "Could not determine user ID from request"
        });
      }

      // Get user and related organization
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        console.log("[Badge Profile] User not found:", userId);
        return res.status(404).json({error: "User not found"});
      }

      console.log("[Badge Profile] User found:", user.id);

      // Get organization if user has one
      let organization = null;
      if (user.organizationId) {
        organization = await storage.getOrganization(
          Number(user.organizationId)
        );
      }

      // Get lead settings from user settings or use defaults
      const settings = (user.settings as EnhancedUserSettings) || {};
      const bannerSettings = (user.bannerSettings as any) || {};
      const theme = (user.theme as any) || {};
      const userLeadSettings = settings.leadSettings || DEFAULT_LEAD_SETTINGS;

      // Format the response with the required information
      const response = {
        background: settings?.theme?.background || null,
        quickLinks: settings?.quickLinks || [],
        sections: settings?.sections || [],
        chatSettings: settings?.chatSettings || null,
        userProfile: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          title: user.title,
          bio: user.bio,
          profileImage: user.profileImage,
          publicPath: user.publicPath,
          uniquePathId: user.uniquePathId,
          phoneNumber: user.phoneNumber,
          linkedinProfile: user.linkedinProfile || null,
          companyName: user.companyName,
          qrCodeUrl: user.qrCodeUrl
        },
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              logo: organization.logo,
              description: organization.description,
              website: organization.website,
              defaultColor: organization.defaultColor,
              domain: organization.domain,
              socialProfiles: organization.socialProfiles || {},
              createdAt: organization.createdAt,
              updatedAt: organization.updatedAt,
              qrCodeColor: organization.qrCodeColor,
              qrLogoUrl: organization.qrLogoUrl,
              icon: organization.icon
            }
          : null,
        leadSettings: userLeadSettings,
        branding: settings?.branding || null,
        pages: settings?.pages,
        // Add custom banner data from new schema
        customBanner: theme.banner?.type === "custom" ? theme.banner : null,
        savedBanners: bannerSettings.savedBanners || []
      };

      // Ensure all sections have pageId properties
      const firstPageId = response.pages?.[0]?.id;
      if (response.sections && Array.isArray(response.sections)) {
        response.sections = response.sections.map((section) => {
          if (!section.pageId) {
            return {
              ...section,
              pageId: firstPageId
            };
          }
          return section;
        });
      }

      console.log("[Badge Profile] Settings retrieved successfully");
      res.json(response);
    } catch (error) {
      console.error("[Badge Profile] Error retrieving settings:", error);
      res.status(500).json({
        error: "Failed to retrieve badge profile settings",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

/**
 * Update Badge Profile Page Settings API
 * This route updates badge profile page settings for the authenticated user
 */
router.put(
  "/",
  asyncHandler(async (req: RequestWithUser, res: Response) => {
    try {
      console.log("[Badge Profile] Updating page settings");
      console.log(
        "[Badge Profile] Request body:",
        truncateForLogging(req.body)
      );

      // Check authentication
      if (!req.isAuthenticated()) {
        console.log("[Badge Profile] User not authenticated");
        return res.status(401).json({error: "Not authenticated"});
      }

      // Get user ID from user object or session
      let userId: number;
      if (req.session?.passport?.user) {
        userId = req.session.passport.user;
        console.log("[Badge Profile] Using userId from session:", userId);
      } else if (req.user && typeof req.user === "object" && "id" in req.user) {
        userId = Number(req.user.id);
        console.log("[Badge Profile] Using userId from user object:", userId);
      } else {
        console.error("[Badge Profile] Could not determine user ID");
        return res.status(400).json({
          error: "Invalid user ID",
          details: "Could not determine user ID from request"
        });
      }

      // Get existing user
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        console.log("[Badge Profile] User not found:", userId);
        return res.status(404).json({error: "User not found"});
      }

      // Check if firstName or lastName are changing
      const isNameChanging =
        (req.body.firstName !== undefined &&
          req.body.firstName !== user.firstName) ||
        (req.body.lastName !== undefined &&
          req.body.lastName !== user.lastName);

      // Generate random ID helper function
      const generateRandomId = () =>
        Math.random().toString(36).substring(2, 15);

      // Update user settings - merge with existing settings
      const existingSettings = (user.settings as EnhancedUserSettings) || {};

      // Process pages and hash any passwords
      let updatedPages = req.body.pages ||
        existingSettings.pages || [
          {id: generateRandomId(), name: "Home", privacy: "public"},
          {id: generateRandomId(), name: "About Me", privacy: "public"},
          {id: generateRandomId(), name: "Resources", privacy: "public"}
        ];

      // Hash passwords for password-protected pages
      if (Array.isArray(updatedPages)) {
        updatedPages = updatedPages.map((page) => {
          // Only process pages with passwords that need to be hashed
          if (
            page.privacy === "password" &&
            page.password &&
            !page.passwordHash
          ) {
            // Generate a random salt
            const salt = crypto.randomBytes(16).toString("hex");
            // Hash the password with the salt
            const hash = crypto
              .pbkdf2Sync(page.password, salt, 1000, 64, "sha512")
              .toString("hex");

            // Return the page with the hash and salt, but remove the plain text password
            return {
              ...page,
              passwordHash: hash,
              passwordSalt: salt,
              password: undefined // Remove plain text password
            };
          } else if (page.privacy !== "password") {
            // For non-password pages, remove any existing password fields
            return {
              ...page,
              password: undefined,
              passwordHash: undefined,
              passwordSalt: undefined
            };
          }
          // If it already has a hash, keep it as is
          return page;
        });
      }

      const updatedSettings: EnhancedUserSettings = {
        ...existingSettings,
        theme: {
          ...existingSettings.theme,
          // Only update background if it's explicitly provided in the request
          ...(req.body.background !== undefined && {
            background: req.body.background
          })
        },
        quickLinks: req.body.quickLinks || existingSettings.quickLinks || [],
        sections: req.body.sections || existingSettings.sections || [],
        chatSettings:
          req.body.chatSettings || existingSettings.chatSettings || null,
        pages: updatedPages
      };

      // Ensure all sections have pageIds
      if (updatedSettings.sections && Array.isArray(updatedSettings.sections)) {
        const firstPageId = updatedSettings.pages?.[0]?.id;
        updatedSettings.sections = updatedSettings.sections.map((section) => {
          if (!section.pageId) {
            return {
              ...section,
              pageId: firstPageId
            };
          }
          return section;
        });
      }

      // Handle lead settings as part of user settings
      if (req.body.leadSettings) {
        updatedSettings.leadSettings = {
          fields: req.body.leadSettings.fields,
          downloadVcard: req.body.leadSettings.downloadVcard,
          notifyEmail: req.body.leadSettings.notifyEmail,
          captureFromQr: req.body.leadSettings.captureFromQr,
          customThankYouMessage:
            req.body.leadSettings.customThankYouMessage || null,
          redirectUrl: req.body.leadSettings.redirectUrl || null
        };
      }

      // Handle branding settings as part of user settings
      if (req.body.branding) {
        updatedSettings.branding = {
          removeBuiltWithBadge: req.body.branding.removeBuiltWithBadge || false,
          customBranding: req.body.branding.customBranding || false
        };
      }

      // Extract profile fields if provided
      const updateData: any = {
        settings: updatedSettings,
        updatedAt: new Date()
      };

      // Add profile fields if they exist in the request
      if (req.body.firstName !== undefined)
        updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined)
        updateData.lastName = req.body.lastName;
      if (req.body.profileImage !== undefined)
        updateData.profileImage = req.body.profileImage;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.body.title !== undefined) updateData.title = req.body.title;

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
          console.log("[Badge Profile] Updated publicPath:", newPublicPath);
        }
      }

      // Update in the database
      await db.update(users).set(updateData).where(eq(users.id, userId));

      console.log("[Badge Profile] Settings updated successfully");
      res.json({
        success: true,
        message: "Badge profile settings updated successfully",
        settings: {
          background: updatedSettings.theme?.background || null,
          quickLinks: updatedSettings.quickLinks || [],
          sections: updatedSettings.sections || [],
          chatSettings: updatedSettings.chatSettings || null,
          leadSettings: updatedSettings.leadSettings || DEFAULT_LEAD_SETTINGS,
          branding: updatedSettings.branding || null,
          pages: updatedSettings.pages || [
            {id: "home", name: "Home", privacy: "public"},
            {id: "about", name: "About Me", privacy: "public"},
            {id: "resources", name: "Resources", privacy: "public"}
          ]
        },
        // Return updated profile fields
        firstName: updateData.firstName || user.firstName,
        lastName: updateData.lastName || user.lastName,
        profileImage: updateData.profileImage || user.profileImage,
        bio: updateData.bio || user.bio,
        title: updateData.title || user.title,
        publicPath: updateData.publicPath || user.publicPath
      });
    } catch (error) {
      console.error("[Badge Profile] Error updating settings:", error);
      res.status(500).json({
        error: "Failed to update badge profile settings",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

/**
 * Verify Page Password API
 * This route securely verifies a password for a password-protected page
 * without exposing the actual password hash to the client
 */
router.post(
  "/verify-password",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {publicPath, pageId, password} = req.body;

      if (!publicPath || !pageId || !password) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "publicPath, pageId, and password are required"
        });
      }

      console.log("[Badge Profile] Verifying password for page:", pageId);

      // Find the user by public path
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.publicPath, publicPath));

      if (!user) {
        console.log("[Badge Profile] User not found for path:", publicPath);
        return res.status(404).json({error: "User profile not found"});
      }

      // Get user settings
      const settings = (user.settings as EnhancedUserSettings) || {};
      const pages = settings.pages || [];

      // Find the specific page
      const page = pages.find((p) => p.id === pageId);

      if (!page) {
        console.log("[Badge Profile] Page not found:", pageId);
        return res.status(404).json({error: "Page not found"});
      }

      // Check if page is password protected
      if (page.privacy !== "password") {
        console.log("[Badge Profile] Page is not password protected:", pageId);
        return res.status(400).json({error: "Page is not password protected"});
      }

      // Check if we have a hash and salt
      if (!page.passwordHash || !page.passwordSalt) {
        // Fallback to plain text password for backward compatibility
        const isValid = page.password === password;

        return res.json({
          valid: isValid,
          pageId
        });
      }

      // Verify the password using the stored hash and salt
      const hash = crypto
        .pbkdf2Sync(password, page.passwordSalt, 1000, 64, "sha512")
        .toString("hex");

      const isValid = hash === page.passwordHash;

      console.log("[Badge Profile] Password verification result:", isValid);

      return res.json({
        valid: isValid,
        pageId
      });
    } catch (error) {
      console.error("[Badge Profile] Error verifying password:", error);
      res.status(500).json({
        error: "Failed to verify password",
        details:
          error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
);

export default router;
