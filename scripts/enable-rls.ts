import * as dotenv from "dotenv";
dotenv.config();
import pg from "pg";

// Enables Row-Level Security on every table in the public schema. With RLS on and
// no policies, the anon/authenticated roles (Supabase Data API) get deny-by-default,
// while the app — which connects as the `postgres` role (BYPASSRLS) — is unaffected.
// Idempotent. Run with: pnpm db:rls
const {Pool} = pg;
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
});

async function main() {
  const {rows} = await pool.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`
  );
  for (const {tablename} of rows as {tablename: string}[]) {
    await pool.query(
      `alter table public."${tablename}" enable row level security`
    );
    console.log(`[rls] enabled RLS on public.${tablename}`);
  }
  console.log(
    `[rls] Done — RLS enabled on ${rows.length} tables (default-deny for the Data API; the app's postgres role bypasses RLS).`
  );
  await pool.end();
}

main().catch((e) => {
  console.error("[rls] failed:", e);
  process.exit(1);
});
