/**
 * Migration script to transfer existing user-organization relationships
 * from users.organizationId to the new user_organizations table.
 */

import {db} from "../server/db";
import {users, userOrganizations} from "../shared/types/user";
import {organizations} from "../shared/schema";
import {eq, isNotNull} from "drizzle-orm";

async function migrateUserOrganizations() {
  console.log("Starting user organizations migration...");

  try {
    // Fetch all users with an organizationId
    const usersWithOrg = await db
      .select()
      .from(users)
      .where(isNotNull(users.organizationId));

    console.log(
      `Found ${usersWithOrg.length} users with organization associations to migrate`
    );

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each user
    for (const user of usersWithOrg) {
      try {
        const {id, organizationId, isCompanyAdmin} = user;

        // Skip if there's no organizationId (should never happen due to the query, but just in case)
        if (!organizationId) {
          console.log(`Skipping user ${id}: No organization ID`);
          skipped++;
          continue;
        }

        // Check if the organization exists
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId));

        if (!org) {
          console.log(
            `Skipping user ${id}: Organization ${organizationId} not found`
          );
          skipped++;
          continue;
        }

        // Insert into user_organizations table
        console.log(
          `Migrating user ${id} association with organization ${organizationId}`
        );
        await db.insert(userOrganizations).values({
          userId: id,
          organizationId: organizationId,
          isCompanyAdmin: isCompanyAdmin || false,
          isPrimary: true, // Mark as primary since it was the only organization
          isActive: true,
          joinedAt: new Date(),
          updatedAt: new Date()
        });

        migrated++;
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        errors++;
      }
    }

    console.log("Migration summary:");
    console.log(`- Migrated: ${migrated} user-organization associations`);
    console.log(`- Skipped: ${skipped} users`);
    console.log(`- Errors: ${errors} users`);
    console.log("Migration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run the migration
migrateUserOrganizations().catch(console.error);
