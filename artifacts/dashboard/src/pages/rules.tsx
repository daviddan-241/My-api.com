import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Plus, X, AlertCircle, Bot, Shield, Cpu, Sliders, Check, AlertTriangle } from "lucide-react";
import { useGetRules, useUpdateRules, getGetRulesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  systemPrompt: z.string().min(0),
  blockedWords: z.array(z.string()),
  defaultMaxTokens: z.coerce.number().min(1).max(32000),
  modelText: z.string().min(1, "Required"),
  modelChat: z.string().min(1, "Required"),
  modelCode: z.string().min(1, "Required"),
  modelImage: z.string().min(1, "Required"),
});

function SectionCard({ icon: Icon, title, description, accent, children }: {
  icon: React.ElementType; title: string; description: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Rules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rules, isLoading, isError } = useGetRules();
  const updateRules = useUpdateRules();
  const [newBlockedWord, setNewBlockedWord] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      systemPrompt: "", blockedWords: [], defaultMaxTokens: 1024,
      modelText: "", modelChat: "", modelCode: "", modelImage: "",
    },
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    if (rules && !initializedRef.current) {
      initializedRef.current = true;
      form.reset({
        systemPrompt: rules.systemPrompt || "",
        blockedWords: rules.blockedWords || [],
        defaultMaxTokens: rules.defaultMaxTokens || 1024,
        modelText: rules.modelText || "",
        modelChat: rules.modelChat || "",
        modelCode: rules.modelCode || "",
        modelImage: rules.modelImage || "",
      });
    }
  }, [rules]);

  const addBlockedWord = () => {
    if (!newBlockedWord.trim()) return;
    const current = form.getValues("blockedWords");
    if (!current.includes(newBlockedWord.trim())) {
      form.setValue("blockedWords", [...current, newBlockedWord.trim()], { shouldDirty: true });
    }
    setNewBlockedWord("");
  };

  const removeBlockedWord = (word: string) => {
    form.setValue("blockedWords", form.getValues("blockedWords").filter(w => w !== word), { shouldDirty: true });
  };

  function doSave(values: z.infer<typeof formSchema>) {
    setConfirmOpen(false);
    updateRules.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRulesQueryKey() });
        setSaved(true);
        form.reset(values); // mark clean so isDirty resets correctly
        setTimeout(() => setSaved(false), 3000);
        toast({ title: "Rules locked in", description: "Your gateway rules are now active and saved." });
      },
      onError: (err) => {
        toast({ title: "Failed to save", description: err.message, variant: "destructive" });
      },
    });
  }

  function onSaveClick() {
    form.handleSubmit((values) => {
      setConfirmOpen(true);
      // store values temporarily for confirm
      (window as any).__pendingRules = values;
    })();
  }

  function onConfirm() {
    const values = (window as any).__pendingRules;
    if (values) doSave(values);
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-red-950/60 border border-red-800/50 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-none mt-0.5" />
          <div>
            <p className="font-semibold text-red-300 text-sm">Couldn't load rules</p>
            <p className="text-red-400 text-xs mt-1">Make sure your API key is set in the API Key tab.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 w-full">

      {/* Confirm dialog overlay */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900/50 border border-amber-700/40 flex items-center justify-center flex-none">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Lock in these rules?</p>
                <p className="text-xs text-muted-foreground">This will save and apply your rules immediately.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Your rules will be saved to the server and used for every future AI request. You can update them again at any time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Rules</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Control how your AI behaves.</p>
        </div>
        <button
          onClick={onSaveClick}
          disabled={updateRules.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-gradient text-white text-sm font-bold shadow-sm disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
        >
          {saved
            ? <><Check className="w-4 h-4" /> Saved!</>
            : updateRules.isPending
            ? <><Lock className="w-4 h-4 animate-pulse" /> Saving…</>
            : <><Lock className="w-4 h-4" /> Save Rules</>}
        </button>
      </div>

      {saved && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          Rules locked in — your AI will follow these on every request.
        </div>
      )}

      <Form {...form}>
        <form className="space-y-4">

          {/* System Prompt */}
          <SectionCard icon={Bot} title="System Prompt" description="How your AI behaves on every request" accent="bg-violet-900/50 text-violet-400">
            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={`You are a powerful AI assistant. Be direct, helpful, and knowledgeable...`}
                      className="min-h-[110px] text-sm rounded-xl border-border bg-secondary/40 font-mono resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs mt-2 text-muted-foreground">
                    This is prepended to every AI request. Write anything — sets personality, tone, language, and behavior. You have full control.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SectionCard>

          {/* Blocked Words */}
          <SectionCard icon={Shield} title="Blocked Words" description="Requests with these phrases are rejected" accent="bg-red-950/50 text-red-400">
            <FormField
              control={form.control}
              name="blockedWords"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a word or phrase..."
                      value={newBlockedWord}
                      onChange={e => setNewBlockedWord(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBlockedWord(); } }}
                      className="rounded-xl border-border bg-secondary/40 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addBlockedWord}
                      className="px-3 py-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {field.value.map(word => (
                      <span key={word} className="flex items-center gap-1.5 bg-red-950/60 text-red-300 border border-red-800/40 px-3 py-1 rounded-full text-xs font-medium">
                        {word}
                        <button type="button" onClick={() => removeBlockedWord(word)} className="hover:text-red-100 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {field.value.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No blocked words — all prompts are allowed.</p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SectionCard>

          {/* Token Limit */}
          <SectionCard icon={Sliders} title="Response Length" description="Default max tokens per response" accent="bg-sky-950/50 text-sky-400">
            <FormField
              control={form.control}
              name="defaultMaxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="number" {...field} className="rounded-xl border-border bg-secondary/40 text-sm" />
                  </FormControl>
                  <FormDescription className="text-xs mt-1.5 text-muted-foreground">
                    512 = short · 1024 = medium · 2048 = long
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SectionCard>

          {/* Models */}
          <SectionCard icon={Cpu} title="Model Selection" description="Which AI model powers each endpoint" accent="bg-emerald-950/50 text-emerald-400">
            <div className="space-y-4">
              {([
                { name: "modelText" as const, label: "Text model" },
                { name: "modelChat" as const, label: "Chat model" },
                { name: "modelCode" as const, label: "Code model" },
                { name: "modelImage" as const, label: "Image model" },
              ]).map(item => (
                <FormField
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{item.label}</FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-xl border-border bg-secondary/40 text-sm font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Chat/text/code use Groq models, e.g. <code className="bg-secondary px-1.5 py-0.5 rounded text-[11px]">llama-3.3-70b-versatile</code> or <code className="bg-secondary px-1.5 py-0.5 rounded text-[11px]">mixtral-8x7b-32768</code>. Image uses HuggingFace model IDs.
            </p>
          </SectionCard>

          {/* Bottom save button */}
          <button
            type="button"
            onClick={onSaveClick}
            disabled={updateRules.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl btn-gradient text-white font-bold text-sm shadow-md disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.99]"
          >
            {saved
              ? <><Check className="w-4 h-4" /> Rules Saved & Locked In!</>
              : updateRules.isPending
              ? <><Lock className="w-4 h-4 animate-pulse" /> Saving…</>
              : <><Lock className="w-4 h-4" /> Save & Lock Rules</>}
          </button>

        </form>
      </Form>
    </div>
  );
}
