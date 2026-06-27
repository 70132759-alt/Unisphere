import { pgTable, serial, text, integer, timestamp, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  major: text("major").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  cover: text("cover").notNull().default(""),
  bio: text("bio").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const followsTable = pgTable(
  "follows",
  {
    id: serial("id").primaryKey(),
    followerId: integer("follower_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    followedId: integer("followed_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("follows_unique").on(t.followerId, t.followedId)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export type Follow = typeof followsTable.$inferSelect;
