import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients"; 
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/clients" element={<Layout><Clients /></Layout>} />
          <Route path="/pipeline" element={<Layout><div className="p-6"><h1 className="text-3xl font-bold">Pipeline</h1><p className="text-muted-foreground">Pipeline view coming soon...</p></div></Layout>} />
          <Route path="/applications" element={<Layout><div className="p-6"><h1 className="text-3xl font-bold">Applications</h1><p className="text-muted-foreground">Applications view coming soon...</p></div></Layout>} />
          <Route path="/calendar" element={<Layout><div className="p-6"><h1 className="text-3xl font-bold">Calendar</h1><p className="text-muted-foreground">Calendar view coming soon...</p></div></Layout>} />
          <Route path="/settings" element={<Layout><div className="p-6"><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Settings coming soon...</p></div></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
