import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";
import {users} from "./user";

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  type: text("type").$type<"pdf" | "url" | "document" | "image">().notNull(),
  content: jsonb("content")
    .$type<{
      url?: string;
      fileUrl?: string;
      mimeType?: string;
      fileSize?: number;
      documentContent?: string;
      thumbnail?: string;
    }>()
    .notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Schema for content validation with enhanced type checking
export const insertContentSchema = createInsertSchema(content)
  .extend({
    type: z.enum(["pdf", "url", "document", "image"], {
      required_error: "Content type is required",
      invalid_type_error: "Invalid content type"
    }),
    content: z
      .object({
        url: z.string().url("Invalid URL format").optional(),
        fileUrl: z.string().optional(),
        documentContent: z.string().optional(),
        thumbnail: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().positive("File size must be positive").optional()
      })
      .refine(
        (data) => {
          // Ensure at least one content field is provided
          return !!(data.url || data.fileUrl || data.documentContent);
        },
        {
          message:
            "At least one content source (url, fileUrl, or documentContent) must be provided"
        }
      ),
    order: z.number().int().min(0).default(0),
    description: z.string().optional()
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

// Types
export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
