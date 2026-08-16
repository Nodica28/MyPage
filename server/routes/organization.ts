import {Request, Response, Router} from "express";
import {db} from "../db";
import {organizations, users, userOrganizations} from "@shared/tables";
import {eq, and, asc} from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import {User} from "@shared/types/user";
import {requireAuth} from "../auth";
import {
  createApiError,
  ErrorCodes,
  handleFileUploadError,
  handleValidationError,
  handleNotFoundError,
  asyncHandler
} from "../utils/error-handler";
import {dbImageStorage} from "../services/dbImageStorage";
import {storage as dbStorage} from "../storage";

export const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {recursive: true});
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "logo-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({storage: storage});

export const updateOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("[Organization] Update request received:", req.body);
    const {name, description, website, defaultColor, socialProfiles} = req.body;
    const user = req.user as User | undefined;

    if (!name) {
      return handleValidationError(
        res,
        "Organization name is required",
        "MISSING_NAME"
      );
    }

    if (!user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's primary organization
    const primaryOrg = await dbStorage.getPrimaryOrganization(user.id);

    if (!primaryOrg) {
      // Create a new organization if user doesn't have one
      console.log(
        "[Organization] No organization ID in user profile, creating new one"
      );

      // Convert socialProfiles to JSON if it's a string
      let parsedSocialProfiles = socialProfiles;
      if (typeof socialProfiles === "string") {
        try {
          // If it's a JSON string, parse it
          if (socialProfiles.trim()) {
            parsedSocialProfiles = JSON.parse(socialProfiles);
          } else {
            // If it's an empty string, use an empty array
            parsedSocialProfiles = [];
          }
        } catch (e) {
          console.error("[Organization] Error parsing socialProfiles:", e);
          // If parsing fails, use an empty array
          parsedSocialProfiles = [];
        }
      }

      console.log(
        "[Organization] Parsed social profiles for new org:",
        parsedSocialProfiles
      );

      try {
        const [result] = await db
          .insert(organizations)
          .values({
            name,
            description: description || "",
            website: website || "",
            domain: website?.replace(/^https?:\/\//, "") || "",
            defaultColor: defaultColor || "#4E5BA6",
            socialProfiles: parsedSocialProfiles,
            updatedAt: new Date()
          })
          .returning();

        // Add user to the new organization as primary
        if (user?.id) {
          console.log(
            "[Organization] Adding user to new organization as primary"
          );
          await dbStorage.addUserToOrganization({
            userId: user.id,
            organizationId: result.id,
            isPrimary: true,
            isCompanyAdmin: true,
            isActive: true
          });

          console.log("[Organization] Added user to organization as primary");
        }

        console.log("[Organization] Created new organization:", result);
        return res.json(result);
      } catch (error) {
        console.error("[Organization] Error creating organization:", error);
        throw createApiError(
          "Failed to create organization",
          500,
          ErrorCodes.DATABASE_ERROR,
          "Database error while creating organization"
        );
      }
    }

    // Get the existing organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));
    console.log("[Organization] Found existing organization:", org);

    if (!org) {
      console.log(
        "[Organization] No organization found despite having ID, creating new one"
      );
      // Convert socialProfiles to JSON if it's a string
      let parsedSocialProfiles = socialProfiles;
      if (typeof socialProfiles === "string") {
        try {
          // If it's a JSON string, parse it
          if (socialProfiles.trim()) {
            parsedSocialProfiles = JSON.parse(socialProfiles);
          } else {
            // If it's an empty string, use an empty array
            parsedSocialProfiles = [];
          }
        } catch (e) {
          console.error(
            "[Organization] Error parsing socialProfiles (case 2):",
            e
          );
          // If parsing fails, use an empty array
          parsedSocialProfiles = [];
        }
      }

      console.log(
        "[Organization] Parsed social profiles for new org (case 2):",
        parsedSocialProfiles
      );

      try {
        const [result] = await db
          .insert(organizations)
          .values({
            name,
            description: description || "",
            website: website || "",
            domain: website?.replace(/^https?:\/\//, "") || "",
            defaultColor: defaultColor || "#4E5BA6",
            socialProfiles: parsedSocialProfiles,
            updatedAt: new Date()
          })
          .returning();

        // Add user to the new organization as primary
        if (user?.id) {
          console.log(
            "[Organization] Adding user to new organization as primary (case 2)"
          );
          await dbStorage.addUserToOrganization({
            userId: user.id,
            organizationId: result.id,
            isPrimary: true,
            isCompanyAdmin: true,
            isActive: true
          });

          console.log(
            "[Organization] Added user to organization as primary (case 2)"
          );
        }

        console.log("[Organization] Created new organization:", result);
        return res.json(result);
      } catch (error) {
        console.error("[Organization] Error creating organization:", error);
        throw createApiError(
          "Failed to create organization",
          500,
          ErrorCodes.DATABASE_ERROR,
          "Database error while creating organization"
        );
      }
    }

    // Update existing
    console.log("[Organization] Updating organization with data:", {
      name,
      description,
      website,
      defaultColor,
      logo: req.body.logo,
      socialProfiles
    });

    // Convert socialProfiles to proper JSON object for database
    let parsedSocialProfiles = socialProfiles;

    // If it's a string, try to parse it
    if (typeof socialProfiles === "string") {
      try {
        if (socialProfiles.trim()) {
          parsedSocialProfiles = JSON.parse(socialProfiles);
        } else {
          // Empty string becomes empty object
          parsedSocialProfiles = {};
        }
      } catch (e) {
        console.error("[Organization] Error parsing socialProfiles string:", e);
        parsedSocialProfiles = {};
      }
    }
    // If it's an array (like [{}]), convert it to an object
    else if (Array.isArray(socialProfiles)) {
      // Convert array to object with index keys
      if (socialProfiles.length === 0) {
        parsedSocialProfiles = {};
      } else {
        // If it contains actual data, merge all objects in the array
        try {
          parsedSocialProfiles = socialProfiles.reduce(
            (acc, item) => ({...acc, ...item}),
            {}
          );
        } catch (e) {
          console.error(
            "[Organization] Error processing socialProfiles array:",
            e
          );
          parsedSocialProfiles = {};
        }
      }
    }
    // If it's not a string or array and not an object, use empty object
    else if (typeof socialProfiles !== "object" || socialProfiles === null) {
      parsedSocialProfiles = {};
    }

    console.log("[Organization] Parsed social profiles:", parsedSocialProfiles);

    try {
      const [result] = await db
        .update(organizations)
        .set({
          name,
          description,
          website,
          defaultColor,
          socialProfiles: parsedSocialProfiles,
          logo: req.body.logo,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, org.id))
        .returning();

      console.log("[Organization] Updated organization:", result);
      res.json(result);
    } catch (error) {
      console.error("[Organization] Error updating organization:", error);
      throw createApiError(
        "Failed to update organization",
        500,
        ErrorCodes.DATABASE_ERROR,
        "Database error while updating organization"
      );
    }
  }
);

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  console.log("[Organization] Logo upload request received:", req.file);
  const user = req.user as User | undefined;

  if (!req.file) {
    console.error("[Organization] No file uploaded");
    return handleFileUploadError(res, "No file uploaded", "NO_FILE");
  }

  // Ensure that uploads directory exists and is accessible
  try {
    if (!fs.existsSync(uploadsDir)) {
      console.log("[Organization] Creating uploads directory");
      fs.mkdirSync(uploadsDir, {recursive: true});
    }

    // Verify file was saved properly
    const filePath = path.join(uploadsDir, req.file.filename);
    if (!fs.existsSync(filePath)) {
      console.error("[Organization] File was not saved properly:", filePath);
      return handleFileUploadError(
        res,
        "File upload failed - file not saved",
        "FILE_NOT_SAVED"
      );
    }

    console.log("[Organization] File saved successfully at", filePath);
  } catch (err) {
    console.error("[Organization] Error verifying uploads directory:", err);
    return handleFileUploadError(
      res,
      "Error accessing uploads directory",
      "UPLOAD_DIR_ERROR"
    );
  }

  if (!user?.id) {
    return res.status(401).json({error: "User not authenticated"});
  }

  // Get user's primary organization
  const primaryOrg = await dbStorage.getPrimaryOrganization(user.id);
  if (!primaryOrg) {
    return handleNotFoundError(
      res,
      "Organization",
      "No primary organization found for user"
    );
  }

  // Create a URL relative to the server
  const logoUrl = `/uploads/${req.file.filename}`;
  const absoluteUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  console.log("[Organization] Generated logo URL:", logoUrl);
  console.log("[Organization] Absolute URL for debugging:", absoluteUrl);

  // Get the existing organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, primaryOrg.organizationId));
  if (!org) {
    console.error("[Organization] No organization found for logo upload");
    return handleNotFoundError(
      res,
      "Organization",
      primaryOrg.organizationId.toString()
    );
  }

  console.log("[Organization] Updating organization with logo:", logoUrl);

  // Update the logo URL
  const [result] = await db
    .update(organizations)
    .set({
      logo: logoUrl,
      updatedAt: new Date()
    })
    .where(eq(organizations.id, org.id))
    .returning();

  console.log("[Organization] Updated organization with logo:", result);
  res.json({logoUrl});
});

