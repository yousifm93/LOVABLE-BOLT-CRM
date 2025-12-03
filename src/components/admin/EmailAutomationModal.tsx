import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EmailAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  pipeline_group: string;
  recipient_type: string;
  purpose: string | null;
  template_id: string | null;
  is_active: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
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

export function EmailAutomationModal({
  open,
  onOpenChange,
  automation,
  templates,
  onSuccess,
}: EmailAutomationModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'status_changed',
    pipeline_group: 'active',
    recipient_type: 'borrower',
    purpose: '',
    template_id: '',
    trigger_config: {} as any,
  });

  useEffect(() => {
    if (automation) {
      setFormData({
        name: automation.name,
        trigger_type: automation.trigger_type,
        pipeline_group: automation.pipeline_group,
        recipient_type: automation.recipient_type,
        purpose: automation.purpose || '',
        template_id: automation.template_id || '',
        trigger_config: automation.trigger_config || {},
      });
    } else {
      setFormData({
        name: '',
        trigger_type: 'status_changed',
        pipeline_group: 'active',
        recipient_type: 'borrower',
        purpose: '',
        template_id: '',
        trigger_config: {},
      });
    }
  }, [automation, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      name: formData.name,
      trigger_type: formData.trigger_type,
      pipeline_group: formData.pipeline_group,
      recipient_type: formData.recipient_type,
      purpose: formData.purpose || null,
      template_id: formData.template_id || null,
      trigger_config: formData.trigger_config,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{automation ? 'Edit Email Automation' : 'Add Email Automation'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Conditional trigger config fields */}
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
              onValueChange={v => setFormData(prev => ({ ...prev, template_id: v }))}
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

        <DialogFooter>
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
