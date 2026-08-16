import {Request, Response, Router} from "express";
import {db} from "../db";
import {
  userOrganizations,
  users,
  organizations,
  invitations
} from "@shared/tables";
import {eq, and, desc, asc, sql, count, inArray} from "drizzle-orm";
import {User} from "@shared/types/user";
import {requireAuth} from "../auth";
import {
  createApiError,
  ErrorCodes,
  handleValidationError,
  asyncHandler
} from "../utils/error-handler";
import {sendInvitationEmail} from "../services/mailtrap-email";
import crypto from "crypto";

// Define custom request interface with the User type
interface RequestWithUser extends Request {
  user?: User;
}

const router = Router();

// Helper function to check if user is company admin in organization
async function checkCompanyAdminAccess(
  userId: number,
  organizationId: number
): Promise<boolean> {
  console.log("checkCompanyAdminAccess", userId, organizationId);
  const userAccess = await db
    .select()
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, organizationId),
        eq(userOrganizations.isCompanyAdmin, true)
      )
    );

  return userAccess.length > 0;
}

// Helper function to get user's current organization
async function getUserCurrentOrganization(
  userId: number
): Promise<number | null> {
  const primaryOrg = await db
    .select({organizationId: userOrganizations.organizationId})
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.isPrimary, true)
      )
    )
    .limit(1);

  if (primaryOrg.length > 0) {
    return primaryOrg[0].organizationId;
  }

  // Fallback to any organization the user is in
  const anyOrg = await db
    .select({organizationId: userOrganizations.organizationId})
    .from(userOrganizations)
    .where(eq(userOrganizations.userId, userId))
    .limit(1);

  return anyOrg.length > 0 ? anyOrg[0].organizationId : null;
}

// Transform status from database to frontend format
function transformMemberStatus(
  userOrgData: any,
  invitationData: any
): "Active" | "Invited" | "Inactive" {
  if (invitationData && !userOrgData.joinedAt) {
    return "Invited";
  }
  if (userOrgData.isActive) {
    return "Active";
  }
  return "Inactive";
}

