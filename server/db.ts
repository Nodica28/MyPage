import * as dotenv from "dotenv";
dotenv.config();

import {drizzle} from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

const {Pool} = pg;

// Supabase Postgres via node-postgres (pg). Point DATABASE_URL at the pooled
// (Supavisor, transaction-mode, port 6543) connection string for serverless.
// pg returns pg-style results ({ rows, rowCount }), matching the prior Neon driver.
export const pool = new Pool({connectionString: process.env.DATABASE_URL});

export const db = drizzle(pool, {schema});
