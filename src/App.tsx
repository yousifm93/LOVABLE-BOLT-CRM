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
import YousifTasks from "./pages/tasks/YousifTasks";
import SalmaTasks from "./pages/tasks/SalmaTasks";
import HermitTasks from "./pages/tasks/HermitTasks";
import AgentList from "./pages/contacts/AgentList";
import BorrowerList from "./pages/contacts/BorrowerList";
import Admin from "./pages/Admin";
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
          <Route path="/tasks/yousif" element={<Layout><YousifTasks /></Layout>} />
          <Route path="/tasks/salma" element={<Layout><SalmaTasks /></Layout>} />
          <Route path="/tasks/hermit" element={<Layout><HermitTasks /></Layout>} />
          <Route path="/contacts/agents" element={<Layout><AgentList /></Layout>} />
          <Route path="/contacts/borrowers" element={<Layout><BorrowerList /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
