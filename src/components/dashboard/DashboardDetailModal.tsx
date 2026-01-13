import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateShort } from "@/utils/formatters";
import { Check, X, ArrowRight, Loader2, RefreshCw, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuickAddActivityModal, ActivityType, CallSubType } from "@/components/modals/QuickAddActivityModal";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { StatusBadge } from "@/components/ui/data-table";

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
  notes?: string | null;
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

interface Call {
  id: string;
  name: string;
  person_type: 'Lead' | 'Agent';
  call_date: string;
  call_type?: string | null;
  notes: string | null;
  lead_id?: string | null;
  logged_by_name?: string | null;
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

interface Review {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  review_left_on: string;
  pipeline_stage_id?: string;
}

interface DashboardDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Lead[] | Agent[] | Email[] | Call[] | Review[];
  type: "leads" | "applications" | "meetings" | "calls" | "emails" | "reviews";
  onLeadClick?: (leadId: string) => void;
  goal?: number;
  expectedProgress?: number;
  activityType?: ActivityType;
  callSubType?: CallSubType;
}

// Goal Slot Grid Component for visualizing progress toward monthly goals
interface GoalSlotGridProps {
  goal: number;
  expectedProgress: number;
  data: any[];
  type: string;
  onLeadClick?: (leadId: string) => void;
  formatDate: (item: any) => string;
  getName: (item: any) => string;
  onEmptySlotClick?: () => void;
  allowAdd?: boolean;
}

