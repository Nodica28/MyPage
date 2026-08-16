import type {Request, Response, NextFunction} from "express";
import {eq} from "drizzle-orm";
import {db} from "../db";
import {users, generateUniqueId, sanitizePath} from "@shared/schema";
import type {User} from "@shared/types/user";
import {getServerClient, isSupabaseConfigured} from "../supabase";
import {handleAuthError} from "../utils/error-handler";

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

// Find (or lazily create) the public.users profile row for a Supabase auth user.
// Used both by the auth middleware and the login/OAuth/callback handlers.
export async function ensureAppUser(
  authUser: SupabaseAuthUser
): Promise<User | undefined> {
  if (!authUser?.id) return undefined;

  // 1) Already linked by auth_id.
  let [user] = await db.select().from(users).where(eq(users.authId, authUser.id));
  if (user) return user;

  // 2) Pre-existing row by email (e.g. created before Supabase linkage) — link it.
  const email = (authUser.email || "").toLowerCase();
  if (email) {
    [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      if (!user.authId) {
        [user] = await db
          .update(users)
          .set({authId: authUser.id, updatedAt: new Date()})
          .where(eq(users.id, user.id))
          .returning();
      }
      return user;
    }
  }

  // 3) First sign-in (Google / magic link) — create the profile with Pro defaults.
  const meta = authUser.user_metadata || {};
  const firstName =
    meta.firstName || meta.given_name || (meta.name || "").split(" ")[0] || "";
  const lastName =
    meta.lastName ||
    meta.family_name ||
    (meta.name || "").split(" ").slice(1).join(" ") ||
    "";
  const uniquePathId = generateUniqueId();
  const publicPath = sanitizePath(
    `${firstName || "user"}-${lastName || "profile"}-${uniquePathId}`
  );

  const [created] = await db
    .insert(users)
    .values({
      authId: authUser.id,
      email: email || `${authUser.id}@placeholder.local`,
      firstName: firstName || "New",
      lastName: lastName || "User",
      uniquePathId,
      publicPath,
      profileImage: meta.avatar_url || meta.picture || null,
      subscriptionStatus: "active",
      planType: "pro",
      headshotCredits: 999999
    })
    .returning();
  return created;
}

// Soft authentication: populate req.user from the Supabase session cookie when
// present, and install Passport-compatible shims the rest of the app relies on.
// Always calls next(); `requireAuth` is what actually gates protected routes.
export async function populateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const r = req as any;

  r.isAuthenticated = () => Boolean(r.user);
  r.login = (user: User, cb?: (err?: any) => void) => {
    r.user = user;
    r.session = r.session || {};
    r.session.passport = {user: (user as any)?.id};
    if (cb) cb();
  };
  r.logout = (cb?: (err?: any) => void) => {
    r.user = undefined;
    if (r.session) r.session.passport = undefined;
    if (cb) cb();
  };
  if (!r.session) r.session = {};

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServerClient(req, res);
      const {
        data: {user: authUser}
      } = await supabase.auth.getUser();
      if (authUser) {
        const appUser = await ensureAppUser(authUser as SupabaseAuthUser);
        if (appUser) {
          r.user = appUser;
          r.session.passport = {user: appUser.id};
        }
      }
    } catch (err) {
      console.warn(
        "[Auth] populateUser failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  next();
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return handleAuthError(
      res,
      "Authentication required to access this resource"
    );
  }
  next();
};