export const getOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("[Organization] Fetching organization for user:", req.user?.id);
    const user = req.user as User | undefined;

    if (!user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get the user's primary organization
    let primaryOrg = await dbStorage.getPrimaryOrganization(user.id);

    if (!primaryOrg) {
      // Check if user has any other organizations and automatically set one as primary
      console.log(
        "[Organization] No primary organization found, checking for other organizations"
      );
      const userOrganizations = await dbStorage.getUserOrganizations(user.id);

      if (userOrganizations.length > 0) {
        // Set the first available organization as primary
        const firstOrg = userOrganizations[0];
        console.log(
          `[Organization] Auto-setting organization ${firstOrg.organizationId} as primary for user ${user.id}`
        );

        await dbStorage.updateUserOrganization(
          user.id,
          firstOrg.organizationId,
          {isPrimary: true}
        );

        // Get the updated primary organization
        primaryOrg = await dbStorage.getPrimaryOrganization(user.id);
      }

      if (!primaryOrg) {
        return res.json(null); // Return null if user truly has no organizations
      }
    }

    // Select all columns including QR code related fields
    const [result] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        logo: organizations.logo,
        description: organizations.description,
        website: organizations.website,
        defaultColor: organizations.defaultColor,
        icon: organizations.icon,
        qrLogoUrl: organizations.qrLogoUrl, // Include QR logo URL
        qrCodeColor: organizations.qrCodeColor, // Include QR code color
        socialProfiles: organizations.socialProfiles,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));

    if (!result) {
      console.log("[Organization] Organization not found");
      return res.json(null);
    }

    // Count the members in the organization
    // First try the new userOrganizations table (many-to-many)
    const userOrgMembers = await db
      .select({userId: userOrganizations.userId})
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.organizationId, primaryOrg.organizationId),
          eq(userOrganizations.isActive, true)
        )
      );

    // Also count users from the legacy users.organizationId field for backward compatibility
    const legacyMembers = await db
      .select({id: users.id})
      .from(users)
      .where(eq(users.organizationId, primaryOrg.organizationId));

    // Use the higher count (in case migration is in progress)
    const memberCount = Math.max(userOrgMembers.length, legacyMembers.length);

    console.log("[Organization] Found organization:", result);
    console.log(`[Organization] Member count: ${memberCount}`);

    // Return organization with member count
    res.json({
      ...result,
      memberCount
    });
  }
);

