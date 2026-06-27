import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buildingsTable = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hours: text("hours").notNull().default(""),
  icon: text("icon").notNull().default(""),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  color: text("color").notNull().default("#4f46e5"),
  mapsUrl: text("maps_url").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  image: text("image").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBuildingSchema = createInsertSchema(buildingsTable).omit({ id: true, createdAt: true });
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildingsTable.$inferSelect;

export type Story = typeof storiesTable.$inferSelect;
