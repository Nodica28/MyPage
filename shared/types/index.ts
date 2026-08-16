// Re-export types from each domain module
export * from "./user";
export * from "./character";
export * from "./content";
export * from "./sections";
export * from "./headshot";

// Re-export types from analytics file
export type {
  Analytics,
  InsertAnalytics,
  PathRedirect,
  InsertPathRedirect
} from "./analytics";
export {insertAnalyticsSchema} from "./analytics";

// Re-export types from UI with renamed items to avoid conflicts
export type {Banner, InsertBanner} from "./ui";
export {banners, insertBannerSchema} from "./ui";

// Re-export types from utils with renamed items as needed
export type {QrSettings, InsertQrSettings} from "./utils";
export {generateUniqueId, sanitizePath} from "./utils";

// Re-export utility functions
export {
  generateCharacterName,
  generateUniqueId as generateId,
  sanitizePath as sanitize
} from "../schema";
