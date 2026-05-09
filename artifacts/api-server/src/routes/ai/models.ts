import { Router, type IRouter } from "express";
import { apiKeyAuth } from "../../middlewares/apiKeyAuth";
import { getActiveRules } from "../../lib/rulesCache";

const router: IRouter = Router();

router.get("/ai/models", apiKeyAuth, async (_req, res): Promise<void> => {
  const rules = await getActiveRules();

  res.json({
    endpoints: {
      "POST /api/ai/text": {
        description: "Generate text from a prompt",
        default_model: rules.modelText,
      },
      "POST /api/ai/chat": {
        description: "Multi-turn chat (OpenAI messages format)",
        default_model: rules.modelChat,
      },
      "POST /api/ai/code": {
        description: "Generate or complete code",
        default_model: rules.modelCode,
      },
      "POST /api/ai/image": {
        description: "Text-to-image generation (returns base64 + data URL)",
        default_model: rules.modelImage,
      },
    },
    default_models: {
      text: rules.modelText,
      chat: rules.modelChat,
      code: rules.modelCode,
      image: rules.modelImage,
    },
    authentication: "Send your API key as the x-api-key header on every request",
    free_token_url: "https://huggingface.co/settings/tokens",
  });
});

export default router;
