import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Copy, Eye } from "lucide-react";

interface EmailAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  pipeline_group: string;
  recipient_type: string;
  cc_recipient_type: string | null;
  purpose: string | null;
  template_id: string | null;
  is_active: boolean;
  conditions: any | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
  subject?: string;
}

interface EmailAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation: EmailAutomation | null;
  templates: EmailTemplate[];
  onSuccess: () => void;
}

const PIPELINE_GROUPS = [
  { value: 'active', label: 'Active Loan' },
  { value: 'past_client', label: 'Past Client' },
  { value: 'leads', label: 'Leads' },
];

const RECIPIENT_TYPES = [
  { value: 'borrower', label: 'Borrower' },
  { value: 'buyer_agent', label: "Buyer's Agent" },
  { value: 'listing_agent', label: 'Listing Agent' },
  { value: 'lender', label: 'Lender AE' },
  { value: 'team_member', label: 'Team Member' },
];

const TRIGGER_TYPES = [
  { value: 'pipeline_stage_changed', label: 'On pipeline stage change' },
  { value: 'status_changed', label: 'On status change' },
  { value: 'date_based', label: 'X days after date' },
];

const STATUS_FIELDS = [
  { value: 'loan_status', label: 'Loan Status' },
  { value: 'disclosure_status', label: 'Disclosure Status' },
  { value: 'cd_status', label: 'CD Status' },
  { value: 'appraisal_status', label: 'Appraisal Status' },
  { value: 'title_status', label: 'Title Status' },
  { value: 'insurance_status', label: 'Insurance Status' },
  { value: 'package_status', label: 'Package Status' },
  { value: 'condo_status', label: 'Condo Status' },
];

const DATE_FIELDS = [
  { value: 'close_date', label: 'Close Date' },
  { value: 'lock_expiration_date', label: 'Lock Expiration Date' },
  { value: 'appr_date_time', label: 'Appraisal Date/Time' },
  { value: 'title_eta', label: 'Title ETA' },
  { value: 'appraisal_eta', label: 'Appraisal ETA' },
];

const PIPELINE_STAGES = [
  { value: 'Leads', label: 'Leads' },
  { value: 'Pending App', label: 'Pending App' },
  { value: 'Screening', label: 'Screening' },
  { value: 'Pre-Qualified', label: 'Pre-Qualified' },
  { value: 'Pre-Approved', label: 'Pre-Approved' },
  { value: 'Active', label: 'Active' },
  { value: 'Past Clients', label: 'Past Clients' },
];

const MERGE_TAGS = {
  'Borrower Info': [
    { tag: '{{first_name}}', description: 'Borrower first name' },
    { tag: '{{last_name}}', description: 'Borrower last name' },
    { tag: '{{email}}', description: 'Borrower email' },
    { tag: '{{phone}}', description: 'Borrower phone' },
  ],
  'Loan Details': [
    { tag: '{{lender_name}}', description: 'Lender name' },
    { tag: '{{lender_loan_number}}', description: 'Lender loan number' },
    { tag: '{{loan_amount}}', description: 'Loan amount' },
    { tag: '{{sales_price}}', description: 'Sales price' },
    { tag: '{{interest_rate}}', description: 'Interest rate' },
    { tag: '{{loan_program}}', description: 'Loan program type' },
    { tag: '{{appraisal_value}}', description: 'Appraised value' },
    { tag: '{{equity_amount}}', description: 'Equity amount (appraisal - sales price)' },
  ],
  'Dates': [
    { tag: '{{close_date}}', description: 'Closing date' },
    { tag: '{{closing_date}}', description: 'Closing date (alias)' },
    { tag: '{{lock_expiration_date}}', description: 'Lock expiration' },
  ],
  'Property': [
    { tag: '{{subject_address}}', description: 'Property street address' },
    { tag: '{{property_address}}', description: 'Full property address' },
    { tag: '{{city}}', description: 'City' },
    { tag: '{{state}}', description: 'State' },
    { tag: '{{zip}}', description: 'ZIP code' },
  ],
  'Contacts': [
    { tag: '{{buyer_agent_first_name}}', description: "Buyer's agent first name" },
    { tag: '{{buyer_agent_name}}', description: "Buyer's agent full name" },
    { tag: '{{buyer_agent_phone}}', description: "Buyer's agent phone" },
    { tag: '{{buyer_agent_email}}', description: "Buyer's agent email" },
    { tag: '{{listing_agent_first_name}}', description: "Listing agent first name" },
    { tag: '{{listing_agent_name}}', description: "Listing agent full name" },
    { tag: '{{listing_agent_phone}}', description: "Listing agent phone" },
    { tag: '{{listing_agent_email}}', description: "Listing agent email" },
    { tag: '{{title_contact_name}}', description: "Title contact name" },
    { tag: '{{title_contact_phone}}', description: "Title contact phone" },
    { tag: '{{title_contact_email}}', description: "Title contact email" },
  ],
  'Loan Officer': [
    { tag: '{{loan_officer_name}}', description: 'Loan officer full name' },
    { tag: '{{loan_officer_phone}}', description: 'Loan officer phone' },
  ],
};

