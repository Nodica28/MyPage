import type {User as DbUser} from "@shared/types/user";

// The app reads req.user / req.session / req.isAuthenticated / req.login across
// ~125 sites. Those augmentations used to come from @types/passport and
// @types/express-session, which only activate while the passport / express-session
// runtime modules are imported. Supabase Auth replaced both, so we declare the
// augmentation directly here. req.user is populated by the populateUser middleware.
declare global {
  namespace Express {
    interface User extends DbUser {}
    interface AuthenticatedRequest extends Request {
      user: User;
    }
    interface Request {
      user?: User;
      // Type-guard form (matches @types/passport) so `if (req.isAuthenticated())`
      // narrows req.user to defined at the call sites that rely on it.
      isAuthenticated(): this is AuthenticatedRequest;
      login(user: User, done?: (err?: any) => void): void;
      logIn(user: User, done?: (err?: any) => void): void;
      logout(done?: (err?: any) => void): void;
      logOut(done?: (err?: any) => void): void;
      session: {
        passport?: {user?: number};
        [key: string]: any;
      };
    }
  }
}

export {};
