import { pgTable, text, serial, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).$type<"admin" | "user">().notNull().default("user"),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 10 })
    .$type<"high" | "medium" | "low">()
    .notNull()
    .default("medium"),
  aiPotential: varchar("ai_potential", { length: 20 })
    .$type<"pending" | "none" | "some" | "advanced">()
    .notNull()
    .default("pending"),
  estimatedMinutes: integer("estimated_minutes"),
  estimatedMinutesWithAI: integer("estimated_minutes_with_ai"),
  coachingTips: text("coaching_tips"),
  motivationalScore: integer("motivational_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  completed: boolean("completed").default(false).notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).default("user"),
  organizationId: z.number().optional(),
});

export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;