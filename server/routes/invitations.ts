import express from "express";
import {storage} from "../storage";
import crypto from "crypto";
import {sendInvitationEmail} from "../services/mailtrap-email";

const router = express.Router();

/**
 * Send invitations to multiple email addresses
 * POST /api/invitations
 */
router.post("/", async (req, res) => {
  try {
    const {emails, organizationId, invitedBy, publicToken, noExpiration, role} =
      req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({error: "No email addresses provided"});
    }

    if (!organizationId) {
      return res.status(400).json({error: "Organization ID is required"});
    }

    // Get organization details for email
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({error: "Organization not found"});
    }

    // If a publicToken was provided, update the organization
    if (publicToken) {
      try {
        await storage.updateOrganization(organizationId, {publicToken});
        console.log(`Updated organization ${organizationId} with publicToken`);
      } catch (tokenError) {
        console.error(
          "Failed to update organization with publicToken:",
          tokenError
        );
        // Continue with invitations even if token update fails
      }
    }

    // Get inviter details - use the logged-in user if invitedBy is not specified
    const inviter = invitedBy
      ? await storage.getUser(invitedBy)
      : req.session.passport?.user
        ? await storage.getUser(req.session.passport.user)
        : null;

    const invitationResults = [];

    // Process each email
    for (const email of emails) {
      if (!email || typeof email !== "string" || !email.includes("@")) {
        invitationResults.push({
          email,
          success: false,
          error: "Invalid email address"
        });
        continue;
      }

      try {
        // Generate a unique token for each invitation
        const invitationToken = crypto.randomBytes(32).toString("hex");

        // Set expiration date (30 days from now) unless noExpiration is true
        const expiresAt = noExpiration
          ? null
          : (() => {
              const date = new Date();
              date.setDate(date.getDate() + 30);
              return date;
            })();

        // Store invitation in database
        const invitation = await storage.createInvitation({
          email,
          organizationId,
          invitedBy: inviter?.id || null,
          token: invitationToken,
          role: role || "User", // Default to User if no role specified
          expiresAt
        });

        // Create invitation URL with proper domain (not just a relative path)
        let invitationUrl = `/register?token=${invitationToken}`;

        // Check if we can get the request URL base
        try {
          // Try to construct a base URL from request headers
          const protocol =
            req.headers["x-forwarded-proto"] || req.protocol || "http";
          const host =
            req.headers["x-forwarded-host"] ||
            req.headers.host ||
            "localhost:3000";

          // Create an absolute URL with protocol and host
          invitationUrl = `${protocol}://${host}/register?token=${invitationToken}`;
          console.log(`Generated absolute invitation URL: ${invitationUrl}`);
        } catch (urlError) {
          console.warn(
            `Could not create absolute URL, using relative path instead: ${invitationUrl}`,
            urlError
          );
        }

        // Add additional logging for troubleshooting
        console.log(
          `Creating invitation for ${email} with token: ${invitationToken.substring(0, 8)}...`
        );
        console.log(`Invitation URL: ${invitationUrl}`);

        // Send invitation email
        await sendInvitationEmail({
          to: email,
          invitationUrl,
          organization: organization,
          inviter: inviter
        });
        console.log(`Successfully sent invitation email to ${email}`);

        invitationResults.push({
          email,
          success: true,
          invitationId: invitation.id
        });
      } catch (error) {
        console.error(`Error sending invitation to ${email}:`, error);
        invitationResults.push({
          email,
          success: false,
          error: "Failed to send invitation"
        });
      }
    }

    return res.json({
      message: "Invitations processed",
      results: invitationResults
    });
  } catch (error) {
    console.error("Error processing invitations:", error);
    return res.status(500).json({error: "Failed to process invitations"});
  }
});

/**
 * Verify an invitation token
 * GET /api/invitations/:token
 */
