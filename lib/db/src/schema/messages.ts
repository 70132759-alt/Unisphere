import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  text: text("text").notNull().default(""),
  isAttachment: boolean("is_attachment").notNull().default(false),
  image: text("image"),
  filename: text("filename"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedForSender: boolean("deleted_for_sender").notNull().default(false),
  deletedForReceiver: boolean("deleted_for_receiver").notNull().default(false),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
