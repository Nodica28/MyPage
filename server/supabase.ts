import {createServerClient} from "@supabase/ssr";
import {createClient, type SupabaseClient} from "@supabase/supabase-js";
import type {Request, Response} from "express";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Service-role admin client (server-only — bypasses RLS, never expose to the browser).
// Null until the project is wired up, so the app can still boot with placeholder env.
export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {autoRefreshToken: false, persistSession: false}
      })
    : null;

function parseCookieHeader(header: string): {name: string; value: string}[] {
  if (!header) return [];
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return {name: part, value: ""};
      const name = part.slice(0, eq).trim();
      let value = part.slice(eq + 1).trim();
      try {
        value = decodeURIComponent(value);
      } catch {
        // leave the raw value if it isn't percent-encoded
      }
      return {name, value};
    });
}

function serializeCookie(
  name: string,
  value: string,
  options: Record<string, any> = {}
): string {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.domain) segments.push(`Domain=${options.domain}`);
  segments.push(`Path=${options.path || "/"}`);
  if (options.expires) {
    const exp =
      options.expires instanceof Date
        ? options.expires.toUTCString()
        : options.expires;
    segments.push(`Expires=${exp}`);
  }
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  if (options.sameSite) {
    const ss =
      typeof options.sameSite === "string" ? options.sameSite : "Lax";
    segments.push(`SameSite=${ss}`);
  }
  return segments.join("; ");
}

// Per-request client bound to the request/response cookies. Reads the session from
// the incoming cookies and writes refreshed/new session cookies onto the response.
export function getServerClient(req: Request, res: Response): SupabaseClient {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? "");
      },
      setAll(cookiesToSet) {
        for (const {name, value, options} of cookiesToSet) {
          res.append("Set-Cookie", serializeCookie(name, value, options));
        }
      }
    }
  });
}
