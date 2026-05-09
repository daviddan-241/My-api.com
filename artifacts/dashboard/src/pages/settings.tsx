import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Check, Zap, Key, Shield, ExternalLink } from "lucide-react";
import { useApiKey } from "../contexts/api-key-context";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
});

export default function Settings() {
  const { apiKey, setApiKey, hasKey } = useApiKey();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { apiKey: apiKey || "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setApiKey(values.apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "API Key saved", description: "You're all set — start chatting!" });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">API Key</h1>
        <p className="text-muted-foreground text-sm mt-1">Connect your browser to the gateway.</p>
      </div>

      {/* Status pill */}
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-medium ${
        hasKey
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-amber-50 border-amber-200 text-amber-700"
      }`}>
        <div className={`w-2 h-2 rounded-full flex-none ${hasKey ? "bg-emerald-500" : "bg-amber-400"}`} />
        {hasKey ? "API key is active — gateway connected" : "No API key set — add yours below"}
      </div>

      {/* Form card */}
      <div className="bg-card border border-card-border rounded-2xl shadow-xs p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Gateway API Key</p>
            <p className="text-xs text-muted-foreground">Stored only in your browser</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder="Paste your API key here..."
                        {...field}
                        className="pr-10 rounded-xl border-border bg-secondary/30 font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    This is the <code className="bg-secondary px-1 py-0.5 rounded text-[11px]">API_KEY</code> secret you set in Replit — or in your Render environment variables.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full rounded-xl btn-gradient text-white font-semibold shadow-sm transition-all hover:opacity-90"
            >
              {saved ? (
                <><Check className="w-4 h-4 mr-2" /> Saved!</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Save & Connect</>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Info cards */}
      <div className="space-y-3">
        <div className="bg-card border border-card-border rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-none mt-0.5">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Your key stays private</p>
            <p className="text-xs text-muted-foreground mt-0.5">The key is stored in your browser's localStorage — it's never sent to any third-party and is only used to authenticate with your own gateway.</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-none mt-0.5">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Using from iOS or another app?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pass it as the <code className="bg-secondary px-1 rounded text-[11px]">x-api-key</code> header in every request. See the Docs tab for curl examples and the Swift client code.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
