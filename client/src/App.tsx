import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Documents from "@/pages/Documents";
import AIAssistant from "@/pages/AIAssistant";
import Calendar from "@/pages/CalendarMonthView";
import Communications from "@/pages/Communications";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public route */}
      <Route path="/login" component={Login} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/cases" component={Home} />
          <Route path="/cases/:id" component={Home} />
          <Route path="/documents" component={Documents} />
          <Route path="/ai-assistant" component={AIAssistant} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/communications" component={Communications} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
