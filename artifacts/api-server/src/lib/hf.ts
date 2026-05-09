import { logger } from "./logger";

export const MODELS = {
  text:    "llama-3.1-8b-instant",
  chat:    "llama-3.1-8b-instant",
  code:    "llama-3.1-8b-instant",
  quality: "llama-3.3-70b-versatile",
  vision:  "llama-3.2-11b-vision-preview",
  image:   "black-forest-labs/FLUX.1-schnell",
};

// Fallback chain when primary model is rate-limited (429)
const FALLBACK_MODELS: Record<string, string[]> = {
  "llama-3.3-70b-versatile":  ["llama-3.1-8b-instant", "gemma2-9b-it"],
  "llama-3.1-70b-versatile":  ["llama-3.1-8b-instant", "gemma2-9b-it"],
  "llama-3.1-8b-instant":     ["gemma2-9b-it", "llama3-8b-8192"],
  "llama-3.2-11b-vision-preview": ["llama-3.2-11b-vision-preview"],
};

function getFallbacks(model: string): string[] {
  return FALLBACK_MODELS[model] ?? ["llama-3.1-8b-instant"];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

function hasImageContent(messages: ChatMessage[]): boolean {
  return messages.some(m =>
    Array.isArray(m.content) &&
    (m.content as ContentPart[]).some(p => p.type === "image_url")
  );
}

function parseGroqError(body: unknown): string {
  if (!body) return "AI service error";
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return body.slice(0, 200); }
  }
  const b = body as Record<string, unknown>;
  const err = b.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return (e.message as string) ?? JSON.stringify(e).slice(0, 200);
  }
  return (b.message as string) ?? "AI service error";
}

async function callGroq(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  stream: false
): Promise<{ ok: boolean; text?: string; error?: string; status: number; usedModel?: string }>;
async function callGroq(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  stream: true
): Promise<{ ok: boolean; response?: Response; error?: string; status: number; usedModel?: string }>;
async function callGroq(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  stream: boolean
): Promise<{ ok: boolean; text?: string; response?: Response; error?: string; status: number; usedModel?: string }> {
  const token = process.env.GROQ_API_KEY;
  if (!token) return { ok: false, error: "GROQ_API_KEY not configured on server", status: 500 };

  const effectiveModel = hasImageContent(messages) ? MODELS.vision : model;
  const modelsToTry = [effectiveModel, ...getFallbacks(effectiveModel).filter(m => m !== effectiveModel)];

  let lastError = "";
  let lastStatus = 500;

  for (const m of modelsToTry) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages, max_tokens: maxTokens, stream }),
    });

    if (res.ok) {
      if (stream) return { ok: true, response: res, status: 200, usedModel: m };
      const body = await res.json();
      return { ok: true, text: body.choices?.[0]?.message?.content ?? "", status: 200, usedModel: m };
    }

    const bodyText = await res.text();
    let bodyParsed: unknown;
    try { bodyParsed = JSON.parse(bodyText); } catch { bodyParsed = bodyText; }
    const errMsg = parseGroqError(bodyParsed);
    lastError = errMsg;
    lastStatus = res.status;

    if (res.status === 429) {
      logger.warn({ model: m, err: errMsg }, "Model rate-limited, trying fallback");
      continue;
    }
    return { ok: false, error: errMsg, status: res.status };
  }

  if (lastStatus === 429) {
    return { ok: false, error: "All AI models are currently rate-limited. Please wait a few minutes and try again.", status: 429 };
  }
  return { ok: false, error: lastError || "AI service error", status: lastStatus };
}

// ── Non-streaming chat ────────────────────────────────────────────────────────
export async function hfChat(
  model: string,
  messages: ChatMessage[],
  maxTokens = 4096
): Promise<{ ok: boolean; text?: string; error?: string; status: number; usedModel?: string }> {
  return callGroq(model, messages, maxTokens, false);
}

// ── Streaming chat ────────────────────────────────────────────────────────────
export async function hfChatStreamRaw(
  model: string,
  messages: ChatMessage[],
  maxTokens = 4096
): Promise<{ ok: boolean; response?: Response; error?: string; status: number }> {
  return callGroq(model, messages, maxTokens, true);
}

// ── Image generation via Pollinations.ai (free, no key required) ─────────────
export async function hfImage(
  _model: string,
  prompt: string
): Promise<{ ok: boolean; buffer?: Buffer; mimeType?: string; error?: string; status: number }> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&nologo=true&seed=${Date.now() % 99999}`;

  try {
    const res = await fetch(url, { headers: { Accept: "image/*" } });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Pollinations image error");
      return { ok: false, error: `Image generation failed (${res.status})`, status: res.status };
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, buffer: buf, mimeType: contentType, status: 200 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    logger.error({ err }, "Pollinations fetch error");
    return { ok: false, error: msg, status: 500 };
  }
}

export function wantsImage(text: string): boolean {
  const IMAGE_PATTERNS = [
    /\b(generate|create|make|draw|render|paint|design|produce|show)\b.{0,50}\b(image|picture|photo|illustration|artwork|drawing|painting|portrait|wallpaper)\b/i,
    /\b(image|picture|photo|illustration|artwork|drawing|painting|sketch)\b.{0,20}\bof\b/i,
    /\bshow me.{0,30}\b(image|picture|photo|drawing)\b/i,
    /^(draw|paint|sketch|render|imagine)\s+.{0,50}\b(image|picture|photo|illustration|artwork|painting)\b/i,
  ];
  return IMAGE_PATTERNS.some(p => p.test(text.trim()));
}

export function extractImagePrompt(text: string): string {
  return text
    .replace(/^(please\s+)?(generate|create|make|draw|render|paint|design|produce|show me)\s+(an?\s+)?(image|picture|photo|illustration|artwork|drawing|painting|sketch)\s+(of\s+)?/i, "")
    .replace(/^(draw|paint|sketch|render|imagine)\s+/i, "")
    .trim() || text;
}
