import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDateShort } from "@/utils/formatters";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  lead_on_date?: string;
  app_complete_at?: string | null;
  pipeline_stage_id?: string;
  assigned_user_id?: string | null;
}

const STAGE_ID_TO_NAME: Record<string, string> = {
  'c54f417b-3f67-43de-80f5-954cf260d571': 'Leads',
  '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': 'Pending App',
  'a4e162e0-5421-4d17-8ad5-4b1195bbc995': 'Screening',
  '09162eec-d2b2-48e5-86d0-9e66ee8b2af7': 'Pre-Qualified',
  '3cbf38ff-752e-4163-a9a3-1757499b4945': 'Pre-Approved',
  '76eb2e82-e1d9-4f2d-a57d-2120a25696db': 'Active',
  'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd': 'Past Clients'
};

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  face_to_face_meeting?: string | null;
  last_agent_call?: string | null;
  notes?: string | null;
  meeting_summary?: string | null;
}

interface Email {
  id: string;
  lead_id: string;
  direction: 'In' | 'Out';
  from_email: string;
  to_email: string;
  subject: string;
  snippet?: string | null;
  timestamp: string;
  delivery_status?: string | null;
  ai_summary?: string | null;
  lead?: {
    first_name: string;
    last_name: string;
  };
}

interface EmailSuggestion {
  id: string;
  email_log_id: string;
  field_name: string;
  field_display_name: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
  status: string;
}

interface DashboardDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Lead[] | Agent[] | Email[];
  type: "leads" | "applications" | "meetings" | "calls" | "emails";
  onLeadClick?: (leadId: string) => void;
}

