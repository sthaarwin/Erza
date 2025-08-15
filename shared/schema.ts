import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  messages: jsonb("messages").notNull().default([]),
  personality: text("personality").notNull().default("friendly"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

// Message types for chat
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
  fileId: z.string().optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string(),
  personality: z.string().optional(),
});

export const personalityChangeSchema = z.object({
  personality: z.enum(["friendly", "sarcastic", "professional", "funny"]),
  sessionId: z.string(),
});

export type Message = z.infer<typeof messageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type PersonalityChange = z.infer<typeof personalityChangeSchema>;
