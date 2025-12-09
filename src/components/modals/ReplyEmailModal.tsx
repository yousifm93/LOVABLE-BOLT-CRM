import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface ReplyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalEmail: {
    from_email: string;
    subject: string;
    body?: string;
    html_body?: string;
    lead_id?: string;
    to_email?: string;
  } | null;
  onEmailSent?: () => void;
}

export function ReplyEmailModal({ isOpen, onClose, originalEmail, onEmailSent }: ReplyEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { toast } = useToast();

  // Reset form when modal opens with new email
  useEffect(() => {
    if (isOpen && originalEmail) {
      // Pre-fill subject with Re: prefix if not already there
      const originalSubject = originalEmail.subject || "";
      setSubject(originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`);
      
      // Quote the original email
      const originalContent = originalEmail.html_body || originalEmail.body || "";
      const quotedContent = originalContent 
        ? `<br/><br/><hr/><p><strong>Original message from ${originalEmail.from_email}:</strong></p><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px; color: #666;">${originalContent}</blockquote>`
        : "";
      setBody(quotedContent);
      setCc("");
    }
  }, [isOpen, originalEmail]);

  const handleSend = async () => {
    if (!originalEmail?.from_email) {
      toast({
        title: "Error",
        description: "No recipient email address available.",
        variant: "destructive",
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-direct-email", {
        body: {
          to: originalEmail.from_email,
          subject,
          html: body,
          from_email: "scenarios@mortgagebolt.org",
          from_name: "Mortgage Bolt",
          cc: cc || undefined,
          reply_to: originalEmail.to_email || "yousif@mortgagebolt.org",
        },
      });

      if (error) throw error;

      // Log the outbound email to email_logs
      if (originalEmail.lead_id) {
        const { data: userData } = await supabase.auth.getUser();
        
        await supabase.from("email_logs").insert({
          lead_id: originalEmail.lead_id,
          direction: "Out",
          from_email: "scenarios@mortgagebolt.org",
          to_email: originalEmail.from_email,
          subject,
          body: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
          html_body: body,
          user_id: userData?.user?.id || null,
        });
      }

      toast({
        title: "Email sent",
        description: `Reply sent to ${originalEmail.from_email}`,
      });

      onClose();
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error sending email",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!originalEmail) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reply to Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* To field - disabled, shows original sender */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={originalEmail.from_email}
              disabled
              className="bg-muted"
            />
          </div>

          {/* From field - disabled */}
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              value="scenarios@mortgagebolt.org"
              disabled
              className="bg-muted"
            />
          </div>

          {/* Reply-To field - disabled */}
          <div className="space-y-2">
            <Label htmlFor="reply-to">Reply-To</Label>
            <Input
              id="reply-to"
              value={originalEmail.to_email || "yousif@mortgagebolt.org"}
              disabled
              className="bg-muted"
            />
          </div>

          {/* CC field - editable */}
          <div className="space-y-2">
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              type="email"
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>

          {/* Subject field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message body with rich text editor */}
          <div className="space-y-2">
            <Label>Message</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Type your reply..."
              className="min-h-[200px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Reply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
