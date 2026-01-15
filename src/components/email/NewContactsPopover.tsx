import { useState, useEffect } from "react";
import { Loader2, User, Check, X, Plus, Mail, Phone, Building2, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContactSuggestion {
  id: string;
  email_log_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  suggested_tags: string[] | null;
  source_email_subject: string | null;
  source_email_from: string | null;
  source_email_date: string | null;
  status: string;
  reason: string | null;
  confidence: number | null;
}

interface NewContactsPopoverProps {
  emailLogId: string;
  subject: string;
  fromEmail: string;
  className?: string;
  pendingSuggestionCount?: number;
}

export function NewContactsPopover({ emailLogId, subject, fromEmail, className, pendingSuggestionCount = 0 }: NewContactsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsLoading(true);
      try {
        // Fetch suggestions for this email
        const { data: suggestionsData, error: suggestionsError } = await supabase
          .from('email_contact_suggestions')
          .select('*')
          .eq('email_log_id', emailLogId)
          .order('created_at', { ascending: false });

        if (suggestionsError) {
          console.error('Error fetching contact suggestions:', suggestionsError);
        } else {
          setSuggestions(suggestionsData || []);
        }
      } catch (error) {
        console.error('Error loading contact suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApproveSuggestion = async (suggestion: ContactSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    try {
      // Create the contact with all available data
      const noteText = `Added from email: "${suggestion.source_email_subject || subject}" from ${suggestion.source_email_from || fromEmail}${suggestion.source_email_date ? ` on ${new Date(suggestion.source_email_date).toLocaleDateString()}` : ''}.`;
      
      // Use today's date for lead_created_date to avoid timezone issues
      const today = new Date().toISOString().split('T')[0];
      
      // Get job_title from suggestion if available (may need to parse from reason if not directly stored)
      const jobTitle = (suggestion as any).job_title || null;
      
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          first_name: suggestion.first_name,
          last_name: suggestion.last_name || '',
          email: suggestion.email,
          phone: suggestion.phone,
          company: suggestion.company,
          job_title: jobTitle,
          tags: suggestion.suggested_tags,
          type: 'Other',
          source_type: 'email_import',
          notes: noteText,
          lead_created_date: today,
          description: suggestion.reason,
          email_log_id: suggestion.email_log_id
        });

      if (insertError) throw insertError;

      // Mark suggestion as approved
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('email_contact_suggestions')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', suggestion.id);

      // Update local state
      setSuggestions(prev => prev.map(s => 
        s.id === suggestion.id ? { ...s, status: 'approved' } : s
      ));

      toast({
        title: "Contact Added",
        description: `${suggestion.first_name} ${suggestion.last_name || ''} added to Master Contact List`,
      });
    } catch (error: any) {
      console.error('Error approving contact suggestion:', error);
      toast({
        title: "Error",
        description: `Failed to add contact: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const handleDenySuggestion = async (suggestion: ContactSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('email_contact_suggestions')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', suggestion.id);

      setSuggestions(prev => prev.map(s => 
        s.id === suggestion.id ? { ...s, status: 'rejected' } : s
      ));
    } catch (error) {
      console.error('Error denying suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const processedSuggestions = suggestions.filter(s => s.status !== 'pending');

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-purple-500/20 text-purple-600 border border-purple-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-purple-500/30 transition-colors font-medium inline-flex items-center gap-1",
            className
          )}
        >
          New Contact
          {pendingSuggestionCount > 0 && (
            <span className="bg-purple-600 text-white text-[9px] px-1.5 min-w-[16px] text-center rounded-full">
              {pendingSuggestionCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] p-0" 
        align="end"
        side="bottom"
        sideOffset={5}
        collisionPadding={16}
        avoidCollisions={true}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-600" />
            <h4 className="font-semibold text-sm">Contact Suggestions</h4>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{subject}</p>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No contact suggestions for this email
              </div>
            ) : (
              <>
                {/* Pending suggestions */}
                {pendingSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground">
                      Pending ({pendingSuggestions.length})
                    </h5>
                    {pendingSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border rounded-md p-2.5 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5 text-purple-600" />
                              <span className="text-sm font-medium">
                                {suggestion.first_name} {suggestion.last_name || ''}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{suggestion.email}</span>
                              </div>
                              {suggestion.phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{suggestion.phone}</span>
                                </div>
                              )}
                              {suggestion.company && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  <span>{suggestion.company}</span>
                                </div>
                              )}
                            </div>
                            {suggestion.suggested_tags && suggestion.suggested_tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                {suggestion.suggested_tags.map((tag, idx) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-accent/30 text-accent-foreground rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {suggestion.reason && (
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                {suggestion.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApproveSuggestion(suggestion)}
                              disabled={processingIds.has(suggestion.id)}
                            >
                              {processingIds.has(suggestion.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDenySuggestion(suggestion)}
                              disabled={processingIds.has(suggestion.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Processed suggestions */}
                {processedSuggestions.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <h5 className="text-xs font-medium text-muted-foreground">
                      Processed ({processedSuggestions.length})
                    </h5>
                    {processedSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border rounded-md p-2.5 bg-muted/30 opacity-60">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium">
                              {suggestion.first_name} {suggestion.last_name || ''}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.email}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px]",
                              suggestion.status === 'approved' && "bg-green-500/10 text-green-600 border-green-500/20",
                              suggestion.status === 'rejected' && "bg-red-500/10 text-red-600 border-red-500/20"
                            )}
                          >
                            {suggestion.status === 'approved' ? 'Added' : 'Skipped'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}