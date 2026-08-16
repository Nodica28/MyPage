import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
  index,
  varchar,
  boolean
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";

// Organization schema
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  logo: text("logo"),
  description: text("description"),
  website: text("website"),
  defaultColor: text("default_color"),
  icon: text("icon"),
  qrLogoUrl: text("qr_logo_url"),
  qrCodeColor: text("qr_code_color"),
  socialProfiles: text("social_profiles"),
  autoJoin: text("auto_join").default("false"),
  publicToken: text("public_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Create insert schema for organizations
export const insertOrganizationSchema = createInsertSchema(organizations)
  .extend({
    name: z.string().min(1, "Organization name is required"),
    domain: z.string().min(1, "Domain is required")
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

// Export types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

// Re-export all types from their respective modules
export * from "./types/character";
export * from "./types/user";
export * from "./types/content";
export * from "./types/analytics";
export * from "./types/model";

// Leads table to store lead entries submitted through the form
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // The owner of the badge profile
    actionId: text("action_id").notNull(), // The form or action that generated this lead
    formData: jsonb("form_data").notNull(), // JSON object with form field values
    tags: jsonb("tags").default("[]"), // JSON array of tags
    notes: jsonb("notes").default("[]"), // JSON array of notes
    fromQr: text("from_qr").default("false"), // Whether this lead came from a QR code scan
    ip: text("ip"), // IP address of the lead (for analytics only)
    userAgent: text("user_agent"), // User agent of the lead (for analytics only)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      userIdIdx: index("leads_user_id_idx").on(table.userId),
      actionIdIdx: index("leads_action_id_idx").on(table.actionId),
      createdAtIdx: index("leads_created_at_idx").on(table.createdAt)
    };
  }
);

// Export types for leads
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Utility functions
export const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return (timestamp.substring(timestamp.length - 4) + randomStr).substring(
    0,
    8
  );
};

export const sanitizePath = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// Character name generation utility
export const generateCharacterName = (
  firstName: string,
  lastName: string
): string => {
  return `${firstName} ${lastName}`.trim();
};

// Image storage table to store binary image data
export const imageStorage = pgTable(
  "image_storage",
  {
    id: serial("id").primaryKey(),
    filename: varchar("filename", {length: 255}).notNull(),
    originalName: varchar("original_name", {length: 255}).notNull(),
    mimetype: varchar("mimetype", {length: 100}).notNull(),
    size: integer("size").notNull(),
    data: text("data").notNull(), // Base64 encoded image data
    userId: integer("user_id"),
    type: varchar("type", {length: 50}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      filenameIdx: index("image_storage_filename_idx").on(table.filename),
      userIdIdx: index("image_storage_user_id_idx").on(table.userId),
      typeIdx: index("image_storage_type_idx").on(table.type)
    };
  }
);

// Create insert schema for image storage
export const insertImageStorageSchema = createInsertSchema(imageStorage).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Authentication tokens table for magic links
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    email: text("email").notNull(),
    expires: timestamp("expires").notNull(),
    used: boolean("used").default(false),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => {
    return {
      tokenIdx: index("auth_tokens_token_idx").on(table.token),
      emailIdx: index("auth_tokens_email_idx").on(table.email),
      expiresIdx: index("auth_tokens_expires_idx").on(table.expires)
    };
  }
);

// Create insert schema for auth tokens
export const insertAuthTokenSchema = createInsertSchema(authTokens).omit({
  id: true,
  createdAt: true
});

// Export types
export type ImageStorage = typeof imageStorage.$inferSelect;
export type InsertImageStorage = z.infer<typeof insertImageStorageSchema>;
export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = z.infer<typeof insertAuthTokenSchema>;

// Path redirects table to handle URL redirects when users change names
// One record per user with old paths stored as JSON array for efficiency
export const pathRedirects = pgTable(
  "path_redirects",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique(),
    oldPaths: jsonb("old_paths").$type<string[]>().notNull(),
    currentPath: text("current_path").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      userIdIdx: index("path_redirects_user_id_idx").on(table.userId),
      currentPathIdx: index("path_redirects_current_path_idx").on(
        table.currentPath
      ),
      oldPathsIdx: index("path_redirects_old_paths_idx").using(
        "gin",
        table.oldPaths
      )
    };
  }
);

// Create insert schemas for the new tables
export const insertPathRedirectSchema = createInsertSchema(pathRedirects).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Export types for the new tables
export type PathRedirect = typeof pathRedirects.$inferSelect;
export type InsertPathRedirect = z.infer<typeof insertPathRedirectSchema>;