export const getOrganizationById = asyncHandler(
  async (req: Request, res: Response) => {
    const {id} = req.params;
    console.log(`[Organization] Fetching organization by ID: ${id}`);

    if (!id || isNaN(parseInt(id))) {
      return handleValidationError(
        res,
        "Invalid organization ID",
        "INVALID_ORGANIZATION_ID"
      );
    }

    // Select all columns including QR code related fields
    const [result] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        logo: organizations.logo,
        description: organizations.description,
        website: organizations.website,
        defaultColor: organizations.defaultColor,
        icon: organizations.icon,
        qrLogoUrl: organizations.qrLogoUrl, // Include QR logo URL
        qrCodeColor: organizations.qrCodeColor, // Include QR code color
        socialProfiles: organizations.socialProfiles,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .where(eq(organizations.id, parseInt(id)));

    if (!result) {
      console.log(`[Organization] Organization with ID ${id} not found`);
      return handleNotFoundError(res, "Organization", id);
    }

    console.log("[Organization] Found organization by ID:", result);
    res.json(result);
  }
);

// Update QR code settings for an organization
export const updateQRCodeSettings = asyncHandler(
  async (req: Request, res: Response) => {
    console.log(
      "[Organization] QR code settings update request received:",
      req.body
    );
    const user = req.user as User | undefined;

    if (!user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's primary organization
    const primaryOrg = await dbStorage.getPrimaryOrganization(user.id);
    if (!primaryOrg) {
      return handleNotFoundError(
        res,
        "Organization",
        "No primary organization found for user"
      );
    }

    const {qrCodeColor, qrLogoUrl} = req.body;

    // Get the existing organization
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        logo: organizations.logo,
        description: organizations.description,
        website: organizations.website,
        defaultColor: organizations.defaultColor,
        icon: organizations.icon,
        qrCodeColor: organizations.qrCodeColor,
        qrLogoUrl: organizations.qrLogoUrl,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));

    if (!org) {
      console.error(
        "[Organization] No organization found for QR code settings update"
      );
      return handleNotFoundError(
        res,
        "Organization",
        primaryOrg.organizationId.toString()
      );
    }

    // Prepare update data with only the fields that were provided
    const updateData: any = {};

    if (qrCodeColor !== undefined) {
      updateData.qrCodeColor = qrCodeColor;
    }

    if (qrLogoUrl !== undefined) {
      updateData.qrLogoUrl = qrLogoUrl;
    }

    // QR dot type is no longer configurable, removed

    console.log(
      "[Organization] Updating organization QR settings with:",
      updateData
    );

    try {
      const [result] = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, org.id))
        .returning();

      console.log("[Organization] Updated organization QR settings:", result);

      // If we have users in this organization, regenerate their QR codes with the new settings
      if (qrCodeColor !== undefined || qrLogoUrl !== undefined) {
        try {
          console.log("[Organization] Querying users to update QR codes");
          const orgUsers = await db
            .select()
            .from(users)
            .where(eq(users.organizationId, org.id));

          console.log(
            `[Organization] Found ${orgUsers.length} users to update QR codes`
          );

          // Import the QR code generator utility
          const {generateQRCode} = await import("../utils/qrCodeGenerator");

          // Prepare QR code options
          const qrCodeOptions = {
            width: 400,
            margin: 4,
            errorCorrectionLevel: "H" as const,
            color: {
              dark:
                updateData.qrCodeColor ||
                org.qrCodeColor ||
                org.defaultColor ||
                "#0A8DCD",
              light: "#FFFFFF"
            },
            logoUrl: updateData.qrLogoUrl || org.qrLogoUrl || undefined
          };

          // Update each user's QR code
          for (const user of orgUsers) {
            if (user.publicPath) {
              try {
                // Build the profile URL
                const baseUrl =
                  process.env.PUBLIC_URL ||
                  `${req.protocol}://${req.get("host") || "localhost"}`;
                const profileUrl = `${baseUrl}/${user.publicPath}`;

                console.log(
                  `[Organization] Regenerating QR code for user ${user.id} with URL: ${profileUrl}`
                );

                // Generate new QR code
                const qrCodeResult = await generateQRCode(
                  profileUrl,
                  qrCodeOptions
                );

                // Only save the QR code if it was successfully generated
                if (!qrCodeResult) {
                  console.error(
                    `[Organization] Failed to generate QR code for user ${user.id}`
                  );
                  continue;
                }

                // Prepare update object with basic data - now qrCodeResult is just a string
                const updateObj: Record<string, any> = {
                  qrCodeUrl: qrCodeResult,
                  qrCodeSvg: null // We're no longer using SVG data
                };

                console.log(
                  `[Organization] QR code data URL generated successfully for user ${user.id}`
                );

                // Update user with new QR code
                await db
                  .update(users)
                  .set(updateObj)
                  .where(eq(users.id, user.id));

                console.log(
                  `[Organization] Updated QR code for user ${user.id}`
                );
              } catch (qrError) {
                console.error(
                  `[Organization] Failed to regenerate QR code for user ${user.id}:`,
                  qrError
                );
                // Continue with other users
              }
            } else {
              console.log(
                `[Organization] Skipping QR code generation for user ${user.id} - no public path`
              );
            }
          }
        } catch (usersError) {
          console.error(
            "[Organization] Error updating user QR codes:",
            usersError
          );
          // Continue and still return success for the organization update
        }
      }

      res.json(result);
    } catch (error) {
      console.error("[Organization] Error updating QR code settings:", error);
      throw createApiError(
        "Failed to update QR code settings",
        500,
        ErrorCodes.DATABASE_ERROR,
        "Database error while updating QR code settings"
      );
    }
  }
);