export function DashboardDetailModal({
  open,
  onOpenChange,
  title,
  data,
  type,
  onLeadClick,
}: DashboardDetailModalProps) {
  const [emailSuggestions, setEmailSuggestions] = useState<Record<string, EmailSuggestion[]>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Fetch suggestions for emails
  useEffect(() => {
    if (type === 'emails' && open && data.length > 0) {
      const fetchSuggestions = async () => {
        const emailIds = (data as Email[]).map(e => e.id);
        const { data: suggestions } = await supabase
          .from('email_field_suggestions')
          .select('*')
          .in('email_log_id', emailIds)
          .eq('status', 'pending');

        if (suggestions) {
          const grouped = suggestions.reduce((acc, s) => {
            if (!acc[s.email_log_id]) acc[s.email_log_id] = [];
            acc[s.email_log_id].push(s);
            return acc;
          }, {} as Record<string, EmailSuggestion[]>);
          setEmailSuggestions(grouped);
        }
      };
      fetchSuggestions();
    }
  }, [type, open, data]);

  const handleApproveSuggestion = async (suggestion: EmailSuggestion, leadId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    try {
      await supabase
        .from('leads')
        .update({ [suggestion.field_name]: suggestion.suggested_value })
        .eq('id', leadId);

      await supabase
        .from('email_field_suggestions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      setEmailSuggestions(prev => ({
        ...prev,
        [suggestion.email_log_id]: prev[suggestion.email_log_id]?.filter(s => s.id !== suggestion.id) || [],
      }));
      toast.success(`Updated ${suggestion.field_display_name}`);
    } catch (error) {
      toast.error('Failed to approve suggestion');
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
  };

  const handleDenySuggestion = async (suggestion: EmailSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    try {
      await supabase
        .from('email_field_suggestions')
        .update({ status: 'denied', reviewed_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      setEmailSuggestions(prev => ({
        ...prev,
        [suggestion.email_log_id]: prev[suggestion.email_log_id]?.filter(s => s.id !== suggestion.id) || [],
      }));
      toast.success('Suggestion denied');
    } catch (error) {
      toast.error('Failed to deny suggestion');
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
  };

  const renderDate = (item: Lead | Agent | Email) => {
    if (type === "leads" && "lead_on_date" in item) {
      return item.lead_on_date ? formatDateShort(item.lead_on_date) : "—";
    }
    if (type === "applications" && "app_complete_at" in item) {
      return item.app_complete_at ? new Date(item.app_complete_at).toLocaleDateString() : "—";
    }
    if (type === "meetings" && "face_to_face_meeting" in item) {
      return item.face_to_face_meeting ? new Date(item.face_to_face_meeting).toLocaleDateString() : "—";
    }
    if (type === "calls" && "last_agent_call" in item) {
      return item.last_agent_call ? new Date(item.last_agent_call).toLocaleDateString() : "—";
    }
    if (type === "emails" && "timestamp" in item) {
      return item.timestamp ? new Date(item.timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
      }) : "—";
    }
    return "—";
  };

  const getDateColumnTitle = () => {
    switch (type) {
      case "leads":
        return "Lead On Date";
      case "applications":
        return "Application Date";
      case "meetings":
        return "Meeting Date";
      case "calls":
        return "Call Date";
      case "emails":
        return "Email Date";
      default:
        return "Date";
    }
  };

  const getThirdColumnTitle = () => {
    if (type === "emails") return "Direction";
    return (type === "meetings" || type === "calls") ? "Notes" : "Current Stage";
  };

  const getFourthColumnTitle = () => {
    if (type === "emails") return "AI Summary";
    return null;
  };

  const getFifthColumnTitle = () => {
    if (type === "emails") return "Subject";
    return null;
  };

  const getName = (item: Lead | Agent | Email) => {
    if (type === "emails" && "lead" in item && item.lead) {
      return `${item.lead.first_name || ''} ${item.lead.last_name || ''}`.trim() || "Unknown";
    }
    if ("first_name" in item) {
      return `${item.first_name} ${item.last_name}`;
    }
    return "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title} ({data.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Name</TableHead>
                  <TableHead className="min-w-[130px]">{getDateColumnTitle()}</TableHead>
                  <TableHead className="min-w-[100px]">{getThirdColumnTitle()}</TableHead>
                  {getFourthColumnTitle() && <TableHead className="min-w-[250px]">{getFourthColumnTitle()}</TableHead>}
                  {getFifthColumnTitle() && <TableHead className="min-w-[200px]">{getFifthColumnTitle()}</TableHead>}
                  {type === "emails" && <TableHead className="min-w-[300px]">CRM Update</TableHead>}
                </TableRow>
              </TableHeader>
            <TableBody>
              {data.map((item) => {
                const emailId = type === "emails" ? (item as Email).id : null;
                const suggestions = emailId ? emailSuggestions[emailId] || [] : [];
                const leadId = type === "emails" ? (item as Email).lead_id : null;

                return (
                  <TableRow key={item.id}>
                    <TableCell 
                      className={`font-medium ${type === "emails" && "lead_id" in item ? "cursor-pointer hover:text-primary hover:underline" : ('pipeline_stage_id' in item && onLeadClick ? "cursor-pointer hover:text-primary hover:underline" : "")}`}
                      onClick={() => {
                        if (type === "emails" && "lead_id" in item && onLeadClick) {
                          onLeadClick(item.lead_id);
                        } else if ('pipeline_stage_id' in item && onLeadClick) {
                          onLeadClick(item.id);
                        }
                      }}
                    >
                      {getName(item)}
                    </TableCell>
                    <TableCell>{renderDate(item)}</TableCell>
                    <TableCell>
                      {type === "emails" && "direction" in item ? (
                        <Badge variant={item.direction === 'Out' ? 'default' : 'secondary'}>
                          {item.direction === 'Out' ? 'Sent' : 'Received'}
                        </Badge>
                      ) : 'pipeline_stage_id' in item ? (
                        <Badge variant="secondary">
                          {STAGE_ID_TO_NAME[item.pipeline_stage_id || ''] || "Unknown"}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {('meeting_summary' in item && item.meeting_summary) || ('notes' in item && item.notes) || "—"}
                        </span>
                      )}
                    </TableCell>
                    {type === "emails" && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {(item as Email).ai_summary || "—"}
                        </span>
                      </TableCell>
                    )}
                    {type === "emails" && "subject" in item && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {item.subject || "—"}
                        </span>
                      </TableCell>
                    )}
                    {type === "emails" && (
                      <TableCell>
                        {suggestions.length > 0 ? (
                          <div className="space-y-2">
                            {suggestions.map((suggestion) => (
                              <div key={suggestion.id} className="flex items-center gap-2 text-xs">
                                <div className="flex-1 flex items-center gap-1">
                                  <span className="font-medium">{suggestion.field_display_name}:</span>
                                  <span className="text-muted-foreground">{suggestion.current_value || 'Empty'}</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span className="text-primary font-medium">{suggestion.suggested_value}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDenySuggestion(suggestion)}
                                    disabled={processingIds.has(suggestion.id)}
                                  >
                                    {processingIds.has(suggestion.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-green-600 hover:bg-green-600/10"
                                    onClick={() => leadId && handleApproveSuggestion(suggestion, leadId)}
                                    disabled={processingIds.has(suggestion.id)}
                                  >
                                    {processingIds.has(suggestion.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
