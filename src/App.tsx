import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import DashboardTabs from "@/pages/DashboardTabs";
import Leads from "@/pages/Leads";
import PendingApp from "@/pages/PendingApp";
import Screening from "@/pages/Screening";
import PreQualified from "@/pages/PreQualified";
import PreApproved from "@/pages/PreApproved";
import Active from "@/pages/Active";
import PastClients from "@/pages/PastClients";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import AgentList from "@/pages/contacts/AgentList";
import BorrowerList from "@/pages/contacts/BorrowerList";
import ApprovedLenders from "@/pages/contacts/ApprovedLenders";
import TasksModern from "@/pages/TasksModern";
import SalmaTasks from "@/pages/tasks/SalmaTasks";
import HermanTasks from "@/pages/tasks/HermanTasks";
import GuidelineChatbot from "@/pages/resources/GuidelineChatbot";
import Condolist from "@/pages/resources/Condolist";
import PreapprovalLetter from "@/pages/resources/PreapprovalLetter";
import LoanEstimate from "@/pages/resources/LoanEstimate";
import Marketing from "@/pages/resources/Marketing";
import Email from "@/pages/Email";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// App routes component
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/" element={<DashboardTabs />} />
        <Route path="/email" element={<Email />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/pending-app" element={<PendingApp />} />
        <Route path="/screening" element={<Screening />} />
        <Route path="/pre-qualified" element={<PreQualified />} />
        <Route path="/pre-approved" element={<PreApproved />} />
        <Route path="/active" element={<Active />} />
        <Route path="/past-clients" element={<PastClients />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/contacts/agents" element={<AgentList />} />
        <Route path="/contacts/borrowers" element={<BorrowerList />} />
        <Route path="/contacts/lenders" element={<ApprovedLenders />} />
        <Route path="/tasks/yousif" element={<TasksModern />} />
        <Route path="/tasks/salma" element={<SalmaTasks />} />
        <Route path="/tasks/hermit" element={<HermanTasks />} />
        <Route path="/resources/chatbot" element={<GuidelineChatbot />} />
        <Route path="/resources/condolist" element={<Condolist />} />
        <Route path="/resources/preapproval" element={<PreapprovalLetter />} />
        <Route path="/resources/estimate" element={<LoanEstimate />} />
        <Route path="/resources/marketing" element={<Marketing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;