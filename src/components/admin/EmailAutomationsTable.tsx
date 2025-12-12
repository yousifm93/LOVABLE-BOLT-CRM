import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Mail, AlertTriangle, TestTube2, Send, Search, User, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmailAutomationModal } from "./EmailAutomationModal";
import { EmailAutomationExecutionHistoryModal } from "./EmailAutomationExecutionHistoryModal";
import { formatDistanceToNow } from "date-fns";

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
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  execution_count: number | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
  subject?: string;
}

interface EmailAutomationSettings {
  id: string;
  test_mode_enabled: boolean;
  test_borrower_email: string;
  test_buyer_agent_email: string;
  test_listing_agent_email: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  loan_status: string | null;
}

const PIPELINE_GROUPS = [
  { id: 'active', label: 'Active Loan Automations' },
  { id: 'past_client', label: 'Past Client Automations' },
  { id: 'leads', label: 'Lead Automations' },
];

const RECIPIENT_LABELS: Record<string, string> = {
  borrower: 'Borrower',
  buyer_agent: "Buyer's Agent",
  listing_agent: 'Listing Agent',
  lender: 'Lender AE',
  team_member: 'Team Member',
};

const TRIGGER_LABELS: Record<string, string> = {
  pipeline_stage_changed: 'On stage change',
  status_changed: 'On status change',
  date_based: 'X days after date',
};

