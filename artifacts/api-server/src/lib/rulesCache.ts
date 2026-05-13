import { db, rulesTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_RULES = {
  systemPrompt:
    "You are a highly capable AI assistant. Follow the user's instructions precisely and completely. Be direct, thorough, and accurate. When writing code, produce clean working code. When asked to explain something, be clear and concise. Always follow any custom instructions the user gives you — they override your defaults.",
  blockedWords: [
    "make a bomb",
    "build a weapon",
    "synthesize drugs",
    "child abuse",
  ],
  defaultMaxTokens: 4096,
  modelText: "llama-3.1-8b-instant",
  modelChat: "llama-3.1-8b-instant",
  modelCode: "llama-3.1-8b-instant",
  modelImage: "black-forest-labs/FLUX.1-schnell",
};

export type ActiveRules = typeof DEFAULT_RULES;

let cached: ActiveRules | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 30_000;

export async function getActiveRules(): Promise<ActiveRules> {
  const now = Date.now();
  if (cached && now - lastFetch < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const rows = await db.select().from(rulesTable).limit(1);
    if (rows.length === 0) {
      // Seed the first row
      await db.insert(rulesTable).values({
        systemPrompt: DEFAULT_RULES.systemPrompt,
        blockedWords: JSON.stringify(DEFAULT_RULES.blockedWords),
        defaultMaxTokens: DEFAULT_RULES.defaultMaxTokens,
        modelText: DEFAULT_RULES.modelText,
        modelChat: DEFAULT_RULES.modelChat,
        modelCode: DEFAULT_RULES.modelCode,
        modelImage: DEFAULT_RULES.modelImage,
      });
      cached = DEFAULT_RULES;
    } else {
      const row = rows[0]!;
      let blockedWords: string[] = DEFAULT_RULES.blockedWords;
      try {
        blockedWords = JSON.parse(row.blockedWords) as string[];
      } catch {
        logger.warn("Failed to parse blockedWords from DB, using defaults");
      }
      cached = {
        systemPrompt: row.systemPrompt,
        blockedWords,
        defaultMaxTokens: row.defaultMaxTokens,
        modelText: row.modelText,
        modelChat: row.modelChat,
        modelCode: row.modelCode,
        modelImage: row.modelImage,
      };
    }
  } catch (err) {
    logger.error({ err }, "Failed to load rules from DB, using defaults");
    cached = DEFAULT_RULES;
  }

  lastFetch = Date.now();
  return cached;
}

export function invalidateRulesCache(): void {
  lastFetch = 0;
  cached = null;
}
