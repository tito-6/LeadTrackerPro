import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(), // Using text for date to handle ISO strings
  leadType: text("lead_type").notNull(), // 'kiralama' or 'satis'
  salesRep: text("sales_rep").notNull(),
  project: text("project").notNull(),
  status: text("status").notNull(), // 'yeni', 'bilgi-verildi', 'olumsuz', 'satis'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesReps = pgTable("sales_reps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  monthlyTarget: integer("monthly_target").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertSalesRepSchema = createInsertSchema(salesReps).omit({
  id: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type SalesRep = typeof salesReps.$inferSelect;
export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
