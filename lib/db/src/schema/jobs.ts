import { pgTable, serial, text, integer, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull().default(""),
  type: text("type").notNull().default(""),
  salary: text("salary").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  logo: text("logo").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedJobsTable = pgTable(
  "saved_jobs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("saved_jobs_unique").on(t.userId, t.jobId)],
);

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;