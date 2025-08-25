import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
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
import YousifTasks from "@/pages/tasks/YousifTasks";
import SalmaTasks from "@/pages/tasks/SalmaTasks";
import HermanTasks from "@/pages/tasks/HermanTasks";
import GuidelineChatbot from "@/pages/resources/GuidelineChatbot";
import Condolist from "@/pages/resources/Condolist";
import PreapprovalLetter from "@/pages/resources/PreapprovalLetter";
import LoanEstimate from "@/pages/resources/LoanEstimate";
import Marketing from "@/pages/resources/Marketing";
import "./App.css";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardTabs />} />
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
          <Route path="/tasks/yousif" element={<YousifTasks />} />
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
    </Router>
  );
}

export default App;