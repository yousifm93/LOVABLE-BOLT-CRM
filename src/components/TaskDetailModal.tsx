import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, Edit2 } from "lucide-react";
import { formatDateModern } from "@/utils/dateUtils";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onTaskUpdated?: () => void;
}

export function TaskDetailModal({ open, onOpenChange, task, onTaskUpdated }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && task) {
      setEditData({
        title: task.title || "",
        description: task.description || "",
        due_date: task.due_date || "",
        status: task.status || "To Do",
        priority: task.priority || "Medium",
        assignee_id: task.assignee_id || "",
      });
      loadUsers();
    }
  }, [open, task]);

  const loadUsers = async () => {
    try {
      const usersData = await databaseService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleSave = async () => {
    if (!task?.id) return;

    setLoading(true);
    try {
      await databaseService.updateTask(task.id, {
        title: editData.title,
        description: editData.description || null,
        due_date: editData.due_date || null,
        status: editData.status,
        priority: editData.priority,
        assignee_id: editData.assignee_id || null,
      });

      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      setIsEditing(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const assignableUsers = users.filter(u => 
    u.is_active === true && u.is_assignable !== false
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Task Details</DialogTitle>
            {!isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-8"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {isEditing ? (
            <>
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={editData.due_date}
                    onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="assignee">Assigned To</Label>
                  <Select
                    value={editData.assignee_id}
                    onValueChange={(value) => setEditData({ ...editData, assignee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {assignableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) => setEditData({ ...editData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="Working on it">Working on it</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="Stuck">Stuck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={editData.priority}
                    onValueChange={(value) => setEditData({ ...editData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      title: task.title || "",
                      description: task.description || "",
                      due_date: task.due_date || "",
                      status: task.status || "To Do",
                      priority: task.priority || "Medium",
                      assignee_id: task.assignee_id || "",
                    });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold">{task.title}</h3>
                {task.description && (
                  <p className="text-muted-foreground mt-2">{task.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Due Date:</span>
                    <span className="text-sm">
                      {task.due_date ? formatDateModern(task.due_date) : "No date set"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Assigned To:</span>
                    <span className="text-sm">
                      {task.assignee 
                        ? `${task.assignee.first_name} ${task.assignee.last_name}`
                        : "Unassigned"
                      }
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Borrower:</span>
                    <span className="text-sm">
                      {task.borrower 
                        ? `${task.borrower.first_name} ${task.borrower.last_name}`
                        : "No borrower"
                      }
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Priority:</span>
                    <Badge variant="outline">{task.priority}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Order:</span>
                    <span className="text-sm">{task.task_order}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Created: {formatDateModern(task.created_at)}</span>
                  {task.updated_at !== task.created_at && (
                    <span>• Updated: {formatDateModern(task.updated_at)}</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