const SAMPLE_DATA: Record<string, string> = {
  '{{first_name}}': 'John',
  '{{last_name}}': 'Smith',
  '{{email}}': 'john.smith@email.com',
  '{{phone}}': '(555) 123-4567',
  '{{lender_name}}': 'ABC Mortgage',
  '{{lender_loan_number}}': '1234567890',
  '{{loan_amount}}': '$450,000',
  '{{sales_price}}': '$500,000',
  '{{interest_rate}}': '6.875%',
  '{{loan_program}}': 'Conventional',
  '{{close_date}}': 'December 20, 2024',
  '{{closing_date}}': 'December 20, 2024',
  '{{lock_expiration_date}}': 'January 15, 2025',
  '{{subject_address}}': '123 Main Street',
  '{{property_address}}': '123 Main Street, Miami, FL 33131',
  '{{city}}': 'Miami',
  '{{state}}': 'FL',
  '{{zip}}': '33131',
  '{{buyer_agent_first_name}}': 'Sarah',
  '{{buyer_agent_name}}': 'Sarah Johnson',
  '{{buyer_agent_phone}}': '(555) 234-5678',
  '{{buyer_agent_email}}': 'sarah@realty.com',
  '{{listing_agent_first_name}}': 'Michael',
  '{{listing_agent_name}}': 'Michael Brown',
  '{{listing_agent_phone}}': '(555) 345-6789',
  '{{listing_agent_email}}': 'michael@realty.com',
  '{{title_contact_name}}': 'Lisa Williams',
  '{{title_contact_phone}}': '(555) 456-7890',
  '{{title_contact_email}}': 'lisa@titlecompany.com',
  '{{appraisal_value}}': '$520,000',
  '{{equity_amount}}': '$20,000',
  '{{loan_officer_name}}': 'Yousif Mohamed',
  '{{loan_officer_phone}}': '(305) 555-1234',
};

