import { useState, useEffect } from "react";
import { Loader2, User, Check, X, Plus, Mail, Phone, Building2, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingContact {
  id: string;
  email_log_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[] | null;
  description: string | null;
  approval_status: string | null;
  job_title: string | null;
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
  const [contacts, setContacts] = useState<PendingContact[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsLoading(true);
      try {
        // Fetch pending contacts for this email from the contacts table
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .eq('email_log_id', emailLogId)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false });

        if (contactsError) {
          console.error('Error fetching pending contacts:', contactsError);
        } else {
          setContacts(contactsData || []);
        }
      } catch (error) {
        console.error('Error loading pending contacts:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApproveContact = async (contact: PendingContact) => {
    setProcessingIds(prev => new Set(prev).add(contact.id));
    try {
      // Contact already exists in the table - just update approval_status to 'approved'
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ approval_status: 'approved' })
        .eq('id', contact.id);

      if (updateError) throw updateError;

      // Update local state
      setContacts(prev => prev.filter(c => c.id !== contact.id));

      toast({
        title: "Contact Approved",
        description: `${contact.first_name} ${contact.last_name || ''} added to Master Contact List`,
      });
    } catch (error: any) {
      console.error('Error approving contact:', error);
      toast({
        title: "Error",
        description: `Failed to approve contact: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  };

  const handleDenyContact = async (contact: PendingContact) => {
    setProcessingIds(prev => new Set(prev).add(contact.id));
    try {
      // Update approval_status to 'rejected'
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ approval_status: 'rejected' })
        .eq('id', contact.id);

      if (updateError) throw updateError;

      // Update local state
      setContacts(prev => prev.filter(c => c.id !== contact.id));

      toast({
        title: "Contact Rejected",
        description: `${contact.first_name} ${contact.last_name || ''} will not be added`,
      });
    } catch (error) {
      console.error('Error rejecting contact:', error);
      toast({
        title: "Error",
        description: "Failed to reject contact",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  };

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
            <h4 className="font-semibold text-sm">Pending Contacts</h4>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{subject}</p>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No pending contacts for this email
              </div>
            ) : (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground">
                  Pending ({contacts.length})
                </h5>
                {contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-md p-2.5 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5 text-purple-600" />
                          <span className="text-sm font-medium">
                            {contact.first_name} {contact.last_name || ''}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {contact.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.company && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{contact.company}</span>
                            </div>
                          )}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {contact.tags.map((tag, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-accent/30 text-accent-foreground rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {contact.description && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {contact.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApproveContact(contact)}
                          disabled={processingIds.has(contact.id)}
                        >
                          {processingIds.has(contact.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDenyContact(contact)}
                          disabled={processingIds.has(contact.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}