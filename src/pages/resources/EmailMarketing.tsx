import { Routes, Route, Navigate } from "react-router-dom";
import EmailCampaigns from "@/pages/resources/email-marketing/EmailCampaigns";
import EmailTemplates from "@/pages/resources/email-marketing/EmailTemplates";
import EmailAudiences from "@/pages/resources/email-marketing/EmailAudiences";
import EmailAnalytics from "@/pages/resources/email-marketing/EmailAnalytics";
import EmailSenders from "@/pages/resources/email-marketing/EmailSenders";
import EmailSettings from "@/pages/resources/email-marketing/EmailSettings";

export default function EmailMarketing() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Email Marketing Hub</h1>
        <p className="text-muted-foreground">Create, send and track email campaigns for MortgageBolt</p>
      </div>
      
      <Routes>
        <Route path="/" element={<Navigate to="campaigns" replace />} />
        <Route path="campaigns" element={<EmailCampaigns />} />
        <Route path="templates" element={<EmailTemplates />} />
        <Route path="audiences" element={<EmailAudiences />} />
        <Route path="analytics" element={<EmailAnalytics />} />
        <Route path="senders" element={<EmailSenders />} />
        <Route path="settings" element={<EmailSettings />} />
      </Routes>
    </div>
  );
}