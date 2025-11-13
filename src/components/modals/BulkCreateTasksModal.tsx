import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2 } from "lucide-react";

interface TaskRow {
  id: string;
  title: string;
  borrower_id: string;
  description: string;
  due_date: string;
  assignee_id: string;
}

interface BulkCreateTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksCreated: () => void;
}

export function BulkCreateTasksModal({ open, onOpenChange, onTasksCreated }: BulkCreateTasksModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskRow[]>([
    { id: '1', title: '', borrower_id: '', description: '', due_date: new Date().toISOString().split('T')[0], assignee_id: '' }
  ]);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const [usersData, leadsData] = await Promise.all([
      databaseService.getUsers(),
      databaseService.getLeads(),
    ]);
    setUsers(usersData);
    setLeads(leadsData);
  };

  const addRow = () => {
    setTasks([...tasks, {
      id: Date.now().toString(),
      title: '',
      borrower_id: '',
      description: '',
      due_date: new Date().toISOString().split('T')[0],
      assignee_id: ''
    }]);
  };

  const removeRow = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof TaskRow, value: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveAll = async () => {
    const validTasks = tasks.filter(t => t.title.trim() !== '');
    if (validTasks.length === 0) {
      toast({
        title: "Error",
        description: "At least one task must have a title",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        validTasks.map(task =>
          databaseService.createTask({
            title: task.title,
            description: task.description || null,
            due_date: task.due_date || null,
            priority: "Medium" as any,
            status: "To Do" as any,
            assignee_id: task.assignee_id || null,
            borrower_id: task.borrower_id || null,
            task_order: 0,
            created_by: user!.id,
            creation_log: [],
          })
        )
      );

      toast({
        title: "Success",
        description: `${validTasks.length} task(s) created successfully`,
      });

      onTasksCreated();
      onOpenChange(false);
      setTasks([{ id: '1', title: '', borrower_id: '', description: '', due_date: new Date().toISOString().split('T')[0], assignee_id: '' }]);
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast({
        title: "Error",
        description: "Failed to create tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Create Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Task Title</TableHead>
                <TableHead className="w-[180px]">Borrower</TableHead>
                <TableHead className="w-[250px]">Description</TableHead>
                <TableHead className="w-[140px]">Due Date</TableHead>
                <TableHead className="w-[150px]">Assigned To</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                      placeholder="Task title"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.borrower_id}
                      onValueChange={(value) => updateTask(task.id, 'borrower_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.first_name} {lead.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="min-h-[60px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={task.due_date}
                      onChange={(e) => updateTask(task.id, 'due_date', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.assignee_id}
                      onValueChange={(value) => updateTask(task.id, 'assignee_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {tasks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(task.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button onClick={addRow} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Task
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={loading}>
            {loading ? "Creating..." : `Create ${tasks.filter(t => t.title.trim()).length} Task(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
