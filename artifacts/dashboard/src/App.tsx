import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiKeyProvider } from "./contexts/api-key-context";
import { ChatTabProvider } from "./contexts/chat-tab-context";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";

import Playground from "./pages/playground";
import Rules from "./pages/rules";
import Docs from "./pages/docs";
import Settings from "./pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Playground} />
        <Route path="/rules" component={Rules} />
        <Route path="/docs" component={Docs} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiKeyProvider>
        <ChatTabProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </ChatTabProvider>
      </ApiKeyProvider>
    </QueryClientProvider>
  );
}

export default App;