const GoalSlotGrid = ({ goal, expectedProgress, data, type, onLeadClick, formatDate, getName, onEmptySlotClick, allowAdd }: GoalSlotGridProps) => {
  // Generate all slots from 1 to goal
  const slots = Array.from({ length: goal }, (_, i) => i + 1);
  
  // Map actual data to slot numbers
  const filledSlots = data.slice(0, goal);
  
  // Calculate the next available slot (only this one can be clicked to add)
  const nextAvailableSlot = filledSlots.length + 1;
  
  // Determine grid columns based on goal size
  const getGridCols = () => {
    if (goal <= 12) return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-6';
    if (goal <= 30) return 'grid-cols-5 sm:grid-cols-6 md:grid-cols-10';
    return 'grid-cols-5 sm:grid-cols-7 md:grid-cols-10';
  };

  // Only allow clicking on the next available slot
  const canClickSlot = (slotNum: number) => allowAdd && onEmptySlotClick && slotNum === nextAvailableSlot;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Progress: <span className="font-semibold text-foreground">{data.length}</span> / {goal}
        </span>
        <span className="text-muted-foreground">
          Expected by today: <span className="font-semibold text-primary">{expectedProgress}</span>
        </span>
      </div>
      
      {/* Slot grid */}
      <div className={`grid ${getGridCols()} gap-2`}>
        {slots.map((slotNum) => {
          const item = filledSlots[slotNum - 1];
          const isFilled = !!item;
          const isExpectedSlot = slotNum === expectedProgress;
          const isPastExpected = slotNum <= expectedProgress;
          
          return (
            <div
              key={slotNum}
              className={`
                relative p-2 rounded-lg border-2 min-h-[80px] transition-all
                ${isFilled 
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600' 
                  : isPastExpected && !isFilled
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-dashed border-red-300 dark:border-red-700'
                    : 'bg-muted/20 border-dashed border-muted-foreground/30'
                }
                ${isExpectedSlot ? 'ring-2 ring-primary ring-offset-2' : ''}
                ${isFilled && onLeadClick && (type === 'leads' || type === 'applications' || type === 'reviews') ? 'cursor-pointer hover:shadow-md' : ''}
              `}
              onClick={() => {
                if (isFilled && onLeadClick && item?.id && (type === 'leads' || type === 'applications' || type === 'reviews')) {
                  onLeadClick(item.id);
                }
              }}
            >
              {/* Slot number */}
              <div className={`
                absolute top-1 left-2 text-xs font-bold
                ${isExpectedSlot ? 'text-primary' : isFilled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
              `}>
                {slotNum}
              </div>
              
              {/* Expected marker */}
              {isExpectedSlot && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-primary bg-background px-1 rounded whitespace-nowrap">
                  ← Target
                </div>
              )}
              
              {/* Content */}
              {isFilled ? (
                <div className="pt-4 space-y-0.5">
                  <p className="text-xs font-medium truncate">
                    {getName(item)}
                  </p>
                  {/* Show pipeline stage for leads and applications */}
                  {(type === 'leads' || type === 'applications') && item.pipeline_stage_id && (
                    <StatusBadge status={STAGE_ID_TO_NAME[item.pipeline_stage_id] || 'Unknown'} />
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatDate(item)}
                  </p>
                </div>
              ) : (
                <div 
                  className={`pt-4 flex items-center justify-center h-[40px] ${canClickSlot(slotNum) ? 'cursor-pointer group/slot hover:bg-muted/40 transition-colors rounded' : ''}`}
                  onClick={() => {
                    if (canClickSlot(slotNum)) {
                      onEmptySlotClick();
                    }
                  }}
                >
                  <span className="text-[10px] text-muted-foreground">
                    {isPastExpected ? 'Behind' : 'Empty'}
                  </span>
                  {canClickSlot(slotNum) && (
                    <Plus className="h-3 w-3 ml-1 opacity-0 group-hover/slot:opacity-100 text-primary transition-opacity" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-50 dark:bg-green-950/30 border-2 border-green-400" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-50/50 dark:bg-red-950/20 border-2 border-dashed border-red-300" />
          <span>Behind pace</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted/20 border-2 border-dashed border-muted-foreground/30" />
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-primary ring-2 ring-primary ring-offset-1" />
          <span>Target slot</span>
        </div>
      </div>
    </div>
  );
};

export function DashboardDetailModal({
  open,
  onOpenChange,
  title,
  data,
  type,
  onLeadClick,
  goal,
  expectedProgress,
  activityType,
  callSubType,
}: DashboardDetailModalProps) {
  const [emailSuggestions, setEmailSuggestions] = useState<Record<string, EmailSuggestion[]>>({});
  const [responseSuggestions, setResponseSuggestions] = useState<Record<string, EmailResponseSuggestion>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'lead-updates' | 'emails-to-respond'>('lead-updates');
  const [localEmails, setLocalEmails] = useState<Email[]>([]);
  
  // Quick-add modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);

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

        // Field name mapping for looking up current values (AI uses different names than DB)
        const fieldNameMap: Record<string, string> = {
          'loan_program': 'program',
          'monthly_taxes': 'property_taxes',
          'monthly_insurance': 'homeowners_insurance',
          'insurance_amount': 'homeowners_insurance',
          'transaction_type': 'loan_type',
          'escrow': 'escrows',
          'appraisal_date_time': 'appr_date_time',
        };
        
        // Insert new suggestions with proper field name mapping for current_value lookup
        for (const s of parseResult.data.suggestions) {
          const mappedFieldName = fieldNameMap[s.field_name] || s.field_name;
          await supabase.from('email_field_suggestions').insert({
            email_log_id: email.id,
            lead_id: email.lead_id,
            field_name: s.field_name,
            field_display_name: s.field_display_name,
            current_value: leadData?.[mappedFieldName] || null,
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

  const renderDate = (item: Lead | Agent | Email | Call | Review) => {
    if (type === "leads" && "lead_on_date" in item) {
      return item.lead_on_date ? formatDateShort(item.lead_on_date) : "—";
    }
    if (type === "applications" && "app_complete_at" in item) {
      return item.app_complete_at ? new Date(item.app_complete_at).toLocaleDateString() : "—";
    }
    if (type === "meetings" && "face_to_face_meeting" in item) {
      return item.face_to_face_meeting ? new Date(item.face_to_face_meeting).toLocaleDateString() : "—";
    }
    if (type === "calls" && "call_date" in item) {
      return item.call_date ? new Date(item.call_date).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
      }) : "—";
    }
    if (type === "emails" && "timestamp" in item) {
      return item.timestamp ? new Date(item.timestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
      }) : "—";
    }
    if (type === "reviews" && "review_left_on" in item) {
      return item.review_left_on ? formatDateShort(item.review_left_on) : "—";
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
      case "reviews":
        return "Review Date";
      default:
        return "Date";
    }
  };

  const getThirdColumnTitle = () => {
    if (type === "emails") return "Dir";
    if (type === "calls") return "Type";
    if (type === "reviews") return "Stage";
    return type === "meetings" ? "Notes" : "Current Stage";
  };

  const getName = (item: Lead | Agent | Email | Call | Review) => {
    if (type === "emails" && "lead" in item && item.lead) {
      return `${item.lead.first_name || ''} ${item.lead.last_name || ''}`.trim() || "Unknown";
    }
    if (type === "calls" && "name" in item) {
      return item.name || "Unknown";
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

  // Field name mapping for looking up current values (AI uses different names than DB)
  const FIELD_NAME_MAP: Record<string, string> = {
    'loan_program': 'program',
    'monthly_taxes': 'property_taxes',
    'escrow': 'escrows',
  };

  const getMappedFieldName = (fieldName: string): string => {
    return FIELD_NAME_MAP[fieldName] || fieldName;
  };

  const renderEmailTable = (emails: Email[], showResponseColumn: boolean = false) => (
    <div className="min-w-[1000px]">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="w-[90px] py-2">Name</TableHead>
            <TableHead className="w-[75px] py-2">{getDateColumnTitle()}</TableHead>
            <TableHead className="w-[40px] py-2">Dir</TableHead>
            <TableHead className="w-[40px] py-2 text-center">Conf</TableHead>
            <TableHead className="w-[35px] py-2 text-center">Rerun</TableHead>
            {showResponseColumn ? (
              <>
                <TableHead className="w-[160px] py-2">AI Summary</TableHead>
                <TableHead className="w-[180px] py-2">Reason to Reply</TableHead>
                <TableHead className="w-[70px] py-2">Urgency</TableHead>
                <TableHead className="w-[80px] py-2">Actions</TableHead>
              </>
            ) : (
              <>
                <TableHead className="w-[200px] py-2">CRM Update</TableHead>
                <TableHead className="w-[150px] py-2">AI Summary</TableHead>
              </>
            )}
            <TableHead className="w-[100px] py-2">Subject</TableHead>
            {!showResponseColumn && <TableHead className="w-[140px] py-2">Explanation</TableHead>}
            <TableHead className="w-[100px] py-2">Notes</TableHead>
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
                        <span className="text-[11px] text-muted-foreground line-clamp-2">
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

  // Helper to strip HTML tags from notes
  const stripHtmlTags = (html: string | null): string => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const CALL_TYPE_LABELS: Record<string, string> = {
    'new_agent': 'New Agent',
    'current_agent': 'Current Agent',
    'top_agent': 'Top Agent',
    'past_la': 'Past LA',
    'current_client': 'Borrower Call',
    'past_client': 'Past Client Call',
  };

  const renderCallsContent = () => (
    <div className="min-w-[1000px]">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="text-[11px]">
            <TableHead className="w-[120px] py-2">Name</TableHead>
            <TableHead className="w-[70px] py-2">Type</TableHead>
            <TableHead className="w-[100px] py-2">Logged By</TableHead>
            <TableHead className="w-[130px] py-2">Call Date</TableHead>
            <TableHead className="w-[100px] py-2">Call Type</TableHead>
            <TableHead className="py-2">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data as Call[]).map((item) => (
            <TableRow key={item.id} className="text-xs">
              <TableCell 
                className={`py-1.5 font-medium text-xs ${item.person_type === 'Lead' && item.lead_id && onLeadClick ? "cursor-pointer hover:text-primary hover:underline" : ""}`}
                onClick={() => {
                  if (item.person_type === 'Lead' && item.lead_id && onLeadClick) {
                    onLeadClick(item.lead_id);
                  }
                }}
              >
                <span className="line-clamp-1">{item.name}</span>
              </TableCell>
              <TableCell className="py-1.5">
                <Badge 
                  variant={item.person_type === 'Lead' ? 'default' : 'secondary'} 
                  className="text-[10px] px-1.5 py-0"
                >
                  {item.person_type}
                </Badge>
              </TableCell>
              <TableCell className="py-1.5 text-[11px] text-muted-foreground">
                {item.logged_by_name || "—"}
              </TableCell>
              <TableCell className="py-1.5 text-[11px] text-muted-foreground">
                {item.call_date ? new Date(item.call_date).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                }) : "—"}
              </TableCell>
              <TableCell className="py-1.5 text-[11px] text-muted-foreground">
                {item.call_type ? CALL_TYPE_LABELS[item.call_type] || item.call_type : "—"}
              </TableCell>
              <TableCell className="py-1.5 max-w-xs">
                <span className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                  {stripHtmlTags(item.notes) || "—"}
                </span>
              </TableCell>
            </TableRow>
          ))}
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
            <TableHead className="w-[100px] py-2">{getThirdColumnTitle()}</TableHead>
            {'pipeline_stage_id' in (data[0] || {}) && (
              <TableHead className="py-2">About the Borrower</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data as (Lead | Agent)[]).map((item) => (
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
              {'pipeline_stage_id' in item && (
                <TableCell className="py-1.5">
                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                    {(item as Lead).notes || "—"}
                  </span>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // Helper function to format date for goal grid
  const formatDateForGrid = (item: any) => {
    if (type === "leads" && item.lead_on_date) {
      return formatDateShort(item.lead_on_date);
    }
    if (type === "applications" && item.app_complete_at) {
      return new Date(item.app_complete_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (type === "meetings") {
      // Handle both face-to-face meetings AND broker opens
      const dateValue = item.face_to_face_meeting || item.broker_open;
      if (dateValue) {
        return new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    if (type === "calls" && item.call_date) {
      return new Date(item.call_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (type === "reviews" && item.review_left_on) {
      return formatDateShort(item.review_left_on);
    }
    return "—";
  };

  // Show goal grid for non-email types when goal is provided
  const showGoalGrid = goal && expectedProgress && type !== 'emails';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {title} ({data.length}{goal ? ` / ${goal}` : ''})
          </DialogTitle>
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
              <ScrollArea className="h-[65vh] w-full overflow-x-auto">
                <div className="overflow-x-auto">
                  {renderEmailTable(localEmails, false)}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="emails-to-respond" className="mt-0">
              <ScrollArea className="h-[65vh] w-full overflow-x-auto">
                <div className="overflow-x-auto">
                  {emailsNeedingResponse.length > 0 ? (
                    renderEmailTable(emailsNeedingResponse, true)
                  ) : (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                      No emails currently need a response
                    </div>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : showGoalGrid ? (
          <ScrollArea className="h-[70vh] w-full pr-4">
            <GoalSlotGrid
              goal={goal}
              expectedProgress={expectedProgress}
              data={data}
              type={type}
              onLeadClick={onLeadClick}
              formatDate={formatDateForGrid}
              getName={getName}
              allowAdd={!!activityType && activityType !== 'lead' || type === 'leads'}
              onEmptySlotClick={() => {
                if (activityType === 'lead' || type === 'leads') {
                  setCreateLeadModalOpen(true);
                } else if (activityType) {
                  setQuickAddOpen(true);
                }
              }}
            />
          </ScrollArea>
        ) : type === 'calls' ? (
          <ScrollArea className="h-[70vh] w-full">
            {renderCallsContent()}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[70vh] w-full">
            {renderNonEmailContent()}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </DialogContent>

      {/* Quick-add activity modal */}
      {activityType && activityType !== 'lead' && (
        <QuickAddActivityModal
          isOpen={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          activityType={activityType}
          callSubType={callSubType}
          onActivityAdded={() => {
            setQuickAddOpen(false);
            onOpenChange(false);
          }}
        />
      )}

      {/* Create lead modal */}
      <CreateLeadModal
        open={createLeadModalOpen}
        onOpenChange={setCreateLeadModalOpen}
        onLeadCreated={() => {
          setCreateLeadModalOpen(false);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}