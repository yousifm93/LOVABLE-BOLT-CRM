import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEmailSuggestions, EmailFieldSuggestion } from "@/hooks/useEmailSuggestions";

interface EmailTagData {
  leadId: string;
  leadName: string;
  emailLogId: string;
  aiSummary: string | null;
  subject: string;
}

interface EmailTagPopoverProps {
  tagData: EmailTagData;
  className?: string;
}

export function EmailTagPopover({ tagData, className }: EmailTagPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<EmailFieldSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { approveSuggestion, denySuggestion, getSuggestionsForEmail } = useEmailSuggestions();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && tagData.emailLogId) {
      setIsLoading(true);
      const fetchedSuggestions = await getSuggestionsForEmail(tagData.emailLogId);
      setSuggestions(fetchedSuggestions);
      setIsLoading(false);
    }
  };

  const handleApprove = async (suggestion: EmailFieldSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    const success = await approveSuggestion(suggestion);
    if (success) {
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestion.id);
      return next;
    });
  };

  const handleDeny = async (suggestionId: string) => {
    setProcessingIds(prev => new Set(prev).add(suggestionId));
    const success = await denySuggestion(suggestionId);
    if (success) {
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(suggestionId);
      return next;
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full truncate max-w-[100px] hover:bg-primary/20 transition-colors font-medium",
            className
          )}
        >
          {tagData.leadName}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[520px] p-0" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{tagData.leadName}</h4>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{tagData.subject}</p>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="p-3 space-y-3">
            {/* AI Summary Section */}
            {tagData.aiSummary && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1.5">AI Summary</h5>
                <div className="bg-muted/50 rounded-md p-2.5 text-sm">
                  {tagData.aiSummary}
                </div>
              </div>
            )}

            {/* CRM Updates Section */}
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1.5">
                CRM Updates Suggested
              </h5>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No pending CRM updates
                </p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <div 
                      key={suggestion.id}
                      className="border rounded-md p-2.5 bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {suggestion.field_display_name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0"
                            >
                              {Math.round((suggestion.confidence || 0.8) * 100)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">
                              {suggestion.current_value || "∅"}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-primary">
                              {suggestion.suggested_value}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => handleApprove(suggestion)}
                            disabled={processingIds.has(suggestion.id)}
                          >
                            {processingIds.has(suggestion.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeny(suggestion.id)}
                            disabled={processingIds.has(suggestion.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {suggestion.reason && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {suggestion.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
