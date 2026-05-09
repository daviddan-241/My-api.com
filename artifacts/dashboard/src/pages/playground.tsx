import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, User, Image as ImageIcon,
  Trash2, Copy, Check, Loader2, ImageOff, StopCircle,
  Paperclip, X, FileText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useApiKey } from "../contexts/api-key-context";
import { useChatTabs } from "../contexts/chat-tab-context";
import type { ChatItem, UserItem, TextItem, ImageItem, LoadItem, ErrorItem, Role, Attachment } from "../types/chat";

// ── Build API history ──────────────────────────────────────────────────────────
function buildHistory(items: ChatItem[]): { role: Role; content: any }[] {
  return items.flatMap<{ role: Role; content: any }>((it) => {
    if (it.role === "user") {
      const u = it as UserItem;
      const imageAttachments = (u.attachments ?? []).filter(a => a.type === "image");
      const textAttachments  = (u.attachments ?? []).filter(a => a.type === "text");

      let textContent = u.content;
      for (const f of textAttachments) {
        textContent = `[Attached file: ${f.name}]\n${f.content ?? ""}\n\n${textContent}`;
      }

      if (imageAttachments.length > 0) {
        const parts: any[] = [{ type: "text", text: textContent }];
        for (const img of imageAttachments) {
          parts.push({ type: "image_url", image_url: { url: img.dataUrl! } });
        }
        return [{ role: "user", content: parts }];
      }
      return [{ role: "user", content: textContent }];
    }
    if (it.role === "assistant" && "kind" in it) {
      if (it.kind === "text")  return [{ role: "assistant", content: (it as TextItem).content }];
      if (it.kind === "image") return [{ role: "assistant", content: `[Image generated: ${(it as ImageItem).prompt}]` }];
    }
    return [];
  });
}

// ── Image intent detection ─────────────────────────────────────────────────────
const IMAGE_RE = [
  /\b(generate|create|make|draw|render|paint|design|produce|show)\b.{0,50}\b(image|picture|photo|illustration|artwork|drawing|painting|portrait|wallpaper)\b/i,
  /\b(image|picture|photo|illustration|artwork|drawing|painting|sketch)\b.{0,20}\bof\b/i,
  /\bshow me.{0,30}\b(image|picture|photo|drawing)\b/i,
  /^(draw|paint|sketch|render|imagine)\s+.{0,50}\b(image|picture|photo|illustration|artwork|painting)\b/i,
];
function looksLikeImage(text: string) { return IMAGE_RE.some(p => p.test(text.trim())); }

let _id = 0;
const uid = () => `${Date.now()}-${_id++}`;

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5"
      title="Copy"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

// ── Message bubbles ────────────────────────────────────────────────────────────
function UserBubble({ content, attachments }: { content: string; attachments?: Attachment[] }) {
  return (
    <div className="flex gap-2.5 justify-end items-end message-in">
      <div className="max-w-[82%] space-y-1.5">
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {attachments.map(a => (
              a.type === "image" && a.dataUrl ? (
                <img
                  key={a.id}
                  src={a.dataUrl}
                  alt={a.name}
                  className="max-h-32 max-w-[180px] rounded-xl border border-border object-cover shadow-sm"
                />
              ) : (
                <div key={a.id} className="flex items-center gap-1.5 bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground">
                  <FileText className="w-3 h-3 text-muted-foreground flex-none" />
                  <span className="max-w-[120px] truncate">{a.name}</span>
                </div>
              )
            ))}
          </div>
        )}
        {content && (
          <div className="px-4 py-2.5 rounded-2xl rounded-br-sm btn-gradient text-white text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>
      <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-none mb-0.5">
        <User className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-full btn-gradient flex items-center justify-center flex-none shadow-sm mb-0.5">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  );
}

function TextBubble({ item }: { item: TextItem }) {
  const hasCodeBlock = item.content.includes("```");

  const renderContent = () => {
    if (!hasCodeBlock) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>;
    }
    const parts = item.content.split(/(```[\w]*\n[\s\S]*?```)/g);
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          const codeMatch = part.match(/```([\w]*)\n([\s\S]*?)```/);
          if (codeMatch) {
            const lang = codeMatch[1];
            const code = codeMatch[2];
            return (
              <div key={i} className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/60" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="flex items-center gap-2">
                    {lang && <span className="text-[10px] text-slate-400 font-mono">{lang}</span>}
                    <button onClick={() => navigator.clipboard.writeText(code)} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
                      <Copy className="w-3 h-3" /> copy
                    </button>
                  </div>
                </div>
                <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto"><code>{code}</code></pre>
              </div>
            );
          }
          return part ? <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{part}</p> : null;
        })}
      </div>
    );
  };

  return (
    <div className="flex gap-2.5 items-end message-in">
      <AIAvatar />
      <div className="group max-w-[82%] bg-card border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-xs">
        {renderContent()}
        {item.streaming && (
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse rounded-full" />
        )}
        {!item.streaming && item.content && (
          <div className="flex justify-end mt-1">
            <CopyBtn text={item.content} />
          </div>
        )}
      </div>
    </div>
  );
}

