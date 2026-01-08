import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, ArrowRight, Loader2, Mail } from "lucide-react";
import { useEmailSuggestions, type EmailFieldSuggestion } from "@/hooks/useEmailSuggestions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const { suggestions, isLoading, approveSuggestion, denySuggestion } = useEmailSuggestions();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Group suggestions by lead
  const suggestionsByLead = suggestions.reduce((acc, suggestion) => {
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

  const handleApprove = async (suggestion: EmailFieldSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    await approveSuggestion(suggestion, notes[suggestion.id]);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
    // Clear the note after approval
    setNotes(prev => {
      const next = { ...prev };
      delete next[suggestion.id];
      return next;
    });
  };

  const handleDeny = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId));
    await denySuggestion(suggestionId, notes[suggestionId]);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestionId);
      return next;
    });
    // Clear the note after denial
    setNotes(prev => {
      const next = { ...prev };
      delete next[suggestionId];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            CRM Update Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary">{suggestions.length} pending</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
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
            <div className="space-y-4">
              {Object.entries(suggestionsByLead).map(([leadId, { lead, suggestions: leadSuggestions }]) => (
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
                      <Badge variant="outline" className="text-xs">
                        {leadSuggestions.length} suggestion{leadSuggestions.length > 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {leadSuggestions.map((suggestion) => (
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
                              <p className="text-xs text-muted-foreground/70 truncate">
                                From: {suggestion.email_log.subject}
                              </p>
                            )}
                          </div>
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
                        </div>
                        {/* Notes input */}
                        <Input
                          placeholder="Add a note (optional)..."
                          value={notes[suggestion.id] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [suggestion.id]: e.target.value }))}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
