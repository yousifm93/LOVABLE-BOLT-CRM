import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import PendingApp from "./pages/PendingApp";
import Screening from "./pages/Screening";
import PreQualified from "./pages/PreQualified";
import PreApproved from "./pages/PreApproved";
import Active from "./pages/Active";
import PastClients from "./pages/PastClients";
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
          <Route path="/leads" element={<Layout><Leads /></Layout>} />
          <Route path="/pending-app" element={<Layout><PendingApp /></Layout>} />
          <Route path="/screening" element={<Layout><Screening /></Layout>} />
          <Route path="/pre-qualified" element={<Layout><PreQualified /></Layout>} />
          <Route path="/pre-approved" element={<Layout><PreApproved /></Layout>} />
          <Route path="/active" element={<Layout><Active /></Layout>} />
          <Route path="/past-clients" element={<Layout><PastClients /></Layout>} />
          <Route path="/settings" element={<Layout><div className="p-6"><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Settings coming soon...</p></div></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
