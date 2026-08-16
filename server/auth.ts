import {Express, Request, Response} from "express";
import {eq} from "drizzle-orm";
import {db} from "./db";
import {
  users,
  organizations,
  userOrganizations,
  generateUniqueId,
  sanitizePath
} from "@shared/schema";
import {invitations} from "@shared/types/user";
import {supabaseAdmin, getServerClient, isSupabaseConfigured} from "./supabase";
import {
  populateUser,
  requireAuth,
  ensureAppUser
} from "./middleware/supabase-auth";

// requireAuth is imported from "./auth" by many route files — keep re-exporting it.
// (The Express.Request / Express.User augmentation lives in types/express-augment.d.ts.)
export {requireAuth};

const PUBLIC_URL =
  process.env.PUBLIC_URL || process.env.APP_URL || "http://localhost:5000";
const CALLBACK_URL = `${PUBLIC_URL}/api/auth/callback`;

function notConfigured(res: Response) {
  return res
    .status(503)
    .json({error: "Authentication is not configured (missing Supabase env)"});
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // Populate req.user (+ passport-compatible shims) from the Supabase session cookie.
  app.use("/api", populateUser);

  // ── Registration: Supabase auth user + public.users profile + org side-effects ──
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      if (!isSupabaseConfigured() || !supabaseAdmin) return notConfigured(res);

      const body = req.body || {};
      const email = (body.email || "").toLowerCase().trim();
      if (!email) return res.status(400).json({error: "Email is required"});
      if (!body.firstName || !body.lastName) {
        return res
          .status(400)
          .json({error: "First and last name are required"});
      }
      // Password is optional — this app signs in via magic link / Google.

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      if (existing.length > 0) {
        return res
          .status(400)
          .json({error: "An account with this email already exists"});
      }

      // 1) Create the Supabase auth user (email pre-confirmed for immediate login).
      const {data: created, error: createErr} =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {firstName: body.firstName, lastName: body.lastName},
          // Include a password only if the form supplied one (passwordless otherwise).
          ...(body.password ? {password: body.password} : {})
        });
      if (createErr || !created?.user) {
        return res
          .status(400)
          .json({error: createErr?.message || "Could not create account"});
      }
      const authId = created.user.id;

      // 2) Create the profile row + organization membership (auto-Pro).
      const uniquePathId = generateUniqueId();
      const publicPath = sanitizePath(
        `${body.firstName}-${body.lastName}-${uniquePathId}`
      );

      const result = await db.transaction(async (tx) => {
        let organizationId: number | undefined;
        let createdOrganization: typeof organizations.$inferSelect | undefined;

        if (body.invitationToken) {
          const [invitation] = await tx
            .select()
            .from(invitations)
            .where(eq(invitations.token, body.invitationToken));
          const invOrgId = invitation?.organizationId ?? undefined;
          if (invOrgId != null) {
            organizationId = invOrgId;
            const [org] = await tx
              .select()
              .from(organizations)
              .where(eq(organizations.id, invOrgId));
            createdOrganization = org;
          }
        } else if (body.company?.companyId != null) {
          const companyId = Number(body.company.companyId);
          organizationId = companyId;
          const [org] = await tx
            .select()
            .from(organizations)
            .where(eq(organizations.id, companyId));
          createdOrganization = org;
        } else if (body.company?.companyName) {
          const [org] = await tx
            .insert(organizations)
            .values({
              name: body.company.companyName,
              domain: email.split("@")[1] || "",
              website: body.company.companyWebsite || "",
              logo: body.company.companyLogo || "",
              defaultColor: body.company.primaryColor || "#4E5BA6",
              updatedAt: new Date()
            })
            .returning();
          createdOrganization = org;
          organizationId = org?.id;
        }

        // Admin only when they created a brand-new org (not joined/invited).
        const isOrgAdmin =
          !!organizationId &&
          !body.company?.companyId &&
          !body.invitationToken;

        const [user] = await tx
          .insert(users)
          .values({
            authId,
            email,
            firstName: body.firstName,
            lastName: body.lastName,
            title: body.title,
            uniquePathId,
            publicPath,
            organizationId,
            isCompanyAdmin: isOrgAdmin ? true : undefined,
            subscriptionStatus: "active",
            planType: "pro",
            headshotCredits: 999999
          })
          .returning();

        if (organizationId) {
          await tx.insert(userOrganizations).values({
            userId: user.id,
            organizationId,
            isCompanyAdmin: isOrgAdmin,
            isActive: true,
            isPrimary: true,
            joinedAt: new Date(),
            updatedAt: new Date()
          });
        }

        return {user, organization: createdOrganization};
      });

      // 3) Mailtrap contact sync (non-fatal).
      try {
        const {syncRecipientsToContacts} = await import(
          "./services/mailtrap-email"
        );
        const emailToUserMap = new Map<string, {isBetaTester: boolean}>();
        emailToUserMap.set(result.user.email, {isBetaTester: false});
        await syncRecipientsToContacts(result.user.email, emailToUserMap);
      } catch (mailErr) {
        console.warn("[Auth] Mailtrap sync failed:", mailErr);
      }

      // 4) Establish a session (sets the Supabase auth cookies on the response).
      // Works whether or not a password was set: mint a one-time magic-link token
      // and consume it server-side to log the new user straight in.
      try {
        const supabase = getServerClient(req, res);
        const {data: linkData} = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email
        });
        const hash = linkData?.properties?.hashed_token;
        if (hash) {
          await supabase.auth.verifyOtp({token_hash: hash, type: "magiclink"});
        }
      } catch (sessionErr) {
        // Non-fatal: the account exists; the user can still log in via magic link.
        console.warn("[Auth] Could not auto-login after register:", sessionErr);
      }

      return res.json({
        success: true,
        user: result.user,
        organization: result.organization,
        message: "Successfully registered"
      });
    } catch (error) {
      console.error("[Auth] Registration error:", error);
      return res.status(500).json({
        error: "Registration failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ── Email/password login ──
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      if (!isSupabaseConfigured()) return notConfigured(res);
      const email = (req.body?.email || "").toLowerCase().trim();
      const password = req.body?.password;
      if (!email || !password) {
        return res
          .status(400)
          .json({error: "Email and password are required"});
      }

      const supabase = getServerClient(req, res);
      const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error || !data?.user) {
        return res.status(401).json({error: "Invalid email or password"});
      }

      const appUser = await ensureAppUser(data.user);
      return res.json({
        success: true,
        user: appUser,
        message: "Successfully logged in"
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({error: "Login failed"});
    }
  });

  // ── Current user ──
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({success: false, message: "Not authenticated"});
    }
    return res.json({success: true, user: req.user});
  });

  // ── Logout ──
  app.post("/api/logout", async (req: Request, res: Response) => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getServerClient(req, res);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn("[Auth] Logout error:", error);
    }
    return res.json({success: true, message: "Successfully logged out"});
  });

  // ── Google OAuth (initiate) ──
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    try {
      if (!isSupabaseConfigured()) return res.redirect("/auth?error=oauth_unconfigured");
      const supabase = getServerClient(req, res);
      const {data, error} = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {redirectTo: CALLBACK_URL}
      });
      if (error || !data?.url) {
        return res.redirect("/auth?error=oauth_init_failed");
      }
      return res.redirect(data.url);
    } catch (error) {
      console.error("[Auth] Google OAuth init error:", error);
      return res.redirect("/auth?error=oauth_init_failed");
    }
  });

  // ── OAuth / magic-link callback: exchange the code for a session, then redirect ──
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const tokenHash = req.query.token_hash as string | undefined;
    const otpType = (req.query.type as string | undefined) || "magiclink";
    try {
      if (isSupabaseConfigured() && (code || tokenHash)) {
        const supabase = getServerClient(req, res);
        if (tokenHash) {
          // Magic-link / email OTP: verified server-side, no PKCE verifier needed.
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any
          });
        } else if (code) {
          // OAuth / PKCE code exchange.
          await supabase.auth.exchangeCodeForSession(code);
        }
        const {
          data: {user}
        } = await supabase.auth.getUser();
        if (user) await ensureAppUser(user);
      }
    } catch (error) {
      console.error("[Auth] OAuth callback error:", error);
      return res.redirect("/auth?error=oauth_failed");
    }
    return res.redirect("/");
  });

  // ── Magic link (passwordless) ──
  const sendMagicLink = async (req: Request, res: Response) => {
    try {
      const email = (req.body?.email || "").toLowerCase().trim();
      if (!email) return res.status(400).json({error: "Email is required"});
      if (isSupabaseConfigured()) {
        const supabase = getServerClient(req, res);
        // Creates the user if new (sign-up) and, in production, emails the link.
        await supabase.auth.signInWithOtp({
          email,
          options: {emailRedirectTo: CALLBACK_URL}
        });

        // Dev/testing convenience: print a directly-usable magic link to the server
        // console (no real inbox needed). On in non-production, or set LOG_MAGIC_LINKS=true.
        const shouldLog =
          process.env.NODE_ENV !== "production" ||
          process.env.LOG_MAGIC_LINKS === "true";
        if (shouldLog && supabaseAdmin) {
          try {
            const {data, error} = await supabaseAdmin.auth.admin.generateLink({
              type: "magiclink",
              email
            });
            const hash = data?.properties?.hashed_token;
            if (!error && hash) {
              const link = `${PUBLIC_URL}/api/auth/callback?token_hash=${hash}&type=magiclink`;
              const bar = "━".repeat(78);
              console.log(
                `\n${bar}\n🔗  MAGIC LINK  ·  ${email}\n${link}\n${bar}\n`
              );
            } else if (error) {
              console.warn(
                "[Auth] dev magic-link generation failed:",
                error.message
              );
            }
          } catch (genErr) {
            console.warn("[Auth] dev magic-link generation error:", genErr);
          }
        }
      }
      // Anti-enumeration: always report success.
      return res.json({
        success: true,
        message: "If your email is registered, a login link is on its way."
      });
    } catch (error) {
      console.error("[Auth] Magic link error:", error);
      return res.json({
        success: true,
        message: "If your email is registered, a login link is on its way."
      });
    }
  };
  app.post("/api/auth/magic-link", sendMagicLink);
  app.post("/api/auth/magic-link/request", sendMagicLink);
  app.post("/api/magic-link", sendMagicLink); // legacy client path

  // ── Stubs for endpoints whose features were retired with Passport ──
  // (Google token / calendar integration + the old register-after-OAuth handoff.)
  app.get("/api/auth/oauth-data", (_req: Request, res: Response) =>
    res.json({success: false, data: null})
  );
  app.delete("/api/auth/oauth-data", (_req: Request, res: Response) =>
    res.json({success: true})
  );
  app.get("/api/auth/google-token", (_req: Request, res: Response) =>
    res
      .status(404)
      .json({success: false, accessToken: null, requiresReauth: true})
  );
  app.get("/api/auth/google/calendar", (_req: Request, res: Response) =>
    res.redirect("/settings?error=calendar_unavailable")
  );
}
