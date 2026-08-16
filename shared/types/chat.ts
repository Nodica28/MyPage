import {z} from "zod";

/**
 * Interface for a predefined chat prompt
 */
export interface ChatPrompt {
  id: string;
  text: string;
  order: number;
}

/**
 * Interface for a knowledge source
 */
export interface KnowledgeSource {
  id: string;
  type: "url" | "file";
  content: string;
  name?: string; // Name of the file or title of the URL
  size?: number; // Size in bytes for files
}

/**
 * Interface for chat settings
 */
export interface ChatSettings {
  defaultPrompts: ChatPrompt[];
  knowledgeSources: KnowledgeSource[];
  includeProfileData: boolean;
  model?: string; // Default to latest GPT model if not specified
  systemPrompt?: string; // Custom system prompt for the AI
}

/**
 * Interface for the global chat feature settings
 */
export interface GlobalChatSettings {
  enabled: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  bubbleText?: string;
  welcomeMessage?: string;
  chatSettings: ChatSettings;
}

/**
 * Schema for chat prompt validation
 */
export const chatPromptSchema = z.object({
  id: z.string(),
  text: z
    .string()
    .min(1, "Prompt text is required")
    .max(150, "Prompt text should be less than 150 characters"),
  order: z.number().int().nonnegative()
});

/**
 * Schema for knowledge source validation
 */
export const knowledgeSourceSchema = z.object({
  id: z.string(),
  type: z.enum(["url", "file"]),
  content: z.string().min(1, "Content is required"),
  name: z.string().optional(),
  size: z.number().nonnegative().optional()
});

/**
 * Schema for chat settings validation
 */
export const chatSettingsSchema = z.object({
  defaultPrompts: z
    .array(chatPromptSchema)
    .max(3, "Maximum 3 default prompts allowed"),
  knowledgeSources: z.array(knowledgeSourceSchema),
  includeProfileData: z.boolean().default(true),
  model: z.string().optional(),
  systemPrompt: z.string().optional()
});

/**
 * Schema for global chat settings validation
 */
export const globalChatSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  position: z
    .enum(["bottom-right", "bottom-left", "top-right", "top-left"])
    .default("bottom-right"),
  bubbleText: z.string().optional(),
  welcomeMessage: z.string().optional(),
  chatSettings: chatSettingsSchema.default({
    defaultPrompts: [
      {id: "default-1", text: "Tell me more about your services", order: 0},
      {id: "default-2", text: "What experience do you have?", order: 1},
      {id: "default-3", text: "How can we work together?", order: 2}
    ],
    knowledgeSources: [],
    includeProfileData: true,
    model: "o1-mini",
    systemPrompt:
      "You are a helpful assistant representing the profile owner. Answer questions based on their profile information."
  })
});
