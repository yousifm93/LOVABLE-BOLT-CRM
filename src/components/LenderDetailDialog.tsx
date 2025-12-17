import { useState, useEffect } from "react";
import { Building2, Mail, Phone, User, Globe, Lock, Eye, EyeOff, DollarSign, Copy, ExternalLink, Users, History, Calendar, Package, Percent, FileText, ClipboardCopy, Hash, Send, Plus, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { InlineEditLenderType } from "@/components/ui/inline-edit-lender-type";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditPercentage } from "@/components/ui/inline-edit-percentage";
import { InlineEditProduct } from "@/components/ui/inline-edit-product";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  // New fields
  initial_approval_date?: string;
  renewed_on?: string;
  // Products
  product_bs_loan?: string;
  product_manufactured_homes?: string;
  product_fha?: string;
  product_va?: string;
  product_coop?: string;
  product_conv?: string;
  product_wvoe?: string;
  product_high_dti?: string;
  product_condo_hotel?: string;
  product_dr_loan?: string;
  product_fn?: string;
  product_nwc?: string;
  product_heloc?: string;
  product_5_8_unit?: string;
  product_9_plus_unit?: string;
  product_commercial?: string;
  product_construction?: string;
  product_land_loan?: string;
  product_fthb_dscr?: string;
  product_jumbo?: string;
  product_dpa?: string;
  product_no_income_primary?: string;
  product_low_fico?: string;
  product_inv_heloc?: string;
  product_no_seasoning_cor?: string;
  product_tbd_uw?: string;
  product_condo_review_desk?: string;
  product_condo_mip_issues?: string;
  product_nonqm_heloc?: string;
  product_fn_heloc?: string;
  product_no_credit?: string;
  product_558?: string;
  product_itin?: string;
  product_pl_program?: string;
  product_1099_program?: string;
  product_wvoe_family?: string;
  product_1099_less_1yr?: string;
  product_1099_no_biz?: string;
  product_omit_student_loans?: string;
  product_no_ratio_dscr?: string;
  // Clauses
  title_clause?: string;
  insurance_clause?: string;
  // Numbers
  condotel_min_sqft?: number;
  asset_dep_months?: number;
  min_fico?: number;
  min_sqft?: number;
  heloc_min_fico?: number;
  heloc_min?: number;
  max_cash_out_70_ltv?: number;
  // LTVs
  heloc_max_ltv?: number;
  fn_max_ltv?: number;
  bs_loan_max_ltv?: number;
  ltv_1099?: number;
  pl_max_ltv?: number;
  condo_inv_max_ltv?: number;
  jumbo_max_ltv?: number;
  wvoe_max_ltv?: number;
  dscr_max_ltv?: number;
  fha_max_ltv?: number;
  conv_max_ltv?: number;
  max_ltv?: number;
  // Other
  epo_period?: string;
  // Custom fields
  custom_fields?: Record<string, { value: any; type: string; label: string }>;
}

