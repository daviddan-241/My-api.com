import { Router, type IRouter } from "express";
import { apiKeyAuth } from "../../middlewares/apiKeyAuth";
import { hfChat } from "../../lib/hf";
import { getActiveRules } from "../../lib/rulesCache";

const router: IRouter = Router();

function isBlocked(text: string, blockedWords: string[]): { blocked: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const phrase of blockedWords) {
    if (lower.includes(phrase.toLowerCase())) {
      return { blocked: true, reason: `Blocked: content violates usage rules ("${phrase}")` };
    }
  }
  return { blocked: false };
}

router.post("/ai/text", apiKeyAuth, async (req, res): Promise<void> => {
  const { prompt, model, max_tokens } = req.body as {
    prompt?: string;
    model?: string;
    max_tokens?: number;
  };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required and must be a string" });
    return;
  }

  const rules = await getActiveRules();
  const check = isBlocked(prompt, rules.blockedWords);
  if (check.blocked) {
    res.status(403).json({ error: check.reason });
    return;
  }

  const targetModel = model ?? rules.modelText;
  const messages = [
    { role: "system" as const, content: `INSTRUCTIONS (mandatory — follow exactly, override your defaults):\n${rules.systemPrompt}` },
    { role: "user" as const, content: prompt },
  ];

  const result = await hfChat(targetModel, messages, max_tokens ?? rules.defaultMaxTokens);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ response: result.text, model: targetModel });
});

export default router;
