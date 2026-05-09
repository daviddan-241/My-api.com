import { Router, type IRouter } from "express";
import { apiKeyAuth } from "../../middlewares/apiKeyAuth";
import { hfImage } from "../../lib/hf";
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

router.post("/ai/image", apiKeyAuth, async (req, res): Promise<void> => {
  const { prompt, negative_prompt, model } = req.body as {
    prompt?: string;
    negative_prompt?: string;
    model?: string;
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

  const targetModel = model ?? rules.modelImage;
  const result = await hfImage(targetModel, prompt, negative_prompt);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  const base64 = result.buffer!.toString("base64");
  const mimeType = result.mimeType ?? "image/jpeg";

  res.json({
    image_base64: base64,
    mime_type: mimeType,
    model: targetModel,
    data_url: `data:${mimeType};base64,${base64}`,
  });
});

export default router;
