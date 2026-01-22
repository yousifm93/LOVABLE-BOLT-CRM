import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MissingMergeTagsModal } from "@/components/modals/MissingMergeTagsModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SendEmailTemplatesCardProps {
  leadId: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
  show_in_lead_details?: boolean;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  is_assignable: boolean;
}

interface MissingField {
  tag: string;
  label: string;
}

export function SendEmailTemplatesCard({ leadId }: SendEmailTemplatesCardProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [recipients, setRecipients] = useState({
    borrower: false,
    agent: false,
    thirdParty: false
  });
  const [thirdPartyEmail, setThirdPartyEmail] = useState("");
  const [showThirdPartyEmail, setShowThirdPartyEmail] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [borrowerEmail, setBorrowerEmail] = useState<string | null>(null);
  const [agentEmail, setAgentEmail] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const fetchData = async () => {
    // Fetch users - only assignable users from the users table
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .eq("is_assignable", true)
      .eq("is_active", true)
      .order("first_name");
    setUsers(usersData || []);

    // Fetch templates - only those marked to show in lead details
    const { data: templatesData } = await supabase
      .from("email_templates")
      .select("*")
      .neq("show_in_lead_details", false)
      .order("name");
    setTemplates(templatesData || []);

    // Fetch lead data
    const { data: leadData } = await supabase
      .from("leads")
      .select("email, buyer_agent_id")
      .eq("id", leadId)
      .single();

    if (leadData) {
      setBorrowerEmail(leadData.email);
      
      // Fetch agent email if buyer_agent_id exists
      if (leadData.buyer_agent_id) {
        const { data: agentData } = await supabase
          .from("buyer_agents")
          .select("email")
          .eq("id", leadData.buyer_agent_id)
          .single();
        
        setAgentEmail(agentData?.email || null);
      }
    }
  };

  const handleRecipientChange = (recipient: keyof typeof recipients, checked: boolean) => {
    setRecipients(prev => ({
      ...prev,
      [recipient]: checked
    }));
    
    if (recipient === 'thirdParty') {
      setShowThirdPartyEmail(checked);
    }
  };

  const validateMergeTags = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("validate-template-merge-tags", {
        body: {
          leadId,
          templateId: selectedTemplate,
        },
      });

      if (error) {
        console.error("Error validating merge tags:", error);
        return true; // Allow sending if validation fails
      }

      if (!data.valid && data.missingFields?.length > 0) {
        setMissingFields(data.missingFields);
        setShowMissingFieldsModal(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating merge tags:", error);
      return true; // Allow sending if validation fails
    }
  };

  const handleSendEmail = async () => {
    if (!selectedTemplate) {
      toast({ title: "Error", description: "Please select an email template", variant: "destructive" });
      return;
    }

    if (!selectedSender) {
      toast({ title: "Error", description: "Please select a sender", variant: "destructive" });
      return;
    }

    const selectedRecipients = Object.entries(recipients)
      .filter(([_, selected]) => selected)
      .map(([recipient]) => recipient);

    if (selectedRecipients.length === 0) {
      toast({ title: "Error", description: "Please select at least one recipient", variant: "destructive" });
      return;
    }

    // Validate recipient emails
    if (recipients.borrower && !borrowerEmail) {
      toast({ title: "Error", description: "Borrower email not found", variant: "destructive" });
      return;
    }

    if (recipients.agent && !agentEmail) {
      toast({ title: "Error", description: "Agent email not found", variant: "destructive" });
      return;
    }

    if (recipients.thirdParty && !thirdPartyEmail.trim()) {
      toast({ title: "Error", description: "Please enter third party email", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Validate merge tags before sending
    const isValid = await validateMergeTags();
    if (!isValid) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-template-email", {
        body: {
          leadId,
          templateId: selectedTemplate,
          senderId: selectedSender,
          recipients: {
            borrower: recipients.borrower,
            agent: recipients.agent,
            thirdParty: recipients.thirdParty ? thirdPartyEmail : "",
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Success", description: "Email sent successfully" });
        // Reset form
        setSelectedTemplate("");
        setRecipients({ borrower: false, agent: false, thirdParty: false });
        setThirdPartyEmail("");
        setShowThirdPartyEmail(false);
      } else {
        throw new Error(data?.error || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send email", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-2 flex-shrink-0">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full text-left">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send Email Templates
              </CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <Label htmlFor="from-sender" className="text-sm font-medium">
              From
            </Label>
            <Select value={selectedSender} onValueChange={setSelectedSender}>
              <SelectTrigger id="from-sender" className="mt-1">
                <SelectValue placeholder="Select sender" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
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
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
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
                  disabled={!borrowerEmail}
                />
                <Label htmlFor="borrower" className="text-sm">
                  Borrower
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agent"
                  checked={recipients.agent}
                  onCheckedChange={(checked) => handleRecipientChange("agent", checked as boolean)}
                  disabled={!agentEmail}
                />
                <Label htmlFor="agent" className="text-sm">
                  BA
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="third-party"
                  checked={recipients.thirdParty}
                  onCheckedChange={(checked) => handleRecipientChange("thirdParty", checked as boolean)}
                />
                <Label htmlFor="third-party" className="text-sm">3rd</Label>
              </div>
            </div>
            
            {showThirdPartyEmail && (
              <div className="mt-2">
                <Input
                  placeholder="Enter third party email address"
                  value={thirdPartyEmail}
                  onChange={(e) => setThirdPartyEmail(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>

              <Button onClick={handleSendEmail} className="w-full mt-6" disabled={loading}>
                {loading ? "Sending..." : "Send Email"}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <MissingMergeTagsModal
        open={showMissingFieldsModal}
        onOpenChange={setShowMissingFieldsModal}
        missingFields={missingFields}
      />
    </>
  );
}
