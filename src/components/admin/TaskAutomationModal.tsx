import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { databaseService } from '@/services/database';

interface TaskAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: any;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

export function TaskAutomationModal({ open, onOpenChange, automation }: TaskAutomationModalProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'lead_created',
    trigger_config: {},
    task_name: '',
    task_description: '',
    assigned_to_user_id: '',
    task_priority: 'Medium',
    due_date_offset_days: null as number | null,
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (automation) {
      setFormData({
        name: automation.name || '',
        trigger_type: automation.trigger_type || 'lead_created',
        trigger_config: automation.trigger_config || {},
        task_name: automation.task_name || '',
        task_description: automation.task_description || '',
        assigned_to_user_id: automation.assigned_to_user_id || '',
        task_priority: automation.task_priority || 'Medium',
        due_date_offset_days: automation.due_date_offset_days,
        is_active: automation.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        trigger_type: 'lead_created',
        trigger_config: {},
        task_name: '',
        task_description: '',
        assigned_to_user_id: '',
        task_priority: 'Medium',
        due_date_offset_days: null,
        is_active: true,
      });
    }
  }, [automation, open]);

  const loadUsers = async () => {
    try {
      const data = await databaseService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.task_name || !formData.task_description || !formData.assigned_to_user_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (automation) {
        await databaseService.updateTaskAutomation(automation.id, formData);
        toast({
          title: 'Success',
          description: 'Automation updated successfully',
        });
      } else {
        await databaseService.createTaskAutomation(formData);
        toast({
          title: 'Success',
          description: 'Automation created successfully',
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save automation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{automation ? 'Edit' : 'Create'} Task Automation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Automation Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Follow up on new leads"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger_type">Trigger Type *</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_created">When a lead is created</SelectItem>
                <SelectItem value="status_changed">When status changes</SelectItem>
                <SelectItem value="date_arrives">When a date arrives</SelectItem>
                <SelectItem value="days_after_date">X days after a date</SelectItem>
                <SelectItem value="days_before_date">X days before a date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Task Details</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task_name">Task Name *</Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  placeholder="e.g., Follow up on new lead"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task_description">Task Description *</Label>
                <Textarea
                  id="task_description"
                  value={formData.task_description}
                  onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                  placeholder="Describe what needs to be done..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To *</Label>
                  <Select
                    value={formData.assigned_to_user_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_to_user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.task_priority}
                    onValueChange={(value) => setFormData({ ...formData, task_priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date_offset">Due Date Offset (days from now)</Label>
                <Input
                  id="due_date_offset"
                  type="number"
                  value={formData.due_date_offset_days || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    due_date_offset_days: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="e.g., 7 for one week"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Automation is active
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : automation ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
