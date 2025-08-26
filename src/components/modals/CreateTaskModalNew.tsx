import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { databaseService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { TaskFormData, TaskPriority, TaskStatus, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/types/task';

interface CreateTaskModalNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
  initialData?: Partial<TaskFormData>;
}

export function CreateTaskModalNew({
  open,
  onOpenChange,
  onTaskCreated,
  initialData
}: CreateTaskModalNewProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    borrower_id: null,
    priority: 'Medium',
    task_order: 0,
    assigned_to: null,
    due_date: null,
    status: 'Open'
  });

  useEffect(() => {
    if (open) {
      loadData();
      setFormData({
        name: initialData?.name || '',
        borrower_id: initialData?.borrower_id || null,
        priority: initialData?.priority || 'Medium',
        task_order: initialData?.task_order || 0,
        assigned_to: initialData?.assigned_to || null,
        due_date: initialData?.due_date || null,
        status: initialData?.status || 'Open'
      });
    }
  }, [open, initialData]);

  const loadData = async () => {
    try {
      const [usersData, leadsData] = await Promise.all([
        databaseService.getUsers(),
        databaseService.getLeads()
      ]);
      setUsers(usersData);
      setLeads(leadsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Task name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await databaseService.createTask({
        name: formData.name,
        title: formData.name, // Keep both for compatibility
        borrower_id: formData.borrower_id,
        priority: formData.priority,
        task_order: formData.task_order,
        assigned_to: formData.assigned_to,
        due_date: formData.due_date,
        status: formData.status,
        created_by: null // Will be set by auth context
      });

      toast({
        title: "Success",
        description: "Task created successfully"
      });
      
      onTaskCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      due_date: date ? format(date, 'yyyy-MM-dd') : null
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Task Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter task name"
              required
            />
          </div>

          {/* Borrower */}
          <div className="space-y-2">
            <Label>Borrower</Label>
            <Select
              value={formData.borrower_id || ''}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                borrower_id: value || null 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select borrower" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No borrower</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.first_name} {lead.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: TaskPriority) => setFormData(prev => ({ 
                ...prev, 
                priority: value 
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Order */}
          <div className="space-y-2">
            <Label htmlFor="task_order">Task Order</Label>
            <Input
              id="task_order"
              type="number"
              min="0"
              value={formData.task_order}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                task_order: parseInt(e.target.value) || 0 
              }))}
            />
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select
              value={formData.assigned_to || ''}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                assigned_to: value || null 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(new Date(formData.due_date), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date ? new Date(formData.due_date) : undefined}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: TaskStatus) => setFormData(prev => ({ 
                ...prev, 
                status: value 
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#FFD300] hover:bg-[#FFD300]/90 text-black"
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}