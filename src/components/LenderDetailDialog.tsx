import { useState, useEffect } from "react";
import { X, Building2, Mail, Phone, User, Globe, Lock, Eye, EyeOff, DollarSign, Copy, ExternalLink, Users, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { InlineEditLenderType } from "@/components/ui/inline-edit-lender-type";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: "Conventional" | "Non-QM" | "Private" | "HELOC";
  account_executive?: string;
  account_executive_email?: string;
  account_executive_phone?: string;
  broker_portal_url?: string;
  broker_portal_username?: string;
  broker_portal_password?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AssociatedClient {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  loan_status: string | null;
  close_date: string | null;
  is_closed: boolean | null;
}

interface EmailLog {
  id: string;
  subject: string;
  timestamp: string;
  delivery_status: string | null;
  opened_at: string | null;
}

interface LenderDetailDialogProps {
  lender: Lender | null;
  isOpen: boolean;
  onClose: () => void;
  onLenderUpdated: () => void;
}

export function LenderDetailDialog({ lender, isOpen, onClose, onLenderUpdated }: LenderDetailDialogProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [associatedClients, setAssociatedClients] = useState<AssociatedClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  useEffect(() => {
    if (lender?.id && isOpen) {
      loadAssociatedClients();
      loadEmailLogs();
    }
  }, [lender?.id, isOpen]);

  const loadAssociatedClients = async () => {
    if (!lender?.id) return;
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, loan_status, close_date, is_closed')
        .eq('approved_lender_id', lender.id)
        .order('close_date', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      setAssociatedClients(data || []);
    } catch (error) {
      console.error('Error loading associated clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadEmailLogs = async () => {
    if (!lender?.account_executive_email) {
      setEmailLogs([]);
      return;
    }
    setLoadingEmails(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, subject, timestamp, delivery_status, opened_at')
        .eq('to_email', lender.account_executive_email)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!lender?.id) return;

    try {
      await databaseService.updateLender(lender.id, { [field]: value });
      onLenderUpdated();
      toast({
        title: "Updated",
        description: "Lender information updated successfully.",
      });
    } catch (error) {
      console.error('Error updating lender:', error);
      toast({
        title: "Error",
        description: "Failed to update lender information.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  };

  if (!lender) return null;

  const initials = lender.lender_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '??';

  const getLenderTypeColor = (type: string) => {
    switch (type) {
      case 'Conventional': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'Non-QM': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'Private': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
      case 'HELOC': return 'bg-green-500/20 text-green-700 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Parse first/last name from account_executive
  const aeParts = lender.account_executive?.split(' ') || [];
  const aeFirstName = aeParts[0] || '';
  const aeLastName = aeParts.slice(1).join(' ') || '';

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getDeliveryStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-green-500/20 text-green-700';
      case 'sent': return 'bg-blue-500/20 text-blue-700';
      case 'failed': return 'bg-red-500/20 text-red-700';
      case 'bounced': return 'bg-red-500/20 text-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-3">
              <InlineEditText
                value={lender.lender_name}
                onValueChange={(value) => handleFieldUpdate('lender_name', value)}
                placeholder="Lender name"
                className="font-semibold text-xl"
              />
              <InlineEditLenderType
                value={lender.lender_type}
                onValueChange={(value) => handleFieldUpdate('lender_type', value)}
              />
              <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-500/30">
                Approved
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Account Executive - grid layout */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Executive
              </h3>
              <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">First Name</label>
                  <InlineEditText
                    value={aeFirstName}
                    onValueChange={(value) => handleFieldUpdate('account_executive', `${value} ${aeLastName}`.trim())}
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Last Name</label>
                  <InlineEditText
                    value={aeLastName}
                    onValueChange={(value) => handleFieldUpdate('account_executive', `${aeFirstName} ${value}`.trim())}
                    placeholder="Last"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <InlineEditText
                    value={lender.account_executive_email}
                    onValueChange={(value) => handleFieldUpdate('account_executive_email', value)}
                    placeholder="email@lender.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <InlineEditPhone
                    value={lender.account_executive_phone}
                    onValueChange={(value) => handleFieldUpdate('account_executive_phone', value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Portal Access - grid layout */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Portal Access
              </h3>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Portal URL</label>
                  <div className="flex items-center gap-1">
                    <InlineEditLink
                      value={lender.broker_portal_url}
                      onValueChange={(value) => handleFieldUpdate('broker_portal_url', value)}
                      placeholder="https://portal.lender.com"
                    />
                    {lender.broker_portal_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(lender.broker_portal_url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Username</label>
                  <div className="flex items-center gap-1">
                    <InlineEditText
                      value={lender.broker_portal_username}
                      onValueChange={(value) => handleFieldUpdate('broker_portal_username', value)}
                      placeholder="Username"
                    />
                    {lender.broker_portal_username && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(lender.broker_portal_username!, 'Username')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Password</label>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 flex items-center gap-1 p-1.5 border rounded-md bg-muted/30 text-sm">
                      <span className="flex-1 font-mono text-xs">
                        {showPassword ? lender.broker_portal_password || '—' : '••••••••'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                    {lender.broker_portal_password && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(lender.broker_portal_password!, 'Password')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Loan Limits */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Loan Limits
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-md">
                <div>
                  <label className="text-xs text-muted-foreground">Minimum</label>
                  <InlineEditCurrency
                    value={lender.min_loan_amount ?? null}
                    onValueChange={(value) => handleFieldUpdate('min_loan_amount', value)}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Maximum</label>
                  <InlineEditCurrency
                    value={lender.max_loan_amount ?? null}
                    onValueChange={(value) => handleFieldUpdate('max_loan_amount', value)}
                    placeholder="$0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Notes</h3>
              <InlineEditNotes
                value={lender.notes}
                onValueChange={(value) => handleFieldUpdate('notes', value)}
                placeholder="Add notes about this lender..."
              />
            </div>

            <Separator />

            {/* Email History */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Email History ({emailLogs.length})
              </h3>
              {loadingEmails ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !lender.account_executive_email ? (
                <p className="text-sm text-muted-foreground italic">No email address configured for this lender.</p>
              ) : emailLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No emails sent to this lender yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {emailLogs.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{email.subject}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground flex-shrink-0">
                        {email.delivery_status && (
                          <Badge variant="outline" className={`text-xs ${getDeliveryStatusColor(email.delivery_status)}`}>
                            {email.delivery_status}
                          </Badge>
                        )}
                        {email.opened_at && (
                          <Badge variant="outline" className="text-xs bg-green-500/20 text-green-700">
                            Opened
                          </Badge>
                        )}
                        <span className="text-xs">
                          {formatDate(email.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Associated Clients */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Associated Clients ({associatedClients.length})
              </h3>
              {loadingClients ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : associatedClients.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No clients associated with this lender yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {associatedClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{client.first_name} {client.last_name}</span>
                        {client.loan_status && (
                          <Badge variant="outline" className="text-xs">
                            {client.loan_status}
                          </Badge>
                        )}
                        {client.is_closed && (
                          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">
                            Closed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{formatCurrency(client.loan_amount)}</span>
                        {client.close_date && (
                          <span className="text-xs">
                            {new Date(client.close_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}