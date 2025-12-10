import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, ArrowRight, Loader2, Mail } from "lucide-react";
import { useEmailSuggestions, type EmailFieldSuggestion } from "@/hooks/useEmailSuggestions";
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
    await approveSuggestion(suggestion);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
  };

  const handleDeny = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId));
    await denySuggestion(suggestionId);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestionId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            CRM Update Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary">{suggestions.length} pending</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
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
                        className="p-3 bg-muted/50 rounded-lg border border-border space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="font-medium">
                              {suggestion.field_display_name}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-muted-foreground">
                                {suggestion.current_value || 'Empty'}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-primary">
                                {suggestion.suggested_value}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeny(suggestion.id)}
                              disabled={processingIds.has(suggestion.id)}
                            >
                              {processingIds.has(suggestion.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                              onClick={() => handleApprove(suggestion)}
                              disabled={processingIds.has(suggestion.id)}
                            >
                              {processingIds.has(suggestion.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.reason}
                        </p>
                        {suggestion.email_log && (
                          <p className="text-xs text-muted-foreground/70 truncate">
                            From: {suggestion.email_log.subject}
                          </p>
                        )}
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
