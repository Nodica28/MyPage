import {pgTable, text, serial, boolean, timestamp} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";

// QR Settings table definition
export const qrSettings = pgTable("qr_settings", {
  id: serial("id").primaryKey(),
  transparent: boolean("transparent").default(true),
  backColor: text("back_color").default("#ffffff"),
  frontColor: text("front_color").default("#4E5BA6"),
  markerOutColor: text("marker_out_color").default("#4E5BA6"),
  markerInColor: text("marker_in_color").default("#4E5BA6"),
  pattern: text("pattern").default("blob"),
  marker: text("marker").default("circle"),
  markerIn: text("marker_in").default("circle"),
  outerFrame: text("outer_frame").default("none"),
  optionLogo: text("option_logo"),
  noLogoBg: boolean("no_logo_bg").default(false),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Utility functions
export const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return (timestamp.substring(timestamp.length - 4) + randomStr).substring(
    0,
    8
  );
};

export const generateCharacterName = (gender: string, id: string) => {
  const prefix = gender === "male" ? "M" : gender === "female" ? "F" : "P";
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp.substring(timestamp.length - 4)}-${id.substring(0, 4)}`;
};

export const sanitizePath = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

// Schema
export const insertQrSettingsSchema = createInsertSchema(qrSettings);

// Types
export type QrSettings = typeof qrSettings.$inferSelect;
export type InsertQrSettings = z.infer<typeof insertQrSettingsSchema>;
