import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  jsonb
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";

// Model settings table
export const modelSettings = pgTable("model_settings", {
  id: serial("id").primaryKey(),
  apiToken: text("api_token").notNull(),
  modelVisibility: text("model_visibility")
    .$type<"public" | "private">()
    .notNull(),
  controlnetConfig: jsonb("controlnet_config").$type<{
    poseStrength: number;
    cannyStrength: number;
    depthStrength: number;
    enablePoseControlnet: boolean;
    enableCannyControlnet: boolean;
    enableDepthControlnet: boolean;
    controlnetConditioningScale: number;
  }>(),
  modelConfig: jsonb("model_config").$type<{
    defaultPromptMale: string;
    defaultPromptFemale: string;
    defaultNegativePrompt: string;
    sdxlWeights: string;
    scheduler: string;
    numInferenceSteps: number;
    guidanceScale: number;
  }>(),
  imageConfig: jsonb("image_config").$type<{
    outputFormat: string;
    outputQuality: number;
    ipAdapterScale: number;
    enhanceNonFaceRegion: boolean;
    faceDetectionInputWidth: number;
    faceDetectionInputHeight: number;
  }>(),
  lcmConfig: jsonb("lcm_config").$type<{
    enableLcm: boolean;
    lcmGuidanceScale: number;
    lcmInferenceSteps: number;
  }>(),
  promptVars: jsonb("prompt_vars").$type<{
    settings: {
      studio: {
        white: string;
        black: string;
        gradient: string;
        textured: string;
      };
      office: {
        "modern-office": string;
        "executive-suite": string;
        "conference-room": string;
        "coworking-space": string;
        "window-view": string;
        library: string;
      };
      outdoors: {
        beach: string;
        forest: string;
        mountain: string;
        urban: string;
        park: string;
      };
      fun: {
        throne: string;
        funk: string;
        pyramids: string;
        superhero: string;
        underwater: string;
      };
    };
    lighting: {
      natural: string;
      studio: string;
      dramatic: string;
      soft: string;
      "golden-hour": string;
    };
    expressions: {
      neutral: string;
      "slight-smile": string;
      "broad-smile": string;
      laughing: string;
      serious: string;
      thoughtful: string;
      confident: string;
      professional: string;
    };
    clothing: {
      professional: string;
      casual: string;
      "business-casual": string;
      suit: string;
      "black-tie": string;
      creative: string;
    };
  }>(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// QR settings table
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

// Create schemas
export const insertModelSettingsSchema = createInsertSchema(modelSettings);
export const insertQrSettingsSchema = createInsertSchema(qrSettings);

// Export types
export type ModelSettings = typeof modelSettings.$inferSelect;
export type QrSettings = typeof qrSettings.$inferSelect;
export type InsertModelSettings = z.infer<typeof insertModelSettingsSchema>;
export type InsertQrSettings = z.infer<typeof insertQrSettingsSchema>;

// Define PromptVariables type to match what's used in promptService
export type PromptVariables = {
  lighting?: Record<string, string>;
  settings?: Record<string, Record<string, string>>;
  expressions?: Record<string, string>;
  clothing?: Record<string, string>;
};

// Re-export types from other modules
export type {Organization, InsertOrganization} from "../schema";
export type {Content, InsertContent} from "./content";
export type {Analytics, InsertAnalytics, PathRedirect} from "./analytics";