// Update QR logo
export const uploadQRLogo = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("[Organization] QR logo update request received:", req.body);
    const user = req.user as User | undefined;

    if (!user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's primary organization
    const primaryOrg = await dbStorage.getPrimaryOrganization(user.id);
    if (!primaryOrg) {
      return handleNotFoundError(
        res,
        "Organization",
        "No primary organization found for user"
      );
    }

    // Get the image URL from the request body
    const {imageUrl} = req.body;

    if (!imageUrl) {
      console.error("[Organization] No image URL provided for QR logo");
      return handleValidationError(
        res,
        "No image URL provided",
        "NO_IMAGE_URL"
      );
    }

    // Validate that the URL is for a database image
    if (!imageUrl.startsWith("/api/db-images/")) {
      console.error("[Organization] Invalid image URL format:", imageUrl);
      return handleValidationError(
        res,
        "Invalid image URL format",
        "INVALID_IMAGE_URL"
      );
    }

    console.log(
      "[Organization] Using database image URL for QR logo:",
      imageUrl
    );

    // Get the existing organization
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        logo: organizations.logo,
        description: organizations.description,
        website: organizations.website,
        defaultColor: organizations.defaultColor,
        icon: organizations.icon,
        qrCodeColor: organizations.qrCodeColor,
        qrLogoUrl: organizations.qrLogoUrl,
        // @ts-ignore - This field exists in the database but is not in the type definition
        socialProfiles: organizations.socialProfiles,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));

    if (!org) {
      console.error("[Organization] No organization found for QR logo upload");
      return handleNotFoundError(
        res,
        "Organization",
        primaryOrg.organizationId.toString()
      );
    }

    console.log("[Organization] Updating organization with QR logo:", imageUrl);

    // Update the QR logo URL
    const [result] = await db
      .update(organizations)
      .set({
        qrLogoUrl: imageUrl
      })
      .where(eq(organizations.id, org.id))
      .returning();

    console.log("[Organization] Updated organization with QR logo:", result);
    res.json({qrLogoUrl: imageUrl});
  }
);

