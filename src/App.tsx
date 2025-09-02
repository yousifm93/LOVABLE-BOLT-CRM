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
import AdminAssistant from "@/pages/AdminAssistant";
import NotFound from "@/pages/NotFound";
import AgentListWrapper from "@/pages/contacts/AgentListWrapper";
import BorrowerList from "@/pages/contacts/BorrowerList";
import ApprovedLenders from "@/pages/contacts/ApprovedLenders";
import TasksModern from "@/pages/TasksModern";
import DeletedTasksAdmin from "@/pages/admin/DeletedTasksAdmin";
import PropertyValue from "./pages/resources/PropertyValue"
import PropertyValuePublic from "./pages/resources/PropertyValuePublic"
import GuidelineChatbot from "@/pages/resources/GuidelineChatbot";
import IncomeCalculator from "@/pages/resources/IncomeCalculator";
import { LoanPricer } from "@/pages/resources/LoanPricer";
import Condolist from "@/pages/resources/Condolist";
import PreapprovalLetter from "@/pages/resources/PreapprovalLetter";
import LoanEstimate from "@/pages/resources/LoanEstimate";
import Email from "@/pages/Email";
import EmailMarketing from "@/pages/resources/EmailMarketing";
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
        <Route path="/home-value" element={<PropertyValuePublic />} />
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
        <Route path="/admin/assistant" element={<AdminAssistant />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/contacts/agents" element={<AgentListWrapper />} />
        <Route path="/contacts/borrowers" element={<BorrowerList />} />
        <Route path="/contacts/lenders" element={<ApprovedLenders />} />
        <Route path="/tasks" element={<TasksModern />} />
        <Route path="/admin/deleted-tasks" element={<DeletedTasksAdmin />} />
        <Route path="/resources/loan-pricer" element={<LoanPricer />} />
        <Route path="/resources/chatbot" element={<GuidelineChatbot />} />
        <Route path="/resources/property-value" element={<PropertyValue />} />
        <Route path="/resources/income-calculator" element={<IncomeCalculator />} />
        <Route path="/resources/email-marketing/*" element={<EmailMarketing />} />
        <Route path="/resources/condolist" element={<Condolist />} />
        <Route path="/resources/preapproval" element={<PreapprovalLetter />} />
        <Route path="/resources/estimate" element={<LoanEstimate />} />
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