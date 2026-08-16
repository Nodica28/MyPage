import {Request, Response, Router} from "express";
import {db} from "../db";
import {userOrganizations, users, organizations} from "@shared/tables";
import {eq, and} from "drizzle-orm";
import {User} from "@shared/types/user";
import {requireAuth} from "../auth";
import {
  createApiError,
  ErrorCodes,
  handleValidationError,
  asyncHandler
} from "../utils/error-handler";

// Define custom request interface with the User type
interface RequestWithUser extends Request {
  user?: User;
}

const router = Router();

// Get all organizations for a user
export const getUserOrganizations = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    console.log("[UserOrgs] Getting organizations for user:", req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    try {
      // First check what's in userOrganizations table
      const userOrgResults = await db
        .select()
        .from(userOrganizations)
        .where(eq(userOrganizations.userId, req.user.id));
      
      console.log(`[UserOrgs] Raw userOrganizations for user ${req.user.id}:`, userOrgResults);

      // Also check if user has organizationId in legacy users table
      const userResult = await db
        .select({
          id: users.id,
          organizationId: users.organizationId
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);
      
      console.log(`[UserOrgs] Legacy user organizationId for user ${req.user.id}:`, userResult[0]?.organizationId);

      // Auto-migrate user if they have legacy organizationId but no userOrganizations entries
      if (userOrgResults.length === 0 && userResult[0]?.organizationId) {
        console.log(`[UserOrgs] Auto-migrating user ${req.user.id} to userOrganizations table`);
        
        try {
          await db
            .insert(userOrganizations)
            .values({
              userId: req.user.id,
              organizationId: userResult[0].organizationId,
              isPrimary: true,
              isCompanyAdmin: true,
              isActive: true
            });
          
          console.log(`[UserOrgs] Successfully migrated user ${req.user.id} to userOrganizations`);
        } catch (migrationError) {
          console.error(`[UserOrgs] Failed to migrate user ${req.user.id}:`, migrationError);
        }
      }

      const results = await db
        .select({
          userOrganization: userOrganizations,
          organization: organizations
        })
        .from(userOrganizations)
        .leftJoin(
          organizations,
          eq(userOrganizations.organizationId, organizations.id)
        )
        .where(eq(userOrganizations.userId, req.user.id));

      // Get member counts for each organization
      const formattedResults = await Promise.all(
        results.map(async (row) => {
          if (!row.organization) {
            return {
              ...row.userOrganization,
              organization: null
            };
          }

          // Count members in this organization from userOrganizations table
          const memberCount = await db
            .select({count: userOrganizations.userId})
            .from(userOrganizations)
            .where(
              and(
                eq(userOrganizations.organizationId, row.organization.id),
                eq(userOrganizations.isActive, true)
              )
            );

          // Also count legacy members from users table for comparison
          const legacyMemberCount = await db
            .select({count: users.id})
            .from(users)
            .where(eq(users.organizationId, row.organization.id));

          // Use the higher count (in case migration is in progress)
          const totalMemberCount = Math.max(
            memberCount.length,
            legacyMemberCount.length
          );

          return {
            ...row.userOrganization,
            organization: {
              ...row.organization,
              memberCount: totalMemberCount
            }
          };
        })
      );

      console.log(
        `[UserOrgs] Found ${formattedResults.length} organizations for user ${req.user.id}`
      );
      res.json(formattedResults);
    } catch (error) {
      console.error("[UserOrgs] Error getting user organizations:", error);
      throw createApiError(
        "Failed to get user organizations",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Get all users for an organization
export const getOrganizationUsers = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {organizationId} = req.params;
    console.log(`[UserOrgs] Getting users for organization: ${organizationId}`);

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!organizationId || isNaN(parseInt(organizationId))) {
      return handleValidationError(
        res,
        "Invalid organization ID",
        "INVALID_ORGANIZATION_ID"
      );
    }

    try {
      // Check if user has access to this organization
      const userAccess = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        );

      if (userAccess.length === 0) {
        return res.status(403).json({
          error: "You don't have access to this organization"
        });
      }

      // Get all users in the organization
      const results = await db
        .select({
          userOrganization: userOrganizations,
          user: users
        })
        .from(userOrganizations)
        .leftJoin(users, eq(userOrganizations.userId, users.id))
        .where(eq(userOrganizations.organizationId, parseInt(organizationId)));

      const formattedResults = results.map((row) => ({
        ...row.userOrganization,
        user: {
          ...row.user,
          password: undefined // Remove sensitive data
        }
      }));

      console.log(
        `[UserOrgs] Found ${formattedResults.length} users for organization ${organizationId}`
      );
      res.json(formattedResults);
    } catch (error) {
      console.error("[UserOrgs] Error getting organization users:", error);
      throw createApiError(
        "Failed to get organization users",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Add a user to an organization
export const addUserToOrganization = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {organizationId} = req.params;
    const {userId, isCompanyAdmin = false, isPrimary = false} = req.body;

    console.log(
      `[UserOrgs] Adding user ${userId} to organization ${organizationId}`
    );

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!organizationId || isNaN(parseInt(organizationId))) {
      return handleValidationError(
        res,
        "Invalid organization ID",
        "INVALID_ORGANIZATION_ID"
      );
    }

    if (!userId || isNaN(parseInt(userId))) {
      return handleValidationError(res, "Invalid user ID", "INVALID_USER_ID");
    }

    try {
      // Check if the requesting user is an admin in this organization
      const userAccess = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId)),
            eq(userOrganizations.isCompanyAdmin, true)
          )
        );

      if (userAccess.length === 0) {
        return res.status(403).json({
          error: "You don't have admin access to this organization"
        });
      }

      // Check if user already exists in organization
      const existingUserOrg = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, parseInt(userId)),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        );

      if (existingUserOrg.length > 0) {
        return res.status(400).json({
          error: "User is already a member of this organization"
        });
      }

      // If setting this as primary, update existing primary organizations to non-primary
      if (isPrimary) {
        await db
          .update(userOrganizations)
          .set({isPrimary: false})
          .where(eq(userOrganizations.userId, parseInt(userId)));
      }

      // Add user to organization
      const [result] = await db
        .insert(userOrganizations)
        .values({
          userId: parseInt(userId),
          organizationId: parseInt(organizationId),
          isCompanyAdmin,
          isPrimary,
          isActive: true,
          joinedAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(
        `[UserOrgs] Added user ${userId} to organization ${organizationId}:`,
        result
      );
      res.status(201).json(result);
    } catch (error) {
      console.error("[UserOrgs] Error adding user to organization:", error);
      throw createApiError(
        "Failed to add user to organization",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Remove a user from an organization
export const removeUserFromOrganization = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {organizationId, userId} = req.params;

    console.log(
      `[UserOrgs] Removing user ${userId} from organization ${organizationId}`
    );

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!organizationId || isNaN(parseInt(organizationId))) {
      return handleValidationError(
        res,
        "Invalid organization ID",
        "INVALID_ORGANIZATION_ID"
      );
    }

    if (!userId || isNaN(parseInt(userId))) {
      return handleValidationError(res, "Invalid user ID", "INVALID_USER_ID");
    }

    try {
      // Check if the requesting user is an admin in this organization
      const userAccess = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId)),
            eq(userOrganizations.isCompanyAdmin, true)
          )
        );

      if (userAccess.length === 0) {
        return res.status(403).json({
          error: "You don't have admin access to this organization"
        });
      }

      // Don't allow removing yourself if you're the last admin
      if (parseInt(userId) === req.user.id) {
        const adminCount = await db
          .select()
          .from(userOrganizations)
          .where(
            and(
              eq(userOrganizations.organizationId, parseInt(organizationId)),
              eq(userOrganizations.isCompanyAdmin, true)
            )
          );

        if (adminCount.length <= 1) {
          return res.status(400).json({
            error: "Cannot remove the last admin from an organization"
          });
        }
      }

      // Remove user from organization
      await db
        .delete(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, parseInt(userId)),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        );

      console.log(
        `[UserOrgs] Removed user ${userId} from organization ${organizationId}`
      );
      res.status(204).send();
    } catch (error) {
      console.error("[UserOrgs] Error removing user from organization:", error);
      throw createApiError(
        "Failed to remove user from organization",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Set an organization as primary for a user
export const setPrimaryOrganization = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {organizationId} = req.params;

    console.log(
      `[UserOrgs] Setting organization ${organizationId} as primary for user ${req.user?.id}`
    );

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!organizationId || isNaN(parseInt(organizationId))) {
      return handleValidationError(
        res,
        "Invalid organization ID",
        "INVALID_ORGANIZATION_ID"
      );
    }

    try {
      // Check if user is a member of this organization
      const userAccess = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        );

      if (userAccess.length === 0) {
        return res.status(403).json({
          error: "You are not a member of this organization"
        });
      }

      // Set all other organizations as non-primary
      await db
        .update(userOrganizations)
        .set({isPrimary: false})
        .where(eq(userOrganizations.userId, req.user.id));

      // Set the requested organization as primary
      const [result] = await db
        .update(userOrganizations)
        .set({isPrimary: true, updatedAt: new Date()})
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        )
        .returning();

      console.log(
        `[UserOrgs] Set organization ${organizationId} as primary for user ${req.user.id}:`,
        result
      );
      res.json(result);
    } catch (error) {
      console.error("[UserOrgs] Error setting primary organization:", error);
      throw createApiError(
        "Failed to set primary organization",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Switch primary organization (alternative endpoint for convenience)
export const switchPrimaryOrganization = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {organizationId} = req.body;

    console.log(
      `[UserOrgs] Switching primary organization to ${organizationId} for user ${req.user?.id}`
    );

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!organizationId || isNaN(parseInt(organizationId))) {
      return handleValidationError(
        res,
        "Invalid organization ID",
        "INVALID_ORGANIZATION_ID"
      );
    }

    try {
      // Check if user is a member of this organization
      const userAccess = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        );

      if (userAccess.length === 0) {
        return res.status(403).json({
          error: "You are not a member of this organization"
        });
      }

      // Set all other organizations as non-primary
      await db
        .update(userOrganizations)
        .set({isPrimary: false, updatedAt: new Date()})
        .where(eq(userOrganizations.userId, req.user.id));

      // Set the requested organization as primary
      const [result] = await db
        .update(userOrganizations)
        .set({isPrimary: true, updatedAt: new Date()})
        .where(
          and(
            eq(userOrganizations.userId, req.user.id),
            eq(userOrganizations.organizationId, parseInt(organizationId))
          )
        )
        .returning();

      console.log(
        `[UserOrgs] Switched primary organization to ${organizationId} for user ${req.user.id}:`,
        result
      );
      
      res.json({
        success: true,
        message: "Primary organization switched successfully",
        result
      });
    } catch (error) {
      console.error("[UserOrgs] Error switching primary organization:", error);
      throw createApiError(
        "Failed to switch primary organization",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Set up routes
router.get("/me/organizations", requireAuth, getUserOrganizations);
router.get(
  "/organizations/:organizationId/users",
  requireAuth,
  getOrganizationUsers
);
router.post(
  "/organizations/:organizationId/users",
  requireAuth,
  addUserToOrganization
);
router.delete(
  "/organizations/:organizationId/users/:userId",
  requireAuth,
  removeUserFromOrganization
);
router.put(
  "/me/organizations/:organizationId/primary",
  requireAuth,
  setPrimaryOrganization
);
router.post(
  "/switch-primary",
  requireAuth,
  switchPrimaryOrganization
);

export default router;
