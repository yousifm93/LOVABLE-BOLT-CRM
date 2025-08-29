import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, AlertCircle, Clock } from "lucide-react";
import { formatDateModern } from "@/utils/dateUtils";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
}

export function TaskDetailModal({ open, onOpenChange, task }: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}