export function EmailAutomationModal({
  open,
  onOpenChange,
  automation,
  templates,
  onSuccess,
}: EmailAutomationModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showPreviewData, setShowPreviewData] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'status_changed',
    pipeline_group: 'active',
    recipient_type: 'borrower',
    cc_recipient_type: '' as string,
    purpose: '',
    template_id: '',
    trigger_config: {} as any,
    conditions: null as any,
  });

  const [templateData, setTemplateData] = useState({
    subject: '',
    html: '',
  });

  useEffect(() => {
    if (automation) {
      setFormData({
        name: automation.name,
        trigger_type: automation.trigger_type,
        pipeline_group: automation.pipeline_group,
        recipient_type: automation.recipient_type,
        cc_recipient_type: automation.cc_recipient_type || '',
        purpose: automation.purpose || '',
        template_id: automation.template_id || '',
        trigger_config: automation.trigger_config || {},
        conditions: automation.conditions || null,
      });
      
      // Load template data if template is selected
      if (automation.template_id) {
        loadTemplateData(automation.template_id);
      }
    } else {
      setFormData({
        name: '',
        trigger_type: 'status_changed',
        pipeline_group: 'active',
        recipient_type: 'borrower',
        cc_recipient_type: '',
        purpose: '',
        template_id: '',
        trigger_config: {},
        conditions: null,
      });
      setTemplateData({ subject: '', html: '' });
    }
    setActiveTab('settings');
  }, [automation, open]);

  const loadTemplateData = async (templateId: string) => {
    const { data } = await supabase
      .from('email_templates')
      .select('html, json_blocks')
      .eq('id', templateId)
      .single();
    
    if (data) {
      // Extract subject from json_blocks if available
      const jsonBlocks = data.json_blocks as any;
      const subject = jsonBlocks?.subject || '';
      setTemplateData({
        subject,
        html: data.html || '',
      });
    }
  };

  const handleTemplateChange = async (templateId: string) => {
    setFormData(prev => ({ ...prev, template_id: templateId }));
    if (templateId) {
      await loadTemplateData(templateId);
    } else {
      setTemplateData({ subject: '', html: '' });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    // First, save the template content if it's been modified
    if (formData.template_id && (templateData.subject || templateData.html)) {
      const { error: templateError } = await supabase
        .from('email_templates')
        .update({
          html: templateData.html,
          json_blocks: { subject: templateData.subject },
        })
        .eq('id', formData.template_id);

      if (templateError) {
        console.error('Error updating template:', templateError);
        toast({ title: "Error saving template", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: formData.name,
      trigger_type: formData.trigger_type,
      pipeline_group: formData.pipeline_group,
      recipient_type: formData.recipient_type,
      cc_recipient_type: formData.cc_recipient_type || null,
      purpose: formData.purpose || null,
      template_id: formData.template_id || null,
      trigger_config: formData.trigger_config,
      conditions: formData.conditions,
    };

    let error;
    if (automation) {
      ({ error } = await supabase
        .from('email_automations')
        .update(payload)
        .eq('id', automation.id));
    } else {
      ({ error } = await supabase
        .from('email_automations')
        .insert(payload));
    }

    setSaving(false);

    if (error) {
      toast({ title: "Error saving automation", variant: "destructive" });
    } else {
      toast({ title: automation ? "Automation updated" : "Automation created" });
      onOpenChange(false);
      onSuccess();
    }
  };

  const updateTriggerConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      trigger_config: { ...prev.trigger_config, [key]: value },
    }));
  };

  const copyMergeTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast({ title: "Copied to clipboard", description: tag });
  };

  const getPreviewHtml = () => {
    if (!templateData.html) return '<p style="color: #666;">No template content yet...</p>';
    
    let preview = templateData.html;
    if (showPreviewData) {
      Object.entries(SAMPLE_DATA).forEach(([tag, value]) => {
        preview = preview.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
      });
    }
    return preview;
  };

  const getPreviewSubject = () => {
    if (!templateData.subject) return 'No subject...';
    
    let preview = templateData.subject;
    if (showPreviewData) {
      Object.entries(SAMPLE_DATA).forEach(([tag, value]) => {
        preview = preview.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
      });
    }
    return preview;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{automation ? 'Edit Email Automation' : 'Add Email Automation'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Automation Settings</TabsTrigger>
            <TabsTrigger value="template">Email Content</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="settings" className="h-full overflow-auto p-1">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome email after pre-approval"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pipeline Group</Label>
                    <Select
                      value={formData.pipeline_group}
                      onValueChange={v => setFormData(prev => ({ ...prev, pipeline_group: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_GROUPS.map(g => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Recipient</Label>
                    <Select
                      value={formData.recipient_type}
                      onValueChange={v => setFormData(prev => ({ ...prev, recipient_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPIENT_TYPES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>CC (Optional)</Label>
                    <Select
                      value={formData.cc_recipient_type || "none"}
                      onValueChange={v => setFormData(prev => ({ ...prev, cc_recipient_type: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No CC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {RECIPIENT_TYPES.filter(r => r.value !== formData.recipient_type).map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select
                    value={formData.trigger_type}
                    onValueChange={v => setFormData(prev => ({ ...prev, trigger_type: v, trigger_config: {} }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.trigger_type === 'pipeline_stage_changed' && (
                  <div className="space-y-2">
                    <Label>Target Stage</Label>
                    <Select
                      value={formData.trigger_config.target_stage || ''}
                      onValueChange={v => updateTriggerConfig('target_stage', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.trigger_type === 'status_changed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status Field</Label>
                      <Select
                        value={formData.trigger_config.field || ''}
                        onValueChange={v => updateTriggerConfig('field', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_FIELDS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Status</Label>
                      <Input
                        value={formData.trigger_config.target_status || ''}
                        onChange={e => updateTriggerConfig('target_status', e.target.value)}
                        placeholder="e.g., Received"
                      />
                    </div>
                  </div>
                )}

                {formData.trigger_type === 'date_based' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date Field</Label>
                      <Select
                        value={formData.trigger_config.date_field || ''}
                        onValueChange={v => updateTriggerConfig('date_field', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FIELDS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Days Offset</Label>
                      <Input
                        type="number"
                        value={formData.trigger_config.days_offset || 0}
                        onChange={e => updateTriggerConfig('days_offset', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea
                    value={formData.purpose}
                    onChange={e => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Describe the purpose of this email..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Template</Label>
                  <Select
                    value={formData.template_id}
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="template" className="h-full overflow-hidden">
              <div className="grid grid-cols-[1fr_250px] gap-4 h-full">
                {/* Editor Section */}
                <div className="space-y-4 overflow-auto p-1">
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={templateData.subject}
                      onChange={e => setTemplateData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., ACTION REQUIRED: Your Loan Documents are Ready"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body (HTML)</Label>
                    <Textarea
                      value={templateData.html}
                      onChange={e => setTemplateData(prev => ({ ...prev, html: e.target.value }))}
                      placeholder="Enter your email HTML content here..."
                      className="font-mono text-sm min-h-[350px]"
                    />
                  </div>
                </div>

                {/* Merge Tags Panel */}
                <div className="border-l pl-4 overflow-auto">
                  <h4 className="font-medium text-sm mb-3">Merge Tags</h4>
                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-2">
                      {Object.entries(MERGE_TAGS).map(([section, tags]) => (
                        <Collapsible
                          key={section}
                          open={expandedSections[section] !== false}
                          onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, [section]: open }))}
                        >
                          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary w-full text-left py-1">
                            {expandedSections[section] !== false ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            {section}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 ml-4 mt-1">
                              {tags.map(({ tag, description }) => (
                                <div
                                  key={tag}
                                  className="flex items-center justify-between gap-2 text-xs p-1.5 rounded hover:bg-muted cursor-pointer group"
                                  onClick={() => copyMergeTag(tag)}
                                >
                                  <div>
                                    <code className="text-primary font-mono">{tag}</code>
                                    <p className="text-muted-foreground">{description}</p>
                                  </div>
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="h-full overflow-auto">
              <div className="space-y-4 p-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Email Preview</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewData(!showPreviewData)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreviewData ? 'Show Merge Tags' : 'Show Sample Data'}
                  </Button>
                </div>
                
                {/* Email Preview Container */}
                <div className="border rounded-lg overflow-hidden bg-background">
                  {/* Email Header */}
                  <div className="border-b p-3 bg-muted/30">
                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-16">From:</span>
                        <span>Yousif Mohamed &lt;yousif@mortgagebolt.org&gt;</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-16">To:</span>
                        <span>{showPreviewData ? 'john.smith@email.com' : '{{email}}'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-16">Subject:</span>
                        <span className="font-medium">{getPreviewSubject()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Email Body */}
                  <div className="p-4">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : automation ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
