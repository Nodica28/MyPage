import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uuid
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";
import {organizations} from "../schema";
import {LeadSettings} from "./lead";

// User-related tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Links this profile row to the Supabase Auth user (auth.users.id).
  authId: uuid("auth_id").unique(),
  email: text("email").notNull().unique(),
  // Auth is handled by Supabase; this legacy column is nullable and unused for new users.
  password: text("password"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  bio: text("bio"),
  profileImage: text("profile_image"),
  phoneNumber: text("phone_number"),
  companyName: text("company_name"),
  website: text("website"),
  linkedinProfile: text("linkedin_profile"),
  twitterHandle: text("twitter_handle"),
  meetingLink: text("meeting_link"),
  meetingProvider: text("meeting_provider"),
  googleId: text("google_id"),
  organizationId: integer("organization_id").references(() => organizations.id),
  isCompanyAdmin: boolean("is_workspace_admin").default(false),
  onboardingComplete: boolean("onboarding_complete").default(false),
  isBetaTester: boolean("is_beta_tester").default(false),
  selectedRole: text("selected_role").$type<
    "creator" | "professional" | "team_member"
  >(),
  uniquePathId: text("unique_path_id").notNull().unique(),
  publicPath: text("public_path").notNull().unique(),
  qrCodeUrl: text("qr_code_url"),
  qrCodeSvg: text("qr_code_svg"),
  characterId: integer("character_id"),
  // OAuth token fields for Google integrations
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiresAt: timestamp("google_token_expires_at"),
  googleScopes: text("google_scopes"),
  // Slack OAuth fields
  slackId: text("slack_id"),
  slackTeamId: text("slack_team_id"),
  slackAccessToken: text("slack_access_token"),
  slackRefreshToken: text("slack_refresh_token"),
  slackTokenExpiresAt: timestamp("slack_token_expires_at"),
  slackScopes: text("slack_scopes"),
  // New columns from database schema
  socialLinks: jsonb("social_links").$type<{
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    github?: string;
    website?: string;
  }>(),
  theme: jsonb("theme").$type<{
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    layout?: "modern" | "classic" | "minimal";
  }>(),
  qrCodeSettings: jsonb("qr_code_settings").$type<{
    enabled?: boolean;
    size?: "small" | "medium" | "large";
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    backgroundColor?: string;
    foregroundColor?: string;
    includeProfile?: boolean;
    customUrl?: string;
  }>(),
  bannerSettings: jsonb("banner_settings").$type<{
    activeBannerId?: string;
    savedBanners?: Array<{
      id: string;
      name?: string;
      headline: {
        text: string;
        font: string;
        color: string;
      };
      subheadline?: {
        text: string;
        font: string;
        color: string;
      };
      tags: Array<{
        text: string;
        color: string;
        backgroundColor: string;
      }>;
      backgroundType: "preset" | "custom";
      backgroundValue: string;
      customUploadUrl?: string;
      createdAt: string;
      updatedAt?: string;
    }>;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Stripe and subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status")
    .$type<"free" | "pro" | "cancelled" | "past_due" | "active">()
    .default("active"),
  subscriptionId: text("subscription_id"),
  planType: text("plan_type").$type<"free" | "pro">().default("pro"),
  headshotCredits: integer("headshot_credits").default(999999),
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  subscriptionCancelAtPeriodEnd: boolean(
    "subscription_cancel_at_period_end"
  ).default(false),
  settings: jsonb("settings").$type<{
    theme?: {
      banner?: {
        type: "gradient" | "solid" | "pattern" | "custom";
        id: string;
        // Custom banner data (only when type is "custom")
        headline?: {
          text: string;
          font: string;
          color: string;
        };
        subheadline?: {
          text: string;
          font: string;
          color: string;
        };
        tags?: Array<{
          text: string;
          color: string;
          backgroundColor: string;
        }>;
        backgroundType?: "preset" | "custom";
        backgroundValue?: string;
        customUploadUrl?: string;
        createdAt?: string;
        updatedAt?: string;
      };
      background?: {
        type: "preset" | "custom";
        preset?: string;
        customUrl?: string;
      };
    };
    // Saved custom banners that users can create, edit, and choose from
    savedBanners?: Array<{
      id: string;
      name?: string; // User-defined name for the banner
      headline: {
        text: string;
        font: string;
        color: string;
      };
      subheadline?: {
        text: string;
        font: string;
        color: string;
      };
      tags: Array<{
        text: string;
        color: string;
        backgroundColor: string;
      }>;
      backgroundType: "preset" | "custom";
      backgroundValue: string;
      customUploadUrl?: string;
      createdAt: string;
      updatedAt?: string;
    }>;
    quickLinks?: Array<{
      id: string;
      label: string;
      url: string;
      type: "website" | "email" | "phone" | "custom";
    }>;
    sections?: Array<{
      id: string;
      type: string;
      name: string;
      anchor: string;
      isVisible: boolean;
      order: number;
      content?: {
        title?: string;
        description?: string;
        buttonText?: string;
        buttonLink?: string;
        image?: string;
        status?: "connected" | "sample";
      };
    }>;
    chatSettings?: {
      enabled: boolean;
      position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
      bubbleText?: string;
      welcomeMessage?: string;
      chatSettings: {
        defaultPrompts: Array<{
          id: string;
          text: string;
          order: number;
        }>;
        knowledgeSources: Array<{
          id: string;
          type: "url" | "file";
          content: string;
          name?: string;
          size?: number;
        }>;
        includeProfileData: boolean;
        model?: string;
        systemPrompt?: string;
      };
    };
    leadSettings?: LeadSettings;
    branding?: {
      removeBuiltWithBadge?: boolean;
      customBranding?: boolean;
    };
  }>()
});

