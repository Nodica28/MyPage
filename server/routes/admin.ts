import {Router, Request, Response, NextFunction} from "express";
import {db} from "../db";
import {qrSettings, modelSettings, organizations} from "@shared/schema";
import {users, userOrganizations} from "@shared/types/user";
import {headshotRequests} from "@shared/types/character";
import {eq, desc, and, sql} from "drizzle-orm";

const router = Router();

// Middleware to check if user is admin with @withbadge.ai email and exists in DB
const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(403).json({error: "Authentication required"});
    }

    const userEmail = (req.user as any)?.email;

    // Check if email ends with @withbadge.ai
    if (!userEmail || !userEmail.endsWith("@withbadge.ai")) {
      return res
        .status(403)
        .json({error: "Admin access restricted to @withbadge.ai emails"});
    }

    // Verify user exists in database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!dbUser) {
      return res.status(403).json({error: "User not found in database"});
    }

    // User is authenticated, has correct email domain, and exists in DB
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    return res.status(500).json({error: "Authentication error"});
  }
};

router.use(requireSuperAdmin);

// Get all settings (model + QR)
router.get("/settings", async (req, res) => {
  try {
    const [modelConfig] = await db.select().from(modelSettings);
    const [qrConfig] = await db.select().from(qrSettings);

    res.json({
      ...modelConfig,
      qrSettings: qrConfig
    });
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    res.status(500).json({error: "Failed to fetch settings"});
  }
});

// Update settings
router.patch("/settings", async (req, res) => {
  try {
    const {qrSettings: qrConfig, ...modelConfig} = req.body;

    // Update modelConfig structure
    if (modelConfig.modelConfig) {
      // Initialize all prompt fields if they don't exist
      const promptFields = {
        // Hair Style
        straightHairPrompt: "",
        wavyHairPrompt: "",
        curlyHairPrompt: "",
        coilyHairPrompt: "",
        afroHairPrompt: "",
        braidedHairPrompt: "",
        dreadlocksPrompt: "",

        // Hair Length
        buzzHairLengthPrompt: "",
        veryShortHairPrompt: "",
        shortHairPrompt: "",
        mediumHairPrompt: "",
        longHairPrompt: "",
        veryLongHairPrompt: "",

        // Hair Color
        blackHairPrompt: "",
        darkBrownHairPrompt: "",
        brownHairPrompt: "",
        lightBrownHairPrompt: "",
        blondeHairPrompt: "",
        platinumHairPrompt: "",
        redHairPrompt: "",
        auburnHairPrompt: "",
        grayHairPrompt: "",
        whiteHairPrompt: "",

        // Highlights
        blondeHighlightsPrompt: "",
        caramelHighlightsPrompt: "",
        redHighlightsPrompt: "",
        blueHighlightsPrompt: "",
        purpleHighlightsPrompt: "",
        pinkHighlightsPrompt: "",

        // Facial Hair
        stubblePrompt: "",
        mustachePrompt: "",
        goateePrompt: "",
        shortBeardPrompt: "",
        fullBeardPrompt: "",
        longBeardPrompt: "",

        // Skin Tone
        veryFairSkinPrompt: "",
        fairSkinPrompt: "",
        mediumSkinPrompt: "",
        oliveSkinPrompt: "",
        brownSkinPrompt: "",
        darkBrownSkinPrompt: "",
        veryDarkSkinPrompt: ""
      };

      // Lighting and Expression Categories
      const lightingAndExpressionPrompts = {
        naturalLightPrompt: "",
        studioLightPrompt: "",
        rembrandtLightPrompt: "",
        butterflyLightPrompt: "",
        loopLightPrompt: "",
        neutralExpressionPrompt: "",
        slightSmilePrompt: "",
        broadSmilePrompt: "",
        laughingPrompt: "",
        seriousPrompt: "",
        thoughtfulPrompt: "",
        confidentPrompt: "",
        determinedPrompt: "",
        pensivePrompt: "",
        professionalExpressionPrompt: ""
      };

      // Clothing Categories
      const clothingPrompts = {
        professionalClothingPrompt: "",
        businessCasualClothingPrompt: "",
        casualClothingPrompt: ""
      };

      modelConfig.modelConfig = {
        ...promptFields,
        ...lightingAndExpressionPrompts,
        ...clothingPrompts,
        ...modelConfig.modelConfig
      };
    }

    // Update model settings
    const [updatedModelSettings] = await db
      .update(modelSettings)
      .set(modelConfig)
      .returning();

    // Update QR settings
    const [updatedQrSettings] = await db
      .update(qrSettings)
      .set(qrConfig)
      .returning();

    res.json({
      ...updatedModelSettings,
      qrSettings: updatedQrSettings
    });
  } catch (error) {
    console.error("Error updating admin settings:", error);
    res.status(500).json({error: "Failed to update settings"});
  }
});

