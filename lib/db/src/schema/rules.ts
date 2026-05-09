import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rulesTable = pgTable("gateway_rules", {
  id: serial("id").primaryKey(),
  systemPrompt: text("system_prompt").notNull().default(
    `You are a helpful AI assistant. Answer questions clearly and accurately, write clean code when asked, and assist with any legitimate task. Be direct and thorough.`
  ),
  blockedWords: text("blocked_words").notNull().default(
    JSON.stringify(["make a bomb", "build a weapon", "synthesize drugs", "child abuse"])
  ),
  defaultMaxTokens: integer("default_max_tokens").notNull().default(512),
  modelText: text("model_text").notNull().default("Qwen/Qwen2.5-1.5B-Instruct"),
  modelChat: text("model_chat").notNull().default("Qwen/Qwen2.5-1.5B-Instruct"),
  modelCode: text("model_code").notNull().default("Qwen/Qwen2.5-Coder-1.5B-Instruct"),
  modelImage: text("model_image").notNull().default("black-forest-labs/FLUX.1-schnell"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRulesSchema = createInsertSchema(rulesTable).omit({ id: true, updatedAt: true });
export type InsertRules = z.infer<typeof insertRulesSchema>;
export type Rules = typeof rulesTable.$inferSelect;