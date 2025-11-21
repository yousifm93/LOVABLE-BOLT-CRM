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
import { formatDateTime } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';

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
  const [testingAutomation, setTestingAutomation] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'lead_created',
    trigger_config: {} as { 
      field?: string; 
      target_status?: string; 
      target_stage_id?: string;
      frequency?: string;
      day_of_week?: number;
      day_of_month?: number;
      scheduled_hour?: number;
    },
    task_name: '',
    task_description: '',
    assigned_to_user_id: '',
    task_priority: 'Medium',
    due_date_offset_days: null as number | null,
    is_active: true,
    category: '',
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
        category: automation.category || '',
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
        category: '',
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
    
    // Sync automation name with task name
    const submissionData = {
      ...formData,
      name: formData.task_name
    };
    
    if (!submissionData.task_name || !submissionData.task_description || !submissionData.assigned_to_user_id) {
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
        await databaseService.updateTaskAutomation(automation.id, submissionData);
        toast({
          title: 'Success',
          description: 'Automation updated successfully',
        });
      } else {
        await databaseService.createTaskAutomation(submissionData);
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

  const handleTestAutomation = async () => {
    if (!automation?.id) return;
    
    setTestingAutomation(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-task-automation', {
        body: { automationId: automation.id }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task created successfully from automation',
      });
    } catch (error: any) {
      console.error('Error testing automation:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to test automation';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setTestingAutomation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {automation ? 'Edit Task Automation' : 'Create Task Automation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name + Created On (2 columns when editing) */}
          {automation ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task_name">Task Name *</Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  placeholder="e.g., Follow up on new lead"
                />
              </div>
              <div className="space-y-2">
                <Label>Created On</Label>
                <div className="text-sm text-muted-foreground pt-2">
                  {formatDateTime(automation.created_at)}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="task_name">Task Name *</Label>
              <Input
                id="task_name"
                value={formData.task_name}
                onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                placeholder="e.g., Follow up on new lead"
              />
            </div>
          )}

          {/* Trigger Type */}
          <div className="space-y-2">
            <Label htmlFor="trigger_type">Trigger Type *</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({ ...formData, trigger_type: value, trigger_config: {} })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_created">When a lead is created</SelectItem>
                <SelectItem value="status_changed">When status changes</SelectItem>
                <SelectItem value="pipeline_stage_changed">When pipeline stage changes</SelectItem>
                <SelectItem value="scheduled">On a schedule (time-based)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Changed Configuration */}
          {formData.trigger_type === 'status_changed' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium text-sm">Status Change Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="field">Field to Monitor *</Label>
                <Select
                  value={formData.trigger_config.field || ''}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger_config: { ...formData.trigger_config, field: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appraisal_status">Appraisal Status</SelectItem>
                  <SelectItem value="disclosure_status">Disclosure Status</SelectItem>
                  <SelectItem value="loan_status">Loan Status</SelectItem>
                  <SelectItem value="close_date">Close Date</SelectItem>
                  <SelectItem value="epo_status">EPO Status</SelectItem>
                  <SelectItem value="package_status">Package Status</SelectItem>
                  <SelectItem value="loan_amount">Loan Amount</SelectItem>
                  <SelectItem value="title_status">Title Status</SelectItem>
                  <SelectItem value="insurance_status">Insurance Status</SelectItem>
                  <SelectItem value="condo_status">Condo Status</SelectItem>
                </SelectContent>
                </Select>
              </div>

              {formData.trigger_config.field && (
                <div className="space-y-2">
                  <Label htmlFor="target_status">Target Status *</Label>
                  <Input
                    id="target_status"
                    value={formData.trigger_config.target_status || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      trigger_config: { ...formData.trigger_config, target_status: e.target.value }
                    })}
                    placeholder="e.g., Received, Scheduled"
                  />
                </div>
              )}
            </div>
          )}

          {/* Pipeline Stage Change Configuration */}
          {formData.trigger_type === 'pipeline_stage_changed' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium text-sm">Pipeline Stage Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="target_stage">Target Stage *</Label>
                <Select
                  value={formData.trigger_config.target_stage_id || ''}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger_config: { ...formData.trigger_config, target_stage_id: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="44d74bfb-c4f3-4f7d-a69e-e47ac67a5945">Pending App</SelectItem>
                    <SelectItem value="a4e162e0-5421-4d17-8ad5-4b1195bbc995">Screening</SelectItem>
                    <SelectItem value="09162eec-d2b2-48e5-86d0-9e66ee8b2af7">Pre-Qualified</SelectItem>
                    <SelectItem value="3cbf38ff-752e-4163-a9a3-1757499b4945">Pre-Approved</SelectItem>
                    <SelectItem value="76eb2e82-e1d9-4f2d-a57d-2120a25696db">Active</SelectItem>
                    <SelectItem value="acdfc6ba-7cbc-47af-a8c6-380d77aef6dd">Past Clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Scheduled Configuration */}
          {formData.trigger_type === 'scheduled' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium text-sm">Schedule Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.trigger_config.frequency || ''}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger_config: { ...formData.trigger_config, frequency: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly (specific date)</SelectItem>
                    <SelectItem value="monthly_first_weekday">Monthly (first [day] of month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weekly: Day of Week */}
              {(formData.trigger_config.frequency === 'weekly' || 
                formData.trigger_config.frequency === 'monthly_first_weekday') && (
                <div className="space-y-2">
                  <Label htmlFor="day_of_week">Day of Week *</Label>
                  <Select
                    value={formData.trigger_config.day_of_week?.toString() || ''}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      trigger_config: { ...formData.trigger_config, day_of_week: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Monthly: Day of Month */}
              {formData.trigger_config.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="day_of_month">Day of Month *</Label>
                  <Input
                    id="day_of_month"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.trigger_config.day_of_month || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      trigger_config: { 
                        ...formData.trigger_config, 
                        day_of_month: e.target.value ? parseInt(e.target.value) : undefined 
                      }
                    })}
                    placeholder="1-31"
                  />
                </div>
              )}

              {/* Time (Hour) */}
              <div className="space-y-2">
                <Label htmlFor="scheduled_hour">Time (Hour) *</Label>
                <Select
                  value={formData.trigger_config.scheduled_hour?.toString() || ''}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    trigger_config: { ...formData.trigger_config, scheduled_hour: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tasks will be created at the start of this hour
                </p>
              </div>
            </div>
          )}

          {/* Task Details Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium">Task Details</h3>
            

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="task_description">Task Description *</Label>
              <Textarea
                id="task_description"
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                placeholder="Describe what needs to be done..."
                rows={3}
              />
            </div>

            {/* Assigned To + Priority (2 columns) */}
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
                <Label htmlFor="priority">Priority *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="lead_status">Lead Status</SelectItem>
                    <SelectItem value="active_loan">Active Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date Offset */}
            <div className="space-y-2">
              <Label htmlFor="due_date_offset">Due Date Offset (days)</Label>
              <Input
                id="due_date_offset"
                type="number"
                value={formData.due_date_offset_days ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  due_date_offset_days: e.target.value ? parseInt(e.target.value) : null
                })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Days from trigger event to set as task due date
              </p>
            </div>
          </div>

          {/* Footer with Is Active toggle and buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
            
            <div className="flex gap-2">
              {automation && formData.trigger_type === 'scheduled' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestAutomation}
                  disabled={testingAutomation}
                >
                  {testingAutomation ? 'Testing...' : 'Test Automation'}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (automation ? 'Update' : 'Create')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
