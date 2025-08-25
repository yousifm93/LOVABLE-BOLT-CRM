import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { databaseService, type TaskInsert, type User, type Lead } from '@/services/database';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (task: any) => void;
  relatedLeadId?: string;
}

export function CreateTaskModal({ open, onOpenChange, onTaskCreated, relatedLeadId }: CreateTaskModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'Medium' as any,
    status: 'Open' as any,
    assignee_id: '',
    related_lead_id: relatedLeadId || '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (relatedLeadId) {
        setFormData(prev => ({ ...prev, related_lead_id: relatedLeadId }));
      }
    }
  }, [open, relatedLeadId]);

  const loadData = async () => {
    try {
      const [usersData, leadsData] = await Promise.all([
        databaseService.getUsers(),
        databaseService.getLeads(),
      ]);
      
      setUsers(usersData);
      setLeads(leadsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData: TaskInsert = {
        ...formData,
        assignee_id: formData.assignee_id || null,
        related_lead_id: formData.related_lead_id || null,
        due_date: formData.due_date || null,
        // TODO: Get current user ID from auth context
        created_by: formData.assignee_id, // Temporary - should be current user
      };

      const newTask = await databaseService.createTask(taskData);
      
      onTaskCreated(newTask);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        due_date: '',
        priority: 'Medium',
        status: 'Open',
        assignee_id: '',
        related_lead_id: relatedLeadId || '',
        tags: [],
      });

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({ 
          ...prev, 
          tags: [...prev.tags, newTag] 
        }));
      }
      e.currentTarget.value = '';
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Deferred">Deferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignee_id">Assignee</Label>
              <Select value={formData.assignee_id} onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="related_lead_id">Related Lead</Label>
            <Select value={formData.related_lead_id} onValueChange={(value) => setFormData(prev => ({ ...prev, related_lead_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select related lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No related lead</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.first_name} {lead.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="Type a tag and press Enter"
              onKeyDown={handleTagInput}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}