export function EmailAutomationsTable() {
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [settings, setSettings] = useState<EmailAutomationSettings | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedTestLeadId, setSelectedTestLeadId] = useState<string>('');
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    active: true,
    past_client: true,
    leads: true,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<EmailAutomation | null>(null);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [executionHistoryOpen, setExecutionHistoryOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAutomations();
    loadTemplates();
    loadSettings();
    loadLeads();
  }, []);

  const loadAutomations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_automations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading email automations:', error);
      toast({ title: "Error loading automations", variant: "destructive" });
    } else {
      setAutomations(data || []);
    }
    setLoading(false);
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, html')
      .eq('is_archived', false)
      .order('name');
    setTemplates(data || []);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('email_automation_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error loading settings:', error);
    } else {
      setSettings(data);
    }
  };

  const loadLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, loan_status')
      .order('first_name');
    setLeads(data || []);
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleToggleActive = async (automation: EmailAutomation) => {
    const { error } = await supabase
      .from('email_automations')
      .update({ is_active: !automation.is_active })
      .eq('id', automation.id);

    if (error) {
      toast({ title: "Error updating automation", variant: "destructive" });
    } else {
      setAutomations(prev =>
        prev.map(a => a.id === automation.id ? { ...a, is_active: !a.is_active } : a)
      );
    }
  };

  const handleToggleTestMode = async () => {
    if (!settings) return;
    
    const newValue = !settings.test_mode_enabled;
    const { error } = await supabase
      .from('email_automation_settings')
      .update({ test_mode_enabled: newValue })
      .eq('id', settings.id);

    if (error) {
      toast({ title: "Error updating test mode", variant: "destructive" });
    } else {
      setSettings({ ...settings, test_mode_enabled: newValue });
      toast({ 
        title: newValue ? "Test Mode Enabled" : "Test Mode Disabled",
        description: newValue 
          ? "Emails will be sent to test addresses only" 
          : "Emails will be sent to actual recipients"
      });
    }
  };

  const handleUpdateTestEmail = async (field: keyof EmailAutomationSettings, value: string) => {
    if (!settings) return;
    
    const { error } = await supabase
      .from('email_automation_settings')
      .update({ [field]: value })
      .eq('id', settings.id);

    if (error) {
      toast({ title: "Error updating email", variant: "destructive" });
    } else {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleEdit = (automation: EmailAutomation) => {
    setEditingAutomation(automation);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!automationToDelete) return;
    
    const { error } = await supabase
      .from('email_automations')
      .delete()
      .eq('id', automationToDelete.id);

    if (error) {
      toast({ title: "Error deleting automation", variant: "destructive" });
    } else {
      toast({ title: "Automation deleted" });
      loadAutomations();
    }
    setDeleteDialogOpen(false);
    setAutomationToDelete(null);
  };

  const handleSendTestEmail = async (automation: EmailAutomation) => {
    setSendingTest(automation.id);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-email-automation', {
        body: {
          automationId: automation.id,
          testMode: true,
          leadId: selectedTestLeadId || undefined,
          useRandomLead: !selectedTestLeadId
        }
      });

      if (error) throw error;
      
      const selectedLead = leads.find(l => l.id === selectedTestLeadId);
      const leadName = selectedLead ? `${selectedLead.first_name} ${selectedLead.last_name}` : 'random lead';
      
      toast({ 
        title: "Test Email Sent",
        description: `Email sent using ${leadName}'s fields to ${settings?.test_borrower_email || 'test address'}`
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({ 
        title: "Error sending test email", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSendingTest(null);
    }
  };

  const formatTrigger = (automation: EmailAutomation): string => {
    const config = automation.trigger_config || {};
    switch (automation.trigger_type) {
      case 'pipeline_stage_changed':
        return `Stage → ${config.target_stage || '?'}`;
      case 'status_changed':
        return `${config.field || '?'} → ${config.target_status || '?'}`;
      case 'date_based':
        return `${config.days_offset || 0} days after ${config.date_field || '?'}`;
      default:
        return TRIGGER_LABELS[automation.trigger_type] || automation.trigger_type;
    }
  };

  const getTemplateNameById = (templateId: string | null): string => {
    if (!templateId) return '—';
    const template = templates.find(t => t.id === templateId);
    return template?.name || '—';
  };

  const getAutomationsByGroup = (group: string) => {
    return automations.filter(a => a.pipeline_group === group);
  };

  const selectedLead = leads.find(l => l.id === selectedTestLeadId);

  return (
    <div className="space-y-4">
      {/* Test Mode Card */}
      <Card className={settings?.test_mode_enabled ? "border-amber-500 bg-amber-50/50" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings?.test_mode_enabled ? 'bg-amber-100' : 'bg-muted'}`}>
                <TestTube2 className={`h-5 w-5 ${settings?.test_mode_enabled ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Test Mode</h3>
                  {settings?.test_mode_enabled && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      ACTIVE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings?.test_mode_enabled 
                    ? "All automated emails will be sent to test addresses below instead of actual recipients"
                    : "Automated emails will be sent to actual borrowers and agents"
                  }
                </p>
              </div>
            </div>
            <Switch 
              checked={settings?.test_mode_enabled || false}
              onCheckedChange={handleToggleTestMode}
            />
          </div>
          
          {settings?.test_mode_enabled && (
            <div className="mt-4 pt-4 border-t border-amber-200 space-y-4">
              {/* Borrower Selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Test with Borrower's Fields</Label>
                <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={leadSearchOpen}
                      className="w-full justify-between h-9 text-sm"
                    >
                      {selectedLead ? (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {selectedLead.first_name} {selectedLead.last_name}
                          {selectedLead.loan_status && (
                            <Badge variant="secondary" className="ml-2 text-xs">{selectedLead.loan_status}</Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select a borrower for merge tags...</span>
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search borrowers..." />
                      <CommandList>
                        <CommandEmpty>No borrower found.</CommandEmpty>
                        <CommandGroup>
                          {leads.map(lead => (
                            <CommandItem
                              key={lead.id}
                              value={`${lead.first_name} ${lead.last_name} ${lead.email}`}
                              onSelect={() => {
                                setSelectedTestLeadId(lead.id);
                                setLeadSearchOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{lead.first_name} {lead.last_name}</span>
                                {lead.loan_status && (
                                  <Badge variant="outline" className="text-xs">{lead.loan_status}</Badge>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedLead && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Merge tags will use this borrower's data (email will still go to test addresses)
                  </p>
                )}
              </div>

              {/* Test Email Addresses */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Borrower Test Email</Label>
                  <Input 
                    value={settings.test_borrower_email}
                    onChange={(e) => handleUpdateTestEmail('test_borrower_email', e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Buyer's Agent Test Email</Label>
                  <Input 
                    value={settings.test_buyer_agent_email}
                    onChange={(e) => handleUpdateTestEmail('test_buyer_agent_email', e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Listing Agent Test Email</Label>
                  <Input 
                    value={settings.test_listing_agent_email}
                    onChange={(e) => handleUpdateTestEmail('test_listing_agent_email', e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Email Automations</h2>
        <Button onClick={() => { setEditingAutomation(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {PIPELINE_GROUPS.map(group => {
            const groupAutomations = getAutomationsByGroup(group.id);
            const isOpen = openSections[group.id];

            return (
              <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleSection(group.id)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer p-2 bg-muted/50 rounded-lg hover:bg-muted">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium">{group.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {groupAutomations.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {groupAutomations.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No email automations in this group
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] text-center">#</TableHead>
                          <TableHead className="w-[180px]">When</TableHead>
                          <TableHead className="w-[100px]">Who</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead className="w-[130px]">Template</TableHead>
                          <TableHead className="w-[90px]">Last Run</TableHead>
                          <TableHead className="w-[70px] text-center">Active</TableHead>
                          <TableHead className="w-[160px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupAutomations.map((automation, index) => (
                          <TableRow key={automation.id}>
                            <TableCell className="text-center text-sm text-muted-foreground font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {formatTrigger(automation)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {RECIPIENT_LABELS[automation.recipient_type] || automation.recipient_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {automation.purpose || '—'}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {getTemplateNameById(automation.template_id)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {automation.last_run_at ? (
                                <span title={new Date(automation.last_run_at).toLocaleString()}>
                                  {formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">Never</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={automation.is_active}
                                onCheckedChange={() => handleToggleActive(automation)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSelectedAutomation({ id: automation.id, name: automation.name });
                                    setExecutionHistoryOpen(true);
                                  }}
                                  title="View execution history"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleSendTestEmail(automation)}
                                  disabled={sendingTest === automation.id}
                                  title="Send Test Email"
                                >
                                  <Send className={`h-4 w-4 ${sendingTest === automation.id ? 'animate-pulse' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(automation)}
                                  title="Edit automation"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setAutomationToDelete(automation);
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="Delete automation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <EmailAutomationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        automation={editingAutomation}
        templates={templates}
        onSuccess={() => {
          loadAutomations();
          loadTemplates();
        }}
      />

      <EmailAutomationExecutionHistoryModal
        open={executionHistoryOpen}
        onOpenChange={setExecutionHistoryOpen}
        automationId={selectedAutomation?.id || ''}
        automationName={selectedAutomation?.name || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
