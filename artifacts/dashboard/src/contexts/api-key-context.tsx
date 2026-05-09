import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasKey: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem("gateway_api_key") || "";
  });

  useEffect(() => {
    // Set the window var so custom-fetch.ts can read it
    (window as any).__gatewayApiKey = apiKey;
    if (apiKey) {
      localStorage.setItem("gateway_api_key", apiKey);
    } else {
      localStorage.removeItem("gateway_api_key");
    }
  }, [apiKey]);

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey: setApiKeyState, hasKey: !!apiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error("useApiKey must be used within an ApiKeyProvider");
  }
  return context;
}