router.get("/:token", async (req, res) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({error: "Invitation token is required"});
    }

    // Check if user is authenticated
    const isAuthenticated = !!req.session?.passport?.user;
    let existingUser = null;

    if (isAuthenticated) {
      existingUser = await storage.getUser(req.session.passport?.user || 0);
    }

    // Find the invitation by token
    const invitation = await storage.getInvitation(token);

    // If no invitation found with this token, check if it's a public token from an organization
    if (!invitation) {
      const organization = await storage.getOrganizationByPublicToken(token);

      if (organization) {
        // Return organization info with public token flag
        return res.json({
          organization: {
            id: organization.id,
            name: organization.name,
            domain: organization.domain,
            logo: organization.logo,
            description: organization.description,
            website: organization.website,
            defaultColor: organization.defaultColor
          },
          invitation: null,
          inviter: null,
          existingUser: existingUser,
          shouldJoinCompany: isAuthenticated
        });
      } else {
        return res.status(404).json({error: "Invalid or expired invitation"});
      }
    }

    // Check if invitation has expired (only if expiresAt is set)
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return res.status(410).json({error: "Invitation has expired"});
    }

    // Get organization information
    const organization = invitation.organizationId
      ? await storage.getOrganization(invitation.organizationId)
      : null;

    // Get inviter information (if available)
    const inviter = invitation.invitedBy
      ? await storage.getUser(invitation.invitedBy)
      : null;

    // Check if existing user should be redirected to join page
    let shouldJoinCompany = false;
    if (isAuthenticated && existingUser) {
      // Check if user's email matches invitation email
      const emailMatches = existingUser.email === invitation.email;

      // Check if user is already a member of this organization
      const userOrgs = await storage.getUserOrganizations(existingUser.id);
      const alreadyMember = userOrgs.some(
        (org) => org.organizationId === invitation.organizationId
      );

      shouldJoinCompany = emailMatches && !alreadyMember;
    }

    // Return invitation details and organization info
    return res.json({
      isPublicToken: false,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        token: token,
        createdAt: invitation.createdAt
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            domain: organization.domain,
            logo: organization.logo,
            description: organization.description,
            website: organization.website,
            defaultColor: organization.defaultColor
          }
        : null,
      inviter: inviter
        ? {
            id: inviter.id,
            name: `${inviter.firstName} ${inviter.lastName}`,
            email: inviter.email
          }
        : null,
      existingUser: existingUser,
      shouldJoinCompany: shouldJoinCompany,
      emailMatches: isAuthenticated
        ? existingUser?.email === invitation.email
        : false
    });
  } catch (error) {
    console.error("Error verifying invitation:", error);
    return res.status(500).json({error: "Failed to verify invitation"});
  }
});

/**
 * Create a non-expiring public invitation link
 * POST /api/invitations/public
 */
router.post("/public", async (req, res) => {
  try {
    const {organizationId, publicToken} = req.body;

    if (!organizationId) {
      return res.status(400).json({error: "Organization ID is required"});
    }

    // Get organization details
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({error: "Organization not found"});
    }

    // If a publicToken was provided, update the organization
    if (publicToken) {
      try {
        await storage.updateOrganization(organizationId, {publicToken});
        console.log(
          `Updated organization ${organizationId} with non-expiring publicToken`
        );
      } catch (tokenError) {
        console.error(
          "Failed to update organization with publicToken:",
          tokenError
        );
        return res.status(500).json({error: "Failed to set public token"});
      }
    }

    return res.json({
      message: "Public invitation link created successfully",
      publicToken: publicToken,
      invitationUrl: `${req.protocol}://${req.get("host")}/register?token=${publicToken}`
    });
  } catch (error) {
    console.error("Error creating public invitation:", error);
    return res.status(500).json({error: "Failed to create public invitation"});
  }
});

/**
 * Accept invitation for existing users
 * POST /api/invitations/accept
 */
router.post("/accept", async (req, res) => {
  try {
    const {token, organizationId, role} = req.body;

    if (!token) {
      return res.status(400).json({error: "Invitation token is required"});
    }

    if (!req.session?.passport?.user) {
      return res
        .status(401)
        .json({error: "User must be authenticated to accept invitation"});
    }

    const userId = req.session.passport.user;

    // Verify invitation exists and is valid
    const invitation = await storage.getInvitation(token);
    if (!invitation) {
      return res.status(404).json({error: "Invalid or expired invitation"});
    }

    // Check if invitation has expired (only if expiresAt is set)
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return res.status(410).json({error: "Invitation has expired"});
    }

    // Verify the organization ID matches
    if (invitation.organizationId !== organizationId) {
      return res.status(400).json({error: "Organization ID mismatch"});
    }

    // Check if user already exists in this organization
    const existingMembership = await storage.getUserOrganizations(userId);
    const alreadyMember = existingMembership.some(
      (membership) => membership.organizationId === organizationId
    );

    if (alreadyMember) {
      return res
        .status(400)
        .json({error: "User is already a member of this organization"});
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    // Verify email matches invitation
    if (user.email !== invitation.email) {
      return res
        .status(400)
        .json({error: "Email address does not match invitation"});
    }

    // Determine if user should be admin based on role
    const isCompanyAdmin = role === "Company Admin";

    // Add user to organization
    await storage.addUserToOrganization({
      userId: userId,
      organizationId: organizationId,
      isCompanyAdmin: isCompanyAdmin,
      isActive: true, // Auto-activate when accepting invitation
      isPrimary: false // Don't make it primary by default
    });

    // Get organization details
    const organization = await storage.getOrganization(organizationId);

    console.log(
      `[Invitations] User ${userId} accepted invitation to join organization ${organizationId} as ${role}`
    );

    return res.json({
      success: true,
      message: "Successfully joined organization",
      organization: organization,
      role: role
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return res.status(500).json({error: "Failed to accept invitation"});
  }
});

export default router;
