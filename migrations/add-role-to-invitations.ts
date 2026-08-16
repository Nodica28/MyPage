/**
 * Migration script to add role column to invitations table
 */

import {db} from "../server/db";
import {sql} from "drizzle-orm";

async function addRoleToInvitations() {
  console.log("Starting invitations role column migration...");

  try {
    // Add role column to invitations table
    console.log("Adding role column to invitations table...");
    
    await db.execute(sql`
      ALTER TABLE invitations 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'User'
    `);

    console.log("Role column added successfully!");

    // Update existing invitations to have default role
    console.log("Updating existing invitations with default role...");
    
    const result = await db.execute(sql`
      UPDATE invitations 
      SET role = 'User' 
      WHERE role IS NULL
    `);

    console.log(`Updated ${result.rowCount || 0} existing invitations with default role.`);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration immediately
addRoleToInvitations()
  .then(() => {
    console.log("Migration script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });

export {addRoleToInvitations};