// Regenerate QR codes for all users in an organization
export const regenerateQRCodes = asyncHandler(
  async (req: Request, res: Response) => {
    console.log(
      "[Organization] QR code regeneration request received",
      req.body
    );
    const user = req.user as User | undefined;

    // Extract color and logo from request payload if provided
    const {qrCodeColor, qrLogoUrl} = req.body;

    if (!user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's primary organization
    const primaryOrg = await dbStorage.getPrimaryOrganization(user.id);
    if (!primaryOrg) {
      return handleNotFoundError(
        res,
        "Organization",
        "No primary organization found for user"
      );
    }

    // Get the organization
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        logo: organizations.logo,
        description: organizations.description,
        website: organizations.website,
        defaultColor: organizations.defaultColor,
        icon: organizations.icon,
        qrCodeColor: organizations.qrCodeColor,
        qrLogoUrl: organizations.qrLogoUrl,
        // @ts-ignore - This field exists in the database but is not in the type definition
        socialProfiles: organizations.socialProfiles,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));

    if (!org) {
      console.error(
        "[Organization] No organization found for QR code regeneration"
      );
      return handleNotFoundError(
        res,
        "Organization",
        primaryOrg.organizationId.toString()
      );
    }

    // Fetching all organization users
    console.log("[Organization] Fetching all organization users");
    // Get all users in the organization
    const orgUsers = await db
      .select()
      .from(users)
      .where(eq(users.organizationId, org.id));

    console.log(
      `[Organization] Found ${orgUsers.length} users to regenerate QR codes for`
    );

    try {
      // Import the QR code generator utility
      const {generateQRCode} = await import("../utils/qrCodeGenerator");

      // Prepare QR code options with proper logo
      let logoUrl = undefined;

      // If a logo URL was provided in the request, use it
      if (qrLogoUrl) {
        console.log(
          `[Organization] Using request-provided logo URL: ${qrLogoUrl}`
        );
        logoUrl = qrLogoUrl;
      }
      // Otherwise, use the organization's logo if it exists
      else if (org.qrLogoUrl) {
        console.log(
          `[Organization] Using organization logo URL: ${org.qrLogoUrl}`
        );
        logoUrl = org.qrLogoUrl;
      }

      // If a color was provided in the request, use it
      // Otherwise, fall back to organization color
      const qrColor =
        qrCodeColor || org.qrCodeColor || org.defaultColor || "#0A8DCD";
      console.log(`[Organization] Using QR code color: ${qrColor}`);

      // If we have a new color or logo, update the organization
      if (qrCodeColor || qrLogoUrl) {
        const updateData: Record<string, any> = {};
        if (qrCodeColor) updateData.qrCodeColor = qrCodeColor;
        if (qrLogoUrl) updateData.qrLogoUrl = qrLogoUrl;

        console.log(
          "[Organization] Updating organization with new QR settings:",
          updateData
        );

        try {
          await db
            .update(organizations)
            .set(updateData)
            .where(eq(organizations.id, org.id));
          console.log(
            "[Organization] Organization QR settings updated successfully"
          );
        } catch (updateError) {
          console.error(
            "[Organization] Failed to update organization QR settings:",
            updateError
          );
          // Continue with QR generation even if update fails
        }
      }

      const qrCodeOptions = {
        width: 400,
        margin: 4,
        errorCorrectionLevel: "H" as const,
        color: {
          dark: qrColor,
          light: "#FFFFFF"
        },
        logoUrl
      };

      // Update each user's QR code
      let updatedCount = 0;
      let errorCount = 0;

      // Process users sequentially to avoid memory issues and timeouts
      // Using very small batch size of 1 to prioritize reliability over speed
      for (const user of orgUsers) {
        if (!user.publicPath) {
          console.log(
            `[Organization] Skipping user ${user.id} - no public path found`
          );
          continue;
        }

        try {
          // Build the profile URL
          const baseUrl =
            process.env.PUBLIC_URL ||
            `${req.protocol}://${req.get("host") || "localhost"}`;
          const profileUrl = `${baseUrl}/${user.publicPath}`;

          console.log(
            `[Organization] Regenerating QR code for user ${user.id} with URL: ${profileUrl}`
          );

          // Generate new QR code with simplified method
          const qrCodeResult = await generateQRCode(profileUrl, qrCodeOptions);

          // Only save the QR code if it was successfully generated
          if (!qrCodeResult) {
            console.error(
              `[Organization] Failed to generate QR code for user ${user.id}`
            );
            errorCount++;
            continue;
          }

          // Prepare update object with basic data - now qrCodeResult is just a string
          const updateObj: Record<string, any> = {
            qrCodeUrl: qrCodeResult,
            qrCodeSvg: null // We're no longer using SVG storage
          };

          console.log(
            `[Organization] QR code data URL generated successfully for user ${user.id}`
          );

          // Update user with new QR code
          await db.update(users).set(updateObj).where(eq(users.id, user.id));

          console.log(
            `[Organization] QR code updated successfully for user ${user.id}`
          );
          updatedCount++;

          // Important: Add a small delay between iterations to avoid CPU spikes
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (userError) {
          console.error(
            `[Organization] Error updating QR code for user ${user.id}:`,
            userError
          );
          errorCount++;
        }
      }

      console.log(
        `[Organization] Successfully regenerated ${updatedCount} QR codes, ${errorCount} failed`
      );
      res.json({
        success: true,
        message: `${updatedCount} QR codes regenerated successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`
      });
    } catch (error) {
      console.error("[Organization] QR code regeneration error:", error);
      throw createApiError(
        "Failed to regenerate QR codes",
        500,
        ErrorCodes.SERVER_ERROR,
        "Server error while regenerating QR codes"
      );
    }
  }
);

