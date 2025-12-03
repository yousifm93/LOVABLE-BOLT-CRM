import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import { EmailAutomationModal } from "./EmailAutomationModal";

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
  created_at: string;
  updated_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
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
  const { toast } = useToast();

  useEffect(() => {
    loadAutomations();
    loadTemplates();
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
      .select('id, name')
      .eq('is_archived', false)
      .order('name');
    setTemplates(data || []);
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

  return (
    <div className="space-y-4">
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
                          <TableHead className="w-[200px]">When</TableHead>
                          <TableHead className="w-[120px]">Who</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead className="w-[150px]">Template</TableHead>
                          <TableHead className="w-[80px] text-center">Active</TableHead>
                          <TableHead className="w-[100px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupAutomations.map(automation => (
                          <TableRow key={automation.id}>
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
                                  onClick={() => handleEdit(automation)}
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
        onSuccess={loadAutomations}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
