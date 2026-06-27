import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const societiesTable = pgTable("societies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default(""),
  membersCount: integer("members_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const societyMembersTable = pgTable(
  "society_members",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    societyId: integer("society_id").notNull().references(() => societiesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("society_members_unique").on(t.userId, t.societyId)],
);

export const insertSocietySchema = createInsertSchema(societiesTable).omit({
  id: true,
  createdAt: true,
  membersCount: true,
});
export type InsertSociety = z.infer<typeof insertSocietySchema>;
export type Society = typeof societiesTable.$inferSelect;