// GET /api/team/members - Get all team members for client-side filtering
export const getTeamMembers = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    // Get user's current organization
    const organizationId = await getUserCurrentOrganization(req.user.id);
    if (!organizationId) {
      return res
        .status(403)
        .json({error: "User not associated with any organization"});
    }

    try {
      // Get all team members for the organization
      const results = await db
        .select({
          user: users,
          userOrganization: userOrganizations
        })
        .from(userOrganizations)
        .leftJoin(users, eq(userOrganizations.userId, users.id))
        .where(eq(userOrganizations.organizationId, organizationId))
        .orderBy(asc(users.firstName), asc(users.lastName));

      // Get invitation data for status determination (latest invitation per user)
      const userEmails = results
        .filter((row) => row.user)
        .map((row) => row.user!.email);

      const invitationData =
        userEmails.length > 0
          ? await db
              .select({
                email: invitations.email,
                createdAt: invitations.createdAt
              })
              .from(invitations)
              .where(
                and(
                  eq(invitations.organizationId, organizationId),
                  inArray(invitations.email, userEmails)
                )
              )
              .orderBy(desc(invitations.createdAt))
          : [];

      // Create a map of email to latest invitation
      const latestInvitations = new Map<string, (typeof invitationData)[0]>();
      invitationData.forEach((inv) => {
        if (!latestInvitations.has(inv.email)) {
          latestInvitations.set(inv.email, inv);
        }
      });

      // Transform results to match frontend interface
      const members = results
        .filter((row) => row.user) // Filter out rows where user is null
        .map((row) => {
          const latestInvitation = latestInvitations.get(row.user!.email);
          return {
            id: row.user!.id.toString(),
            firstName: row.user!.firstName,
            lastName: row.user!.lastName,
            email: row.user!.email,
            profileImage: row.user!.profileImage,
            role: row.userOrganization.isCompanyAdmin
              ? "Company Admin"
              : "User",
            status: transformMemberStatus(
              row.userOrganization,
              latestInvitation
            ),
            invitedAt: latestInvitation?.createdAt?.toISOString(),
            joinedAt: row.userOrganization.joinedAt?.toISOString()
          };
        });

      res.json({members});
    } catch (error) {
      console.error("[TeamMembers] Error getting team members:", error);
      throw createApiError(
        "Failed to get team members",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// DELETE /api/team/members/:id - Delete a team member
export const deleteTeamMember = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {id: memberIdStr} = req.params;
    const memberId = parseInt(memberIdStr);

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!memberId || isNaN(memberId)) {
      return handleValidationError(
        res,
        "Invalid member ID",
        "INVALID_MEMBER_ID"
      );
    }

    // Get user's current organization
    const organizationId = await getUserCurrentOrganization(req.user.id);
    if (!organizationId) {
      return res
        .status(403)
        .json({error: "User not associated with any organization"});
    }

    // Check if user is company admin
    const isCompanyAdmin = await checkCompanyAdminAccess(
      req.user.id,
      organizationId
    );
    if (!isCompanyAdmin) {
      return res
        .status(403)
        .json({error: "You don't have admin access to this organization"});
    }

    try {
      // Don't allow removing yourself if you're the last admin
      if (memberId === req.user.id) {
        const adminCount = await db
          .select({count: count()})
          .from(userOrganizations)
          .where(
            and(
              eq(userOrganizations.organizationId, organizationId),
              eq(userOrganizations.isCompanyAdmin, true)
            )
          );

        if (adminCount[0]?.count <= 1) {
          return res.status(400).json({
            error: "Cannot remove the last admin from an organization"
          });
        }
      }

      // Check if the user being removed has this as their primary organization
      const userOrgRelation = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, memberId),
            eq(userOrganizations.organizationId, organizationId)
          )
        )
        .limit(1);

      const wasPrimary = userOrgRelation[0]?.isPrimary;

      // Remove user from organization
      const deletedRows = await db
        .delete(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, memberId),
            eq(userOrganizations.organizationId, organizationId)
          )
        );

      // If this was their primary organization, set another organization as primary if they have any
      if (wasPrimary) {
        console.log(`[TeamMembers] User ${memberId} was removed from their primary organization, checking for other organizations`);
        
        const otherOrganizations = await db
          .select()
          .from(userOrganizations)
          .where(eq(userOrganizations.userId, memberId))
          .limit(1);

        if (otherOrganizations.length > 0) {
          console.log(`[TeamMembers] Setting organization ${otherOrganizations[0].organizationId} as new primary for user ${memberId}`);
          
          await db
            .update(userOrganizations)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(
              and(
                eq(userOrganizations.userId, memberId),
                eq(userOrganizations.organizationId, otherOrganizations[0].organizationId)
              )
            );
        } else {
          console.log(`[TeamMembers] User ${memberId} has no other organizations after removal`);
        }
      }

      if (deletedRows.rowCount === 0) {
        return res.status(404).json({error: "Team member not found"});
      }

      console.log(
        `[TeamMembers] Removed user ${memberId} from organization ${organizationId}`
      );
      res.status(204).send();
    } catch (error) {
      console.error("[TeamMembers] Error deleting team member:", error);
      throw createApiError(
        "Failed to delete team member",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// PATCH /api/team/members/:id - Update team member role and status
export const updateTeamMember = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {id: memberIdStr} = req.params;
    const memberId = parseInt(memberIdStr);
    const {role, status} = req.body;

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!memberId || isNaN(memberId)) {
      return handleValidationError(
        res,
        "Invalid member ID",
        "INVALID_MEMBER_ID"
      );
    }

    // Get user's current organization
    const organizationId = await getUserCurrentOrganization(req.user.id);
    if (!organizationId) {
      return res
        .status(403)
        .json({error: "User not associated with any organization"});
    }

    // Check if user is company admin
    const isCompanyAdmin = await checkCompanyAdminAccess(
      req.user.id,
      organizationId
    );
    if (!isCompanyAdmin) {
      return res
        .status(403)
        .json({error: "You don't have admin access to this organization"});
    }

    try {
      // Prepare update data
      const updateData: any = {updatedAt: new Date()};

      if (role !== undefined) {
        updateData.isCompanyAdmin = role === "Company Admin";
      }

      if (status !== undefined) {
        updateData.isActive = status === "Active";
      }

      // Update user organization
      const [updatedMember] = await db
        .update(userOrganizations)
        .set(updateData)
        .where(
          and(
            eq(userOrganizations.userId, memberId),
            eq(userOrganizations.organizationId, organizationId)
          )
        )
        .returning();

      if (!updatedMember) {
        return res.status(404).json({error: "Team member not found"});
      }

      // Get updated user details
      const [userDetails] = await db
        .select()
        .from(users)
        .where(eq(users.id, memberId));

      if (!userDetails) {
        return res.status(404).json({error: "User not found"});
      }

      const responseData = {
        id: userDetails.id.toString(),
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        email: userDetails.email,
        profileImage: userDetails.profileImage,
        role: updatedMember.isCompanyAdmin ? "Company Admin" : "User",
        status: updatedMember.isActive ? "Active" : "Inactive",
        joinedAt: updatedMember.joinedAt?.toISOString()
      };

      console.log(
        `[TeamMembers] Updated user ${memberId} in organization ${organizationId}`
      );
      res.json(responseData);
    } catch (error) {
      console.error("[TeamMembers] Error updating team member:", error);
      throw createApiError(
        "Failed to update team member",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// POST /api/team/members/bulk-delete - Bulk delete team members
export const bulkDeleteTeamMembers = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {memberIds} = req.body;

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return handleValidationError(
        res,
        "Member IDs array is required",
        "INVALID_MEMBER_IDS"
      );
    }

    // Convert string IDs to numbers
    const numericMemberIds = memberIds
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));

    if (numericMemberIds.length === 0) {
      return handleValidationError(
        res,
        "Invalid member IDs",
        "INVALID_MEMBER_IDS"
      );
    }

    // Get user's current organization
    const organizationId = await getUserCurrentOrganization(req.user.id);
    if (!organizationId) {
      return res
        .status(403)
        .json({error: "User not associated with any organization"});
    }

    // Check if user is company admin
    const isCompanyAdmin = await checkCompanyAdminAccess(
      req.user.id,
      organizationId
    );
    if (!isCompanyAdmin) {
      return res
        .status(403)
        .json({error: "You don't have admin access to this organization"});
    }

    try {
      // Check if trying to remove yourself and if you're the last admin
      if (numericMemberIds.includes(req.user.id)) {
        const adminCount = await db
          .select({count: count()})
          .from(userOrganizations)
          .where(
            and(
              eq(userOrganizations.organizationId, organizationId),
              eq(userOrganizations.isCompanyAdmin, true)
            )
          );

        if (adminCount[0]?.count <= 1) {
          return res.status(400).json({
            error: "Cannot remove the last admin from an organization"
          });
        }
      }

      // Delete members
      const deletedRows = await db
        .delete(userOrganizations)
        .where(
          and(
            sql`${userOrganizations.userId} = ANY(${numericMemberIds})`,
            eq(userOrganizations.organizationId, organizationId)
          )
        );

      console.log(
        `[TeamMembers] Bulk deleted ${deletedRows.rowCount} users from organization ${organizationId}`
      );
      res.json({
        message: `Successfully deleted ${deletedRows.rowCount} team members`,
        deletedCount: deletedRows.rowCount
      });
    } catch (error) {
      console.error("[TeamMembers] Error bulk deleting team members:", error);
      throw createApiError(
        "Failed to delete team members",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// POST /api/team/members/:id/resend-invitation - Resend invitation to a team member
export const resendInvitation = asyncHandler(
  async (req: RequestWithUser, res: Response) => {
    const {id: memberIdStr} = req.params;
    const memberId = parseInt(memberIdStr);

    if (!req.user?.id) {
      return res.status(401).json({error: "User not authenticated"});
    }

    if (!memberId || isNaN(memberId)) {
      return handleValidationError(
        res,
        "Invalid member ID",
        "INVALID_MEMBER_ID"
      );
    }

    // Get user's current organization
    const organizationId = await getUserCurrentOrganization(req.user.id);
    if (!organizationId) {
      return res
        .status(403)
        .json({error: "User not associated with any organization"});
    }

    // Check if user is company admin
    const isCompanyAdmin = await checkCompanyAdminAccess(
      req.user.id,
      organizationId
    );
    if (!isCompanyAdmin) {
      return res
        .status(403)
        .json({error: "You don't have admin access to this organization"});
    }

    try {
      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, memberId));

      if (!user) {
        return res.status(404).json({error: "User not found"});
      }

      // Check if user has an existing invitation
      const [existingInvitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, user.email),
            eq(invitations.organizationId, organizationId)
          )
        );

      // Get organization details
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!organization) {
        return res.status(404).json({error: "Organization not found"});
      }

      let invitationToken: string;

      if (existingInvitation) {
        // Use existing token
        invitationToken = existingInvitation.token;
      } else {
        // Create new invitation
        invitationToken = crypto.randomBytes(32).toString("hex");

        // Set expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.insert(invitations).values({
          email: user.email,
          organizationId,
          invitedBy: req.user.id,
          token: invitationToken,
          expiresAt
        });
      }

      // Create invitation URL
      const protocol =
        req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host =
        req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
      const invitationUrl = `${protocol}://${host}/register?token=${invitationToken}`;

      // Send invitation email
      await sendInvitationEmail({
        to: user.email,
        invitationUrl,
        organization,
        inviter: req.user
      });

      console.log(`[TeamMembers] Resent invitation to ${user.email}`);
      res.json({message: "Invitation resent successfully"});
    } catch (error) {
      console.error("[TeamMembers] Error resending invitation:", error);
      throw createApiError(
        "Failed to resend invitation",
        500,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }
);

// Set up routes
router.get("/", requireAuth, getTeamMembers);
router.delete("/:id", requireAuth, deleteTeamMember);
router.patch("/:id", requireAuth, updateTeamMember);
router.post("/bulk-delete", requireAuth, bulkDeleteTeamMembers);
router.post("/:id/resend-invitation", requireAuth, resendInvitation);

export default router;
