import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDateShort } from "@/utils/formatters";
import { Check, X, ArrowRight, Loader2, RefreshCw } from "lucide-react";
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
  body?: string | null;
  html_body?: string | null;
  timestamp: string;
  delivery_status?: string | null;
  ai_summary?: string | null;
  user_notes?: string | null;
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
  confidence?: number | null;
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
  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());

  // Fetch suggestions for emails - include all statuses for logging
  useEffect(() => {
    if (type === 'emails' && open && data.length > 0) {
      const fetchSuggestions = async () => {
        const emailIds = (data as Email[]).map(e => e.id);
        const { data: suggestions } = await supabase
          .from('email_field_suggestions')
          .select('*')
          .in('email_log_id', emailIds);

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

      // Update local state to reflect approved status instead of removing
      setEmailSuggestions(prev => ({
        ...prev,
        [suggestion.email_log_id]: prev[suggestion.email_log_id]?.map(s => 
          s.id === suggestion.id ? { ...s, status: 'approved' } : s
        ) || [],
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

      // Update local state to reflect denied status instead of removing
      setEmailSuggestions(prev => ({
        ...prev,
        [suggestion.email_log_id]: prev[suggestion.email_log_id]?.map(s => 
          s.id === suggestion.id ? { ...s, status: 'denied' } : s
        ) || [],
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

  const handleRerunParsing = async (email: Email) => {
    setRerunningIds(prev => new Set(prev).add(email.id));
    try {
      // Get current lead data
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', email.lead_id)
        .single();

      // Call parse-email-field-updates
      const { data: parseResult, error } = await supabase.functions.invoke('parse-email-field-updates', {
        body: {
          subject: email.subject,
          body: email.body || email.snippet,
          htmlBody: email.html_body,
          leadId: email.lead_id,
          currentLeadData: leadData
        }
      });

      if (error) {
        throw error;
      }

      if (parseResult?.suggestions?.length > 0) {
        // Delete old pending suggestions for this email
        await supabase
          .from('email_field_suggestions')
          .delete()
          .eq('email_log_id', email.id)
          .eq('status', 'pending');

        // Insert new suggestions
        for (const s of parseResult.suggestions) {
          await supabase.from('email_field_suggestions').insert({
            email_log_id: email.id,
            lead_id: email.lead_id,
            field_name: s.field_name,
            field_display_name: s.field_display_name,
            current_value: leadData?.[s.field_name] || null,
            suggested_value: s.suggested_value,
            reason: s.reason,
            confidence: s.confidence,
            status: 'pending'
          });
        }

        // Refresh suggestions for this email
        const { data: newSuggestions } = await supabase
          .from('email_field_suggestions')
          .select('*')
          .eq('email_log_id', email.id);

        if (newSuggestions) {
          setEmailSuggestions(prev => ({
            ...prev,
            [email.id]: newSuggestions,
          }));
        }

        toast.success(`Found ${parseResult.suggestions.length} new suggestion(s)`);
      } else {
        toast.info('No new suggestions found');
      }
    } catch (error) {
      console.error('Error rerunning parsing:', error);
      toast.error('Failed to rerun parsing');
    }
    setRerunningIds(prev => {
      const next = new Set(prev);
      next.delete(email.id);
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
        return "Date";
      default:
        return "Date";
    }
  };

  const getThirdColumnTitle = () => {
    if (type === "emails") return "Dir";
    return (type === "meetings" || type === "calls") ? "Notes" : "Current Stage";
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
      <DialogContent className="max-w-[98vw] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">{title} ({data.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] w-full">
          <div className="min-w-[1200px]">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="text-[11px]">
                  <TableHead className="w-[90px] py-2">Name</TableHead>
                  <TableHead className="w-[85px] py-2">{getDateColumnTitle()}</TableHead>
                  <TableHead className="w-[50px] py-2">{getThirdColumnTitle()}</TableHead>
                  {type === "emails" && <TableHead className="w-[45px] py-2 text-center">Conf</TableHead>}
                  {type === "emails" && <TableHead className="w-[45px] py-2 text-center">Rerun</TableHead>}
                  {type === "emails" && <TableHead className="w-[200px] py-2">CRM Update</TableHead>}
                  {type === "emails" && <TableHead className="w-[180px] py-2">AI Summary</TableHead>}
                  {type === "emails" && <TableHead className="w-[140px] py-2">Subject</TableHead>}
                  {type === "emails" && <TableHead className="w-[160px] py-2">Explanation</TableHead>}
                  {type === "emails" && <TableHead className="w-[120px] py-2">Notes</TableHead>}
                  {type !== "emails" && (type === "meetings" || type === "calls") && <TableHead>Notes</TableHead>}
                  {type !== "emails" && type !== "meetings" && type !== "calls" && <TableHead>Current Stage</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const emailId = type === "emails" ? (item as Email).id : null;
                  const suggestions = emailId ? emailSuggestions[emailId] || [] : [];
                  const leadId = type === "emails" ? (item as Email).lead_id : null;

                  return (
                    <TableRow key={item.id} className="text-xs">
                      <TableCell 
                        className={`py-1.5 font-medium text-xs ${type === "emails" && "lead_id" in item ? "cursor-pointer hover:text-primary hover:underline" : ('pipeline_stage_id' in item && onLeadClick ? "cursor-pointer hover:text-primary hover:underline" : "")}`}
                        onClick={() => {
                          if (type === "emails" && "lead_id" in item && onLeadClick) {
                            onLeadClick(item.lead_id);
                          } else if ('pipeline_stage_id' in item && onLeadClick) {
                            onLeadClick(item.id);
                          }
                        }}
                      >
                        <span className="line-clamp-1">{getName(item)}</span>
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] text-muted-foreground">{renderDate(item)}</TableCell>
                      <TableCell className="py-1.5">
                        {type === "emails" && "direction" in item ? (
                          <Badge variant={item.direction === 'Out' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                            {item.direction === 'Out' ? 'Out' : 'In'}
                          </Badge>
                        ) : 'pipeline_stage_id' in item ? (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {STAGE_ID_TO_NAME[item.pipeline_stage_id || ''] || "Unknown"}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground line-clamp-2">
                            {('meeting_summary' in item && item.meeting_summary) || ('notes' in item && item.notes) || "—"}
                          </span>
                        )}
                      </TableCell>
                      {type === "emails" && (
                        <TableCell className="py-1.5 text-center">
                          {suggestions.length > 0 ? (
                            <span className="text-[11px] font-semibold">
                              {Math.round((suggestions[0].confidence || 0.75) * 100)}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {type === "emails" && (
                        <TableCell className="py-1.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleRerunParsing(item as Email)}
                            disabled={rerunningIds.has((item as Email).id)}
                            title="Rerun AI parsing"
                          >
                            {rerunningIds.has((item as Email).id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                      {type === "emails" && (
                        <TableCell className="py-1.5">
                          {rerunningIds.has((item as Email).id) ? (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Processing...</span>
                            </div>
                          ) : suggestions.length > 0 ? (
                            <div className="space-y-1">
                              {suggestions.map((suggestion) => (
                                <div key={suggestion.id} className="flex items-center gap-1 text-[11px]">
                                  <div className="flex-1 flex items-center gap-0.5 min-w-0">
                                    <span className="font-medium truncate">{suggestion.field_display_name}:</span>
                                    <span className="text-muted-foreground truncate">{suggestion.current_value || '∅'}</span>
                                    <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="text-primary font-medium truncate">{suggestion.suggested_value}</span>
                                  </div>
                                  {suggestion.status === 'pending' ? (
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDenySuggestion(suggestion)}
                                        disabled={processingIds.has(suggestion.id)}
                                      >
                                        {processingIds.has(suggestion.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0 text-green-600 hover:bg-green-600/10"
                                        onClick={() => leadId && handleApproveSuggestion(suggestion, leadId)}
                                        disabled={processingIds.has(suggestion.id)}
                                      >
                                        {processingIds.has(suggestion.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                                      </Button>
                                    </div>
                                  ) : (
                                    <Badge 
                                      variant={suggestion.status === 'approved' ? 'default' : 'secondary'}
                                      className={suggestion.status === 'approved' 
                                        ? 'bg-green-600 hover:bg-green-600 text-white text-[9px] px-1 py-0' 
                                        : 'bg-muted text-muted-foreground text-[9px] px-1 py-0'}
                                    >
                                      {suggestion.status === 'approved' ? '✓' : '✗'}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {type === "emails" && (
                        <TableCell className="py-1.5">
                          {rerunningIds.has((item as Email).id) ? (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Reanalyzing...</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground line-clamp-3">
                              {(item as Email).ai_summary || "—"}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {type === "emails" && "subject" in item && (
                        <TableCell className="py-1.5">
                          <span className="text-[11px] text-muted-foreground line-clamp-2">
                            {item.subject || "—"}
                          </span>
                        </TableCell>
                      )}
                      {type === "emails" && (
                        <TableCell className="py-1.5">
                          {rerunningIds.has((item as Email).id) ? (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Processing...</span>
                            </div>
                          ) : suggestions.length > 0 ? (
                            <div className="space-y-0.5">
                              {suggestions.map((suggestion) => (
                                <p key={suggestion.id} className="text-[10px] text-muted-foreground line-clamp-3">
                                  {suggestion.reason || "—"}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {type === "emails" && (
                        <TableCell className="py-1.5">
                          <textarea
                            className="w-full min-h-[36px] p-1 text-[10px] border rounded resize-none bg-background"
                            placeholder="Notes..."
                            rows={2}
                            defaultValue={(item as Email).user_notes || ''}
                            onBlur={async (e) => {
                              const newNotes = e.target.value;
                              if (newNotes !== ((item as Email).user_notes || '')) {
                                try {
                                  await supabase
                                    .from('email_logs')
                                    .update({ user_notes: newNotes })
                                    .eq('id', (item as Email).id);
                                  toast.success('Notes saved');
                                } catch (error) {
                                  toast.error('Failed to save notes');
                                }
                              }
                            }}
                          />
                        </TableCell>
                      )}
                      {type !== "emails" && (type === "meetings" || type === "calls") && (
                        <TableCell className="py-1.5">
                          <span className="text-[11px] text-muted-foreground line-clamp-2">
                            {('meeting_summary' in item && item.meeting_summary) || ('notes' in item && item.notes) || "—"}
                          </span>
                        </TableCell>
                      )}
                      {type !== "emails" && type !== "meetings" && type !== "calls" && (
                        <TableCell className="py-1.5">
                          {'pipeline_stage_id' in item ? (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {STAGE_ID_TO_NAME[item.pipeline_stage_id || ''] || "Unknown"}
                            </Badge>
                          ) : "—"}
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