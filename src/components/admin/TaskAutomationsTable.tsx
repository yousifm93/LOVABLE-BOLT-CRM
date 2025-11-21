import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { databaseService } from '@/services/database';
import { TaskAutomationModal } from './TaskAutomationModal';
import { TaskAutomationExecutionHistoryModal } from './TaskAutomationExecutionHistoryModal';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/utils/formatters';
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
}

export function TaskAutomationsTable() {
  const [automations, setAutomations] = useState<TaskAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<TaskAutomation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);
  const [executionHistoryOpen, setExecutionHistoryOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<{id: string, name: string} | null>(null);
  const { toast } = useToast();

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
        variant: 'destructive',
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
        description: `Automation ${isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation status',
        variant: 'destructive',
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
        description: 'Automation deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete automation',
        variant: 'destructive',
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

  const handleExecutionHistoryClick = (automation: TaskAutomation) => {
    setSelectedAutomation({ id: automation.id, name: automation.name });
    setExecutionHistoryOpen(true);
  };

  const formatTrigger = (automation: TaskAutomation) => {
    if (automation.trigger_type === 'lead_created') {
      return 'When a lead is created';
    } else if (automation.trigger_type === 'status_changed') {
      const config = automation.trigger_config;
      const field = config?.field;
      const targetStatus = config?.target_status;
      
      if (field === 'close_date') {
        return 'When Close Date changes (if Disc Status = Signed)';
      }
      
      if (field && targetStatus) {
        const fieldLabel = field
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return `When ${fieldLabel} changes to '${targetStatus}'`;
      }
      return 'When status changes';
    }
    return automation.trigger_type;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading automations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Task Automations</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Task Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Last Run On</TableHead>
            <TableHead className="text-center">Times Run</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {automations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No automations found. Create your first automation to get started.
              </TableCell>
            </TableRow>
          ) : (
            automations.map((automation, index) => (
              <TableRow key={automation.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">{automation.task_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTrigger(automation)}
                </TableCell>
                <TableCell>
                  {automation.assigned_user ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        firstName={automation.assigned_user.first_name}
                        lastName={automation.assigned_user.last_name}
                        email={automation.assigned_user.email || ''}
                        size="sm"
                      />
                      <span className="text-sm">
                        {automation.assigned_user.first_name} {automation.assigned_user.last_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {automation.last_run_at ? (
                    <span className="text-sm">{formatDateTime(automation.last_run_at)}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleExecutionHistoryClick(automation)}
                  >
                    {automation.execution_count || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={automation.is_active}
                    onCheckedChange={(checked) => handleToggleActive(automation.id, checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(automation)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAutomationToDelete(automation.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TaskAutomationModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        automation={editingAutomation}
      />

      <TaskAutomationExecutionHistoryModal
        open={executionHistoryOpen}
        onOpenChange={setExecutionHistoryOpen}
        automationId={selectedAutomation?.id || ''}
        automationName={selectedAutomation?.name || ''}
      />

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
