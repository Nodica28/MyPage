import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";
import {users} from "./user";

// Character table
export const characters = pgTable(
  "characters",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id)
      .unique(),
    renderNetId: text("rendernet_id").notNull(),
    name: text("name").notNull(),
    gender: text("gender").$type<"male" | "female">().notNull(),
    age: integer("age").notNull(),
    hairStyle: text("hair_style").notNull(),
    hairLength: text("hair_length").notNull(),
    hairColor: text("hair_color").notNull(),
    highlights: text("highlights").notNull(),
    facialHair: text("facial_hair"),
    skinTone: text("skin_tone").notNull(),
    bodyBuild: text("body_build").notNull(),
    referenceImage: text("reference_image").notNull(),
    customPrompt: text("custom_prompt"),
    useCustomCharacterPrompt: boolean("use_custom_character_prompt")
      .notNull()
      .default(false),
    useCustomHeadshotPrompt: boolean("use_custom_headshot_prompt")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      renderNetIdIdx: index("characters_rendernet_id_idx").on(table.renderNetId)
    };
  }
);

// Headshot requests table
export const headshotRequests = pgTable(
  "headshot_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    characterId: integer("character_id").references(() => characters.id, {
      onDelete: "set null"
    }),
    settingCategory: text("setting_category")
      .$type<"office" | "outdoors" | "fun" | "studio">()
      .notNull(),
    setting: text("setting").notNull(),
    lighting: text("lighting").notNull(),
    expression: text("expression").notNull(),
    clothing: text("clothing").notNull(),
    status: text("status")
      .$type<"pending" | "processing" | "completed" | "failed">()
      .notNull(),
    output: text("output"),
    error: text("error"),
    referenceImage: text("reference_image"),
    // Advanced generation options
    useCustomCharacterPrompt: boolean("use_custom_character_prompt")
      .notNull()
      .default(false),
    customPrompt: text("custom_prompt"),
    useCustomHeadshotPrompt: boolean("use_custom_headshot_prompt")
      .notNull()
      .default(false),
    useCustomNegativePrompt: boolean("use_custom_negative_prompt")
      .notNull()
      .default(false),
    customNegativePrompt: text("custom_negative_prompt"),
    // Model configuration
    modelConfig: jsonb("model_config").$type<{
      numInferenceSteps?: number;
      guidanceScale?: number;
      enhanceNonFaceRegion?: boolean;
      controlnetConfig?: {
        poseStrength?: number;
        cannyStrength?: number;
        depthStrength?: number;
        enablePoseControlnet?: boolean;
        enableCannyControlnet?: boolean;
        enableDepthControlnet?: boolean;
        controlnetConditioningScale?: number;
      };
    }>(),
    generationId: text("generation_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
  },
  (table) => {
    return {
      userIdIdx: index("headshot_requests_user_id_idx").on(table.userId),
      characterIdIdx: index("headshot_requests_character_id_idx").on(
        table.characterId
      ),
      statusIdx: index("headshot_requests_status_idx").on(table.status)
    };
  }
);

// Character validation schema
export const insertCharacterSchema = createInsertSchema(characters, {
  gender: z.enum(["male", "female"]),
  age: z.number().min(18).max(99),
  hairStyle: z.enum([
    "straight",
    "wavy",
    "curly",
    "coily",
    "afro",
    "braided",
    "dreadlocks"
  ]),
  hairLength: z.enum([
    "buzz",
    "very-short",
    "short",
    "medium",
    "long",
    "very-long"
  ]),
  hairColor: z.enum([
    "black",
    "dark-brown",
    "brown",
    "light-brown",
    "blonde",
    "platinum",
    "red",
    "auburn",
    "gray",
    "white"
  ]),
  highlights: z.enum([
    "none",
    "blonde",
    "caramel",
    "red",
    "blue",
    "purple",
    "pink"
  ]),
  skinTone: z.enum([
    "very-fair",
    "fair",
    "medium",
    "olive",
    "brown",
    "dark-brown",
    "very-dark"
  ]),
  bodyBuild: z.enum(["slim", "athletic", "average", "muscular", "plus-size"]),
  facialHair: z
    .enum([
      "none",
      "stubble",
      "mustache",
      "goatee",
      "short-beard",
      "full-beard",
      "long-beard"
    ])
    .optional()
}).omit({id: true, createdAt: true, updatedAt: true});

// Headshot request validation schema
export const insertHeadshotRequestSchema = createInsertSchema(headshotRequests)
  .extend({
    settingCategory: z.enum(["office", "outdoors", "fun", "studio"]),
    setting: z.string().min(1, "Setting is required"),
    lighting: z.string().min(1, "Lighting is required"),
    expression: z.string().min(1, "Expression is required"),
    clothing: z.string().min(1, "Clothing style is required"),
    status: z.enum(["pending", "processing", "completed", "failed"]),
    useCustomCharacterPrompt: z.boolean().default(false),
    customPrompt: z.string().optional(),
    useCustomHeadshotPrompt: z.boolean().default(false),
    useCustomNegativePrompt: z.boolean().default(false),
    customNegativePrompt: z.string().optional(),
    modelConfig: z
      .object({
        numInferenceSteps: z.number().optional(),
        guidanceScale: z.number().optional(),
        enhanceNonFaceRegion: z.boolean().optional(),
        controlnetConfig: z
          .object({
            poseStrength: z.number().optional(),
            cannyStrength: z.number().optional(),
            depthStrength: z.number().optional(),
            enablePoseControlnet: z.boolean().optional(),
            enableCannyControlnet: z.boolean().optional(),
            enableDepthControlnet: z.boolean().optional(),
            controlnetConditioningScale: z.number().optional()
          })
          .optional()
      })
      .optional()
  })
  .omit({id: true, createdAt: true, updatedAt: true});

// Type exports
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type HeadshotRequest = typeof headshotRequests.$inferSelect;
export type InsertHeadshotRequest = z.infer<typeof insertHeadshotRequestSchema>;
