import * as dotenv from "dotenv";
dotenv.config();

import {eq} from "drizzle-orm";
import {db} from "../server/db";
import {users, generateUniqueId, sanitizePath} from "@shared/schema";
import {supabaseAdmin} from "../server/supabase";

// Seeds one demo account (Supabase auth user + matching public.users profile with
// Pro defaults). Idempotent. Run after `pnpm db:push` once Supabase env is wired:
//   pnpm db:seed
// Override defaults via SEED_EMAIL / SEED_PASSWORD / SEED_FIRST_NAME / SEED_LAST_NAME.
const DEMO_EMAIL = (process.env.SEED_EMAIL || "demo@example.com").toLowerCase();
const DEMO_PASSWORD = process.env.SEED_PASSWORD || "demo-password-123";
const DEMO_FIRST = process.env.SEED_FIRST_NAME || "Demo";
const DEMO_LAST = process.env.SEED_LAST_NAME || "User";

async function findAuthUserByEmail(email: string) {
  for (let page = 1; page <= 10; page++) {
    const {data, error} = await supabaseAdmin!.auth.admin.listUsers({
      page,
      perPage: 200
    });
    if (error) throw error;
    const match = data.users.find(
      (u) => (u.email || "").toLowerCase() === email
    );
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  // 1) Ensure the Supabase auth user exists.
  let authUser = await findAuthUserByEmail(DEMO_EMAIL);
  if (!authUser) {
    const {data, error} = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {firstName: DEMO_FIRST, lastName: DEMO_LAST}
    });
    if (error || !data.user) {
      throw error || new Error("Failed to create auth user");
    }
    authUser = data.user;
    console.log(`[seed] Created Supabase auth user ${DEMO_EMAIL}`);
  } else {
    console.log(`[seed] Supabase auth user ${DEMO_EMAIL} already exists`);
  }

  // 2) Ensure the public.users profile row exists with Pro defaults.
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.authId, authUser.id));
  if (existing.length > 0) {
    console.log("[seed] Profile row already exists; nothing to do.");
    return;
  }

  const uniquePathId = generateUniqueId();
  const publicPath = sanitizePath(`${DEMO_FIRST}-${DEMO_LAST}-${uniquePathId}`);
  await db.insert(users).values({
    authId: authUser.id,
    email: DEMO_EMAIL,
    firstName: DEMO_FIRST,
    lastName: DEMO_LAST,
    uniquePathId,
    publicPath,
    subscriptionStatus: "active",
    planType: "pro",
    headshotCredits: 999999
  });
  console.log(
    `[seed] Created profile for ${DEMO_EMAIL} (login with the password above; public path: /${publicPath})`
  );
}

main()
  .then(() => {
    console.log("[seed] Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
