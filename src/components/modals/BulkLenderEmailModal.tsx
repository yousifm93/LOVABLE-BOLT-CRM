import { useState } from "react";
import { Mail, Loader2, Send, Users, Info } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Lender {
  id: string;
  lender_name: string;
  account_executive?: string;
  account_executive_email?: string;
}

interface BulkLenderEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lenders: Lender[];
}

const MERGE_TAGS = [
  { tag: "{{AccountExecutiveFirstName}}", description: "Account Executive's first name" },
  { tag: "{{AccountExecutiveName}}", description: "Account Executive's full name" },
  { tag: "{{LenderName}}", description: "Lender company name" },
];

export function BulkLenderEmailModal({ isOpen, onClose, lenders }: BulkLenderEmailModalProps) {
  const { toast } = useToast();
  const { user, crmUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("Loan Scenario Inquiry - {{LenderName}}");
  const [body, setBody] = useState(`<p>Hello {{AccountExecutiveFirstName}},</p><p><br></p><p>I wanted to reach out regarding a loan scenario for {{LenderName}}.</p><p><br></p><p>Best regards,<br>${crmUser?.first_name || ''} ${crmUser?.last_name || ''}</p>`);

  const lendersWithEmail = lenders.filter(l => l.account_executive_email);
  const lendersWithoutEmail = lenders.filter(l => !l.account_executive_email);

  const insertMergeTag = (tag: string) => {
    setBody(prev => prev + tag);
  };

  const replaceMergeTags = (text: string, lender: Lender): string => {
    const firstName = lender.account_executive?.split(' ')[0] || 'Team';
    return text
      .replace(/\{\{AccountExecutiveFirstName\}\}/g, firstName)
      .replace(/\{\{AccountExecutiveName\}\}/g, lender.account_executive || 'Team')
      .replace(/\{\{LenderName\}\}/g, lender.lender_name);
  };

  const handleSend = async () => {
    if (lendersWithEmail.length === 0) {
      toast({
        title: "Error",
        description: "No lenders with valid email addresses selected.",
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

      let successCount = 0;
      let errorCount = 0;

      for (const lender of lendersWithEmail) {
        const personalizedSubject = replaceMergeTags(subject, lender);
        const personalizedBody = replaceMergeTags(body, lender);

        try {
          const { error } = await supabase.functions.invoke('send-direct-email', {
            body: {
              to: lender.account_executive_email,
              cc: cc.trim() || undefined,
              subject: personalizedSubject,
              html: personalizedBody,
              from_email: "scenarios@mortgagebolt.org",
              from_name: senderName,
              reply_to: replyToEmail
            }
          });

          if (error) {
            console.error(`Error sending to ${lender.lender_name}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error sending to ${lender.lender_name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Emails Sent",
          description: `Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send emails.",
          variant: "destructive"
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error sending bulk emails:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send emails.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const replyToEmail = crmUser?.email || user?.email || "yousif@mortgagebolt.org";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Send Email to {lenders.length} Lender{lenders.length > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients ({lendersWithEmail.length} with email)</Label>
            <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50 max-h-20 overflow-y-auto">
              {lendersWithEmail.map(lender => (
                <Badge key={lender.id} variant="secondary" className="text-xs">
                  {lender.lender_name}
                </Badge>
              ))}
              {lendersWithoutEmail.map(lender => (
                <Badge key={lender.id} variant="outline" className="text-xs text-muted-foreground">
                  {lender.lender_name} (no email)
                </Badge>
              ))}
            </div>
          </div>

          {/* Merge Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Merge Tags</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to insert into email body</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-wrap gap-2">
              {MERGE_TAGS.map(({ tag, description }) => (
                <TooltipProvider key={tag}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertMergeTag(tag)}
                        className="text-xs"
                      >
                        {tag}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                value="scenarios@mortgagebolt.org"
                disabled
                className="bg-muted"
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
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject (supports merge tags)</Label>
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
              className="min-h-[200px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || lendersWithEmail.length === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {lendersWithEmail.length} Lender{lendersWithEmail.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
