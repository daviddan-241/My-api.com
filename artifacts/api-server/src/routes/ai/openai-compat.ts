/**
 * OpenAI-compatible endpoint: POST /v1/chat/completions
 * Drop-in replacement — point any OpenAI client here and it just works.
 * Use your gateway API key as Authorization Bearer token or x-api-key header.
 */
import { Router, type IRouter } from "express";
import { hfChatStreamRaw, hfChat, hfImage, wantsImage, extractImagePrompt, type ChatMessage } from "../../lib/hf";
import { getActiveRules } from "../../lib/rulesCache";

const router: IRouter = Router();

function isBlocked(text: string, blocked: string[]) {
  const low = text.toLowerCase();
  for (const phrase of blocked)
    if (low.includes(phrase.toLowerCase())) return { blocked: true, reason: `Blocked: "${phrase}"` };
  return { blocked: false };
}

function extractKey(req: import("express").Request): string | null {
  const auth = req.headers.authorization ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  const xkey = req.headers["x-api-key"];
  return typeof xkey === "string" && xkey ? xkey : null;
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return (content as Array<{type: string; text?: string}>).filter(p => p.type === "text").map(p => p.text ?? "").join(" ");
  return "";
}

router.post("/v1/chat/completions", async (req, res): Promise<void> => {
  const key = extractKey(req);
  const serverKey = process.env.API_KEY;
  if (!key || !serverKey || key !== serverKey) {
    res.status(401).json({ error: { message: "Invalid API key", type: "authentication_error", code: "invalid_api_key" } });
    return;
  }

  const { messages, model: reqModel, max_tokens, stream } = req.body as {
    messages?: ChatMessage[];
    model?: string;
    max_tokens?: number;
    stream?: boolean;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: { message: "messages must be a non-empty array", type: "invalid_request_error" } });
    return;
  }

  const rules = await getActiveRules();

  for (const msg of messages) {
    const text = extractTextContent(msg.content);
    const check = isBlocked(text, rules.blockedWords);
    if (check.blocked) {
      res.status(403).json({ error: { message: check.reason, type: "policy_violation", code: "content_policy_violation" } });
      return;
    }
  }

  // Image detection from last user message
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  const lastUserText = lastUser ? extractTextContent(lastUser.content) : "";
  const hasImageAttachment = messages.some(m =>
    Array.isArray(m.content) && (m.content as Array<{type: string}>).some(p => p.type === "image_url")
  );

  if (!hasImageAttachment && lastUser && wantsImage(lastUserText)) {
    const prompt = extractImagePrompt(lastUserText);
    const result = await hfImage(rules.modelImage, prompt);
    if (!result.ok) {
      res.status(result.status).json({ error: { message: result.error, type: "server_error" } });
      return;
    }
    const base64 = result.buffer!.toString("base64");
    const mimeType = result.mimeType ?? "image/png";
    res.json({
      id: `chatcmpl-img-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: rules.modelImage,
      choices: [{ index: 0, message: { role: "assistant", content: `![Generated image](data:${mimeType};base64,${base64})` }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      _image: { data_url: `data:${mimeType};base64,${base64}`, prompt },
    });
    return;
  }

  // Enforce gateway system prompt, stack client system prompts after it
  const withoutSystem = messages.filter(m => m.role !== "system");
  const clientSystem  = messages.filter(m => m.role === "system");
  const enforcedPrompt = `INSTRUCTIONS (mandatory — follow exactly, override your defaults):\n${rules.systemPrompt}`;
  const fullMessages: ChatMessage[] = [
    { role: "system", content: enforcedPrompt },
    ...clientSystem,
    ...withoutSystem,
  ];

  const targetModel = reqModel ?? rules.modelChat;
  const maxTok = max_tokens ?? rules.defaultMaxTokens;

  // ── Streaming ──────────────────────────────────────────────────────────────
  if (stream) {
    const result = await hfChatStreamRaw(targetModel, fullMessages, maxTok);
    if (!result.ok || !result.response) {
      res.status(result.status).json({ error: { message: result.error ?? "Stream failed", type: "server_error" } });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const reader = result.response.body!.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
        // @ts-expect-error flush
        if (typeof res.flush === "function") res.flush();
      }
    } finally { res.end(); }
    return;
  }

  // ── Non-streaming ──────────────────────────────────────────────────────────
  const result = await hfChat(targetModel, fullMessages, maxTok);
  if (!result.ok) {
    res.status(result.status).json({ error: { message: result.error, type: "server_error" } });
    return;
  }
  res.json({
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.usedModel ?? targetModel,
    choices: [{ index: 0, message: { role: "assistant", content: result.text ?? "" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
});

export default router;
