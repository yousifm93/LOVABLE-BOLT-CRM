import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Home from "@/pages/Home";
import DashboardTabs from "@/pages/DashboardTabs";
import Leads from "@/pages/Leads";
import PendingApp from "@/pages/PendingApp";
import Screening from "@/pages/Screening";
import PreQualified from "@/pages/PreQualified";
import PreApproved from "@/pages/PreApproved";
import Active from "@/pages/Active";
import PastClients from "@/pages/PastClients";
import Idle from "@/pages/Idle";
import Admin from "@/pages/Admin";
import AdminAssistant from "@/pages/AdminAssistant";
import MortgageAppAdmin from "@/pages/admin/MortgageAppAdmin";
import MortgageApplication from "@/pages/MortgageApplication";
import BorrowerAuth from "@/pages/BorrowerAuth";
import EmailVerified from "@/pages/EmailVerified";
import NotFound from "@/pages/NotFound";
import AgentListWrapper from "@/pages/contacts/AgentListWrapper";
import BorrowerList from "@/pages/contacts/BorrowerList";
import ApprovedLenders from "@/pages/contacts/ApprovedLenders";
import TasksModern from "@/pages/TasksModern";
import DeletedItemsAdmin from "@/pages/admin/DeletedItemsAdmin";
import PropertyValue from "./pages/resources/PropertyValue";
import PropertyValuePublic from "./pages/resources/PropertyValuePublic";
import GuidelineChatbot from "@/pages/resources/GuidelineChatbot";
import ChatbaseBoltBot from "@/pages/resources/ChatbaseBoltBot";
import IncomeCalculator from "@/pages/resources/IncomeCalculator";
import { LoanPricer } from "@/pages/resources/LoanPricer";
import Condolist from "@/pages/resources/Condolist";
import ImportCondos from "@/pages/resources/ImportCondos";
import CondoSearch from "@/pages/resources/CondoSearch";
import Letter from "@/pages/Letter";
import LoanEstimate from "@/pages/resources/LoanEstimate";
import Email from "@/pages/Email";
import EmailMarketing from "@/pages/resources/EmailMarketing";
import EmailHistory from "@/pages/admin/EmailHistory";
import Feedback from "@/pages/Feedback";
import FeedbackReview from "@/pages/admin/FeedbackReview";
import UpdatePassword from "@/pages/UpdatePassword";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import "./App.css";

// Default landing redirect component
function DefaultLandingRedirect() {
  const { permissions, loading } = usePermissions();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Check if user has a custom default landing page
  const landingPage = permissions?.default_landing_page;
  if (landingPage && landingPage !== '/') {
    return <Navigate to={landingPage} replace />;
  }
  
  // If home is hidden, redirect to their landing page or active
  if (permissions?.home === 'hidden') {
    return <Navigate to={landingPage || '/active'} replace />;
  }
  
  return <Home />;
}

// Protected route component
function ProtectedRoute({
  children
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    loading
  } = useAuth();
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
  const {
    user,
    loading
  } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES - Always outside Layout */}
      <Route path="/apply/auth" element={<BorrowerAuth />} />
      <Route path="/apply/verified" element={<EmailVerified />} />
      <Route path="/apply" element={<MortgageApplication />} />
      <Route path="/home-value" element={<PropertyValuePublic />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      
      {/* AUTH ROUTE */}
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      
      {/* PROTECTED CRM ROUTES - Inside Layout */}
      {user ? (
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<DefaultLandingRedirect />} />
              <Route path="/dashboard" element={<DashboardTabs />} />
              <Route path="/email" element={<Email />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/pending-app" element={<PendingApp />} />
              <Route path="/screening" element={<Screening />} />
              <Route path="/pre-qualified" element={<PreQualified />} />
              <Route path="/pre-approved" element={<PreApproved />} />
              <Route path="/active" element={<Active />} />
              <Route path="/past-clients" element={<PastClients />} />
              <Route path="/idle" element={<Idle />} />
              <Route path="/admin/assistant" element={<AdminAssistant />} />
              <Route path="/admin/mortgage-app" element={<MortgageAppAdmin />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/email-history" element={<EmailHistory />} />
              <Route path="/contacts/agents" element={<AgentListWrapper />} />
              <Route path="/contacts/borrowers" element={<BorrowerList />} />
              <Route path="/contacts/lenders" element={<ApprovedLenders />} />
              <Route path="/tasks" element={<TasksModern />} />
              <Route path="/admin/deleted-tasks" element={<DeletedItemsAdmin />} />
              <Route path="/resources/loan-pricer" element={<LoanPricer />} />
              <Route path="/resources/chatbot" element={<ChatbaseBoltBot />} />
              <Route path="/admin/backup-chat" element={<GuidelineChatbot />} />
              <Route path="/resources/property-value" element={<PropertyValue />} />
              <Route path="/resources/income-calculator" element={<IncomeCalculator />} />
              <Route path="/resources/email-marketing/*" element={<EmailMarketing />} />
              <Route path="/resources/condolist" element={<Condolist />} />
              <Route path="/resources/import-condos" element={<ImportCondos />} />
              <Route path="/resources/condo-search" element={<CondoSearch />} />
              <Route path="/resources/preapproval" element={<Letter />} />
              <Route path="/resources/estimate" element={<LoanEstimate />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/admin/feedback-review" element={<FeedbackReview />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        } />
      ) : (
        <Route path="/*" element={<Navigate to="/auth" replace />} />
      )}
    </Routes>
  );
}
function App() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </Router>
  );
}
export default App;