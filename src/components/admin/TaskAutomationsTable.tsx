import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { databaseService } from '@/services/database';
import { TaskAutomationModal } from './TaskAutomationModal';
import { useToast } from '@/hooks/use-toast';
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
  };
  task_priority: string;
  due_date_offset_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  execution_count?: number;
}

export function TaskAutomationsTable() {
  const [automations, setAutomations] = useState<TaskAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<TaskAutomation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      const data = await databaseService.getTaskAutomations();
      setAutomations(data || []);
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

  const formatTrigger = (automation: TaskAutomation) => {
    switch (automation.trigger_type) {
      case 'lead_created':
        return 'When lead is created';
      case 'status_changed':
        return 'When status changes';
      case 'date_arrives':
        return `When ${automation.trigger_config.date_field} arrives`;
      case 'days_after_date':
        return `${automation.trigger_config.days_offset} days after ${automation.trigger_config.date_field}`;
      case 'days_before_date':
        return `${automation.trigger_config.days_offset} days before ${automation.trigger_config.date_field}`;
      default:
        return automation.trigger_type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading automations...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Task Automations</h3>
            <p className="text-sm text-muted-foreground">
              Configure rules to automatically create tasks based on triggers
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Automation
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Rule Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Task Name</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created On</TableHead>
              <TableHead>Updated On</TableHead>
              <TableHead className="text-center">Times Run</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {automations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No automations configured yet
                  </TableCell>
                </TableRow>
              ) : (
                automations.map((automation, index) => (
                  <TableRow key={automation.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{automation.name}</TableCell>
                    <TableCell className="text-sm">{formatTrigger(automation)}</TableCell>
                    <TableCell>{automation.task_name}</TableCell>
                    <TableCell>
                      {automation.assigned_user
                        ? `${automation.assigned_user.first_name} ${automation.assigned_user.last_name}`
                        : 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(automation.task_priority)}>
                        {automation.task_priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(automation.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(automation.updated_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
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
                          size="icon"
                          onClick={() => handleEdit(automation)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
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
        </div>
      </div>

      <TaskAutomationModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        automation={editingAutomation}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
