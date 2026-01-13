import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight, History, Play } from 'lucide-react';
import { databaseService } from '@/services/database';
import { supabase } from '@/integrations/supabase/client';
import { TaskAutomationModal } from './TaskAutomationModal';
import { TaskAutomationExecutionHistoryModal } from './TaskAutomationExecutionHistoryModal';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getCompletionRequirementLabel } from '@/services/statusChangeValidation';
import { formatDistanceToNow } from 'date-fns';

interface TaskAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  task_name: string;
  task_description: string;
  assigned_to_user_id: string | null;
  assigned_user?: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  task_priority: string;
  due_date_offset_days: number | null;
  is_active: boolean;
  created_at: string;
  last_run_at: string | null;
  execution_count?: number;
  category?: string;
  subcategory?: string;
  completion_requirement_type?: string;
}

export function TaskAutomationsTable() {
  const [automations, setAutomations] = useState<TaskAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<TaskAutomation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);
  const [executionHistoryOpen, setExecutionHistoryOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState({
    marketing: false,
    lead_status: false,
    active_loan: false,
    past_client: false
  });
  const [openSubcategories, setOpenSubcategories] = useState({
    appraisal: false,
    closing: false,
    submission: false,
    other: false
  });
  const { toast } = useToast();

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category as keyof typeof prev]
    }));
  };

  const toggleSubcategory = (subcategory: string) => {
    setOpenSubcategories(prev => ({
      ...prev,
      [subcategory]: !prev[subcategory as keyof typeof prev]
    }));
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      const data = await databaseService.getTaskAutomations();
      setAutomations((data || []) as unknown as TaskAutomation[]);
    } catch (error) {
      console.error('Error loading automations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task automations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await databaseService.toggleTaskAutomationStatus(id, isActive);
      await loadAutomations();
      toast({
        title: 'Success',
        description: `Automation ${isActive ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation status',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (automation: TaskAutomation) => {
    setEditingAutomation(automation);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!automationToDelete) return;
    try {
      await databaseService.deleteTaskAutomation(automationToDelete);
      await loadAutomations();
      toast({
        title: 'Success',
        description: 'Automation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete automation',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setAutomationToDelete(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingAutomation(null);
    loadAutomations();
  };

  const handleManualTrigger = async (automation: TaskAutomation) => {
    setTriggeringId(automation.id);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-task-automation', {
        body: { automationId: automation.id }
      });
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Task automation triggered successfully'
      });
      await loadAutomations();
    } catch (error: any) {
      console.error('Error triggering automation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to trigger automation',
        variant: 'destructive'
      });
    } finally {
      setTriggeringId(null);
    }
  };

  const formatTrigger = (automation: TaskAutomation) => {
    if (automation.trigger_type === 'lead_created') {
      return 'When a lead is created';
    }
    
    if (automation.trigger_type === 'date_based') {
      const config = automation.trigger_config as {
        date_field?: string;
        days_offset?: number;
        condition_field?: string;
        condition_value?: string;
        condition_operator?: string;
      };
      
      const offset = config.days_offset ?? 0;
      const dateField = config.date_field || 'date';
      
      const fieldLabel = dateField
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const when = offset === 0 
        ? 'On'
        : offset < 0 
          ? `${Math.abs(offset)} day(s) before`
          : `${offset} day(s) after`;
      
      const operator = config.condition_operator === 'not_equals' ? '≠' : '=';
      const condition = config.condition_field && config.condition_value
        ? ` (if ${config.condition_field.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${operator} "${config.condition_value}")`
        : '';
      
      return `${when} ${fieldLabel}${condition}`;
    }
    
    if (automation.trigger_type === 'scheduled') {
      const config = automation.trigger_config as {
        frequency?: string;
        day_of_week?: number;
        day_of_month?: number;
        scheduled_hour?: number;
      };
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const hour = config.scheduled_hour ?? 0;
      const timeStr = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      if (config.frequency === 'daily') {
        return `Daily at ${timeStr}`;
      } else if (config.frequency === 'weekly') {
        const dayName = config.day_of_week !== undefined ? dayNames[config.day_of_week] : 'Unknown';
        return `Every ${dayName} at ${timeStr}`;
      } else if (config.frequency === 'monthly') {
        return `Monthly on day ${config.day_of_month} at ${timeStr}`;
      } else if (config.frequency === 'monthly_first_weekday') {
        const dayName = config.day_of_week !== undefined ? dayNames[config.day_of_week] : 'Unknown';
        return `First ${dayName} of month at ${timeStr}`;
      }
      return 'Scheduled';
    }
    
    if (automation.trigger_type === 'pipeline_stage_changed') {
      const config = automation.trigger_config as {
        target_stage_id?: string;
      };
      const stageMap: Record<string, string> = {
        '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': 'Pending App',
        'a4e162e0-5421-4d17-8ad5-4b1195bbc995': 'Screening',
        '09162eec-d2b2-48e5-86d0-9e66ee8b2af7': 'Pre-Qualified',
        '3cbf38ff-752e-4163-a9a3-1757499b4945': 'Pre-Approved',
        '76eb2e82-e1d9-4f2d-a57d-2120a25696db': 'Active',
        'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd': 'Past Clients'
      };
      const stageName = config.target_stage_id ? stageMap[config.target_stage_id] : 'Unknown';
      return `When lead moves to ${stageName}`;
    }
    
    if (automation.trigger_type === 'status_changed') {
      const config = automation.trigger_config;
      const field = config?.field;
      const targetStatus = config?.target_status;
      if (field === 'close_date') {
        return 'When Close Date changes (if Disc Status = Signed)';
      }
      if (field === 'loan_amount') {
        return 'When Loan Amount changes (if Disc Status = Signed)';
      }
      if (field && targetStatus) {
        if (field === 'loan_status') {
          return `When Loan Status changes to '${targetStatus}'`;
        }
        const fieldLabel = field.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return `When ${fieldLabel} changes to '${targetStatus}'`;
      }
      return 'When status changes';
    }
    
    return automation.trigger_type;
  };

  if (loading) {
    return <div className="text-center py-8">Loading automations...</div>;
  }

  // Group automations by category
  const groupedAutomations = {
    marketing: automations.filter(a => a.category === 'marketing'),
    lead_status: automations.filter(a => a.category === 'lead_status'),
    active_loan: automations.filter(a => a.category === 'active_loan'),
    past_client: automations.filter(a => a.category === 'past_client')
  };
  
  // Group active_loan automations by subcategory
  const activeLoanBySubcategory = {
    appraisal: groupedAutomations.active_loan.filter(a => a.subcategory === 'appraisal'),
    closing: groupedAutomations.active_loan.filter(a => a.subcategory === 'closing'),
    submission: groupedAutomations.active_loan.filter(a => a.subcategory === 'submission'),
    other: groupedAutomations.active_loan.filter(a => a.subcategory === 'other' || !a.subcategory)
  };
  
  const categoryLabels = {
    marketing: 'Marketing Automations',
    lead_status: 'Lead Status Automations',
    active_loan: 'Active Loan Automations',
    past_client: 'Past Client Automations'
  };
  
  const subcategoryLabels = {
    appraisal: 'Appraisal',
    closing: 'Closing',
    submission: 'Submission',
    other: 'Other'
  };

  // Render table for automations (reusable)
  const renderAutomationTable = (items: TaskAutomation[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Task Name</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Contingency</TableHead>
          <TableHead className="w-[100px]">Last Run</TableHead>
          <TableHead className="text-center">Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((automation, index) => (
          <TableRow key={automation.id}>
            <TableCell className="font-medium py-2">{index + 1}</TableCell>
            <TableCell className="font-medium py-2">{automation.task_name}</TableCell>
            <TableCell className="text-sm py-2">
              {automation.assigned_user ? (
                <span className="text-foreground">
                  {automation.assigned_user.first_name} {automation.assigned_user.last_name}
                </span>
              ) : (
                <span className="text-muted-foreground/50">Unassigned</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground py-2">
              {formatTrigger(automation)}
            </TableCell>
            <TableCell className="text-sm py-2">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">
                  {getCompletionRequirementLabel(automation.completion_requirement_type || null)}
                </span>
                {(automation.completion_requirement_type === 'log_call_buyer_agent' ||
                  automation.completion_requirement_type === 'log_call_listing_agent' ||
                  automation.task_name.toLowerCase().includes("buyer's agent") ||
                  automation.task_name.toLowerCase().includes("buyer agent") ||
                  automation.task_name.toLowerCase().includes("listing agent")) && (
                  <Badge variant="outline" className="text-xs w-fit text-amber-600 border-amber-300 bg-amber-50">
                    Skipped on Refinance
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground py-2">
              {automation.last_run_at ? (
                <span title={new Date(automation.last_run_at).toLocaleString()}>
                  {formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true })}
                </span>
              ) : (
                <span className="text-muted-foreground/50">Never</span>
              )}
            </TableCell>
            <TableCell className="text-center py-2">
              <Switch 
                checked={automation.is_active} 
                onCheckedChange={(checked) => handleToggleActive(automation.id, checked)} 
              />
            </TableCell>
            <TableCell className="text-right py-2">
              <div className="flex justify-end gap-1">
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
                  onClick={() => handleManualTrigger(automation)} 
                  disabled={triggeringId === automation.id}
                  title="Test automation"
                >
                  <Play className={`h-4 w-4 ${triggeringId === automation.id ? 'animate-pulse' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(automation)}
                  title="Edit automation"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setAutomationToDelete(automation.id);
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
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedAutomations).map(([category, items]) => {
          if (items.length === 0) return null;
          
          // Special handling for active_loan category (with sub-groups)
          if (category === 'active_loan') {
            return (
              <Collapsible 
                key={category} 
                open={openCategories[category as keyof typeof openCategories]} 
                onOpenChange={() => toggleCategory(category)} 
                className="mx-[5px]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {openCategories[category as keyof typeof openCategories] ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </Button>
                  </CollapsibleTrigger>
                  <h3 className="text-lg font-semibold">
                    {categoryLabels[category as keyof typeof categoryLabels]} ({items.length})
                  </h3>
                </div>
                <CollapsibleContent>
                  <div className="space-y-4 pl-4">
                    {Object.entries(activeLoanBySubcategory).map(([subcat, subcatItems]) => {
                      if (subcatItems.length === 0) return null;
                      
                      return (
                        <Collapsible 
                          key={subcat}
                          open={openSubcategories[subcat as keyof typeof openSubcategories]}
                          onOpenChange={() => toggleSubcategory(subcat)}
                          className="mx-[5px]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                {openSubcategories[subcat as keyof typeof openSubcategories] ? 
                                  <ChevronDown className="h-3 w-3" /> : 
                                  <ChevronRight className="h-3 w-3" />
                                }
                              </Button>
                            </CollapsibleTrigger>
                            <h4 className="text-sm font-medium text-muted-foreground">
                              {subcategoryLabels[subcat as keyof typeof subcategoryLabels]} ({subcatItems.length})
                            </h4>
                          </div>
                          <CollapsibleContent>
                            {renderAutomationTable(subcatItems)}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }
          
          // Regular category rendering for other categories
          return (
            <Collapsible 
              key={category} 
              open={openCategories[category as keyof typeof openCategories]} 
              onOpenChange={() => toggleCategory(category)} 
              className="mx-[5px]"
            >
              <div className="flex items-center gap-2 mb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {openCategories[category as keyof typeof openCategories] ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <h3 className="text-lg font-semibold">
                  {categoryLabels[category as keyof typeof categoryLabels]} ({items.length})
                </h3>
              </div>
              <CollapsibleContent>
                {renderAutomationTable(items)}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <TaskAutomationModal open={modalOpen} onOpenChange={handleModalClose} automation={editingAutomation} />

      <TaskAutomationExecutionHistoryModal open={executionHistoryOpen} onOpenChange={setExecutionHistoryOpen} automationId={selectedAutomation?.id || ''} automationName={selectedAutomation?.name || ''} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAutomationToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