// Many-to-many join table for users and organizations
export const userOrganizations = pgTable(
  "user_organizations",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, {onDelete: "cascade"}),
    isCompanyAdmin: boolean("is_workspace_admin").default(false),
    isActive: boolean("is_active").default(true),
    isPrimary: boolean("is_primary").default(false),
    joinedAt: timestamp("joined_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      pk: primaryKey({columns: [table.userId, table.organizationId]}),
      userIdIdx: index("user_organizations_user_id_idx").on(table.userId),
      orgIdIdx: index("user_organizations_org_id_idx").on(table.organizationId)
    };
  }
);

// Schema definitions
export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    firstName: true,
    lastName: true,
    password: true,
    phoneNumber: true,
    organizationId: true
  })
  .extend({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .transform((email) => email.toLowerCase()),
    firstName: z
      .string()
      .min(1, "First name is required")
      .transform((str) => str.trim()),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .transform((str) => str.trim()),
    password: z.string().min(6, "Password must be at least 6 characters")
  });

export const insertUserOrganizationSchema =
  createInsertSchema(userOrganizations);
export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = z.infer<
  typeof insertUserOrganizationSchema
>;

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Additional type exports for frontend use
export type UserProfile = Omit<User, "organizationId" | "phoneNumber"> & {
  organizationId?: number | null;
  phoneNumber?: string | null;
};

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  invitedBy: integer("invited_by").references(() => users.id),
  token: text("token").notNull().unique(),
  role: text("role").default("User"), // Role for the invitation (Company Admin or User)
  expiresAt: timestamp("expires_at"), // Nullable - null means never expires
  createdAt: timestamp("created_at").defaultNow()
});
export type Invitation = typeof invitations.$inferSelect;

// Create an insert schema for invitations
export const insertInvitationSchema = createInsertSchema(invitations)
  .pick({
    organizationId: true,
    invitedBy: true,
    token: true,
    expiresAt: true
  })
  .extend({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .transform((email) => email.toLowerCase()),
    expiresAt: z.date().optional() // Make expiresAt optional for non-expiring invitations
  });

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Payments table to track Stripe transactions
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    amount: integer("amount").notNull(), // Amount in cents
    currency: text("currency").default("usd"),
    type: text("type").$type<"subscription" | "credits">().notNull(),
    status: text("status")
      .$type<"pending" | "succeeded" | "failed" | "cancelled">()
      .notNull(),
    description: text("description"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      userIdIdx: index("payments_user_id_idx").on(table.userId),
      stripePaymentIntentIdx: index("payments_stripe_payment_intent_idx").on(
        table.stripePaymentIntentId
      ),
      typeIdx: index("payments_type_idx").on(table.type),
      statusIdx: index("payments_status_idx").on(table.status),
      createdAtIdx: index("payments_created_at_idx").on(table.createdAt)
    };
  }
);

// Headshot usage tracking table
export const headshotUsage = pgTable(
  "headshot_usage",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    headshotRequestId: integer("headshot_request_id"),
    creditsCost: integer("credits_cost").default(1),
    type: text("type")
      .$type<"monthly_allowance" | "purchased_credits">()
      .notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => {
    return {
      userIdIdx: index("headshot_usage_user_id_idx").on(table.userId),
      headshotRequestIdIdx: index("headshot_usage_headshot_request_idx").on(
        table.headshotRequestId
      ),
      createdAtIdx: index("headshot_usage_created_at_idx").on(table.createdAt)
    };
  }
);

// Create insert schemas for the new tables
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertHeadshotUsageSchema = createInsertSchema(headshotUsage).omit(
  {
    id: true,
    createdAt: true
  }
);

// Export types for the new tables
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type HeadshotUsage = typeof headshotUsage.$inferSelect;
export type InsertHeadshotUsage = z.infer<typeof insertHeadshotUsageSchema>;
