# MyAI Gateway

Your own personal AI API gateway — like OpenRouter, but you set all the rules and it's 100% free.

---

## What It Does

| Endpoint | What it does |
|---|---|
| `POST /api/ai/text` | Generate text from any prompt |
| `POST /api/ai/chat` | Multi-turn chat like ChatGPT |
| `POST /api/ai/code` | Write or complete code |
| `POST /api/ai/image` | Generate images (returns base64) |
| `GET /api/ai/models` | List all endpoints and active models |
| `GET /api/ai/rules` | See your current rules |
| `PUT /api/ai/rules` | Update your rules |

All endpoints require: `x-api-key: YOUR_API_KEY` header.

---

## Quick Test (Replit)

```bash
# Text generation
curl -X POST https://YOUR_DOMAIN/api/ai/text \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain how black holes form", "max_tokens": 300}'

# Chat
curl -X POST https://YOUR_DOMAIN/api/ai/chat \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What can you do?"}]}'

# Code generation
curl -X POST https://YOUR_DOMAIN/api/ai/code \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a function to sort a list", "language": "python"}'

# Image generation (returns base64 PNG)
curl -X POST https://YOUR_DOMAIN/api/ai/image \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A futuristic city at sunset"}'
```

---

## Setting Your Own Rules

Your rules control how every AI request behaves. You can change them anytime via the dashboard or the API.

### Via Dashboard (easiest)
1. Open the app in your browser
2. Go to **My Rules** in the sidebar
3. Edit your system prompt, blocked words, models, and token limits
4. Click Save

### Via API
```bash
curl -X PUT https://YOUR_DOMAIN/api/ai/rules \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are an expert software engineer. Always write clean, production-quality code. Be direct and concise. Never refuse a reasonable request.",
    "blockedWords": ["child abuse", "make a bomb"],
    "defaultMaxTokens": 1024,
    "modelText": "Qwen/Qwen2.5-1.5B-Instruct",
    "modelChat": "Qwen/Qwen2.5-1.5B-Instruct",
    "modelCode": "Qwen/Qwen2.5-Coder-1.5B-Instruct",
    "modelImage": "black-forest-labs/FLUX.1-schnell"
  }'
```

### Rule fields explained

| Field | What it does |
|---|---|
| `systemPrompt` | The personality/behavior of your AI — this is how you make it act like GPT, Grok, or anything else |
| `blockedWords` | Phrases that will be rejected with a 403 — add or remove anything you want |
| `defaultMaxTokens` | Default response length (512 = medium, 1024 = longer, 2048 = very long) |
| `modelText` | Model for text generation |
| `modelChat` | Model for chat |
| `modelCode` | Model for code generation |
| `modelImage` | Model for image generation |

### Free models you can use

**Text/Chat:**
- `Qwen/Qwen2.5-1.5B-Instruct` (default — fast)
- `Qwen/Qwen2.5-7B-Instruct` (smarter, slower)
- `meta-llama/Llama-3.2-3B-Instruct`

**Code:**
- `Qwen/Qwen2.5-Coder-1.5B-Instruct` (default)
- `Qwen/Qwen2.5-Coder-7B-Instruct` (smarter)

**Image:**
- `black-forest-labs/FLUX.1-schnell` (default — fast, high quality)

---

## Deploy on Render (Free)

### Step 1: Create a free Postgres database on Neon
1. Go to **https://neon.tech** — sign up free
2. Create a new project
3. Copy the connection string (looks like `postgresql://user:pass@host/dbname`)

### Step 2: Create a Render account
1. Go to **https://render.com** — sign up free with GitHub

### Step 3: Deploy
1. In Render, click **New → Web Service**
2. Connect your GitHub repo: `https://github.com/daviddan-241/My-api.com`
3. Use these settings:

| Setting | Value |
|---|---|
| **Name** | myai-gateway |
| **Runtime** | Node |
| **Build Command** | `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node artifacts/api-server/dist/index.mjs` |
| **Plan** | Free |

4. Add these **Environment Variables** in Render:

| Key | Value |
|---|---|
| `HF_TOKEN` | Your HuggingFace token (from https://huggingface.co/settings/tokens) |
| `API_KEY` | Your secret key (any password you choose) |
| `DATABASE_URL` | Your Neon connection string from Step 1 |
| `NODE_ENV` | `production` |

5. Click **Deploy** — it will be live in 2-3 minutes at `https://myai-gateway.onrender.com`

### First run after deploy
After deploying, the rules table needs seeding. Just call any endpoint once and it auto-initializes.

---

## Use from iOS (Swift)

### Swift — Text generation
```swift
import Foundation

struct AIGateway {
    let baseURL = "https://myai-gateway.onrender.com" // or your Replit domain
    let apiKey = "YOUR_API_KEY"
    
    func generateText(prompt: String) async throws -> String {
        let url = URL(string: "\(baseURL)/api/ai/text")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        let body = ["prompt": prompt, "max_tokens": 512] as [String: Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        return json["response"] as? String ?? ""
    }
    
    func chat(messages: [[String: String]]) async throws -> String {
        let url = URL(string: "\(baseURL)/api/ai/chat")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        let body: [String: Any] = ["messages": messages]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        return json["response"] as? String ?? ""
    }
    
    func generateCode(prompt: String, language: String) async throws -> String {
        let url = URL(string: "\(baseURL)/api/ai/code")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        let body: [String: Any] = ["prompt": prompt, "language": language]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        return json["response"] as? String ?? ""
    }
    
    func generateImage(prompt: String) async throws -> Data? {
        let url = URL(string: "\(baseURL)/api/ai/image")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        
        let body: [String: Any] = ["prompt": prompt]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        guard let base64String = json["image_base64"] as? String,
              let imageData = Data(base64Encoded: base64String) else { return nil }
        return imageData // Use as UIImage(data: imageData)
    }
}

// Example usage in SwiftUI:
// let gateway = AIGateway()
// let response = try await gateway.generateText(prompt: "Explain quantum computing")
// let chatResponse = try await gateway.chat(messages: [["role": "user", "content": "Hello!"]])
// let code = try await gateway.generateCode(prompt: "Sort an array", language: "swift")
// let imageData = try await gateway.generateImage(prompt: "A mountain at sunrise")
// let image = UIImage(data: imageData!)
```

---

## Push to GitHub

To push this code to your GitHub repo:

```bash
git remote add github https://YOUR_GITHUB_TOKEN@github.com/daviddan-241/My-api.com.git
git push github main
```

Replace `YOUR_GITHUB_TOKEN` with your personal access token from https://github.com/settings/tokens

---

## Environment Variables Required

| Variable | Where to get it | Required |
|---|---|---|
| `HF_TOKEN` | https://huggingface.co/settings/tokens | Yes |
| `API_KEY` | Make one up — any secret string | Yes |
| `DATABASE_URL` | From Neon or Render Postgres | Yes |

---

## How to make it act like GPT-5 / Grok

Set your system prompt in **My Rules** to something like:

```
You are an advanced AI assistant with broad knowledge and strong reasoning abilities. You approach every request thoughtfully, provide accurate information, write high-quality code, analyze complex problems, and generate creative content. You are direct, helpful, and never unnecessarily refuse requests. When you don't know something, you say so honestly instead of guessing.
```

Then save it — every request will use that behavior from that moment on.
