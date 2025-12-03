import { useState } from "react";
import { Mail, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Lender {
  id: string;
  lender_name: string;
  account_executive?: string;
  account_executive_email?: string;
}

interface SendLenderEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lender: Lender | null;
}

export function SendLenderEmailModal({ isOpen, onClose, lender }: SendLenderEmailModalProps) {
  const { toast } = useToast();
  const { user, crmUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Reset form when modal opens with new lender
  const handleOpenChange = (open: boolean) => {
    if (open && lender) {
      setSubject(`Inquiry - ${lender.lender_name}`);
      setBody(`Hello ${lender.account_executive || 'Team'},\n\nI wanted to reach out regarding potential loan opportunities.\n\nBest regards,\n${crmUser?.first_name || ''} ${crmUser?.last_name || ''}`);
      setCc("");
    }
    if (!open) {
      onClose();
    }
  };

  const handleSend = async () => {
    if (!lender?.account_executive_email) {
      toast({
        title: "Error",
        description: "No email address available for this lender.",
        variant: "destructive"
      });
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the subject and body.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      const senderEmail = crmUser?.email || user?.email || "yousif@mortgagebolt.org";
      const senderName = crmUser ? `${crmUser.first_name} ${crmUser.last_name}` : "Mortgage Bolt";

      const { error } = await supabase.functions.invoke('send-template-email', {
        body: {
          to: lender.account_executive_email,
          cc: cc.trim() || undefined,
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
          from_email: senderEmail,
          from_name: senderName,
          reply_to: senderEmail
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Email sent to ${lender.account_executive_email}`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!lender) return null;

  const fromEmail = crmUser?.email || user?.email || "yousif@mortgagebolt.org";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {lender.lender_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={lender.account_executive_email || "No email available"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                value={fromEmail}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              rows={10}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !lender.account_executive_email}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