function ImageBubble({ item }: { item: ImageItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex gap-2.5 items-end message-in">
      <AIAvatar />
      <div className="max-w-[82%] space-y-1.5">
        <div
          className={`rounded-2xl rounded-bl-sm overflow-hidden shadow-sm border border-border cursor-pointer hover:opacity-95 transition-opacity ${expanded ? "max-w-full" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          <img src={item.dataUrl} alt={item.prompt} className="w-full max-w-xs object-cover block" />
        </div>
        <p className="text-[11px] text-muted-foreground px-1 flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {item.prompt.length > 60 ? item.prompt.slice(0, 60) + "…" : item.prompt}
        </p>
      </div>
    </div>
  );
}

function ImageLoadingBubble({ prompt }: { prompt: string }) {
  return (
    <div className="flex gap-2.5 items-end message-in">
      <AIAvatar />
      <div className="bg-card border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Generating image…
        </div>
        <p className="text-xs text-muted-foreground/70 italic">{prompt.length > 50 ? prompt.slice(0, 50) + "…" : prompt}</p>
        <p className="text-[11px] text-muted-foreground/50">Free tier takes 10–30 seconds</p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2.5 items-end message-in">
      <AIAvatar />
      <div className="bg-card border border-card-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 typing-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 typing-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 typing-dot" />
        </div>
      </div>
    </div>
  );
}

function ErrorBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-2.5 items-end message-in">
      <div className="w-7 h-7 rounded-full bg-red-950 flex items-center justify-center flex-none mb-0.5">
        <ImageOff className="w-3.5 h-3.5 text-red-400" />
      </div>
      <div className="bg-red-950/60 border border-red-800/50 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-red-300 max-w-[82%]">
        {content}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  { title: "Explain something", sub: "quantum computing, simply" },
  { title: "Write code for me", sub: "a Python function to sort a list" },
  { title: "Create a painting", sub: "of a futuristic city at sunset" },
  { title: "Ask a question", sub: "what's the difference between AI and ML?" },
  { title: "Analyze a file", sub: "upload a file and ask anything about it" },
  { title: "Write a poem", sub: "about the ocean at night" },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function Playground() {
  const { toast } = useToast();
  const { apiKey, hasKey } = useApiKey();
  const {
    activeId, activeItems,
    appendItem, updateLastAssistant, replaceItem, updateTabItems,
    tabsRef, activeIdRef,
  } = useChatTabs();

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeItems.length]);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const id = uid();

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setAttachments(prev => [...prev, { id, name: file.name, type: "image", dataUrl, mimeType: file.type }]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          setAttachments(prev => [...prev, { id, name: file.name, type: "text", content }]);
        };
        reader.readAsText(file);
      }
    }
    e.target.value = "";
  }, []);

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  // ── Send ──────────────────────────────────────────────────────────────────────
  const send = useCallback(async (text: string, extraAttachments?: Attachment[]) => {
    const allAttachments = [...attachments, ...(extraAttachments ?? [])];
    if (!text.trim() && allAttachments.length === 0) return;
    if (busy) return;
    if (!hasKey) {
      toast({ title: "No API key", description: "Go to API Key tab and enter your key.", variant: "destructive" });
      return;
    }

    setPrompt("");
    setAttachments([]);
    setBusy(true);

    const tabId = activeIdRef.current;
    const currentItems = tabsRef.current.find(t => t.id === tabId)?.items ?? [];
    const userItem: UserItem = { id: uid(), role: "user", content: text, attachments: allAttachments.length > 0 ? allAttachments : undefined };
    const history = buildHistory([...currentItems, userItem]);
    appendItem(tabId, userItem);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const hasImages = allAttachments.some(a => a.type === "image");
      const isImageRequest = !hasImages && looksLikeImage(text);

      if (isImageRequest) {
        const loadId = uid();
        appendItem(tabId, { id: loadId, role: "assistant", kind: "image-loading", prompt: text });

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ messages: history, stream: false }),
          signal: abort.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          replaceItem(tabId, loadId, { id: loadId, role: "assistant", kind: "error", content: data.error ?? "Failed to generate image" });
        } else if (data.type === "image") {
          replaceItem(tabId, loadId, { id: loadId, role: "assistant", kind: "image", dataUrl: data.data_url, prompt: data.prompt, model: data.model });
        } else {
          replaceItem(tabId, loadId, { id: loadId, role: "assistant", kind: "text", content: data.response ?? data.message?.content ?? "", model: data.model });
        }
      } else {
        const assistantId = uid();
        appendItem(tabId, { id: assistantId, role: "assistant", kind: "text", content: "", streaming: true });

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ messages: history, stream: !hasImages }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          replaceItem(tabId, assistantId, { id: assistantId, role: "assistant", kind: "error", content: err.error ?? "Something went wrong" });
          return;
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json") || hasImages) {
          const data = await res.json();
          replaceItem(tabId, assistantId, {
            id: assistantId, role: "assistant", kind: "text",
            content: data.response ?? data.message?.content ?? data.choices?.[0]?.message?.content ?? "",
            model: data.model,
          });
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const json = JSON.parse(raw);
              const chunk = json.choices?.[0]?.delta?.content ?? "";
              if (chunk) {
                fullText += chunk;
                const ft = fullText;
                updateLastAssistant(tabId, prev => ({ ...prev, content: ft, streaming: true }));
              }
            } catch { /* ignore */ }
          }
        }
        updateLastAssistant(tabId, prev => ({ ...prev, streaming: false }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [busy, hasKey, apiKey, attachments, toast, appendItem, updateLastAssistant, replaceItem, tabsRef, activeIdRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(prompt); }
  };

  const stop = () => { abortRef.current?.abort(); setBusy(false); };

  const clearTab = () => {
    stop();
    setAttachments([]);
    updateTabItems(activeId, () => []);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {!hasKey && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs flex items-center gap-2 flex-none">
          <span>🔑</span>
          Go to <strong>API Key</strong> tab and enter your key to start chatting.
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 min-h-full flex flex-col">
          {activeItems.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-2xl btn-gradient flex items-center justify-center mb-6 shadow-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md px-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.title}
                    onClick={() => send(s.sub)}
                    className="bg-secondary hover:bg-secondary/80 rounded-2xl px-4 py-3.5 text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <p className="text-sm font-semibold text-foreground leading-tight">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeItems.map(item => {
            if (item.role === "user") return <UserBubble key={item.id} content={item.content} attachments={(item as UserItem).attachments} />;
            if (item.role === "assistant") {
              const a = item as Exclude<ChatItem, UserItem>;
              if (a.kind === "text")          return <TextBubble key={a.id} item={a as TextItem} />;
              if (a.kind === "image")         return <ImageBubble key={a.id} item={a as ImageItem} />;
              if (a.kind === "image-loading") return <ImageLoadingBubble key={a.id} prompt={(a as LoadItem).prompt} />;
              if (a.kind === "error")         return <ErrorBubble key={a.id} content={(a as ErrorItem).content} />;
            }
            return null;
          })}

          {busy && !activeItems.some(i => i.role === "assistant" && "kind" in i && (i as any).kind === "text" && (i as any).streaming) &&
           !activeItems.some(i => i.role === "assistant" && "kind" in i && (i as any).kind === "image-loading") && (
            <TypingBubble />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-none px-3 pb-4 pt-2 bg-background">
        <div className="max-w-2xl mx-auto">

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {attachments.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 bg-secondary border border-border rounded-xl px-2 py-1 text-xs text-foreground group"
                >
                  {a.type === "image" && a.dataUrl ? (
                    <img src={a.dataUrl} alt={a.name} className="w-5 h-5 rounded object-cover flex-none" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-muted-foreground flex-none" />
                  )}
                  <span className="max-w-[100px] truncate">{a.name}</span>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-secondary rounded-2xl px-2 py-2 focus-within:ring-1 focus-within:ring-white/10 transition-all">
            {/* Clear */}
            <button
              onClick={clearTab}
              disabled={activeItems.length === 0 && attachments.length === 0}
              className="flex-none w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors disabled:opacity-30 mb-0.5"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* File upload */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.txt,.md,.js,.ts,.py,.json,.csv,.html,.css,.xml,.yaml,.yml,.sh,.rb,.go,.java,.cpp,.c,.rs"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex-none w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors disabled:opacity-30 mb-0.5"
              title="Attach file or image"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              className="flex-1 border-0 shadow-none bg-transparent resize-none min-h-[36px] max-h-[160px] p-0 py-1.5 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/40 text-foreground"
              rows={1}
              disabled={busy && !abortRef.current}
            />

            {/* Stop or send */}
            {busy ? (
              <button
                onClick={stop}
                className="flex-none w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-colors mb-0.5"
                title="Stop"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => send(prompt)}
                disabled={!prompt.trim() && attachments.length === 0}
                className="flex-none w-8 h-8 rounded-full bg-white flex items-center justify-center text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-white/90 active:scale-95 mb-0.5"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] text-muted-foreground/30 mt-1.5">
            Enter to send · Shift+Enter for new line · 📎 attach files or images
          </p>
        </div>
      </div>
    </div>
  );
}
