import {
  pgTable,
  text,
  serial,
  integer,
  jsonb,
  timestamp
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";
import {users} from "./user";
import {qrSettings} from "./utils";

// Banner types
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  backgroundType: text("background_type")
    .$type<"image" | "color" | "preset">()
    .notNull(),
  backgroundValue: text("background_value").notNull(),
  tags: jsonb("tags").$type<
    Array<{
      text: string;
      color: string;
      backgroundColor: string;
    }>
  >(),
  headline: jsonb("headline")
    .$type<{
      text: string;
      font: string;
      color: string;
    }>()
    .notNull(),
  subheadline: jsonb("subheadline").$type<{
    text: string;
    font: string;
    color: string;
  }>(),
  qrSettingsId: integer("qr_settings_id").references(() => qrSettings.id),
  bannerType: text("banner_type").$type<"linkedin" | "profile">().notNull(),
  dimensions: jsonb("dimensions")
    .$type<{
      width: number;
      height: number;
    }>()
    .notNull(),
  customUploadUrl: text("custom_upload_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Schemas
export const insertBannerSchema = createInsertSchema(banners)
  .extend({
    tags: z
      .array(
        z.object({
          text: z
            .string()
            .min(1, "Tag text is required")
            .max(30, "Tag too long"),
          color: z
            .string()
            .regex(
              /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
              "Invalid color format"
            ),
          backgroundColor: z
            .string()
            .regex(
              /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
              "Invalid background color format"
            )
        })
      )
      .max(5, "Maximum 5 tags allowed"),
    headline: z.object({
      text: z
        .string()
        .min(1, "Headline text is required")
        .max(50, "Headline too long"),
      font: z.enum(["font-sans", "font-serif", "font-mono"], {
        errorMap: () => ({message: "Invalid font selection"})
      }),
      color: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    }),
    subheadline: z
      .object({
        text: z.string().max(100, "Subheadline too long"),
        font: z.enum(["font-sans", "font-serif", "font-mono"], {
          errorMap: () => ({message: "Invalid font selection"})
        }),
        color: z
          .string()
          .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
      })
      .optional(),
    dimensions: z.object({
      width: z.number().min(1),
      height: z.number().min(1)
    })
  })
  .omit({id: true, createdAt: true, updatedAt: true});

// Types
export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