interface CustomField {
  key: string;
  value: any;
  type: string;
  label: string;
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
  from_email?: string;
  to_email?: string;
  direction?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
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
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Custom fields state
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [addFieldType, setAddFieldType] = useState<'product' | 'currency' | 'date' | 'number' | 'ltv'>('product');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  useEffect(() => {
    if (lender?.id && isOpen) {
      loadAssociatedClients();
      loadEmailLogs();
      loadEmailTemplates();
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
      const aeEmail = lender.account_executive_email;
      // Extract domain from AE email (e.g., "admortgage.com" from "david@admortgage.com")
      const domain = aeEmail.split('@')[1];
      
      // Query emails TO the AE, FROM the AE, or FROM the same domain
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, subject, timestamp, delivery_status, opened_at, from_email, to_email, direction')
        .or(`to_email.eq.${aeEmail},from_email.eq.${aeEmail},from_email.ilike.%@${domain}`)
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name, html')
        .eq('is_archived', false)
        .order('name');
      
      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error loading email templates:', error);
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

  const handleAddCustomField = async () => {
    if (!lender?.id || !newFieldLabel.trim()) return;
    
    const fieldKey = newFieldLabel.toLowerCase().replace(/\s+/g, '_');
    const currentCustomFields = lender.custom_fields || {};
    
    let parsedValue: any = newFieldValue;
    if (addFieldType === 'number' || addFieldType === 'ltv' || addFieldType === 'currency') {
      parsedValue = newFieldValue ? parseFloat(newFieldValue) : null;
    } else if (addFieldType === 'product') {
      parsedValue = newFieldValue || 'TBD';
    }
    
    const updatedCustomFields = {
      ...currentCustomFields,
      [fieldKey]: {
        value: parsedValue,
        type: addFieldType,
        label: newFieldLabel.trim()
      }
    };
    
    try {
      await databaseService.updateLender(lender.id, { custom_fields: updatedCustomFields });
      onLenderUpdated();
      setShowAddFieldModal(false);
      setNewFieldLabel('');
      setNewFieldValue('');
      toast({
        title: "Field Added",
        description: `Custom field "${newFieldLabel}" added successfully.`,
      });
    } catch (error) {
      console.error('Error adding custom field:', error);
      toast({
        title: "Error",
        description: "Failed to add custom field.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomField = async (fieldKey: string) => {
    if (!lender?.id) return;
    
    const currentCustomFields = { ...(lender.custom_fields || {}) };
    delete currentCustomFields[fieldKey];
    
    try {
      await databaseService.updateLender(lender.id, { custom_fields: currentCustomFields });
      onLenderUpdated();
      toast({
        title: "Field Removed",
        description: "Custom field removed successfully.",
      });
    } catch (error) {
      console.error('Error removing custom field:', error);
      toast({
        title: "Error",
        description: "Failed to remove custom field.",
        variant: "destructive",
      });
    }
  };

  const getCustomFieldsByType = (type: string): CustomField[] => {
    if (!lender?.custom_fields) return [];
    return Object.entries(lender.custom_fields)
      .filter(([_, field]) => field.type === type)
      .map(([key, field]) => ({ key, ...field }));
  };

  const openAddFieldModal = (type: 'product' | 'currency' | 'date' | 'number' | 'ltv') => {
    setAddFieldType(type);
    setNewFieldLabel('');
    setNewFieldValue('');
    setShowAddFieldModal(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  };

  const handleSendTemplateEmail = async (template: EmailTemplate) => {
    if (!lender?.account_executive_email) {
      toast({
        title: "Error",
        description: "No email address for this lender.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      // Replace merge tags
      let html = template.html;
      html = html.replace(/\{\{LenderName\}\}/g, lender.lender_name || '');
      html = html.replace(/\{\{AccountExecutiveName\}\}/g, lender.account_executive || '');
      const aeFirstName = lender.account_executive?.split(' ')[0] || '';
      html = html.replace(/\{\{AccountExecutiveFirstName\}\}/g, aeFirstName);

      const { error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: lender.account_executive_email,
          subject: template.name,
          html,
          from: 'scenarios@mortgagebolt.org',
          replyTo: 'yousif@mortgagebolt.com'
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Email sent to ${lender.account_executive_email}`,
      });

      // Reload email logs
      loadEmailLogs();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (!lender) return null;

  const initials = lender.lender_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '??';

  // Parse first/last name from account_executive
  const aeParts = lender.account_executive?.split(' ') || [];
  const aeFirstName = aeParts[0] || '';
  const aeLastName = aeParts.slice(1).join(' ') || '';

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

  // Product fields grouped for display
  const productFields = [
    { key: 'product_fha', label: 'FHA' },
    { key: 'product_va', label: 'VA' },
    { key: 'product_conv', label: 'Conventional' },
    { key: 'product_jumbo', label: 'Jumbo' },
    { key: 'product_bs_loan', label: 'Bank Statement' },
    { key: 'product_wvoe', label: 'WVOE' },
    { key: 'product_1099_program', label: '1099 Program' },
    { key: 'product_pl_program', label: 'P&L Program' },
    { key: 'product_itin', label: 'ITIN' },
    { key: 'product_dpa', label: 'DPA' },
    { key: 'product_heloc', label: 'HELOC' },
    { key: 'product_inv_heloc', label: 'Inv HELOC' },
    { key: 'product_fn_heloc', label: 'FN HELOC' },
    { key: 'product_nonqm_heloc', label: 'Non-QM HELOC' },
    { key: 'product_manufactured_homes', label: 'Manufactured' },
    { key: 'product_coop', label: 'Co-Op' },
    { key: 'product_condo_hotel', label: 'Condo Hotel' },
    { key: 'product_high_dti', label: 'High DTI' },
    { key: 'product_low_fico', label: 'Low FICO' },
    { key: 'product_no_credit', label: 'No Credit' },
    { key: 'product_dr_loan', label: 'DR Loan' },
    { key: 'product_fn', label: 'Foreign National' },
    { key: 'product_nwc', label: 'NWC' },
    { key: 'product_5_8_unit', label: '5-8 Unit' },
    { key: 'product_9_plus_unit', label: '9+ Units' },
    { key: 'product_commercial', label: 'Commercial' },
    { key: 'product_construction', label: 'Construction' },
    { key: 'product_land_loan', label: 'Land Loan' },
    { key: 'product_fthb_dscr', label: 'FTHB DSCR' },
    { key: 'product_no_income_primary', label: 'No Inc Primary' },
    { key: 'product_no_seasoning_cor', label: 'No Season C/O' },
    { key: 'product_tbd_uw', label: 'TBD UW' },
    { key: 'product_condo_review_desk', label: 'Condo Review' },
    { key: 'product_condo_mip_issues', label: 'Condo MIP' },
    { key: 'product_558', label: '558' },
    { key: 'product_wvoe_family', label: 'WVOE Family' },
    { key: 'product_1099_less_1yr', label: '1099 <1yr' },
    { key: 'product_1099_no_biz', label: '1099 No Biz' },
    { key: 'product_omit_student_loans', label: 'Omit Student' },
    { key: 'product_no_ratio_dscr', label: 'No Ratio DSCR' },
  ];

  const ltvFields = [
    { key: 'max_ltv', label: 'Max LTV' },
    { key: 'conv_max_ltv', label: 'Conv Max' },
    { key: 'fha_max_ltv', label: 'FHA Max' },
    { key: 'jumbo_max_ltv', label: 'Jumbo Max' },
    { key: 'bs_loan_max_ltv', label: 'BS Loan Max' },
    { key: 'wvoe_max_ltv', label: 'WVOE Max' },
    { key: 'dscr_max_ltv', label: 'DSCR Max' },
    { key: 'ltv_1099', label: '1099 Max' },
    { key: 'pl_max_ltv', label: 'P&L Max' },
    { key: 'fn_max_ltv', label: 'FN Max' },
    { key: 'heloc_max_ltv', label: 'HELOC Max' },
    { key: 'condo_inv_max_ltv', label: 'Condo Inv Max' },
  ];

  return (
    <>
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
              <Badge 
                variant="default" 
                className={lender.status === 'Active' 
                  ? "bg-green-500/20 text-green-700 border-green-500/30"
                  : "bg-red-500/20 text-red-700 border-red-500/30"}
              >
                {lender.status === 'Active' ? 'Approved' : 'Not Approved'}
              </Badge>
            </div>
            {/* Send Email Button with Template Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={!lender.account_executive_email || sendingEmail}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                {emailTemplates.length === 0 ? (
                  <DropdownMenuItem disabled>No templates available</DropdownMenuItem>
                ) : (
                  emailTemplates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleSendTemplateEmail(template)}
                    >
                      {template.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Account Executive */}
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
                  <div>
                    <InlineEditPhone
                      value={lender.account_executive_phone}
                      onValueChange={(value) => handleFieldUpdate('account_executive_phone', value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Portal Access */}
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

            {/* Loan Limits & Dates */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Loan Limits & Dates
                </h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openAddFieldModal('currency')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Min Loan</label>
                  <InlineEditCurrency
                    value={lender.min_loan_amount ?? null}
                    onValueChange={(value) => handleFieldUpdate('min_loan_amount', value)}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Loan</label>
                  <InlineEditCurrency
                    value={lender.max_loan_amount ?? null}
                    onValueChange={(value) => handleFieldUpdate('max_loan_amount', value)}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Initial Approval</label>
                  <InlineEditDate
                    value={lender.initial_approval_date}
                    onValueChange={(value) => handleFieldUpdate('initial_approval_date', value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Renewed On</label>
                  <InlineEditDate
                    value={lender.renewed_on}
                    onValueChange={(value) => handleFieldUpdate('renewed_on', value)}
                  />
                </div>
                {/* Custom currency/date fields */}
                {getCustomFieldsByType('currency').concat(getCustomFieldsByType('date')).map((field) => (
                  <div key={field.key} className="relative group">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                    {field.type === 'currency' ? (
                      <InlineEditCurrency
                        value={field.value ?? null}
                        onValueChange={(value) => {
                          const updated = { ...lender.custom_fields, [field.key]: { ...field, value } };
                          handleFieldUpdate('custom_fields', updated);
                        }}
                        placeholder="$0"
                      />
                    ) : (
                      <InlineEditDate
                        value={field.value}
                        onValueChange={(value) => {
                          const updated = { ...lender.custom_fields, [field.key]: { ...field, value } };
                          handleFieldUpdate('custom_fields', updated);
                        }}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteCustomField(field.key)}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openAddFieldModal('product')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Yes Products */}
              {(() => {
                const yesProducts = productFields.filter(({ key }) => (lender as any)[key] === 'Y');
                return yesProducts.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-600 mb-2">Yes ({yesProducts.length})</p>
                    <div className="grid grid-cols-5 gap-x-4 gap-y-2">
                      {yesProducts.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-muted-foreground truncate">{label}</label>
                          <InlineEditProduct
                            value={(lender as any)[key]}
                            onValueChange={(value) => handleFieldUpdate(key, value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              {/* No Products */}
              {(() => {
                const noProducts = productFields.filter(({ key }) => (lender as any)[key] === 'N');
                return noProducts.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-red-600 mb-2">No ({noProducts.length})</p>
                    <div className="grid grid-cols-5 gap-x-4 gap-y-2">
                      {noProducts.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-muted-foreground truncate">{label}</label>
                          <InlineEditProduct
                            value={(lender as any)[key]}
                            onValueChange={(value) => handleFieldUpdate(key, value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              {/* TBD/Unset Products */}
              {(() => {
                const tbdProducts = productFields.filter(({ key }) => {
                  const val = (lender as any)[key];
                  return val === 'TBD' || val === null || val === undefined || val === '';
                });
                return tbdProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">TBD / Unset ({tbdProducts.length})</p>
                    <div className="grid grid-cols-5 gap-x-4 gap-y-2">
                      {tbdProducts.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-muted-foreground truncate">{label}</label>
                          <InlineEditProduct
                            value={(lender as any)[key]}
                            onValueChange={(value) => handleFieldUpdate(key, value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <Separator />

            {/* Numbers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Numbers
                </h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openAddFieldModal('number')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Min FICO</label>
                  <InlineEditNumber
                    value={lender.min_fico ?? null}
                    onValueChange={(value) => handleFieldUpdate('min_fico', value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min Sqft</label>
                  <InlineEditNumber
                    value={lender.min_sqft ?? null}
                    onValueChange={(value) => handleFieldUpdate('min_sqft', value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Condotel Min Sqft</label>
                  <InlineEditNumber
                    value={lender.condotel_min_sqft ?? null}
                    onValueChange={(value) => handleFieldUpdate('condotel_min_sqft', value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Asset Dep (Mo)</label>
                  <InlineEditNumber
                    value={lender.asset_dep_months ?? null}
                    onValueChange={(value) => handleFieldUpdate('asset_dep_months', value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">HELOC Min FICO</label>
                  <InlineEditText
                    value={lender.heloc_min_fico?.toString() || ''}
                    onValueChange={(value) => handleFieldUpdate('heloc_min_fico', value ? parseInt(value) : null)}
                    placeholder="e.g., 680 / 75% LTV"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">HELOC Min</label>
                  <InlineEditCurrency
                    value={lender.heloc_min ?? null}
                    onValueChange={(value) => handleFieldUpdate('heloc_min', value)}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max C/O &gt;70% LTV</label>
                  <InlineEditCurrency
                    value={lender.max_cash_out_70_ltv ?? null}
                    onValueChange={(value) => handleFieldUpdate('max_cash_out_70_ltv', value)}
                    placeholder="$0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* LTVs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Maximum LTVs
                </h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openAddFieldModal('ltv')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                {ltvFields.map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <InlineEditPercentage
                      value={(lender as any)[key] ?? null}
                      onValueChange={(value) => handleFieldUpdate(key, value)}
                    />
                  </div>
                ))}
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

            {/* Clauses */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Clauses
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Title Clause</label>
                    {lender.title_clause && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => copyToClipboard(lender.title_clause!, 'Title clause')}
                      >
                        <ClipboardCopy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <InlineEditNotes
                    value={lender.title_clause}
                    onValueChange={(value) => handleFieldUpdate('title_clause', value)}
                    placeholder="Enter title clause..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Insurance Clause</label>
                    {lender.insurance_clause && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => copyToClipboard(lender.insurance_clause!, 'Insurance clause')}
                      >
                        <ClipboardCopy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <InlineEditNotes
                    value={lender.insurance_clause}
                    onValueChange={(value) => handleFieldUpdate('insurance_clause', value)}
                    placeholder="Enter insurance clause..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* EPO */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">EPO Period</h3>
              <InlineEditText
                value={lender.epo_period}
                onValueChange={(value) => handleFieldUpdate('epo_period', value)}
                placeholder="Enter EPO details..."
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
                        <span className="font-medium">
                          {client.first_name} {client.last_name}
                        </span>
                        {client.loan_status && (
                          <Badge variant="outline" className="text-xs">
                            {client.loan_status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {client.loan_amount && (
                          <span className="text-xs">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(client.loan_amount)}
                          </span>
                        )}
                        {client.close_date && (
                          <span className="text-xs">
                            Close: {new Date(client.close_date).toLocaleDateString()}
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

      {/* Add Custom Field Modal */}
      <Dialog open={showAddFieldModal} onOpenChange={setShowAddFieldModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fieldLabel">Field Name</Label>
              <Input
                id="fieldLabel"
                placeholder="Enter field name..."
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldValue">
                {addFieldType === 'product' ? 'Value (Y/N/TBD)' : 
                 addFieldType === 'ltv' ? 'Max LTV (%)' :
                 addFieldType === 'currency' ? 'Amount ($)' :
                 addFieldType === 'date' ? 'Date' : 'Value'}
              </Label>
              {addFieldType === 'product' ? (
                <Select value={newFieldValue} onValueChange={setNewFieldValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Yes</SelectItem>
                    <SelectItem value="N">No</SelectItem>
                    <SelectItem value="TBD">TBD</SelectItem>
                  </SelectContent>
                </Select>
              ) : addFieldType === 'date' ? (
                <Input
                  id="fieldValue"
                  type="date"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                />
              ) : (
                <Input
                  id="fieldValue"
                  type="number"
                  placeholder={addFieldType === 'ltv' ? 'e.g., 80' : addFieldType === 'currency' ? 'e.g., 500000' : 'Enter value...'}
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddFieldModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomField} disabled={!newFieldLabel.trim()}>
                Add Field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