// Get organizations with a specific domain
router.get(
  "/check-domain",
  asyncHandler(async (req: Request, res: Response) => {
    const {domain} = req.query;

    if (!domain || typeof domain !== "string") {
      return handleValidationError(
        res,
        "Domain parameter is required",
        "MISSING_DOMAIN"
      );
    }

    try {
      // Import email domain utilities
      const {isGenericEmailDomain} = await import(
        "../utils/email-domain-utils"
      );

      // Check if this is a generic email domain
      if (isGenericEmailDomain(domain)) {
        return res.json({
          companies: [],
          isGenericDomain: true,
          accountType: "individual"
        });
      }

      // Query organizations with the given domain
      const orgResults = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          domain: organizations.domain,
          logo: organizations.logo
        })
        .from(organizations)
        .where(eq(organizations.domain, domain));

      // Filter out organizations created by generic email users
      const filteredOrgs = await Promise.all(
        orgResults.map(async (org) => {
          // Find the creator (first admin user who joined earliest)
          const creator = await db
            .select({
              email: users.email
            })
            .from(userOrganizations)
            .leftJoin(users, eq(userOrganizations.userId, users.id))
            .where(
              and(
                eq(userOrganizations.organizationId, org.id),
                eq(userOrganizations.isCompanyAdmin, true)
              )
            )
            .orderBy(asc(userOrganizations.joinedAt))
            .limit(1);

          // Check if creator was found and has email
          const creatorEmail = creator.length > 0 ? creator[0]?.email : null;
          
          // If no creator found via userOrganizations, try legacy organizationId
          if (!creatorEmail) {
            const legacyCreator = await db
              .select({
                email: users.email
              })
              .from(users)
              .where(eq(users.organizationId, org.id))
              .orderBy(asc(users.createdAt))
              .limit(1);

            if (legacyCreator.length > 0 && legacyCreator[0]?.email) {
              const legacyCreatorEmail = legacyCreator[0].email;
              const legacyCreatorDomain = legacyCreatorEmail.split("@")[1];
              // Filter out if creator has generic email domain
              if (legacyCreatorDomain && isGenericEmailDomain(legacyCreatorDomain)) {
                return null;
              }
            }
            // If no creator found at all, include the organization (edge case)
            return org;
          }

          // Check if creator has generic email domain
          const creatorDomain = creatorEmail.split("@")[1];
          if (creatorDomain && isGenericEmailDomain(creatorDomain)) {
            return null;
          }

          return org;
        })
      );

      // Remove null entries (filtered out organizations)
      const validOrgs = filteredOrgs.filter((org) => org !== null) as typeof orgResults;

      // Get member details for each organization
      const companiesWithMembers = await Promise.all(
        validOrgs.map(async (org) => {
          // Get all members for this organization
          const members = await db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              profileImage: users.profileImage
            })
            .from(users)
            .where(eq(users.organizationId, org.id))
            .limit(10); // Get up to 10 members for each org

          return {
            id: org.id,
            name: org.name,
            domain: org.domain,
            logo: org.logo,
            memberCount: members.length,
            members: members.map((member) => ({
              id: member.id,
              name: `${member.firstName} ${member.lastName}`,
              profileImage: member.profileImage
            }))
          };
        })
      );

      return res.json({
        companies: companiesWithMembers,
        isGenericDomain: false,
        accountType: "company",
        hasExistingCompanies: companiesWithMembers.length > 0
      });
    } catch (error) {
      console.error("[Organization] Error checking domain:", error);
      throw createApiError(
        "Failed to check organizations by domain",
        500,
        ErrorCodes.DATABASE_ERROR,
        "Database error while checking organizations"
      );
    }
  })
);

