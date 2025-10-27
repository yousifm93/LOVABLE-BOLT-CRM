import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

interface SendEmailTemplatesCardProps {
  leadId: string;
}

export function SendEmailTemplatesCard({ leadId }: SendEmailTemplatesCardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [recipients, setRecipients] = useState({
    borrower: false,
    agent: false,
    thirdParty: false
  });
  const [emails, setEmails] = useState({
    borrower: "",
    agent: "",
    thirdParty: ""
  });
  const [showThirdPartyEmail, setShowThirdPartyEmail] = useState(false);

  const emailTemplates = [
    "Appraisal Received",
    "Appraisal Scheduled", 
    "Following Up",
    "Document Request",
    "Loan Update"
  ];

  const senders = [
    "Yusuf Mohammed",
    "Salam Mohammed", 
    "Herman Daza"
  ];

  const handleRecipientChange = (recipient: keyof typeof recipients, checked: boolean) => {
    setRecipients(prev => ({
      ...prev,
      [recipient]: checked
    }));
    
    if (recipient === 'thirdParty') {
      setShowThirdPartyEmail(checked);
    }
  };

  const handleEmailChange = (recipient: keyof typeof emails, email: string) => {
    setEmails(prev => ({
      ...prev,
      [recipient]: email
    }));
  };

  const handleSendEmail = () => {
    if (!selectedTemplate) {
      alert("Please select an email template");
      return;
    }

    const selectedRecipients = Object.entries(recipients)
      .filter(([_, selected]) => selected)
      .map(([recipient]) => recipient);

    if (selectedRecipients.length === 0) {
      alert("Please select at least one recipient");
      return;
    }

    // TODO: Implement email sending logic
    console.log("Sending email:", {
      template: selectedTemplate,
      recipients: selectedRecipients,
      emails
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Send Email Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="from-sender" className="text-sm font-medium">
            From
          </Label>
          <Select value={selectedSender} onValueChange={setSelectedSender}>
            <SelectTrigger id="from-sender" className="mt-1">
              <SelectValue placeholder="Select sender" />
            </SelectTrigger>
            <SelectContent>
              {senders.map((sender) => (
                <SelectItem key={sender} value={sender}>
                  {sender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="email-template" className="text-sm font-medium">
            Email Template
          </Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger id="email-template" className="mt-1">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {emailTemplates.map((template) => (
                <SelectItem key={template} value={template}>
                  {template}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Recipients</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="borrower"
                checked={recipients.borrower}
                onCheckedChange={(checked) => handleRecipientChange("borrower", checked as boolean)}
              />
              <Label htmlFor="borrower" className="text-sm">Borrower</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="agent"
                checked={recipients.agent}
                onCheckedChange={(checked) => handleRecipientChange("agent", checked as boolean)}
              />
              <Label htmlFor="agent" className="text-sm">Agent</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="third-party"
                checked={recipients.thirdParty}
                onCheckedChange={(checked) => handleRecipientChange("thirdParty", checked as boolean)}
              />
              <Label htmlFor="third-party" className="text-sm">Third Party</Label>
            </div>
          </div>
          
          {showThirdPartyEmail && (
            <div className="mt-2">
              <Input
                placeholder="Enter third party email address"
                value={emails.thirdParty}
                onChange={(e) => handleEmailChange("thirdParty", e.target.value)}
                className="w-full"
              />
            </div>
          )}
        </div>

        <Button onClick={handleSendEmail} className="w-full mt-6">
          Send Email
        </Button>
      </CardContent>
    </Card>
  );
}