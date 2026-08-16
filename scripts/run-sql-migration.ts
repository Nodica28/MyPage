/**
 * Script to execute the SQL migration to add the user_organizations table
 * without affecting existing data
 */

import {pool} from "../server/db";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSqlMigration() {
  console.log("Starting SQL migration for user_organizations table...");

  try {
    // Read the SQL file
    const sqlFilePath = path.resolve(
      __dirname,
      "../migrations/add-user-organizations-table.sql"
    );
    const sql = fs.readFileSync(sqlFilePath, "utf-8");

    // Connect to the database
    const client = await pool.connect();

    try {
      // Start a transaction
      await client.query("BEGIN");

      // Execute the SQL
      console.log("Executing SQL migration...");
      await client.query(sql);

      // Commit the transaction
      await client.query("COMMIT");
      console.log("SQL migration completed successfully!");
    } catch (error) {
      // Roll back the transaction on error
      await client.query("ROLLBACK");
      console.error("SQL migration failed:", error);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error("Error running SQL migration:", error);
    process.exit(1);
  }
}

// Run the migration
runSqlMigration().catch(console.error);