/**
 * GET /api/organization/check-website
 * Check if a company website already exists in the database
 */
router.get(
  "/check-website",
  asyncHandler(async (req: Request, res: Response) => {
    const {website} = req.query;

    if (!website || typeof website !== "string") {
      return res.status(400).json({error: "Website URL is required"});
    }

    try {
      // Normalize the website URL for comparison
      // Remove protocol (http://, https://) and trailing slashes for consistent comparison
      const normalizedWebsite = website
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");

      // Get all organizations with their websites
      const existingOrgs = await db
        .select({
          id: organizations.id,
          website: organizations.website
        })
        .from(organizations);

      // Filter the results in JavaScript to compare normalized websites
      const matchingOrg = existingOrgs.find((org) => {
        if (!org.website) return false;
        const normalizedStoredWebsite = org.website
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "");
        return normalizedStoredWebsite === normalizedWebsite;
      });

      return res.json({
        exists: !!matchingOrg
      });
    } catch (error) {
      console.error("Error checking website:", error);
      res.status(500).json({error: "Internal server error"});
    }
  })
);

// GET /api/organization/check-auto-join
router.get("/check-auto-join", async (req, res) => {
  try {
    const {email} = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        details: "Email is required"
      });
    }

    // Extract domain from email
    const domain = email.split("@")[1];

    if (!domain) {
      return res.status(400).json({
        error: "Invalid Email",
        details: "Could not extract domain from email"
      });
    }

    // Import email domain utilities
    const {isGenericEmailDomain} = await import("../utils/email-domain-utils");

    // Generic email domains cannot auto-join companies
    if (isGenericEmailDomain(domain)) {
      return res.json({
        canAutoJoin: false,
        organizations: [],
        isGenericDomain: true,
        accountType: "individual"
      });
    }

    // Find organizations with matching domain and auto-join enabled
    const matchingOrgs = await db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.domain, domain),
          eq(organizations.autoJoin, "true")
        )
      );

    return res.json({
      canAutoJoin: matchingOrgs.length > 0,
      organizations: matchingOrgs,
      isGenericDomain: false,
      accountType: "company"
    });
  } catch (error) {
    console.error("[Organization] Error checking auto-join:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: "Failed to check auto-join capability"
    });
  }
});

