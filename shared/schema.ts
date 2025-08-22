import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enums for lead fields
export const sourceEnum = pgEnum("source", [
  "website",
  "facebook_ads", 
  "google_ads",
  "referral",
  "events",
  "other"
]);

export const statusEnum = pgEnum("status", [
  "new",
  "contacted",
  "qualified", 
  "lost",
  "won"
]);

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  city: text("city"),
  state: text("state"),
  source: sourceEnum("source").notNull(),
  status: statusEnum("status").notNull().default("new"),
  score: integer("score").default(0),
  leadValue: decimal("lead_value", { precision: 10, scale: 2 }),
  lastActivityAt: timestamp("last_activity_at"),
  isQualified: boolean("is_qualified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  user: one(users),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLeadSchema = createInsertSchema(leads, {
  score: z.number().min(0).max(100).optional(),
  leadValue: z.number().positive().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLeadSchema = insertLeadSchema.partial();

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type LeadStatus = typeof statusEnum.enumValues[number];
export type LeadSource = typeof sourceEnum.enumValues[number];
