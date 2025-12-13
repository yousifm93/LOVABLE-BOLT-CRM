import { useState, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendAgentEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentEmail: string;
  agentName: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
}

export function SendAgentEmailModal({ 
  isOpen, 
  onClose, 
  agentEmail, 
  agentName 
}: SendAgentEmailModalProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setSelectedTemplate(template || null);
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, html')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || !agentEmail) {
      toast({
        title: "Error",
        description: "Please select a template and ensure agent has an email",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const emailSubject = `Message for ${agentName}`;
      const { error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: agentEmail,
          subject: emailSubject,
          html: selectedTemplate.html.replace(/\{\{AgentName\}\}/g, agentName),
          from: 'yousif@mortgagebolt.org',
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Email sent to ${agentName}`,
      });
      
      onClose();
      setSelectedTemplateId("");
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Email to {agentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Email Template
            </label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading templates..." : "Choose a template"} />
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

          {selectedTemplate && (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  To
                </label>
                <p className="text-sm bg-muted px-3 py-2 rounded-md">{agentEmail}</p>
              </div>

              <div className="flex-1 overflow-hidden">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Preview
                </label>
                <div 
                  className="bg-muted rounded-md p-4 overflow-y-auto max-h-[300px] text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedTemplate.html.replace(/\{\{AgentName\}\}/g, agentName) 
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!selectedTemplate || isSending || !agentEmail}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}