// Apply authentication middleware to protected routes
router.patch("/", requireAuth, updateOrganization);
router.patch("/qr-settings", requireAuth, updateQRCodeSettings);
router.post("/regenerate-qr-codes", requireAuth, regenerateQRCodes);
router.post("/logo", requireAuth, upload.single("logo"), (req, res, next) => {
  console.log(
    "[Organization] Logo upload middleware received request with file:",
    req.file
  );
  uploadLogo(req, res, next);
});

// Add a new route for handling logo uploads via database images
router.post("/logo-db", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log("[Organization] Database logo upload received request");
    const {dbImageId} = req.body;

    if (!dbImageId) {
      return res.status(400).json({error: "Missing dbImageId parameter"});
    }

    // Get the user from request
    const user = req.user as User | undefined;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's primary organization
    const primaryOrg = await dbStorage.getPrimaryOrganization(userId);
    if (!primaryOrg) {
      return res.status(401).json({error: "User not part of an organization"});
    }

    // Get current organization to check for existing logo
    const [currentOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));

    // Delete previous logo if it exists and is a database image
    if (currentOrg?.logo?.startsWith("/api/db-images/")) {
      const existingImageId = parseInt(
        currentOrg.logo.replace("/api/db-images/", "")
      );

      if (!isNaN(existingImageId)) {
        // Delete the old image to save space
        console.log(
          `[Organization] Deleting previous logo image: ${existingImageId}`
        );
        await dbImageStorage.deleteImage(existingImageId);
      }
    }

    // Update the organization with the image ID from the database
    const updatedOrg = await db
      .update(organizations)
      .set({
        logo: `/api/db-images/${dbImageId}`,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, primaryOrg.organizationId))
      .returning();

    const result = updatedOrg.length > 0 ? updatedOrg[0] : null;

    if (!result) {
      return res.status(404).json({error: "Organization not found"});
    }

    res.status(200).json({
      logo: result.logo,
      message: "Organization logo updated successfully"
    });
  } catch (error) {
    console.error("[Organization] Error updating logo:", error);
    res.status(500).json({error: "Failed to update organization logo"});
  }
});

// Add a new route for handling QR logo uploads via database images
router.post("/qr-logo", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log("[Organization] QR logo upload received request");
    const {dbImageId} = req.body;

    if (!dbImageId) {
      return res.status(400).json({error: "Missing dbImageId parameter"});
    }

    // Get the user from request
    const user = req.user as User | undefined;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's primary organization
    const primaryOrg = await dbStorage.getPrimaryOrganization(userId);
    if (!primaryOrg) {
      return res.status(401).json({error: "User not part of an organization"});
    }

    // Get current organization to check for existing QR logo
    const [currentOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, primaryOrg.organizationId));

    // Delete previous QR logo if it exists and is a database image
    if (currentOrg?.qrLogoUrl?.startsWith("/api/db-images/")) {
      const existingImageId = parseInt(
        currentOrg.qrLogoUrl.replace("/api/db-images/", "")
      );

      if (!isNaN(existingImageId)) {
        // Delete the old image to save space
        console.log(
          `[Organization] Deleting previous QR logo image: ${existingImageId}`
        );
        await dbImageStorage.deleteImage(existingImageId);
      }
    }

    // Update the organization with the image ID from the database
    const updatedOrg = await db
      .update(organizations)
      .set({
        qrLogoUrl: `/api/db-images/${dbImageId}`,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, primaryOrg.organizationId))
      .returning();

    const result = updatedOrg.length > 0 ? updatedOrg[0] : null;

    if (!result) {
      return res.status(404).json({error: "Organization not found"});
    }

    res.status(200).json({
      qrLogoUrl: result.qrLogoUrl,
      message: "Organization QR logo updated successfully"
    });
  } catch (error) {
    console.error("[Organization] Error updating QR logo:", error);
    res.status(500).json({error: "Failed to update organization QR logo"});
  }
});

router.get("/", requireAuth, getOrganization);
router.get("/:id", getOrganizationById); // Public endpoint, no auth required
