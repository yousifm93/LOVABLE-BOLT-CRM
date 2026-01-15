import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Building2, Mail, Phone, User, Calendar, Tag, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ContactDetailDialogProps {
  contact: any | null;
  isOpen: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export function ContactDetailDialog({ contact, isOpen, onClose, onContactUpdated }: ContactDetailDialogProps) {
  const { toast } = useToast();

  // Early return AFTER all hooks to prevent null access errors
  if (!contact) {
    return null;
  }

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!contact?.id) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ [field]: value })
        .eq('id', contact.id);

      if (error) throw error;
      
      onContactUpdated();
      toast({
        title: "Updated",
        description: "Contact information updated successfully.",
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact information.",
        variant: "destructive",
      });
    }
  };

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown Contact';
  const initials = [contact.first_name?.[0], contact.last_name?.[0]].filter(Boolean).join('') || '??';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] backdrop-blur-xl bg-background/95 border-border/50 shadow-2xl rounded-xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex flex-col justify-center">
              <DialogTitle className="text-xl">{fullName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-0.5">
                {contact.company && (
                  <span className="flex items-center gap-1 text-xs">
                    <Building2 className="h-3 w-3" />
                    {contact.company}
                  </span>
                )}
                <Badge variant="outline" className="text-xs">
                  {contact.type || 'Contact'}
                </Badge>
                {contact.source_type === 'email_import' && (
                  <Badge variant="secondary" className="text-xs">
                    From Emails
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-5 space-y-5">
            {/* Contact Information - 2 column layout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name</label>
                <InlineEditText
                  value={contact.first_name}
                  onValueChange={(value) => handleFieldUpdate('first_name', value)}
                  placeholder="First"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name</label>
                <InlineEditText
                  value={contact.last_name}
                  onValueChange={(value) => handleFieldUpdate('last_name', value)}
                  placeholder="Last"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <InlineEditText
                  value={contact.email}
                  onValueChange={(value) => handleFieldUpdate('email', value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                <InlineEditPhone
                  value={contact.phone}
                  onValueChange={(value) => handleFieldUpdate('phone', value)}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                <InlineEditText
                  value={contact.company}
                  onValueChange={(value) => handleFieldUpdate('company', value)}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Created Date</label>
                <div className="text-sm py-2 px-3 border rounded-md bg-muted/30">
                  {contact.lead_created_date 
                    ? new Date(contact.lead_created_date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
                    : contact.created_at
                    ? new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : <span className="text-muted-foreground">—</span>
                  }
                </div>
              </div>
            </div>

            {/* Description Section - for email imports */}
            {contact.description && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  {contact.description}
                </p>
              </div>
            )}

            {/* Tags Section */}
            {contact.tags && contact.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </h3>
              <InlineEditNotes
                value={contact.notes}
                onValueChange={(value) => handleFieldUpdate('notes', value)}
                placeholder="Add notes about this contact..."
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
