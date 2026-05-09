import { Link, useLocation } from "wouter";
import { Sparkles, Settings2, BookOpen, Key, Zap, Plus, X } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { useChatTabs } from "../contexts/chat-tab-context";

const navItems = [
  { href: "/",         label: "Chat",    icon: Sparkles  },
  { href: "/rules",    label: "Rules",   icon: Settings2 },
  { href: "/docs",     label: "Docs",    icon: BookOpen  },
  { href: "/settings", label: "API Key", icon: Key       },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  const isHealthy = health?.status === "ok";
  const { tabs, activeId, setActiveId, addTab, closeTab } = useChatTabs();
  const onChat = location === "/";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col flex-none bg-sidebar border-r border-sidebar-border">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border flex-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl btn-gradient flex items-center justify-center shadow-sm flex-none">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-none">MyAI Gateway</p>
              <p className="text-[11px] text-sidebar-foreground mt-0.5">Your personal AI API</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="px-3 py-4 space-y-0.5 flex-none">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 flex-none ${active ? "text-sidebar-primary" : ""}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Conversation list ── */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-sidebar-border">
          {/* New chat row */}
          <div className="px-2 pt-2 pb-1 flex-none">
            <button
              onClick={addTab}
              disabled={tabs.length >= 8}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors disabled:opacity-30"
            >
              <Plus className="w-4 h-4 flex-none" />
              New chat
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 scrollbar-none">
            {tabs.map(tab => (
              <Link
                key={tab.id}
                href="/"
                onClick={() => setActiveId(tab.id)}
                className={`group w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all duration-100 cursor-pointer
                  ${tab.id === activeId && onChat
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
              >
                <span className="flex-1 truncate">{tab.name}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => closeTab(tab.id, e)}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded cursor-pointer flex-none"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="px-5 py-4 border-t border-sidebar-border flex-none">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full flex-none ${isHealthy ? "bg-emerald-400" : "bg-red-400"}`}
              style={isHealthy ? { boxShadow: "0 0 0 3px rgba(52,211,153,0.20)" } : {}}
            />
            <span className="text-xs text-sidebar-foreground font-medium">
              {isHealthy ? "API Connected" : "API Offline"}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 glass-dark border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl btn-gradient flex items-center justify-center shadow-sm flex-none">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="font-bold text-sm text-white flex-1">MyAI Gateway</p>
        {/* Mobile: horizontal scrollable chat tabs when on chat page */}
        {onChat && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[55vw]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors flex-none
                  ${tab.id === activeId ? "bg-white/20 text-white" : "text-white/50 hover:text-white"}`}
              >
                {tab.name}
              </button>
            ))}
            {tabs.length < 8 && (
              <button onClick={addTab} className="p-0.5 text-white/50 hover:text-white flex-none">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-none">
          <div className={`w-1.5 h-1.5 rounded-full ${isHealthy ? "bg-emerald-400" : "bg-red-400"}`} />
          <span className="text-xs text-white/60">{isHealthy ? "Live" : "Offline"}</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto flex flex-col pb-16 md:pb-0">
        <div className="h-14 md:hidden flex-none" />
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-dark border-t border-white/10">
        <div className="flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-all duration-150 ${
                  active ? "text-violet-400" : "text-white/40"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-150 ${active ? "scale-110" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </nav>
    </div>
  );
}
