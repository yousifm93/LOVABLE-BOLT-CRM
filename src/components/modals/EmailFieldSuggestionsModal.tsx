import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, ArrowRight, Loader2, Mail, MessageSquare, ExternalLink, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEmailSuggestions, type EmailFieldSuggestion } from "@/hooks/useEmailSuggestions";
import { Input } from "@/components/ui/input";
import DOMPurify from 'dompurify';

interface EmailFieldSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadClick?: (leadId: string) => void;
}

export function EmailFieldSuggestionsModal({
  open,
  onOpenChange,
  onLeadClick,
}: EmailFieldSuggestionsModalProps) {
  const { toast } = useToast();
  const { 
    suggestions, 
    completedSuggestions,
    isLoading, 
    isLoadingCompleted,
    approveSuggestion, 
    denySuggestion,
    fetchCompletedSuggestions,
  } = useEmailSuggestions();
  
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [denyingAllForLead, setDenyingAllForLead] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [notesFilter, setNotesFilter] = useState<'all' | 'with_notes' | 'without_notes'>('all');
  const [previewEmail, setPreviewEmail] = useState<{
    subject: string;
    from: string;
    body: string;
    htmlBody?: string;
    timestamp?: string;
  } | null>(null);

  // Fetch completed suggestions when switching to completed tab
  useEffect(() => {
    if (activeTab === 'completed' && open) {
      fetchCompletedSuggestions();
    }
  }, [activeTab, open, fetchCompletedSuggestions]);

  // Group suggestions by lead
  const groupByLead = (items: EmailFieldSuggestion[]) => {
    return items.reduce((acc, suggestion) => {
      const leadId = suggestion.lead_id;
      if (!acc[leadId]) {
        acc[leadId] = {
          lead: suggestion.lead,
          suggestions: [],
        };
      }
      acc[leadId].suggestions.push(suggestion);
      return acc;
    }, {} as Record<string, { lead: EmailFieldSuggestion['lead']; suggestions: EmailFieldSuggestion[] }>);
  };

  const suggestionsByLead = groupByLead(suggestions);

  // Filter completed suggestions based on notes filter
  const filteredCompleted = completedSuggestions.filter(s => {
    if (notesFilter === 'with_notes') return s.notes && s.notes.trim().length > 0;
    if (notesFilter === 'without_notes') return !s.notes || s.notes.trim().length === 0;
    return true;
  });
  const completedByLead = groupByLead(filteredCompleted);

  const handleApprove = async (suggestion: EmailFieldSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    const success = await approveSuggestion(suggestion, notes[suggestion.id]);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
    // Only clear notes if the approval succeeded
    if (success) {
      setNotes(prev => {
        const next = { ...prev };
        delete next[suggestion.id];
        return next;
      });
    }
  };

  const handleDeny = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId));
    const success = await denySuggestion(suggestionId, notes[suggestionId]);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestionId);
      return next;
    });
    // Only clear notes if the denial succeeded
    if (success) {
      setNotes(prev => {
        const next = { ...prev };
        delete next[suggestionId];
        return next;
      });
    }
  };

  const handleDenyAllForLead = async (leadId: string, leadSuggestions: EmailFieldSuggestion[]) => {
    setDenyingAllForLead(leadId);
    let successCount = 0;
    let failCount = 0;
    
    for (const suggestion of leadSuggestions) {
      const success = await denySuggestion(suggestion.id, 'Bulk denied');
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    setDenyingAllForLead(null);
    toast({
      title: failCount === 0 ? "All Denied" : "Partially Denied",
      description: `${successCount} suggestion${successCount !== 1 ? 's' : ''} denied${failCount > 0 ? `, ${failCount} failed` : ''}`,
      variant: failCount > 0 ? "destructive" : "default",
    });
  };

  const renderSuggestionCard = (suggestion: EmailFieldSuggestion, isCompleted: boolean) => (
    <div 
      key={suggestion.id}
      className="p-4 bg-muted/50 rounded-lg border border-border space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="secondary" className="font-medium">
              {suggestion.field_display_name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(suggestion.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
            {isCompleted && (
              <Badge 
                variant={suggestion.status === 'approved' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {suggestion.status === 'approved' ? 'Approved' : 'Denied'}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground truncate max-w-[150px]">
                {suggestion.current_value || 'Empty'}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-primary truncate max-w-[200px]">
                {suggestion.suggested_value}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            {suggestion.reason}
          </p>
          {suggestion.email_log && (
            <p 
              className="text-xs text-blue-600 hover:underline cursor-pointer truncate flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewEmail({
                  subject: suggestion.email_log!.subject,
                  from: suggestion.email_log!.from_email,
                  body: suggestion.email_log!.body || '',
                  htmlBody: suggestion.email_log!.html_body,
                  timestamp: suggestion.email_log!.timestamp
                });
              }}
            >
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              {suggestion.email_log.subject}
            </p>
          )}
          {isCompleted && suggestion.notes && (
            <div className="mt-2 p-2 bg-background rounded border border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                Notes
              </div>
              <p className="text-sm">{suggestion.notes}</p>
            </div>
          )}
        </div>
        {!isCompleted && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => handleDeny(suggestion.id)}
              disabled={processingIds.has(suggestion.id)}
              title="Deny suggestion"
            >
              {processingIds.has(suggestion.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-green-600 hover:text-green-600 hover:bg-green-600/10 border-green-600/30"
              onClick={() => handleApprove(suggestion)}
              disabled={processingIds.has(suggestion.id)}
              title="Approve suggestion"
            >
              {processingIds.has(suggestion.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
      {!isCompleted && (
        <Input
          placeholder="Add a note (optional)..."
          value={notes[suggestion.id] || ''}
          onChange={(e) => setNotes(prev => ({ ...prev, [suggestion.id]: e.target.value }))}
          className="text-sm h-8"
        />
      )}
    </div>
  );

  const renderLeadCards = (
    groupedData: Record<string, { lead: EmailFieldSuggestion['lead']; suggestions: EmailFieldSuggestion[] }>,
    isCompleted: boolean
  ) => (
    <div className="space-y-4">
      {Object.entries(groupedData).map(([leadId, { lead, suggestions: leadSuggestions }]) => (
        <Card key={leadId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span 
                className="cursor-pointer hover:text-primary hover:underline"
                onClick={() => {
                  onLeadClick?.(leadId);
                  onOpenChange(false);
                }}
              >
                {lead?.first_name} {lead?.last_name}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {leadSuggestions.length} suggestion{leadSuggestions.length > 1 ? 's' : ''}
                </Badge>
                {!isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDenyAllForLead(leadId, leadSuggestions);
                    }}
                    disabled={denyingAllForLead === leadId}
                    title="Deny all suggestions for this borrower"
                  >
                    {denyingAllForLead === leadId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leadSuggestions.map((suggestion) => renderSuggestionCard(suggestion, isCompleted))}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            CRM Update Suggestions
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed')}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                Pending
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{suggestions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            {activeTab === 'completed' && (
              <Select value={notesFilter} onValueChange={(v) => setNotesFilter(v as typeof notesFilter)}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Filter by notes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="with_notes">With Notes</SelectItem>
                  <SelectItem value="without_notes">Without Notes</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="pending" className="mt-0">
            <ScrollArea className="h-[55vh] pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No pending suggestions</p>
                  <p className="text-sm">Field update suggestions from emails will appear here</p>
                </div>
              ) : (
                renderLeadCards(suggestionsByLead, false)
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <ScrollArea className="h-[55vh] pr-2">
              {isLoadingCompleted ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCompleted.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No completed suggestions</p>
                  <p className="text-sm">
                    {notesFilter !== 'all' 
                      ? `No suggestions ${notesFilter === 'with_notes' ? 'with' : 'without'} notes` 
                      : 'Approved and denied suggestions will appear here'}
                  </p>
                </div>
              ) : (
                renderLeadCards(completedByLead, true)
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
      {/* Email Preview Modal */}
      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="pr-8">{previewEmail?.subject}</DialogTitle>
            <p className="text-sm text-muted-foreground">From: {previewEmail?.from}</p>
            {previewEmail?.timestamp && (
              <p className="text-xs text-muted-foreground">
                {new Date(previewEmail.timestamp).toLocaleString()}
              </p>
            )}
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {previewEmail?.htmlBody ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewEmail.htmlBody) }} 
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-sans">{previewEmail?.body}</pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}