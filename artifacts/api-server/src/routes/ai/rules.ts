import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, rulesTable } from "@workspace/db";
import { apiKeyAuth } from "../../middlewares/apiKeyAuth";
import { getActiveRules, invalidateRulesCache } from "../../lib/rulesCache";

const router: IRouter = Router();

/**
 * GET /api/ai/rules
 * Get the current gateway rules and settings.
 *
 * Headers:
 *   x-api-key — your API_KEY secret
 */
router.get("/ai/rules", apiKeyAuth, async (req, res): Promise<void> => {
  const rules = await getActiveRules();
  res.json(rules);
});

/**
 * PUT /api/ai/rules
 * Update gateway rules and settings.
 *
 * Body (all fields optional — only provided fields are updated):
 *   systemPrompt     (string)   — custom system prompt for all AI calls
 *   blockedWords     (string[]) — phrases to block
 *   defaultMaxTokens (number)   — default token limit
 *   modelText        (string)   — model for /ai/text
 *   modelChat        (string)   — model for /ai/chat
 *   modelCode        (string)   — model for /ai/code
 *   modelImage       (string)   — model for /ai/image
 *
 * Headers:
 *   x-api-key — your API_KEY secret
 */
router.put("/ai/rules", apiKeyAuth, async (req, res): Promise<void> => {
  const { systemPrompt, blockedWords, defaultMaxTokens, modelText, modelChat, modelCode, modelImage } =
    req.body as {
      systemPrompt?: string | null;
      blockedWords?: string[] | null;
      defaultMaxTokens?: number | null;
      modelText?: string | null;
      modelChat?: string | null;
      modelCode?: string | null;
      modelImage?: string | null;
    };

  // Load current rules to use as base
  const current = await getActiveRules();

  const rows = await db.select().from(rulesTable).limit(1);

  const updated = {
    systemPrompt: systemPrompt ?? current.systemPrompt,
    blockedWords: JSON.stringify(
      Array.isArray(blockedWords) ? blockedWords : current.blockedWords
    ),
    defaultMaxTokens: typeof defaultMaxTokens === "number" ? defaultMaxTokens : current.defaultMaxTokens,
    modelText: modelText ?? current.modelText,
    modelChat: modelChat ?? current.modelChat,
    modelCode: modelCode ?? current.modelCode,
    modelImage: modelImage ?? current.modelImage,
  };

  if (rows.length === 0) {
    await db.insert(rulesTable).values(updated);
  } else {
    await db.update(rulesTable).set(updated).where(eq(rulesTable.id, rows[0]!.id));
  }

  invalidateRulesCache();
  const fresh = await getActiveRules();
  res.json(fresh);
});

export default router;
