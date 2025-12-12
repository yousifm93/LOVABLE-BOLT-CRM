import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Mail, User, ArrowRight, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QueueItem {
  id: string;
  automation_id: string;
  lead_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: string;
  triggered_by: string | null;
  triggered_at: string;
  automation?: {
    id: string;
    name: string;
    recipient_type: string;
    template_id: string | null;
  };
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  triggered_by_user?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface EmailAutomationQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECIPIENT_LABELS: Record<string, string> = {
  borrower: "Borrower",
  buyer_agent: "Buyer's Agent",
  listing_agent: "Listing Agent",
  title_contact: "Title Contact",
};

const FIELD_LABELS: Record<string, string> = {
  loan_status: "Loan Status",
  disclosure_status: "Disclosure Status",
  cd_status: "CD Status",
  appraisal_status: "Appraisal Status",
  title_status: "Title Status",
  hoi_status: "HOI Status",
  condo_status: "Condo Status",
  package_status: "Package Status",
};

export function EmailAutomationQueueModal({
  open,
  onOpenChange,
}: EmailAutomationQueueModalProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);

  const fetchQueueItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_automation_queue")
        .select(`
          *,
          automation:email_automations(id, name, recipient_type, template_id),
          lead:leads(id, first_name, last_name)
        `)
        .eq("status", "pending")
        .order("triggered_at", { ascending: false });

      if (error) throw error;

      // Fetch triggered_by user info separately
      const userIds = [...new Set((data || []).map(item => item.triggered_by).filter(Boolean))];
      let usersMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, first_name, last_name")
          .in("id", userIds);
        
        usersMap = (users || []).reduce((acc, user) => {
          acc[user.id] = { first_name: user.first_name, last_name: user.last_name };
          return acc;
        }, {} as Record<string, { first_name: string | null; last_name: string | null }>);
      }

      const enrichedData = (data || []).map(item => ({
        ...item,
        triggered_by_user: item.triggered_by ? usersMap[item.triggered_by] : null,
      }));

      setQueueItems(enrichedData);
    } catch (error) {
      console.error("Error fetching queue items:", error);
      toast.error("Failed to load pending emails");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchQueueItems();
    }
  }, [open]);

  const handleApprove = async (item: QueueItem) => {
    setProcessingIds(prev => new Set(prev).add(item.id));
    try {
      // Trigger the email automation
      const { error: invokeError } = await supabase.functions.invoke("trigger-email-automation", {
        body: {
          automationId: item.automation_id,
          leadId: item.lead_id,
          triggerType: "status_changed",
          fieldName: item.field_name,
          fieldValue: item.new_value,
        },
      });

      if (invokeError) throw invokeError;

      // Update queue status
      const { error: updateError } = await supabase
        .from("email_automation_queue")
        .update({ status: "approved", processed_at: new Date().toISOString() })
        .eq("id", item.id);

      if (updateError) throw updateError;

      toast.success("Email sent successfully");
      setQueueItems(prev => prev.filter(q => q.id !== item.id));
    } catch (error) {
      console.error("Error approving email:", error);
      toast.error("Failed to send email");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleDecline = async (item: QueueItem) => {
    setProcessingIds(prev => new Set(prev).add(item.id));
    try {
      const { error } = await supabase
        .from("email_automation_queue")
        .update({ status: "declined", processed_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Email declined");
      setQueueItems(prev => prev.filter(q => q.id !== item.id));
    } catch (error) {
      console.error("Error declining email:", error);
      toast.error("Failed to decline email");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      for (const item of queueItems) {
        await handleApprove(item);
      }
      toast.success("All emails sent successfully");
    } catch (error) {
      console.error("Error approving all:", error);
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Email Confirmations
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            {queueItems.length} email{queueItems.length !== 1 ? "s" : ""} pending approval
          </p>
          {queueItems.length > 0 && (
            <Button
              size="sm"
              onClick={handleApproveAll}
              disabled={approvingAll}
            >
              {approvingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve All
                </>
              )}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queueItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4 opacity-50" />
              <p>No pending emails</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Borrower Name */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {item.lead?.first_name} {item.lead?.last_name}
                        </span>
                      </div>

                      {/* Automation Name */}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Automation: </span>
                        <span className="font-medium">{item.automation?.name}</span>
                      </div>

                      {/* Status Change */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {FIELD_LABELS[item.field_name] || item.field_name}:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.old_value || "—"}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="default" className="text-xs">
                          {item.new_value}
                        </Badge>
                      </div>

                      {/* Recipient */}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Sending to: </span>
                        <Badge variant="secondary" className="text-xs">
                          {RECIPIENT_LABELS[item.automation?.recipient_type || ""] || item.automation?.recipient_type}
                        </Badge>
                      </div>

                      {/* Triggered info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(item.triggered_at), { addSuffix: true })}
                          {item.triggered_by_user && (
                            <> by {item.triggered_by_user.first_name} {item.triggered_by_user.last_name}</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item)}
                        disabled={processingIds.has(item.id)}
                      >
                        {processingIds.has(item.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Send
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(item)}
                        disabled={processingIds.has(item.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Skip
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
