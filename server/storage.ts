import {users, type User, type InsertUser} from "@shared/types/user";

import {
  characters,
  headshotRequests,
  type Character,
  type HeadshotRequest,
  type InsertHeadshotRequest
} from "@shared/types/character";

import {
  organizations,
  modelSettings,
  qrSettings,
  content,
  analytics,
  invitations,
  userOrganizations,
  type ModelSettings,
  type QrSettings,
  type Content,
  type Analytics,
  type Invitation,
  type UserOrganization,
  type InsertUserOrganization
} from "@shared/tables";

import {eq, gte, lte, and, desc, like} from "drizzle-orm";
import {db, pool} from "./db";
import {
  generateUniqueId,
  sanitizePath,
  type Organization
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPublicPath(path: string): Promise<User | undefined>;
  createUser(
    user: InsertUser & {organizationId?: number; isCompanyAdmin?: boolean}
  ): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  getUserProfileSettings(id: number): Promise<User | undefined>;
  updateUserProfileImage(id: number, imageUrl: string): Promise<User>;

  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByDomain(domain: string): Promise<Organization | undefined>;
  getOrganizationByPublicToken(
    token: string
  ): Promise<Organization | undefined>;
  createOrganization(
    org: Omit<Organization, "id" | "createdAt">
  ): Promise<Organization>;
  updateOrganization(
    id: number,
    data: Partial<Organization>
  ): Promise<Organization>;

  // User-Organization relationship methods
  getUserOrganizations(
    userId: number
  ): Promise<(UserOrganization & {organization: Organization})[]>;
  getOrganizationUsers(
    organizationId: number
  ): Promise<(UserOrganization & {user: User})[]>;
  addUserToOrganization(
    data: Omit<InsertUserOrganization, "joinedAt" | "updatedAt">
  ): Promise<UserOrganization>;
  updateUserOrganization(
    userId: number,
    organizationId: number,
    data: Partial<Omit<UserOrganization, "userId" | "organizationId">>
  ): Promise<UserOrganization>;
  removeUserFromOrganization(
    userId: number,
    organizationId: number
  ): Promise<void>;
  getPrimaryOrganization(
    userId: number
  ): Promise<(UserOrganization & {organization: Organization}) | undefined>;

  // Character methods
  createCharacter(
    data: Omit<Character, "id" | "createdAt" | "updatedAt">
  ): Promise<Character>;
  getCharacter(idOrUserId: number | string): Promise<Character | undefined>;
  getCharactersByUserId(userId: number): Promise<Character[]>;
  updateCharacter(
    id: number,
    data: Partial<Omit<Character, "id" | "createdAt" | "updatedAt">>
  ): Promise<Character>;

  // Invitation methods
  createInvitation(
    invitation: Omit<Invitation, "id" | "createdAt">
  ): Promise<Invitation>;
  getInvitation(token: string): Promise<Invitation | undefined>;
  deleteInvitation(id: number): Promise<void>;

  // Content methods
  getContent(userId: number): Promise<Content[]>;
  createContent(content: Omit<Content, "id" | "createdAt">): Promise<Content>;
  deleteContent(id: number): Promise<void>;

  // Analytics methods
  recordAnalytics(data: Omit<Analytics, "id">): Promise<Analytics>;
  getAnalytics(
    userId: number,
    eventType?: "page_view" | "link_click",
    startDate?: Date,
    endDate?: Date
  ): Promise<Analytics[]>;

  // Model settings methods
  getModelSettings(): Promise<ModelSettings>;
  updateModelSettings(settings: Partial<ModelSettings>): Promise<ModelSettings>;
  initializeModelSettings(): Promise<ModelSettings>;

  // Headshot generation methods
  createHeadshotRequest(
    request: Omit<InsertHeadshotRequest, "id" | "createdAt" | "updatedAt">
  ): Promise<HeadshotRequest>;
  updateHeadshotRequest(
    requestId: number,
    updateData: Partial<Omit<HeadshotRequest, "id" | "createdAt" | "updatedAt">>
  ): Promise<HeadshotRequest>;
  getHeadshotRequests(userId: number): Promise<HeadshotRequest[]>;
  deleteHeadshotRequest(requestId: number): Promise<void>;
  findHeadshotRequestByAsset(
    assetId: string
  ): Promise<HeadshotRequest | undefined>;
  getHeadshotRequest(id: number): Promise<HeadshotRequest | undefined>;

  // Company methods
  getCompanysByOrganizationId(organizationId: number): Promise<any[]>;
  createCompany(data: any): Promise<any>;
  updateCompany(id: number, data: Partial<any>): Promise<any>;

  // QR settings methods
  getQrSettings(): Promise<QrSettings>;
  updateQrSettings(settings: Partial<QrSettings>): Promise<QrSettings>;
  initializeQrSettings(): Promise<QrSettings>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByPublicPath(path: string): Promise<User | undefined> {
    console.log("[Storage] Looking up user by path:", path);

    if (!path) {
      console.log("[Storage] Empty path provided, returning undefined");
      return undefined;
    }

    // First try to find by the exact publicPath - most specific match
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.publicPath, path));

    if (user) {
      console.log("[Storage] Found user by exact publicPath match:", path);
      return user;
    }

    // If not found, check if the path is a uniquePathId
    console.log("[Storage] User not found by publicPath, trying uniquePathId");
    [user] = await db.select().from(users).where(eq(users.uniquePathId, path));

    if (user) {
      console.log("[Storage] Found user by uniquePathId:", path);
      return user;
    }

    // Next, try a more specific approach for paths with slashes
    // For example: "devuser123/dev.user"
    const pathParts = path.split("/");

    if (pathParts.length > 1) {
      // If the path contains a slash, try to match on the first part as uniquePathId
      const potentialUniquePathId = pathParts[0];
      console.log(
        "[Storage] Trying to match uniquePathId from path part:",
        potentialUniquePathId
      );

      [user] = await db
        .select()
        .from(users)
        .where(eq(users.uniquePathId, potentialUniquePathId));

      if (user && user.publicPath === path) {
        console.log(
          "[Storage] Found user by uniquePathId and confirmed publicPath:",
          path
        );
        return user;
      }
    }

    // Try other flexible matches as a fallback
    console.log("[Storage] Trying flexible matches on publicPath:", path);

    // Check for exact publicPath match
    [user] = await db.select().from(users).where(eq(users.publicPath, path));

    if (!user) {
      // Try partial match on the end of publicPath (username portion)
      [user] = await db
        .select()
        .from(users)
        .where(like(users.publicPath, `%/${path}`));
    }

    if (!user) {
      // Try partial match anywhere in publicPath as last resort
      [user] = await db
        .select()
        .from(users)
        .where(like(users.publicPath, `%${path}%`));
    }

    // Log the final result
    if (user) {
      console.log(
        "[Storage] Found user by flexible match:",
        path,
        "User ID:",
        user.id
      );
    } else {
      console.log("[Storage] No user found for path:", path);
    }

    return user;
  }

  async createUser(
    insertUser: InsertUser & {
      organizationId?: number;
      isCompanyAdmin?: boolean;
    }
  ): Promise<User> {
    try {
      // Extract organization data for later
      const {organizationId, isCompanyAdmin, ...userDataToInsert} = insertUser;

      // Generate uniquePathId and publicPath
      const uniquePathId = generateUniqueId();
      const firstName = userDataToInsert.firstName || "";
      const lastName = userDataToInsert.lastName || "";
      const publicPath = sanitizePath(
        `${uniquePathId}/${firstName.toLowerCase()}.${lastName.toLowerCase()}`
      );

      // Create user with required fields
      const userToInsert = {
        ...userDataToInsert,
        uniquePathId,
        publicPath
      };

      console.log("[Storage] Creating user with data:", {
        email: userToInsert.email,
        firstName: userToInsert.firstName,
        lastName: userToInsert.lastName,
        uniquePathId,
        publicPath
      });

      // Begin a transaction
      const [user] = await db.insert(users).values(userToInsert).returning();

      // If an organization ID was provided, create the association in the join table
      if (organizationId) {
        console.log(
          `[Storage] Adding user ${user.id} to organization ${organizationId}`
        );

        await db.insert(userOrganizations).values({
          userId: user.id,
          organizationId,
          isCompanyAdmin: isCompanyAdmin || false,
          isPrimary: true, // First organization is primary
          isActive: true
        });
      }

      return user;
    } catch (error) {
      console.error("[Storage] Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    try {
      console.log("[Storage] Updating user:", id, "with data:", data);
      console.log(
        "[Storage] Phone number before processing:",
        data.phoneNumber,
        "Type:",
        typeof data.phoneNumber
      );
      console.log(
        "[Storage] Title before processing:",
        data.title,
        "Type:",
        typeof data.title
      );
      console.log(
        "[Storage] Bio before processing:",
        data.bio,
        "Type:",
        typeof data.bio
      );

      // Handle phone number correctly
      let phoneNumber = null;
      if (data.phoneNumber !== null && data.phoneNumber !== undefined) {
        if (
          typeof data.phoneNumber === "string" &&
          data.phoneNumber.trim() !== ""
        ) {
          phoneNumber = data.phoneNumber.replace(/[\s-]/g, "");
        }
      }

      // Process title field - ensure empty strings become null
      let title = data.title;
      if (title === "") {
        console.log("[Storage] Converting empty title to null");
        title = null;
      }

      // Process bio field - ensure empty strings become null
      let bio = data.bio;
      if (bio === "") {
        console.log("[Storage] Converting empty bio to null");
        bio = null;
      }

      // Add updatedAt timestamp and clean up the data
      const updateData = {
        ...data,
        title,
        bio,
        updatedAt: new Date(),
        // Use properly processed phone number
        phoneNumber: phoneNumber
      };

      // Special handling for settings object to ensure it's properly handled by PostgreSQL
      if (data.settings !== undefined) {
        console.log(
          "[Storage] Settings object detected:",
          JSON.stringify(data.settings).substring(0, 200) + "..."
        );
        // Ensure settings is properly formatted as JSON for PostgreSQL
        updateData.settings = data.settings;
      }

      console.log(
        "[Storage] Phone number after processing:",
        updateData.phoneNumber,
        "Type:",
        typeof updateData.phoneNumber
      );
      console.log(
        "[Storage] Title after processing:",
        updateData.title,
        "Type:",
        typeof updateData.title
      );
      console.log(
        "[Storage] Bio after processing:",
        updateData.bio,
        "Type:",
        typeof updateData.bio
      );

      // Remove any undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Get current user data before update
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!existingUser) {
        console.error("[Storage] User not found before update:", id);
        throw new Error("User not found");
      }

      console.log("[Storage] Current user data:", {
        title: existingUser.title,
        bio: existingUser.bio,
        profileImage: existingUser.profileImage
      });

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!user) {
        console.error("[Storage] User not found after update:", id);
        throw new Error("User not found");
      }

      console.log("[Storage] Successfully updated user:", {
        id: user.id,
        title: user.title,
        bio: user.bio,
        profileImage: user.profileImage
      });
      return user;
    } catch (error) {
      console.error("[Storage] Error updating user:", error);
      throw error;
    }
  }

  async getUserProfileSettings(id: number): Promise<User | undefined> {
    try {
      console.log("[Storage] Fetching profile settings for user:", id);

      const [user] = await db.select().from(users).where(eq(users.id, id));

      if (user) {
        console.log("[Storage] Found profile settings for user:", id);
      } else {
        console.log("[Storage] No profile settings found for user:", id);
      }

      return user;
    } catch (error) {
      console.error("[Storage] Error fetching user profile settings:", error);
      throw error;
    }
  }

  async updateUserProfileImage(id: number, imageUrl: string): Promise<User> {
    try {
      console.log("[Storage] Updating profile image for user:", id);
      console.log("[Storage] New image URL:", imageUrl);

      // First verify user exists with a direct database query
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!existingUser) {
        console.error(
          "[Storage] User not found when updating profile image:",
          id
        );
        throw new Error("User not found");
      }

      // Update with more detailed logging
      console.log(
        "[Storage] Current profile image:",
        existingUser.profileImage
      );
      console.log("[Storage] Setting new profile image:", imageUrl);

      // Update the user record, ensuring the profileImage field is set correctly
      const updateData = {
        profileImage: imageUrl,
        updatedAt: new Date()
      };

      console.log("[Storage] Update data for profile image:", updateData);

      // Execute update with direct database query
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!user) {
        console.error("[Storage] User not found after update:", id);
        throw new Error("User not found after update");
      }

      // Verify the update was successful
      console.log(
        "[Storage] Profile image updated successfully:",
        user.profileImage
      );
      if (user.profileImage !== imageUrl) {
        console.error(
          "[Storage] WARNING: Profile image does not match expected value!",
          "Expected:",
          imageUrl,
          "Actual:",
          user.profileImage
        );
      }

      // Now verify the update was actually persisted with a separate query
      const [verifiedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      if (!verifiedUser) {
        console.error("[Storage] User not found in verification query");
      } else {
        console.log(
          "[Storage] Verification query result:",
          verifiedUser.profileImage
        );
        if (verifiedUser.profileImage !== imageUrl) {
          console.error(
            "[Storage] VERIFICATION FAILED: Profile image update did not persist!"
          );
        } else {
          console.log(
            "[Storage] VERIFICATION SUCCESS: Profile image update persisted correctly"
          );
        }
      }

      return user;
    } catch (error) {
      console.error("[Storage] Error updating user profile image:", error);
      throw error;
    }
  }

  // Organization methods
  async getOrganization(id: number): Promise<Organization | undefined> {
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
        qrLogoUrl: organizations.qrLogoUrl,
        qrCodeColor: organizations.qrCodeColor,
        socialProfiles: organizations.socialProfiles,
        autoJoin: organizations.autoJoin,
        publicToken: organizations.publicToken,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt
      })
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationByDomain(
    domain: string
  ): Promise<Organization | undefined> {
    try {
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
          qrLogoUrl: organizations.qrLogoUrl,
          qrCodeColor: organizations.qrCodeColor,
          socialProfiles: organizations.socialProfiles,
          autoJoin: organizations.autoJoin,
          publicToken: organizations.publicToken,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .where(eq(organizations.domain, domain));
      return org;
    } catch (error) {
      console.error("Error fetching organization:", error);
      throw error;
    }
  }

  async getOrganizationByPublicToken(
    token: string
  ): Promise<Organization | undefined> {
    try {
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
          qrLogoUrl: organizations.qrLogoUrl,
          qrCodeColor: organizations.qrCodeColor,
          socialProfiles: organizations.socialProfiles,
          autoJoin: organizations.autoJoin,
          publicToken: organizations.publicToken,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt
        })
        .from(organizations)
        .where(eq(organizations.publicToken, token));
      return org;
    } catch (error) {
      console.error("Error fetching organization by public token:", error);
      throw error;
    }
  }

  async createOrganization(
    data: Omit<Organization, "id" | "createdAt">
  ): Promise<Organization> {
    try {
      // Insert only the fields we need
      const [org] = await db.insert(organizations).values(data).returning();
      return org;
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }

  async updateOrganization(
    id: number,
    data: Partial<Organization>
  ): Promise<Organization> {
    try {
      console.log("[Storage] Updating organization:", id, "with data:", data);

      const [updated] = await db
        .update(organizations)
        .set(data)
        .where(eq(organizations.id, id))
        .returning();

      if (!updated) {
        throw new Error("Organization not found");
      }

      console.log("[Storage] Updated organization:", updated);
      return updated;
    } catch (error) {
      console.error("[Storage] Error updating organization:", error);
      throw error;
    }
  }

  // User-Organization relationship methods
  async getUserOrganizations(
    userId: number
  ): Promise<(UserOrganization & {organization: Organization})[]> {
    try {
      const results = await db
        .select()
        .from(userOrganizations)
        .leftJoin(
          organizations,
          eq(userOrganizations.organizationId, organizations.id)
        )
        .where(eq(userOrganizations.userId, userId));

      return results.map((row) => ({
        ...row.user_organizations,
        organization: row.organizations
      })) as (UserOrganization & {organization: Organization})[];
    } catch (error) {
      console.error("[Storage] Error getting user organizations:", error);
      throw error;
    }
  }

  async getOrganizationUsers(
    organizationId: number
  ): Promise<(UserOrganization & {user: User})[]> {
    try {
      const results = await db
        .select()
        .from(userOrganizations)
        .leftJoin(users, eq(userOrganizations.userId, users.id))
        .where(eq(userOrganizations.organizationId, organizationId));

      return results.map((row) => ({
        ...row.user_organizations,
        user: row.users
      })) as (UserOrganization & {user: User})[];
    } catch (error) {
      console.error("[Storage] Error getting organization users:", error);
      throw error;
    }
  }

  async addUserToOrganization(
    data: Omit<InsertUserOrganization, "joinedAt" | "updatedAt">
  ): Promise<UserOrganization> {
    const [userOrganization] = await db
      .insert(userOrganizations)
      .values(data)
      .returning();
    return userOrganization;
  }

  async updateUserOrganization(
    userId: number,
    organizationId: number,
    data: Partial<Omit<UserOrganization, "userId" | "organizationId">>
  ): Promise<UserOrganization> {
    const [updatedUserOrganization] = await db
      .update(userOrganizations)
      .set(data)
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.organizationId, organizationId)
        )
      )
      .returning();
    return updatedUserOrganization;
  }

  async removeUserFromOrganization(
    userId: number,
    organizationId: number
  ): Promise<void> {
    await db
      .delete(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.organizationId, organizationId)
        )
      );
  }

  async getPrimaryOrganization(
    userId: number
  ): Promise<(UserOrganization & {organization: Organization}) | undefined> {
    try {
      const results = await db
        .select()
        .from(userOrganizations)
        .leftJoin(
          organizations,
          eq(userOrganizations.organizationId, organizations.id)
        )
        .where(
          and(
            eq(userOrganizations.userId, userId),
            eq(userOrganizations.isPrimary, true)
          )
        )
        .limit(1);

      if (results.length === 0) {
        // Check if user has legacy organizationId and auto-migrate
        console.log(`[Storage] No primary organization found for user ${userId}, checking for legacy organizationId`);
        
        const [user] = await db
          .select({
            id: users.id,
            organizationId: users.organizationId
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user?.organizationId) {
          console.log(`[Storage] Auto-migrating user ${userId} with organizationId ${user.organizationId} to userOrganizations`);
          
          try {
            await db
              .insert(userOrganizations)
              .values({
                userId: userId,
                organizationId: user.organizationId,
                isPrimary: true,
                isCompanyAdmin: true,
                isActive: true
              });

            console.log(`[Storage] Successfully migrated user ${userId} to userOrganizations`);
            
            // Retry the query after migration
            const retryResults = await db
              .select()
              .from(userOrganizations)
              .leftJoin(
                organizations,
                eq(userOrganizations.organizationId, organizations.id)
              )
              .where(
                and(
                  eq(userOrganizations.userId, userId),
                  eq(userOrganizations.isPrimary, true)
                )
              )
              .limit(1);

            if (retryResults.length > 0) {
              return {
                ...retryResults[0].user_organizations,
                organization: retryResults[0].organizations
              } as UserOrganization & {organization: Organization};
            }
          } catch (migrationError) {
            console.error(`[Storage] Failed to migrate user ${userId}:`, migrationError);
          }
        }

        return undefined;
      }

      return {
        ...results[0].user_organizations,
        organization: results[0].organizations
      } as UserOrganization & {organization: Organization};
    } catch (error) {
      console.error("[Storage] Error getting primary organization:", error);
      throw error;
    }
  }

  // Character methods
  async createCharacter(
    data: Omit<Character, "id" | "createdAt" | "updatedAt">
  ): Promise<Character> {
    try {
      console.log("[Storage] Creating character for user:", data.userId);

      // Check if user already has a character
      const existingCharacter = await this.getCharacter(data.userId);
      if (existingCharacter) {
        console.error(
          "[Storage] User already has a character:",
          existingCharacter.id
        );
        throw new Error("User already has a character");
      }

      // Create new character
      const [character] = await db
        .insert(characters)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log("[Storage] Created character:", character.id);
      return character;
    } catch (error: any) {
      console.error("[Storage] Error creating character:", error.message);
      throw error;
    }
  }

  async getCharacter(
    idOrUserId: number | string
  ): Promise<Character | undefined> {
    try {
      console.log(
        `[Storage] Getting character by ${typeof idOrUserId === "string" ? "renderNetId" : "id/userId"}:`,
        idOrUserId
      );

      if (typeof idOrUserId === "string") {
        // Looking up by renderNetId
        const [character] = await db
          .select()
          .from(characters)
          .where(eq(characters.renderNetId, idOrUserId));
        return character;
      } else {
        // Try looking up by id first
        let [character] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, idOrUserId));

        if (!character) {
          // If not found by id, try looking up by userId
          [character] = await db
            .select()
            .from(characters)
            .where(eq(characters.userId, idOrUserId));
        }

        return character;
      }
    } catch (error: any) {
      console.error("[Storage] Error getting character:", error.message);
      throw error;
    }
  }

  async getCharactersByUserId(userId: number): Promise<Character[]> {
    try {
      const charactersList = await db
        .select()
        .from(characters)
        .where(eq(characters.userId, userId));
      return charactersList;
    } catch (error) {
      console.error("Error getting characters by userId:", error);
      throw error;
    }
  }

  async updateCharacter(
    id: number,
    data: Partial<Omit<Character, "id" | "createdAt" | "updatedAt">>
  ): Promise<Character> {
    try {
      console.log("[Storage] Updating character:", id);

      // Get existing character to verify ownership
      const existing = await this.getCharacter(id);
      if (!existing) {
        throw new Error("Character not found");
      }

      // Update character
      const [updated] = await db
        .update(characters)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(characters.id, id))
        .returning();

      console.log("[Storage] Updated character:", updated.id);
      return updated;
    } catch (error: any) {
      console.error("[Storage] Error updating character:", error.message);
      throw error;
    }
  }

  // Invitation methods
  async createInvitation(
    data: Omit<Invitation, "id" | "createdAt">
  ): Promise<Invitation> {
    const [invitation] = await db.insert(invitations).values(data).returning();
    return invitation;
  }

  async getInvitation(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));
    return invitation;
  }

  async deleteInvitation(id: number): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id));
  }

  // Content methods
  async getContent(userId: number): Promise<Content[]> {
    try {
      // Check if columns exist first
      const columnCheckResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'content' 
        AND column_name IN ('is_public', 'order')
      `);

      const existingColumns = columnCheckResult.rows.map(
        (row) => row.column_name
      );
      const hasIsPublic = existingColumns.includes("is_public");
      const hasOrder = existingColumns.includes("order");

      // Build a query based on existing columns
      let query = `
        SELECT 
          id, 
          user_id as "userId", 
          type, 
          title, 
          description, 
          content, 
          created_at as "createdAt", 
          updated_at as "updatedAt"
      `;

      // Add optional columns with COALESCE if they exist
      if (hasIsPublic) {
        // eslint-disable-next-line quotes
        query += ', is_public as "isPublic"';
      }

      if (hasOrder) {
        // eslint-disable-next-line quotes
        query += ', "order"';
      }

      query += " FROM content WHERE user_id = $1";

      const {rows} = await pool.query(query, [userId]);

      // Add missing default values for any columns not in the database
      return rows.map((row) => ({
        ...row,
        isPublic: row.isPublic !== undefined ? row.isPublic : true,
        order: row.order !== undefined ? row.order : 0
      })) as Content[];
    } catch (error) {
      console.error("Error fetching content:", error);
      // Return empty array as fallback
      return [];
    }
  }

  async createContent(
    data: Omit<Content, "id" | "createdAt">
  ): Promise<Content> {
    const [newContent] = await db.insert(content).values(data).returning();
    return newContent;
  }

  async deleteContent(id: number): Promise<void> {
    await db.delete(content).where(eq(content.id, id));
  }

  // Analytics methods
  async recordAnalytics(data: Omit<Analytics, "id">): Promise<Analytics> {
    const [analyticsRecord] = await db
      .insert(analytics)
      .values(data)
      .returning();
    return analyticsRecord;
  }

  async getAnalytics(
    userId: number,
    eventType?: "page_view" | "link_click",
    startDate?: Date,
    endDate?: Date
  ): Promise<Analytics[]> {
    const conditions = [eq(analytics.userId, userId)];

    if (eventType) {
      conditions.push(eq(analytics.eventType, eventType));
    }
    if (startDate) {
      conditions.push(gte(analytics.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(analytics.createdAt, endDate));
    }

    return await db
      .select()
      .from(analytics)
      .where(and(...conditions))
      .orderBy(desc(analytics.createdAt));
  }

  async getModelSettings(): Promise<ModelSettings> {
    try {
      // Check which columns exist first
      const columnCheckResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'model_settings';
      `);

      const columns = columnCheckResult.rows.map((row) => row.column_name);
      const hasPromptVars = columns.includes("prompt_vars");

      // Build query based on available columns
      const promptVarsSelect = hasPromptVars
        ? 'prompt_vars as "promptVars",'
        : "";

      // Try to get settings using a direct query to handle missing columns gracefully
      const {rows} = await pool.query(`
        SELECT 
          id, 
          api_token as "apiToken", 
          model_visibility as "modelVisibility", 
          ${promptVarsSelect}
          updated_at as "updatedAt",
          model_config as "modelConfig",
          image_config as "imageConfig",
          lcm_config as "lcmConfig"
        FROM model_settings 
        LIMIT 1
      `);

      const settings = rows[0];

      // If no settings exist at all, initialize with defaults
      if (!settings) {
        return this.initializeModelSettings();
      }

      // Add default controlnetConfig if it doesn't exist
      if (!settings.controlnetConfig) {
        settings.controlnetConfig = {
          poseStrength: 0.4,
          cannyStrength: 0.3,
          depthStrength: 0.5,
          enablePoseControlnet: true,
          enableCannyControlnet: false,
          enableDepthControlnet: false,
          controlnetConditioningScale: 0.8
        };
      }

      // Add default promptVars if it doesn't exist or wasn't selected
      if (!settings.promptVars) {
        settings.promptVars = {
          settings: {
            studio: {
              white: "clean white studio background",
              black: "sleek black studio background",
              gradient: "professional gradient background",
              textured: "subtle textured studio background"
            },
            office: {
              "modern-office": "modern corporate office environment",
              "executive-suite": "elegant executive suite setting",
              "conference-room": "professional conference room",
              "coworking-space": "contemporary coworking space",
              "window-view": "office with bright window view",
              library: "sophisticated library background"
            },
            outdoors: {
              beach: "professional beach setting",
              forest: "serene forest environment",
              mountain: "majestic mountain backdrop",
              urban: "stylish urban environment",
              park: "peaceful park setting"
            },
            fun: {
              throne: "regal throne setting",
              funk: "vibrant funky backdrop",
              pyramids: "ancient pyramids background",
              superhero: "superhero-themed environment",
              underwater: "ethereal underwater scene"
            }
          },
          lighting: {
            natural: "natural ambient lighting",
            studio: "professional studio lighting setup",
            dramatic: "dramatic cinematic lighting",
            soft: "soft and warm lighting",
            "golden-hour": "golden hour lighting"
          },
          expressions: {
            neutral: "professional neutral expression",
            "slight-smile": "warm, slight smile",
            "broad-smile": "friendly, broad smile",
            laughing: "genuine, natural laugh",
            serious: "serious and composed expression",
            thoughtful: "thoughtful and engaged expression",
            confident: "confident and approachable expression",
            professional: "polished professional expression"
          },
          clothing: {
            professional: "wearing professional business attire",
            casual: "in stylish casual wear",
            "business-casual": "in refined business casual wear",
            suit: "in tailored formal suit",
            "black-tie": "in elegant black tie attire",
            creative: "in creative professional attire"
          }
        };
      }

      return settings;
    } catch (error) {
      console.error("Error fetching model settings:", error);

      // Return default settings instead of failing
      console.log("Returning default model settings as fallback");
      return {
        id: 0,
        apiToken: process.env.RENDERNET_API_KEY || "",
        modelVisibility: "public",
        promptVars: {
          settings: {
            studio: {
              white: "clean white studio background",
              black: "sleek black studio background",
              gradient: "professional gradient background",
              textured: "subtle textured studio background"
            },
            office: {
              "modern-office": "modern corporate office environment",
              "executive-suite": "elegant executive suite setting",
              "conference-room": "professional conference room",
              "coworking-space": "contemporary coworking space",
              "window-view": "office with bright window view",
              library: "sophisticated library background"
            },
            outdoors: {
              beach: "professional beach setting",
              forest: "serene forest environment",
              mountain: "majestic mountain backdrop",
              urban: "stylish urban environment",
              park: "peaceful park setting"
            },
            fun: {
              throne: "regal throne setting",
              funk: "vibrant funky backdrop",
              pyramids: "ancient pyramids background",
              superhero: "superhero-themed environment",
              underwater: "ethereal underwater scene"
            }
          },
          lighting: {
            natural: "natural ambient lighting",
            studio: "professional studio lighting setup",
            dramatic: "dramatic cinematic lighting",
            soft: "soft and warm lighting",
            "golden-hour": "golden hour lighting"
          },
          expressions: {
            neutral: "professional neutral expression",
            "slight-smile": "warm, slight smile",
            "broad-smile": "friendly, broad smile",
            laughing: "genuine, natural laugh",
            serious: "serious and composed expression",
            thoughtful: "thoughtful and engaged expression",
            confident: "confident and approachable expression",
            professional: "polished professional expression"
          },
          clothing: {
            professional: "wearing professional business attire",
            casual: "in stylish casual wear",
            "business-casual": "in refined business casual wear",
            suit: "in tailored formal suit",
            "black-tie": "in elegant black tie attire",
            creative: "in creative professional attire"
          }
        },
        modelConfig: {
          defaultPromptMale:
            "Professional headshot with perfect studio lighting. Ultra high-definition with sharp, crisp details.",
          defaultPromptFemale:
            "Professional headshot with perfect studio lighting. Ultra high-definition with sharp, crisp details.",
          defaultNegativePrompt:
            "(lowres, low quality, worst quality:1.2), (text:1.2), watermark, painting, drawing, illustration, glitch,deformed, mutated, cross-eyed, ugly, disfigured",
          sdxlWeights: "RealVisXL_V3.0_Turbo",
          scheduler: "DPMSolverMultistepScheduler-Karras-SDE",
          numInferenceSteps: 30,
          guidanceScale: 5
        },
        controlnetConfig: {
          poseStrength: 0.4,
          cannyStrength: 0.3,
          depthStrength: 0.5,
          enablePoseControlnet: true,
          enableCannyControlnet: false,
          enableDepthControlnet: false,
          controlnetConditioningScale: 0.8
        },
        imageConfig: {
          enhanceNonFaceRegion: true,
          outputFormat: "webp",
          outputQuality: 100,
          faceDetectionInputWidth: 640,
          faceDetectionInputHeight: 640,
          ipAdapterScale: 0.8
        },
        lcmConfig: {
          enableLcm: false,
          lcmGuidanceScale: 1.5,
          lcmInferenceSteps: 5
        },
        updatedAt: new Date()
      };
    }
  }

  async updateModelSettings(
    settings: Partial<ModelSettings>
  ): Promise<ModelSettings> {
    try {
      console.log("Updating model settings with:", settings);

      const [currentSettings] = await db.select().from(modelSettings).limit(1);
      if (!currentSettings) {
        throw new Error("No existing settings found");
      }

      const [updatedSettings] = await db
        .update(modelSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(modelSettings.id, currentSettings.id))
        .returning();

      console.log("Updated settings:", updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error("Error updating model settings:", error);
      throw error;
    }
  }

  async initializeModelSettings(): Promise<ModelSettings> {
    try {
      // Check if model_settings table exists first
      const tableCheckResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'model_settings'
        );
      `);

      const tableExists = tableCheckResult.rows[0].exists;

      if (!tableExists) {
        console.log(
          "[Storage] model_settings table doesn't exist, using default settings"
        );
        // Return default settings without trying to create the table
        return this.getDefaultModelSettings();
      }

      // Check existing columns to avoid errors
      const columnCheckResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'model_settings';
      `);

      const columns = columnCheckResult.rows.map((row) => row.column_name);
      console.log("[Storage] Existing columns in model_settings:", columns);

      // Build an SQL-safe way to insert or update based on existing columns
      const columnsToInsert = ["api_token", "model_visibility", "updated_at"];
      const valuesToInsert = [
        `'${process.env.RENDERNET_API_KEY || ""}'`,
        "'public'",
        "now()"
      ];

      if (columns.includes("model_config")) {
        columnsToInsert.push("model_config");
        valuesToInsert.push(
          `'${JSON.stringify({
            defaultPromptMale:
              "Professional headshot with perfect studio lighting. Ultra high-definition with sharp, crisp details.",
            defaultPromptFemale:
              "Professional headshot with perfect studio lighting. Ultra high-definition with sharp, crisp details.",
            defaultNegativePrompt:
              "(lowres, low quality, worst quality:1.2), (text:1.2), watermark, painting, drawing, illustration, glitch,deformed, mutated, cross-eyed, ugly, disfigured",
            sdxlWeights: "RealVisXL_V3.0_Turbo",
            scheduler: "DPMSolverMultistepScheduler-Karras-SDE",
            numInferenceSteps: 30,
            guidanceScale: 5
          })}'`
        );
      }

      if (columns.includes("image_config")) {
        columnsToInsert.push("image_config");
        valuesToInsert.push(
          `'${JSON.stringify({
            enhanceNonFaceRegion: true,
            outputFormat: "webp",
            outputQuality: 100,
            faceDetectionInputWidth: 640,
            faceDetectionInputHeight: 640,
            ipAdapterScale: 0.8
          })}'`
        );
      }

      if (columns.includes("lcm_config")) {
        columnsToInsert.push("lcm_config");
        valuesToInsert.push(
          `'${JSON.stringify({
            enableLcm: false,
            lcmGuidanceScale: 1.5,
            lcmInferenceSteps: 5
          })}'`
        );
      }

      if (columns.includes("prompt_vars")) {
        columnsToInsert.push("prompt_vars");
        valuesToInsert.push(
          `'${JSON.stringify({
            settings: {
              studio: {
                white: "clean white studio background",
                black: "sleek black studio background",
                gradient: "professional gradient background",
                textured: "subtle textured studio background"
              },
              office: {
                "modern-office": "modern corporate office environment",
                "executive-suite": "elegant executive suite setting",
                "conference-room": "professional conference room",
                "coworking-space": "contemporary coworking space",
                "window-view": "office with bright window view",
                library: "sophisticated library background"
              },
              outdoors: {
                beach: "professional beach setting",
                forest: "serene forest environment",
                mountain: "majestic mountain backdrop",
                urban: "stylish urban environment",
                park: "peaceful park setting"
              },
              fun: {
                throne: "regal throne setting",
                funk: "vibrant funky backdrop",
                pyramids: "ancient pyramids background",
                superhero: "superhero-themed environment",
                underwater: "ethereal underwater scene"
              }
            },
            lighting: {
              types: {
                natural: "natural ambient lighting",
                studio: "professional studio lighting setup",
                dramatic: "dramatic cinematic lighting",
                soft: "soft and warm lighting",
                "golden-hour": "golden hour lighting"
              }
            },
            expressions: {
              neutral: "professional neutral expression",
              "slight-smile": "warm, slight smile",
              "broad-smile": "friendly, broad smile",
              laughing: "genuine, natural laugh",
              serious: "serious and composed expression",
              thoughtful: "thoughtful and engaged expression",
              confident: "confident and approachable expression",
              professional: "polished professional expression"
            },
            clothing: {
              professional: "wearing professional business attire",
              casual: "in stylish casual wear",
              "business-casual": "in refined business casual wear",
              suit: "in tailored formal suit",
              "black-tie": "in elegant black tie attire",
              creative: "in creative professional attire"
            }
          })}'`
        );
      }

      if (columns.includes("controlnet_config")) {
        columnsToInsert.push("controlnet_config");
        valuesToInsert.push(
          `'${JSON.stringify({
            poseStrength: 0.4,
            cannyStrength: 0.3,
            depthStrength: 0.5,
            enablePoseControlnet: true,
            enableCannyControlnet: false,
            enableDepthControlnet: false,
            controlnetConditioningScale: 0.8
          })}'`
        );
      }

      // Check if there are any rows in the table
      const countResult = await pool.query(
        "SELECT COUNT(*) FROM model_settings"
      );
      const rowCount = parseInt(countResult.rows[0].count);

      let query;
      if (rowCount === 0) {
        // Insert new record
        query = `
          INSERT INTO model_settings (${columnsToInsert.join(", ")}) 
          VALUES (${valuesToInsert.join(", ")}) 
          RETURNING *;
        `;
      } else {
        // Update existing record
        const updatePairs = columnsToInsert
          .map((col, index) => `${col} = ${valuesToInsert[index]}`)
          .join(", ");

        query = `
          UPDATE model_settings 
          SET ${updatePairs} 
          WHERE id = (SELECT id FROM model_settings LIMIT 1) 
          RETURNING *;
        `;
      }

      console.log("[Storage] Executing query:", query);
      const result = await pool.query(query);

      if (result.rows.length === 0) {
        throw new Error("Failed to initialize model settings");
      }

      // Format the response to match the expected type
      const settings = this.formatModelSettings(result.rows[0]);
      return settings;
    } catch (error) {
      console.error("Error initializing model settings:", error);
      // Return default settings if initialization fails
      return this.getDefaultModelSettings();
    }
  }

  // Helper method to provide default model settings
  private getDefaultModelSettings(): ModelSettings {
    return {
      id: 0,
      apiToken: process.env.RENDERNET_API_KEY || "",
      modelVisibility: "public",
      promptVars: {
        settings: {
          studio: {
            white: "clean white studio background",
            black: "sleek black studio background",
            gradient: "professional gradient background",
            textured: "subtle textured studio background"
          },
          office: {
            "modern-office": "modern corporate office environment",
            "executive-suite": "elegant executive suite setting",
            "conference-room": "professional conference room",
            "coworking-space": "contemporary coworking space",
            "window-view": "office with bright window view",
            library: "sophisticated library background"
          },
          outdoors: {
            beach: "professional beach setting",
            forest: "serene forest environment",
            mountain: "majestic mountain backdrop",
            urban: "stylish urban environment",
            park: "peaceful park setting"
          },
          fun: {
            throne: "regal throne setting",
            funk: "vibrant funky backdrop",
            pyramids: "ancient pyramids background",
            superhero: "superhero-themed environment",
            underwater: "ethereal underwater scene"
          }
        },
        lighting: {
          natural: "natural ambient lighting",
          studio: "professional studio lighting setup",
          dramatic: "dramatic cinematic lighting",
          soft: "soft and warm lighting",
          "golden-hour": "golden hour lighting"
        },
        expressions: {
          neutral: "professional neutral expression",
          "slight-smile": "warm, slight smile",
          "broad-smile": "friendly, broad smile",
          laughing: "genuine, natural laugh",
          serious: "serious and composed expression",
          thoughtful: "thoughtful and engaged expression",
          confident: "confident and approachable expression",
          professional: "polished professional expression"
        },
        clothing: {
          professional: "wearing professional business attire",
          casual: "in stylish casual wear",
          "business-casual": "in refined business casual wear",
          suit: "in tailored formal suit",
          "black-tie": "in elegant black tie attire",
          creative: "in creative professional attire"
        }
      },
      modelConfig: {
        defaultPromptMale:
          "Professional headshot with perfect studio lighting. Ultra high-definition with sharp, crisp details.",
        defaultPromptFemale:
          "Professional headshot with perfect studio lighting. Ultra high-definition with sharp, crisp details.",
        defaultNegativePrompt:
          "(lowres, low quality, worst quality:1.2), (text:1.2), watermark, painting, drawing, illustration, glitch,deformed, mutated, cross-eyed, ugly, disfigured",
        sdxlWeights: "RealVisXL_V3.0_Turbo",
        scheduler: "DPMSolverMultistepScheduler-Karras-SDE",
        numInferenceSteps: 30,
        guidanceScale: 5
      },
      controlnetConfig: {
        poseStrength: 0.4,
        cannyStrength: 0.3,
        depthStrength: 0.5,
        enablePoseControlnet: true,
        enableCannyControlnet: false,
        enableDepthControlnet: false,
        controlnetConditioningScale: 0.8
      },
      imageConfig: {
        enhanceNonFaceRegion: true,
        outputFormat: "webp",
        outputQuality: 100,
        faceDetectionInputWidth: 640,
        faceDetectionInputHeight: 640,
        ipAdapterScale: 0.8
      },
      lcmConfig: {
        enableLcm: false,
        lcmGuidanceScale: 1.5,
        lcmInferenceSteps: 5
      },
      updatedAt: new Date()
    };
  }

  private formatModelSettings(dbRow: any): ModelSettings {
    // Handle potential snake_case to camelCase conversion
    const settings: ModelSettings = {
      id: dbRow.id,
      apiToken: dbRow.api_token || dbRow.apiToken || "",
      modelVisibility:
        dbRow.model_visibility || dbRow.modelVisibility || "public",
      updatedAt: dbRow.updated_at || dbRow.updatedAt || new Date(),
      // Parse JSON fields if they are strings
      promptVars:
        typeof dbRow.prompt_vars === "string"
          ? JSON.parse(dbRow.prompt_vars)
          : dbRow.prompt_vars || dbRow.promptVars || {},
      modelConfig:
        typeof dbRow.model_config === "string"
          ? JSON.parse(dbRow.model_config)
          : dbRow.model_config || dbRow.modelConfig || {},
      imageConfig:
        typeof dbRow.image_config === "string"
          ? JSON.parse(dbRow.image_config)
          : dbRow.image_config || dbRow.imageConfig || {},
      lcmConfig:
        typeof dbRow.lcm_config === "string"
          ? JSON.parse(dbRow.lcm_config)
          : dbRow.lcm_config || dbRow.lcmConfig || {},
      controlnetConfig:
        typeof dbRow.controlnet_config === "string"
          ? JSON.parse(dbRow.controlnet_config)
          : dbRow.controlnet_config || dbRow.controlnetConfig || {}
    };

    return settings;
  }

  // Headshot generation methods
  async createHeadshotRequest(
    request: Omit<InsertHeadshotRequest, "id" | "createdAt" | "updatedAt">
  ): Promise<HeadshotRequest> {
    try {
      console.log("[Storage] Creating new headshot request:", request);

      // Get model settings to apply defaults
      const modelSettings = await this.getModelSettings();

      const modelConfig = {
        numInferenceSteps:
          request.modelConfig?.numInferenceSteps ??
          modelSettings.modelConfig?.numInferenceSteps ??
          30,
        guidanceScale:
          request.modelConfig?.guidanceScale ??
          modelSettings.modelConfig?.guidanceScale ??
          5,
        enhanceNonFaceRegion:
          request.modelConfig?.enhanceNonFaceRegion ??
          modelSettings.imageConfig?.enhanceNonFaceRegion ??
          true
      };

      const [newRequest] = await db
        .insert(headshotRequests)
        .values({
          userId: request.userId,
          characterId: request.characterId,
          status: request.status || "processing",
          setting: request.setting || "",
          lighting: request.lighting || "",
          expression: request.expression || "",
          clothing: request.clothing || "",
          settingCategory: request.settingCategory,
          output: null,
          error: null,
          generationId: request.generationId,
          referenceImage: request.referenceImage,
          useCustomCharacterPrompt: request.useCustomCharacterPrompt || false,
          customPrompt: request.customPrompt,
          useCustomHeadshotPrompt: request.useCustomHeadshotPrompt || false,
          useCustomNegativePrompt: request.useCustomNegativePrompt || false,
          customNegativePrompt: request.customNegativePrompt,
          modelConfig
        })
        .returning();

      console.log("[Storage] Created headshot request:", newRequest.id);
      return newRequest;
    } catch (error) {
      console.error("[Storage] Error creating headshot request:", error);
      throw error;
    }
  }

  async updateHeadshotRequest(
    requestId: number,
    updateData: Partial<Omit<HeadshotRequest, "id" | "createdAt" | "updatedAt">>
  ): Promise<HeadshotRequest> {
    try {
      const [updatedRequest] = await db
        .update(headshotRequests)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(headshotRequests.id, requestId))
        .returning();

      if (!updatedRequest) {
        throw new Error("Headshot request not found");
      }

      return updatedRequest;
    } catch (error) {
      console.error("Error updating headshot request:", error);
      throw error;
    }
  }

  async getHeadshotRequests(userId: number): Promise<HeadshotRequest[]> {
    try {
      const requests = await db
        .select()
        .from(headshotRequests)
        .where(eq(headshotRequests.userId, userId))
        .orderBy(desc(headshotRequests.createdAt));

      return requests;
    } catch (error) {
      console.error("Error getting headshot requests:", error);
      throw error;
    }
  }
  async deleteHeadshotRequest(requestId: number): Promise<void> {
    try {
      await db
        .delete(headshotRequests)
        .where(eq(headshotRequests.id, requestId));
    } catch (error) {
      console.error("Error deleting headshot request:", error);
      throw error;
    }
  }

  // Company methods
  async getCompanysByOrganizationId() {
    // Return empty array since companys are deprecated
    return [];
  }

  async createCompany() {
    console.warn("Company creation is deprecated");
    return {
      id: 0,
      name: "",
      slug: "",
      ownerId: 0,
      description: "",
      createdAt: new Date()
    };
  }

  async updateCompany() {
    console.warn("Company updates are deprecated");
    return {
      id: 0,
      name: "",
      slug: "",
      ownerId: 0,
      description: "",
      createdAt: new Date()
    };
  }

  async getQrSettings(): Promise<QrSettings> {
    try {
      const [settings] = await db.select().from(qrSettings).limit(1);

      if (!settings) {
        return this.initializeQrSettings();
      }

      return settings;
    } catch (error) {
      console.error("Error fetching QR settings:", error);
      throw error;
    }
  }

  async updateQrSettings(settings: Partial<QrSettings>): Promise<QrSettings> {
    try {
      const [currentSettings] = await db.select().from(qrSettings).limit(1);
      if (!currentSettings) {
        throw new Error("No existing QR settings found");
      }

      const [updatedSettings] = await db
        .update(qrSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(qrSettings.id, currentSettings.id))
        .returning();

      return updatedSettings;
    } catch (error) {
      console.error("Error updating QR settings:", error);
      throw error;
    }
  }

  async initializeQrSettings(): Promise<QrSettings> {
    try {
      const [settings] = await db
        .insert(qrSettings)
        .values({
          transparent: false,
          backColor: "#ffffff",
          frontColor: "#000000",
          markerOutColor: "#000000",
          markerInColor: "#ffffff",
          pattern: "square",
          marker: "square",
          markerIn: "square",
          outerFrame: "none",
          optionLogo: "",
          noLogoBg: false,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: qrSettings.id,
          set: {
            updatedAt: new Date()
          }
        })
        .returning();

      return settings;
    } catch (error) {
      console.error("Error initializing QR settings:", error);
      throw error;
    }
  }
  async findHeadshotRequestByAsset(
    assetId: string
  ): Promise<HeadshotRequest | undefined> {
    try {
      console.log(`[Storage] Finding headshot request by asset ID: ${assetId}`);

      const [request] = await db
        .select()
        .from(headshotRequests)
        .where(eq(headshotRequests.referenceImage, assetId));

      if (request) {
        console.log(`[Storage] Found headshot request: ${request.id}`);
      } else {
        console.log(
          `[Storage] No headshot request found for asset ID: ${assetId}`
        );
      }

      return request;
    } catch (error) {
      console.error(
        `[Storage] Error finding headshot request by asset: ${error}`
      );
      throw error;
    }
  }
  async getHeadshotRequest(id: number): Promise<HeadshotRequest | undefined> {
    try {
      console.log("[Storage] Getting headshot request:", id);
      const [request] = await db
        .select()
        .from(headshotRequests)
        .where(eq(headshotRequests.id, id));

      return request;
    } catch (error) {
      console.error("[Storage] Error getting headshot request:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
