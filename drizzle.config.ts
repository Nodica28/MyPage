import * as dotenv from "dotenv";
dotenv.config();

import {defineConfig} from "drizzle-kit";

// Migrations/seed should use the DIRECT (non-pooled, port 5432) Supabase
// connection; fall back to DATABASE_URL for local/other setups.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: ["./shared/schema.ts", "./shared/types/*.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl
  }
});
