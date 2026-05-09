import { useState } from "react";
import { Copy, Check, Eye, EyeOff, Zap, MessageSquare, FileText, Code, Image as ImageIcon, Shield } from "lucide-react";
import { useListModels } from "@workspace/api-client-react";
import { useApiKey } from "../contexts/api-key-context";

const DOMAIN = typeof window !== "undefined"
  ? window.location.origin
  : "https://your-domain.onrender.com";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
    >
      {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Docs() {
  const { data: modelsList } = useListModels();
  const { apiKey } = useApiKey();
  const [showKey, setShowKey] = useState(false);

  const displayKey = apiKey
    ? (showKey ? apiKey : "•".repeat(Math.max(8, apiKey.length)))
    : "YOUR_API_KEY";
  const actualKey = apiKey || "YOUR_API_KEY";

  const endpoints = [
    {
      id: "chat", icon: MessageSquare, color: "bg-violet-50 text-violet-600",
      title: "Chat", method: "POST", path: "/api/ai/chat",
      description: "Multi-turn conversation. Follows your system prompt perfectly.",
      model: modelsList?.default_models?.chat || "Qwen/Qwen2.5-1.5B-Instruct",
      body: `{\n  "messages": [\n    { "role": "user", "content": "Hello! What can you do?" }\n  ]\n}`,
    },
    {
      id: "text", icon: FileText, color: "bg-sky-50 text-sky-600",
      title: "Generate Text", method: "POST", path: "/api/ai/text",
      description: "Generate any text from a prompt.",
      model: modelsList?.default_models?.text || "Qwen/Qwen2.5-1.5B-Instruct",
      body: `{\n  "prompt": "Explain black holes in simple terms",\n  "max_tokens": 300\n}`,
    },
    {
      id: "code", icon: Code, color: "bg-emerald-50 text-emerald-600",
      title: "Generate Code", method: "POST", path: "/api/ai/code",
      description: "Write or complete code in any language.",
      model: modelsList?.default_models?.code || "Qwen/Qwen2.5-Coder-1.5B-Instruct",
      body: `{\n  "prompt": "Write a binary search function",\n  "language": "python"\n}`,
    },
    {
      id: "image", icon: ImageIcon, color: "bg-pink-50 text-pink-600",
      title: "Generate Image", method: "POST", path: "/api/ai/image",
      description: "Text-to-image. Returns a base64 PNG.",
      model: modelsList?.default_models?.image || "black-forest-labs/FLUX.1-schnell",
      body: `{\n  "prompt": "A futuristic city at sunset, cinematic"\n}`,
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">API Docs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Use your gateway from any app or device.</p>
      </div>

      {/* Auth */}
      <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Authentication</p>
            <p className="text-xs text-muted-foreground">Required on every request</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 py-2.5 font-mono text-xs">
            <span className="text-muted-foreground">x-api-key:</span>
            <span className="flex-1 truncate text-foreground">{displayKey}</span>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-none"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Set your key in the <strong>API Key</strong> tab. Then every curl example below will use it automatically.
          </p>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {endpoints.map(ep => {
          const Icon = ep.icon;
          const curlCode = `curl -X ${ep.method} ${DOMAIN}${ep.path} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${actualKey}" \\
  -d '${ep.body}'`;

          return (
            <div key={ep.id} className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${ep.color} flex items-center justify-center flex-none`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{ep.title}</p>
                      <p className="text-xs text-muted-foreground">{ep.description}</p>
                    </div>
                  </div>
                  <span className="flex-none ml-2 text-xs font-mono font-semibold bg-violet-50 text-violet-600 border border-violet-200 px-2 py-1 rounded-lg">
                    {ep.method}
                  </span>
                </div>
                <div className="mt-2.5 font-mono text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5">
                  {ep.path}
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <CodeBlock code={curlCode} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Default model</span>
                  <code className="bg-secondary px-2 py-0.5 rounded-lg text-[11px] font-mono">{ep.model}</code>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* iOS tip */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Zap className="w-4 h-4 text-violet-600" />
          <p className="font-semibold text-sm text-violet-800">Using from iOS / Swift?</p>
        </div>
        <p className="text-xs text-violet-700 leading-relaxed">
          A full Swift client is included in the repo at <code className="bg-white/60 px-1 rounded text-[11px]">ios-example/AIGateway.swift</code>. Drop it into Xcode and call <code className="bg-white/60 px-1 rounded text-[11px]">gateway.chat(messages:)</code> — no extra dependencies needed.
        </p>
      </div>

      {/* Rules tip */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <p className="font-semibold text-sm text-emerald-800">System prompt is always active</p>
        </div>
        <p className="text-xs text-emerald-700 leading-relaxed">
          Every request automatically includes the system prompt you set in the <strong>Rules</strong> tab. Change it anytime and it takes effect immediately — no restart needed.
        </p>
      </div>
    </div>
  );
}
