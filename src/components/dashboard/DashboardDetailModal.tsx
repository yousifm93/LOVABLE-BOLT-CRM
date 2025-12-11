import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface EmailResponseSuggestion {
  id: string;
  email_log_id: string;
  lead_id: string;
  needs_response: boolean;
  reason: string | null;
  urgency: string | null;
  confidence: number | null;
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
  const [responseSuggestions, setResponseSuggestions] = useState<Record<string, EmailResponseSuggestion>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'lead-updates' | 'emails-to-respond'>('lead-updates');
  const [localEmails, setLocalEmails] = useState<Email[]>([]);

  // Sync local emails with data prop
  useEffect(() => {
    if (type === 'emails') {
      setLocalEmails(data as Email[]);
    }
  }, [data, type]);

  // Fetch suggestions for emails - include all statuses for logging
  useEffect(() => {
    if (type === 'emails' && open && data.length > 0) {
      const fetchSuggestions = async () => {
        const emailIds = (data as Email[]).map(e => e.id);
        
        // Fetch field suggestions
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

        // Fetch response suggestions
        const { data: responseData } = await supabase
          .from('email_response_suggestions')
          .select('*')
          .in('email_log_id', emailIds);

        if (responseData) {
          const mapped = responseData.reduce((acc, r) => {
            acc[r.email_log_id] = r;
            return acc;
          }, {} as Record<string, EmailResponseSuggestion>);
          setResponseSuggestions(mapped);
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

  const handleDismissResponse = async (emailId: string) => {
    const suggestion = responseSuggestions[emailId];
    if (!suggestion) return;

    setProcessingIds(prev => new Set(prev).add(emailId));
    try {
      await supabase
        .from('email_response_suggestions')
        .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      setResponseSuggestions(prev => ({
        ...prev,
        [emailId]: { ...prev[emailId], status: 'dismissed' }
      }));
      toast.success('Marked as dismissed');
    } catch (error) {
      toast.error('Failed to dismiss');
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(emailId);
      return next;
    });
  };

  const handleMarkResponded = async (emailId: string) => {
    const suggestion = responseSuggestions[emailId];
    if (!suggestion) return;

    setProcessingIds(prev => new Set(prev).add(emailId));
    try {
      await supabase
        .from('email_response_suggestions')
        .update({ status: 'responded', reviewed_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      setResponseSuggestions(prev => ({
        ...prev,
        [emailId]: { ...prev[emailId], status: 'responded' }
      }));
      toast.success('Marked as responded');
    } catch (error) {
      toast.error('Failed to update');
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(emailId);
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

      // Run both parsers in parallel: field updates AND AI summary AND response-needed
      // Prioritize html_body over plain body for better content parsing
      const emailBody = email.html_body || email.body || email.snippet;
      const [parseResult, summaryResult, responseResult] = await Promise.all([
        supabase.functions.invoke('parse-email-field-updates', {
          body: {
            subject: email.subject,
            body: emailBody,
            htmlBody: email.html_body,
            leadId: email.lead_id,
            currentLeadData: leadData
          }
        }),
        supabase.functions.invoke('summarize-email', {
          body: {
            subject: email.subject,
            body: emailBody,
            htmlBody: email.html_body
          }
        }),
        supabase.functions.invoke('parse-email-response-needed', {
          body: {
            subject: email.subject,
            body: emailBody,
            htmlBody: email.html_body,
            fromEmail: email.from_email,
            direction: email.direction,
            leadName: email.lead ? `${email.lead.first_name} ${email.lead.last_name}` : undefined
          }
        })
      ]);

      // Update AI summary in email_logs if we got a new one
      if (summaryResult.data?.summary) {
        await supabase
          .from('email_logs')
          .update({ ai_summary: summaryResult.data.summary })
          .eq('id', email.id);

        // Update local state to reflect new summary
        setLocalEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, ai_summary: summaryResult.data.summary } : e
        ));
      }

      // Handle field suggestions
      if (parseResult.data?.suggestions?.length > 0) {
        // Delete old pending suggestions for this email
        await supabase
          .from('email_field_suggestions')
          .delete()
          .eq('email_log_id', email.id)
          .eq('status', 'pending');

        // Insert new suggestions
        for (const s of parseResult.data.suggestions) {
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
      }

      // Handle response-needed analysis
      if (responseResult.data) {
        // Delete old suggestions for this email
        await supabase
          .from('email_response_suggestions')
          .delete()
          .eq('email_log_id', email.id);

        // Insert new response suggestion
        if (responseResult.data.needsResponse) {
          const { data: newResponse } = await supabase
            .from('email_response_suggestions')
            .insert({
              email_log_id: email.id,
              lead_id: email.lead_id,
              needs_response: responseResult.data.needsResponse,
              reason: responseResult.data.reason,
              urgency: responseResult.data.urgency,
              confidence: responseResult.data.confidence,
              status: 'pending'
            })
            .select()
            .single();

          if (newResponse) {
            setResponseSuggestions(prev => ({
              ...prev,
              [email.id]: newResponse
            }));
          }
        } else {
          // Remove from local state if doesn't need response
          setResponseSuggestions(prev => {
            const next = { ...prev };
            delete next[email.id];
            return next;
          });
        }
      }

      const foundCount = (parseResult.data?.suggestions?.length || 0);
      const summaryUpdated = !!summaryResult.data?.summary;
      const responseFound = responseResult.data?.needsResponse;
      
      let message = '';
      if (foundCount > 0) message += `${foundCount} field suggestion(s)`;
      if (summaryUpdated) message += message ? ', AI summary updated' : 'AI summary updated';
      if (responseFound) message += message ? ', response needed' : 'Response needed';
      
      if (message) {
        toast.success(message);
      } else {
        toast.info('No new updates found');
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

  // Filter emails that need responses for the second tab
  const emailsNeedingResponse = type === 'emails' 
    ? localEmails.filter(e => {
        const suggestion = responseSuggestions[e.id];
        return suggestion?.needs_response && suggestion?.status === 'pending';
      })
    : [];

  const renderEmailTable = (emails: Email[], showResponseColumn: boolean = false) => (
    <div className="min-w-[1200px]">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="w-[90px] py-2">Name</TableHead>
            <TableHead className="w-[85px] py-2">{getDateColumnTitle()}</TableHead>
            <TableHead className="w-[50px] py-2">Dir</TableHead>
            <TableHead className="w-[45px] py-2 text-center">Conf</TableHead>
            <TableHead className="w-[45px] py-2 text-center">Rerun</TableHead>
            {showResponseColumn ? (
              <>
                <TableHead className="w-[180px] py-2">AI Summary</TableHead>
                <TableHead className="w-[200px] py-2">Reason to Reply</TableHead>
                <TableHead className="w-[80px] py-2">Urgency</TableHead>
                <TableHead className="w-[100px] py-2">Actions</TableHead>
              </>
            ) : (
              <>
                <TableHead className="w-[200px] py-2">CRM Update</TableHead>
                <TableHead className="w-[180px] py-2">AI Summary</TableHead>
              </>
            )}
            <TableHead className="w-[140px] py-2">Subject</TableHead>
            {!showResponseColumn && <TableHead className="w-[160px] py-2">Explanation</TableHead>}
            <TableHead className="w-[120px] py-2">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map((item) => {
            const suggestions = emailSuggestions[item.id] || [];
            const responseSuggestion = responseSuggestions[item.id];
            const leadId = item.lead_id;

            return (
              <TableRow key={item.id} className="text-xs">
                <TableCell 
                  className="py-1.5 font-medium text-xs cursor-pointer hover:text-primary hover:underline"
                  onClick={() => onLeadClick && onLeadClick(item.lead_id)}
                >
                  <span className="line-clamp-1">{getName(item)}</span>
                </TableCell>
                <TableCell className="py-1.5 text-[11px] text-muted-foreground">{renderDate(item)}</TableCell>
                <TableCell className="py-1.5">
                  <Badge variant={item.direction === 'Out' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                    {item.direction === 'Out' ? 'Out' : 'In'}
                  </Badge>
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  {showResponseColumn ? (
                    responseSuggestion?.confidence ? (
                      <span className="text-[11px] font-semibold">
                        {Math.round((responseSuggestion.confidence) * 100)}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )
                  ) : (
                    suggestions.length > 0 ? (
                      <span className="text-[11px] font-semibold">
                        {Math.round((suggestions[0].confidence || 0.75) * 100)}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )
                  )}
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleRerunParsing(item)}
                    disabled={rerunningIds.has(item.id)}
                    title="Rerun AI parsing"
                  >
                    {rerunningIds.has(item.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TableCell>
                {showResponseColumn ? (
                  <>
                    <TableCell className="py-1.5">
                      {rerunningIds.has(item.id) ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Reanalyzing...</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground line-clamp-3">
                          {item.ai_summary || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[11px] text-muted-foreground line-clamp-3">
                        {responseSuggestion?.reason || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {responseSuggestion?.urgency && (
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-1 py-0 ${
                            String(responseSuggestion.urgency) === 'high' ? 'bg-red-100 text-red-700' :
                            String(responseSuggestion.urgency) === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}
                        >
                          {responseSuggestion.urgency}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {responseSuggestion?.status === 'pending' ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDismissResponse(item.id)}
                            disabled={processingIds.has(item.id)}
                            title="Dismiss"
                          >
                            {processingIds.has(item.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-green-600 hover:bg-green-600/10"
                            onClick={() => handleMarkResponded(item.id)}
                            disabled={processingIds.has(item.id)}
                            title="Mark as responded"
                          >
                            {processingIds.has(item.id) ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                          </Button>
                        </div>
                      ) : (
                        <Badge 
                          variant="secondary"
                          className={responseSuggestion?.status === 'responded' 
                            ? 'bg-green-600 hover:bg-green-600 text-white text-[9px] px-1 py-0' 
                            : 'bg-muted text-muted-foreground text-[9px] px-1 py-0'}
                        >
                          {responseSuggestion?.status === 'responded' ? '✓' : '✗'}
                        </Badge>
                      )}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="py-1.5">
                      {rerunningIds.has(item.id) ? (
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
                    <TableCell className="py-1.5">
                      {rerunningIds.has(item.id) ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Reanalyzing...</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground line-clamp-3">
                          {item.ai_summary || "—"}
                        </span>
                      )}
                    </TableCell>
                  </>
                )}
                <TableCell className="py-1.5">
                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                    {item.subject || "—"}
                  </span>
                </TableCell>
                {!showResponseColumn && (
                  <TableCell className="py-1.5">
                    {rerunningIds.has(item.id) ? (
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
                <TableCell className="py-1.5">
                  <textarea
                    className="w-full min-h-[36px] p-1 text-[10px] border rounded resize-none bg-background"
                    placeholder="Notes..."
                    rows={2}
                    defaultValue={item.user_notes || ''}
                    onBlur={async (e) => {
                      const newNotes = e.target.value;
                      if (newNotes !== (item.user_notes || '')) {
                        try {
                          await supabase
                            .from('email_logs')
                            .update({ user_notes: newNotes })
                            .eq('id', item.id);
                          toast.success('Notes saved');
                        } catch (error) {
                          toast.error('Failed to save notes');
                        }
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderNonEmailContent = () => (
    <div className="min-w-[1200px]">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="w-[90px] py-2">Name</TableHead>
            <TableHead className="w-[85px] py-2">{getDateColumnTitle()}</TableHead>
            <TableHead className="py-2">{getThirdColumnTitle()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="text-xs">
              <TableCell 
                className={`py-1.5 font-medium text-xs ${'pipeline_stage_id' in item && onLeadClick ? "cursor-pointer hover:text-primary hover:underline" : ""}`}
                onClick={() => {
                  if ('pipeline_stage_id' in item && onLeadClick) {
                    onLeadClick(item.id);
                  }
                }}
              >
                <span className="line-clamp-1">{getName(item)}</span>
              </TableCell>
              <TableCell className="py-1.5 text-[11px] text-muted-foreground">{renderDate(item)}</TableCell>
              <TableCell className="py-1.5">
                {'pipeline_stage_id' in item ? (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {STAGE_ID_TO_NAME[item.pipeline_stage_id || ''] || "Unknown"}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                    {('meeting_summary' in item && item.meeting_summary) || ('notes' in item && item.notes) || "—"}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">{title} ({data.length})</DialogTitle>
        </DialogHeader>
        
        {type === 'emails' ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lead-updates" className="text-xs">
                Lead Updates ({localEmails.length})
              </TabsTrigger>
              <TabsTrigger value="emails-to-respond" className="text-xs">
                Emails to Respond To ({emailsNeedingResponse.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="lead-updates" className="mt-0">
              <ScrollArea className="h-[65vh] w-full">
                {renderEmailTable(localEmails, false)}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="emails-to-respond" className="mt-0">
              <ScrollArea className="h-[65vh] w-full">
                {emailsNeedingResponse.length > 0 ? (
                  renderEmailTable(emailsNeedingResponse, true)
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted-foreground">
                    No emails currently need a response
                  </div>
                )}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <ScrollArea className="h-[70vh] w-full">
            {renderNonEmailContent()}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}