import { useState, useEffect } from "react";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
  onEmailSent?: () => void;
}

export function SendLenderEmailModal({ isOpen, onClose, lender, onEmailSent }: SendLenderEmailModalProps) {
  const { toast } = useToast();
  const { user, crmUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [userSignature, setUserSignature] = useState<string | null>(null);

  // Fetch user's email signature
  useEffect(() => {
    if (crmUser?.id) {
      supabase.from('users')
        .select('email_signature')
        .eq('id', crmUser.id)
        .single()
        .then(({ data }) => setUserSignature(data?.email_signature || null));
    }
  }, [crmUser?.id]);

  // Reset form when modal opens with new lender
  useEffect(() => {
    if (isOpen && lender) {
      setSubject(`Inquiry - ${lender.lender_name}`);
      setBody(`<p>Hello ${lender.account_executive || 'Team'},</p><p><br></p><p>I wanted to reach out regarding potential loan opportunities.</p><p><br></p><p>Best,</p>`);
      setCc("");
    }
  }, [isOpen, lender]);

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
      const senderName = crmUser ? `${crmUser.first_name} ${crmUser.last_name}` : "Mortgage Bolt";
      const replyToEmail = crmUser?.email || user?.email || "yousif@mortgagebolt.org";
      
      // Append email signature if available
      let emailBody = body;
      if (userSignature) {
        emailBody = `${body}<br>${userSignature}`;
      }

      const { error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: lender.account_executive_email,
          cc: cc.trim() || undefined,
          subject: subject,
          html: emailBody,
          from_email: "scenarios@mortgagebolt.org",
          from_name: senderName,
          reply_to: replyToEmail,
          lender_id: lender.id // Pass lender_id for automated tracking
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Email sent to ${lender.account_executive_email}`,
      });

      // Trigger callback to refresh lenders list
      onEmailSent?.();
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

  const replyToEmail = crmUser?.email || user?.email || "yousif@mortgagebolt.org";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
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
                value="scenarios@mortgagebolt.org"
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="reply-to">Reply-To</Label>
              <Input
                id="reply-to"
                value={replyToEmail}
                disabled
                className="bg-muted"
              />
            </div>
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
            <Label>Message</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Type your message..."
              className="min-h-[350px]"
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