// Get basic user list for admin dashboard
router.get("/users", async (req, res) => {
  try {
    const {filter = "all", page = 1, limit = 50, search = ""} = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Try both approaches: direct organizationId and userOrganizations junction table

    // Approach 1: Direct organizationId reference
    const directOrgUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        title: users.title,
        companyName: users.companyName,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        publicPath: users.publicPath,
        isBetaTester: users.isBetaTester,
        planType: users.planType,
        headshotCredits: users.headshotCredits,
        onboardingComplete: users.onboardingComplete,
        selectedRole: users.selectedRole,
        characterId: users.characterId,
        settings: users.settings,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .orderBy(desc(users.createdAt));

    // Approach 2: Via userOrganizations junction table
    const junctionOrgUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        title: users.title,
        companyName: users.companyName,
        organizationId: userOrganizations.organizationId,
        organizationName: organizations.name,
        publicPath: users.publicPath,
        isBetaTester: users.isBetaTester,
        planType: users.planType,
        headshotCredits: users.headshotCredits,
        onboardingComplete: users.onboardingComplete,
        selectedRole: users.selectedRole,
        characterId: users.characterId,
        settings: users.settings,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .leftJoin(userOrganizations, eq(users.id, userOrganizations.userId))
      .leftJoin(
        organizations,
        eq(userOrganizations.organizationId, organizations.id)
      )
      .orderBy(desc(users.createdAt));

    // Compare results and use the one with more organization data
    const directOrgCount = directOrgUsers.filter(
      (u) => u.organizationName
    ).length;
    const junctionOrgCount = junctionOrgUsers.filter(
      (u) => u.organizationName
    ).length;

    // Use whichever approach returns more organization data
    const allUsers =
      junctionOrgCount > directOrgCount ? junctionOrgUsers : directOrgUsers;

    // Apply filters in JavaScript (simpler than complex SQL)
    let filteredUsers = allUsers;

    if (filter === "beta") {
      filteredUsers = allUsers.filter((user) => user.isBetaTester);
    } else if (filter === "regular") {
      filteredUsers = allUsers.filter(
        (user) => !user.isBetaTester && user.planType === "free"
      );
    } else if (filter === "premium") {
      filteredUsers = allUsers.filter((user) => user.planType === "pro");
    }

    // Apply search
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.companyName?.toLowerCase().includes(searchLower) ||
          user.organizationName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const totalCount = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(offset, offset + Number(limit));

    // Get headshot statistics for these users
    const userIds = paginatedUsers.map((user) => user.id);
    let userHeadshotStats: Array<{
      userId: number;
      totalRequests: number;
      completedRequests: number;
    }> = [];

    if (userIds.length > 0) {
      const allUserHeadshots = await db.select().from(headshotRequests);

      userHeadshotStats = userIds.map((userId) => {
        const userHeadshots = allUserHeadshots.filter(
          (h) => h.userId === userId
        );
        return {
          userId,
          totalRequests: userHeadshots.length,
          completedRequests: userHeadshots.filter(
            (h) => h.status === "completed"
          ).length
        };
      });
    }

    // Add real headshot stats and organization info
    const enrichedUsers = paginatedUsers.map((user) => {
      const headshotData = userHeadshotStats.find(
        (stat) => stat.userId === user.id
      );

      return {
        ...user,
        headshotStats: {
          totalRequests: headshotData?.totalRequests || 0,
          completedRequests: headshotData?.completedRequests || 0
        },
        hasCharacter: !!user.characterId
        // organizationName is already included from the database query via ...user
      };
    });

    res.json({
      users: enrichedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({error: "Failed to fetch users"});
  }
});

// Get user statistics for dashboard overview
router.get("/stats", async (req, res) => {
  try {
    // Get all users for basic stats
    const allUsers = await db.select().from(users);

    // Get all headshot requests for statistics
    const allHeadshots = await db.select().from(headshotRequests);

    // Get all organizations
    const allOrganizations = await db.select().from(organizations);

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = allUsers.filter(
      (u) => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo
    );
    const recentHeadshots = allHeadshots.filter(
      (h) => h.createdAt && new Date(h.createdAt) >= thirtyDaysAgo
    );

    const stats = {
      users: {
        totalUsers: allUsers.length,
        betaUsers: allUsers.filter((u) => u.isBetaTester).length,
        premiumUsers: allUsers.filter((u) => u.planType === "pro").length,
        freeUsers: allUsers.filter(
          (u) => u.planType === "free" && !u.isBetaTester
        ).length,
        completedProfiles: allUsers.filter((u) => u.onboardingComplete).length,
        usersWithCharacters: allUsers.filter((u) => u.characterId).length
      },
      headshots: {
        totalRequests: allHeadshots.length,
        completedRequests: allHeadshots.filter((h) => h.status === "completed")
          .length,
        failedRequests: allHeadshots.filter((h) => h.status === "failed")
          .length,
        pendingRequests: allHeadshots.filter((h) => h.status === "pending")
          .length
      },
      organizations: {
        totalOrganizations: allOrganizations.length
      },
      recentActivity: {
        newUsers: recentUsers.length,
        newHeadshots: recentHeadshots.length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({error: "Failed to fetch statistics"});
  }
});

// Helper endpoint to populate missing organizations
router.post("/populate-organizations", async (req, res) => {
  try {
    // Find all users with organizationId but no matching organization
    const usersWithMissingOrgs = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        organizationId: users.organizationId,
        companyName: users.companyName
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(
        and(
          sql`${users.organizationId} IS NOT NULL`,
          sql`${organizations.id} IS NULL`
        )
      );

    // Create placeholder organizations for missing IDs
    const createdOrgs = [];
    for (const user of usersWithMissingOrgs) {
      if (user.organizationId) {
        try {
          await db
            .insert(organizations)
            .values({
              name: user.companyName || `Organization ${user.organizationId}`,
              domain: `org${user.organizationId}.com`,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .onConflictDoNothing();

          createdOrgs.push({
            id: user.organizationId,
            name: user.companyName || `Organization ${user.organizationId}`
          });
        } catch (error) {
          console.error(`Error creating org ${user.organizationId}:`, error);
        }
      }
    }

    res.json({
      message: "Organization population completed",
      usersWithMissingOrgs: usersWithMissingOrgs.length,
      createdOrganizations: createdOrgs
    });
  } catch (error) {
    console.error("Error populating organizations:", error);
    res.status(500).json({error: "Failed to populate organizations"});
  }
});

export default router;
