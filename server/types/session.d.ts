import "express-session";

// Extend the Express Session type to include passport
declare module "express-session" {
  interface Session {
    passport?: {
      user: number;
    };
  }
}
