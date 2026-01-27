import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, ArrowRight, Loader2, Building, ExternalLink, XCircle, Plus } from "lucide-react";
import { useLenderMarketingSuggestions, type LenderFieldSuggestion } from "@/hooks/useLenderMarketingSuggestions";
import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';

interface LenderMarketingSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LenderMarketingSuggestionsModal({
  open,
  onOpenChange,
}: LenderMarketingSuggestionsModalProps) {
  const navigate = useNavigate();
  const { 
    suggestions, 
    completedSuggestions,
    isLoading, 
    isLoadingCompleted,
    approveSuggestion, 
    denySuggestion,
    denyAllForLender,
    fetchCompletedSuggestions,
    refreshSuggestions,
  } = useLenderMarketingSuggestions();
  
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [denyingAllForLender, setDenyingAllForLender] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | 'all'>('24h');
  const [previewEmail, setPreviewEmail] = useState<{
    subject: string;
    from: string;
    body: string;
    htmlBody?: string;
    timestamp?: string;
  } | null>(null);

  // Map time filter to hours
  const getHoursFromFilter = (filter: string): number => {
    switch (filter) {
      case '24h': return 24;
      case '7d': return 168;
      case 'all': return 999999;
      default: return 24;
    }
  };

  // Reload data when time filter changes
  useEffect(() => {
    if (open) {
      const hours = getHoursFromFilter(timeFilter);
      refreshSuggestions(hours);
    }
  }, [timeFilter, open, refreshSuggestions]);

  // Fetch completed suggestions when switching to completed tab
  useEffect(() => {
    if (activeTab === 'completed' && open) {
      const hours = getHoursFromFilter(timeFilter);
      fetchCompletedSuggestions(hours);
    }
  }, [activeTab, open, timeFilter, fetchCompletedSuggestions]);

  // Group suggestions by lender
  const groupByLender = (items: LenderFieldSuggestion[]) => {
    return items.reduce((acc, suggestion) => {
      const key = suggestion.is_new_lender 
        ? `new:${suggestion.suggested_lender_name || 'Unknown'}`
        : suggestion.lender_id || 'unknown';
      
      if (!acc[key]) {
        acc[key] = {
          lenderId: suggestion.lender_id,
          lenderName: suggestion.is_new_lender 
            ? suggestion.suggested_lender_name 
            : suggestion.lender?.lender_name || 'Unknown Lender',
          isNewLender: suggestion.is_new_lender,
          suggestions: [],
        };
      }
      acc[key].suggestions.push(suggestion);
      return acc;
    }, {} as Record<string, { 
      lenderId: string | null; 
      lenderName: string | null; 
      isNewLender: boolean;
      suggestions: LenderFieldSuggestion[] 
    }>);
  };

  const suggestionsByLender = groupByLender(suggestions);
  const completedByLender = groupByLender(completedSuggestions);

  const handleApprove = async (suggestion: LenderFieldSuggestion) => {
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

  const handleDenyAllForLender = async (
    lenderId: string | null, 
    lenderName: string | null, 
    lenderSuggestions: LenderFieldSuggestion[]
  ) => {
    const key = lenderId || `new:${lenderName}`;
    setDenyingAllForLender(key);
    await denyAllForLender(lenderId, lenderName, lenderSuggestions);
    setDenyingAllForLender(null);
  };

  const handleLenderClick = (lenderId: string | null) => {
    if (lenderId) {
      navigate(`/contacts/lenders?openLender=${lenderId}`);
      onOpenChange(false);
    }
  };

  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const renderSuggestionCard = (suggestion: LenderFieldSuggestion, isCompleted: boolean) => (
    <div 
      key={suggestion.id}
      className="p-4 bg-muted/50 rounded-lg border border-border space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="secondary" className="font-medium">
              {formatFieldName(suggestion.field_name)}
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
          </div>
          <div className="flex items-center gap-1 text-sm mb-1">
            <span className="text-muted-foreground truncate max-w-[150px]">
              {suggestion.current_value || 'Empty'}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-primary truncate max-w-[200px]">
              {suggestion.suggested_value}
            </span>
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
    </div>
  );

  const renderLenderCards = (
    groupedData: Record<string, { 
      lenderId: string | null; 
      lenderName: string | null; 
      isNewLender: boolean;
      suggestions: LenderFieldSuggestion[] 
    }>,
    isCompleted: boolean
  ) => (
    <div className="space-y-4">
      {Object.entries(groupedData).map(([key, { lenderId, lenderName, isNewLender, suggestions: lenderSuggestions }]) => (
        <Card key={key} className={isNewLender ? 'border-purple-300 dark:border-purple-700' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isNewLender && (
                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-300">
                    <Plus className="h-3 w-3 mr-1" />
                    NEW
                  </Badge>
                )}
                <span 
                  className={lenderId ? "cursor-pointer hover:text-primary hover:underline" : ""}
                  onClick={() => handleLenderClick(lenderId)}
                >
                  {lenderName || 'Unknown Lender'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {lenderSuggestions.length} suggestion{lenderSuggestions.length > 1 ? 's' : ''}
                </Badge>
                {!isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDenyAllForLender(lenderId, lenderName, lenderSuggestions);
                    }}
                    disabled={denyingAllForLender === (lenderId || `new:${lenderName}`)}
                    title="Deny all suggestions for this lender"
                  >
                    {denyingAllForLender === (lenderId || `new:${lenderName}`) ? (
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
            {lenderSuggestions.map((suggestion) => renderSuggestionCard(suggestion, isCompleted))}
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
            <Building className="h-5 w-5" />
            Lender Marketing Updates
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
            
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Time filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="pending" className="mt-0">
            <ScrollArea className="h-[55vh] pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No pending suggestions</p>
                  <p className="text-sm">Lender update suggestions from marketing emails will appear here</p>
                </div>
              ) : (
                renderLenderCards(suggestionsByLender, false)
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <ScrollArea className="h-[55vh] pr-2">
              {isLoadingCompleted ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : completedSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No completed suggestions</p>
                  <p className="text-sm">Approved and denied suggestions will appear here</p>
                </div>
              ) : (
                renderLenderCards(completedByLender, true)
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
