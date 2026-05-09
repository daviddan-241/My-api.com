import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import type { Tab, ChatItem, TextItem } from "../types/chat";

const STORAGE_KEY = "ai-gateway-tabs-v2";

function loadTabs(): { tabs: Tab[]; activeId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  const id = `tab-${Date.now()}`;
  return { tabs: [{ id, name: "Chat 1", items: [] }], activeId: id };
}

function saveTabs(tabs: Tab[], activeId: string) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeId })); } catch { /* ignore */ }
}

interface ChatTabContextValue {
  tabs: Tab[];
  activeId: string;
  setActiveId: (id: string) => void;
  activeItems: ChatItem[];
  addTab: () => void;
  closeTab: (id: string, e: React.MouseEvent) => void;
  updateTabItems: (tabId: string, updater: (prev: ChatItem[]) => ChatItem[]) => void;
  appendItem: (tabId: string, item: ChatItem) => void;
  updateLastAssistant: (tabId: string, updater: (prev: TextItem) => TextItem) => void;
  replaceItem: (tabId: string, id: string, next: ChatItem) => void;
  tabsRef: React.MutableRefObject<Tab[]>;
  activeIdRef: React.MutableRefObject<string>;
}

const ChatTabContext = createContext<ChatTabContextValue | null>(null);

export function ChatTabProvider({ children }: { children: React.ReactNode }) {
  const initial = loadTabs();
  const [tabs, setTabs] = useState<Tab[]>(initial.tabs);
  const [activeId, setActiveId] = useState<string>(initial.activeId);

  const tabsRef = useRef<Tab[]>(tabs);
  const activeIdRef = useRef<string>(activeId);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => { saveTabs(tabs, activeId); }, [tabs, activeId]);

  const activeItems = tabs.find(t => t.id === activeId)?.items ?? [];

  const addTab = useCallback(() => {
    const id = `tab-${Date.now()}`;
    const n = tabsRef.current.length + 1;
    setTabs(prev => [...prev, { id, name: `Chat ${n}`, items: [] }]);
    setActiveId(id);
  }, []);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => {
      if (prev.length === 1) {
        const newId = `tab-${Date.now()}`;
        setActiveId(newId);
        return [{ id: newId, name: "Chat 1", items: [] }];
      }
      const next = prev.filter(t => t.id !== id);
      if (activeIdRef.current === id) {
        const idx = prev.findIndex(t => t.id === id);
        setActiveId(next[Math.max(0, idx - 1)].id);
      }
      return next;
    });
  }, []);

  const updateTabItems = useCallback((tabId: string, updater: (prev: ChatItem[]) => ChatItem[]) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, items: updater(t.items) } : t));
  }, []);

  const appendItem = useCallback((tabId: string, item: ChatItem) => {
    updateTabItems(tabId, prev => [...prev, item]);
  }, [updateTabItems]);

  const updateLastAssistant = useCallback((tabId: string, updater: (prev: TextItem) => TextItem) => {
    updateTabItems(tabId, prev => {
      const copy = [...prev];
      const idx = copy.findLastIndex(i => i.role === "assistant" && "kind" in i && (i as TextItem).kind === "text");
      if (idx !== -1) copy[idx] = updater(copy[idx] as TextItem);
      return copy;
    });
  }, [updateTabItems]);

  const replaceItem = useCallback((tabId: string, id: string, next: ChatItem) => {
    updateTabItems(tabId, prev => prev.map(i => i.id === id ? next : i));
  }, [updateTabItems]);

  return (
    <ChatTabContext.Provider value={{
      tabs, activeId, setActiveId, activeItems,
      addTab, closeTab,
      updateTabItems, appendItem, updateLastAssistant, replaceItem,
      tabsRef, activeIdRef,
    }}>
      {children}
    </ChatTabContext.Provider>
  );
}

export function useChatTabs() {
  const ctx = useContext(ChatTabContext);
  if (!ctx) throw new Error("useChatTabs must be used inside ChatTabProvider");
  return ctx;
}
