import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, Edit2, Phone, ShieldCheck, UserCheck } from "lucide-react";
import { formatDateModern } from "@/utils/dateUtils";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { validateTaskCompletion } from "@/services/taskCompletionValidation";
import { TaskCompletionRequirementModal } from "@/components/modals/TaskCompletionRequirementModal";
import { AgentCallLogModal } from "@/components/modals/AgentCallLogModal";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [completionRequirement, setCompletionRequirement] = useState<any>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [agentCallLogOpen, setAgentCallLogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  useEffect(() => {
    if (open && task) {
      setEditData({
        title: task.title || "",
        description: task.description || "",
        notes: task.notes || "",
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

    // Validate if trying to mark as Done
    if (editData.status === 'Done' && task.status !== 'Done') {
      const validation = await validateTaskCompletion(task);
      
      if (!validation.canComplete) {
        setCompletionRequirement(validation);
        setRequirementModalOpen(true);
        setPendingStatusChange('Done');
        return;
      }
    }

    setLoading(true);
    try {
      await databaseService.updateTask(task.id, {
        title: editData.title,
        description: editData.description || null,
        notes: editData.notes || null,
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

  const handleLogCallFromModal = () => {
    setRequirementModalOpen(false);
    
    if (!completionRequirement?.contactInfo) return;
    
    if (completionRequirement.contactInfo.type === 'buyer_agent' || 
        completionRequirement.contactInfo.type === 'listing_agent') {
      setSelectedAgent({
        id: completionRequirement.contactInfo.id,
        first_name: completionRequirement.contactInfo.name.split(' ')[0],
        last_name: completionRequirement.contactInfo.name.split(' ').slice(1).join(' '),
        phone: completionRequirement.contactInfo.phone
      });
      setAgentCallLogOpen(true);
    }
  };

  const handleAgentCallLogged = async () => {
    setAgentCallLogOpen(false);
    
    if (pendingStatusChange) {
      setEditData({ ...editData, status: pendingStatusChange });
      setPendingStatusChange(null);
      
      toast({
        title: "Call logged",
        description: "Retrying task completion...",
      });
      
      setTimeout(() => handleSave(), 500);
    }
  };

  if (!task) return null;

  const assignableUsers = users.filter(u => 
    u.is_active === true && u.is_assignable !== false
  );

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-medium text-muted-foreground">Task Details</DialogTitle>
                {task?.completion_requirement_type && task.completion_requirement_type !== 'none' && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      This task has completion requirements
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-7 mr-6"
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

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  placeholder="Add notes about this task..."
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
                      <SelectItem value="Critical">ASAP</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
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
                      notes: task.notes || "",
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
                <h3 className="text-xl font-bold">{task.title}</h3>
                {task.description && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Description:</span>
                    <span className="text-sm text-muted-foreground">{task.description}</span>
                  </div>
                )}
                {task.notes && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                      <span className="text-sm whitespace-pre-wrap">{task.notes}</span>
                    </div>
                    {task.updated_at && task.updated_at !== task.created_at && (
                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                        Updated: {formatDateModern(task.updated_at)}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Contact Info based on completion requirement */}
                {task.completion_requirement_type === 'log_call_buyer_agent' && task.buyer_agent && (
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Phone className="h-3 w-3" />
                    <span className="font-medium">{task.buyer_agent.first_name} {task.buyer_agent.last_name}</span>
                    {task.buyer_agent.phone && (
                      <span className="font-mono">• {task.buyer_agent.phone}</span>
                    )}
                  </div>
                )}
                
                {task.completion_requirement_type === 'log_call_listing_agent' && task.listing_agent && (
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Phone className="h-3 w-3" />
                    <span className="font-medium">{task.listing_agent.first_name} {task.listing_agent.last_name}</span>
                    {task.listing_agent.phone && (
                      <span className="font-mono">• {task.listing_agent.phone}</span>
                    )}
                  </div>
                )}
                
                {task.completion_requirement_type === 'log_call_borrower' && task.borrower && (
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Phone className="h-3 w-3" />
                    <span className="font-medium">{task.borrower.first_name} {task.borrower.last_name}</span>
                    {task.borrower.phone && (
                      <span className="font-mono">• {task.borrower.phone}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-2">
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
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Borrower:</span>
                    <span className="text-sm">
                      {task.borrower 
                        ? `${task.borrower.first_name} ${task.borrower.last_name}`
                        : "No borrower"
                      }
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Priority:</span>
                    <Badge variant="outline">{task.priority}</Badge>
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

    <TaskCompletionRequirementModal
      open={requirementModalOpen}
      onOpenChange={setRequirementModalOpen}
      requirement={completionRequirement || { message: '', missingRequirement: '' }}
      onLogCall={handleLogCallFromModal}
    />

    {selectedAgent && (
      <AgentCallLogModal
        agentId={selectedAgent.id}
        agentName={`${selectedAgent.first_name} ${selectedAgent.last_name}`}
        isOpen={agentCallLogOpen}
        onClose={() => setAgentCallLogOpen(false)}
        onCallLogged={handleAgentCallLogged}
      />
    )}
    </TooltipProvider>
  );
}
