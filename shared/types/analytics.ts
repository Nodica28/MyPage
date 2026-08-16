import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";
import {users} from "./user";

export const analytics = pgTable(
  "analytics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    eventType: text("event_type").$type<"page_view" | "link_click">().notNull(),
    path: text("path"),
    linkUrl: text("link_url"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => {
    return {
      userIdIdx: index("analytics_user_id_idx").on(table.userId),
      eventTypeIdx: index("analytics_event_type_idx").on(table.eventType),
      createdAtIdx: index("analytics_created_at_idx").on(table.createdAt)
    };
  }
);

// Schemas
export const insertAnalyticsSchema = createInsertSchema(analytics).extend({
  eventType: z.enum(["page_view", "link_click"]),
  metadata: z.record(z.unknown()).optional()
});

// Types
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
