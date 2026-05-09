# MyAI Gateway

A personal AI API gateway — like your own OpenRouter — that proxies free HuggingFace models for text, chat, code, and image generation. You set the rules, you own the key.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `HF_TOKEN` — HuggingFace free API token (https://huggingface.co/settings/tokens)
- Required env: `API_KEY` — your secret key that protects the gateway

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI backend: HuggingFace Inference API (free tier)

## Where things live

- `artifacts/api-server/src/routes/ai/` — all AI route handlers (text, chat, code, image, models)
- `artifacts/api-server/src/middlewares/apiKeyAuth.ts` — API key guard middleware
- `artifacts/api-server/src/lib/hf.ts` — HuggingFace client, model list, content filter rules

## Architecture decisions

- All AI routes are guarded by `x-api-key` header middleware — no key, no access.
- Content filtering lives in `lib/hf.ts → isBlocked()` — easy to add/remove blocked phrases.
- Images are returned as base64 PNG strings (no file storage needed).
- Model selection is per-request: pass `model` in body to override the default for any endpoint.
- HuggingFace 503 (model loading) is surfaced with a friendly retry message rather than a raw error.

## Product

Four AI endpoints, all protected by your API key:

| Endpoint | What it does | Default model |
|---|---|---|
| `POST /api/ai/text` | Generate text from a prompt | Mistral-7B-Instruct |
| `POST /api/ai/chat` | Multi-turn chat | Zephyr-7B |
| `POST /api/ai/code` | Code generation/completion | StarCoder2-3B |
| `POST /api/ai/image` | Text-to-image (returns base64 PNG) | Stable Diffusion XL |
| `GET /api/ai/models` | List all endpoints & models | — |

## Usage Examples (curl)

```bash
# List all endpoints
curl https://YOUR_DOMAIN/api/ai/models -H "x-api-key: YOUR_KEY"

# Generate text
curl -X POST https://YOUR_DOMAIN/api/ai/text \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain black holes in simple terms", "max_tokens": 300}'

# Chat
curl -X POST https://YOUR_DOMAIN/api/ai/chat \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello! What can you do?"}]}'

# Generate code
curl -X POST https://YOUR_DOMAIN/api/ai/code \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a Python function to reverse a string", "language": "python"}'

# Generate an image
curl -X POST https://YOUR_DOMAIN/api/ai/image \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A sunset over a futuristic city"}'
```

## Free HuggingFace API Token

Get yours free at: **https://huggingface.co/settings/tokens**
- Sign up at huggingface.co
- Go to Settings → Access Tokens → New Token
- Role: "Read" is enough
- Paste it as `HF_TOKEN` in Replit Secrets

## User preferences

- Uses HuggingFace free tier only — no paid APIs required.
- Content rules are in `lib/hf.ts → BLOCKED_WORDS` — edit that array to change what's allowed.

## Gotchas

- HuggingFace free models may return 503 "model loading" — just retry after 20-30 seconds.
- Image generation is slow (10-30s) on the free tier — that's normal.
- The free HuggingFace tier has rate limits; for heavy use consider HF Pro.
- Always pass `x-api-key` header or you'll get a 401 error.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
