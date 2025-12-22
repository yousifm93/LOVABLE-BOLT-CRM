import { useState } from "react";
import { Mail, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  priority: string;
  assignee?: { first_name: string; last_name: string };
  borrower?: {
    first_name: string;
    last_name: string;
    pipeline_stage?: { name: string } | null;
  };
  borrower_id?: string;
}

interface EmailTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
}

interface TaskNote {
  [taskId: string]: string;
}

export function EmailTasksModal({ open, onOpenChange, tasks }: EmailTasksModalProps) {
  const { toast } = useToast();
  const [toEmail, setToEmail] = useState("hello@mortgagebolt.com");
  const [subject, setSubject] = useState(`Task Summary - ${format(new Date(), 'MMMM d, yyyy')}`);
  const [taskNotes, setTaskNotes] = useState<TaskNote>({});
  const [isSending, setIsSending] = useState(false);

  // Group tasks by borrower
  const groupedTasks = tasks.reduce((acc, task) => {
    const borrowerName = task.borrower 
      ? `${task.borrower.first_name} ${task.borrower.last_name}`
      : 'No Borrower Assigned';
    
    if (!acc[borrowerName]) {
      acc[borrowerName] = {
        stage: task.borrower?.pipeline_stage?.name || 'Unknown',
        tasks: []
      };
    }
    acc[borrowerName].tasks.push(task);
    return acc;
  }, {} as Record<string, { stage: string; tasks: Task[] }>);

  const formatPriority = (priority: string) => {
    if (priority === 'Critical') return 'ASAP';
    return priority;
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return 'No due date';
    return format(new Date(dueDate), 'MMM d, yyyy');
  };

  const getAssigneeName = (task: Task) => {
    if (!task.assignee) return 'Unassigned';
    const firstInitial = task.assignee.first_name?.charAt(0) || '';
    const lastInitial = task.assignee.last_name?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`;
  };

  const generateEmailHtml = () => {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a2e; border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px;">
          Task Summary - ${format(new Date(), 'MMMM d, yyyy')}
        </h1>
        <p style="color: #666; margin-bottom: 24px;">
          Total Tasks: <strong>${tasks.length}</strong>
        </p>
    `;

    let borrowerIndex = 1;
    for (const [borrowerName, data] of Object.entries(groupedTasks)) {
      html += `
        <div style="margin-bottom: 24px; background: #f8f9fa; border-radius: 8px; padding: 16px;">
          <h2 style="color: #1a1a2e; margin: 0 0 12px 0; font-size: 16px;">
            ${borrowerIndex}. ${borrowerName} 
            <span style="display: inline-block; background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: normal; margin-left: 8px;">
              ${data.stage}
            </span>
          </h2>
      `;

      data.tasks.forEach((task, taskIndex) => {
        const note = taskNotes[task.id] || '';
        html += `
          <div style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 8px; border-left: 3px solid ${task.priority === 'Critical' ? '#dc2626' : task.priority === 'High' ? '#f59e0b' : '#10b981'};">
            <div style="font-weight: 600; color: #1a1a2e; margin-bottom: 6px;">
              ${String.fromCharCode(97 + taskIndex)}. ${task.title}
            </div>
            ${task.description ? `
              <div style="color: #444; font-size: 13px; margin-bottom: 8px; padding-left: 12px; border-left: 2px solid #e5e7eb;">
                ${task.description}
              </div>
            ` : ''}
            <div style="color: #666; font-size: 13px; margin-bottom: 6px;">
              <span style="display: inline-block; background: ${task.priority === 'Critical' ? '#fee2e2' : task.priority === 'High' ? '#fef3c7' : '#d1fae5'}; color: ${task.priority === 'Critical' ? '#dc2626' : task.priority === 'High' ? '#d97706' : '#059669'}; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-right: 8px;">
                ${formatPriority(task.priority)}
              </span>
              <span style="margin-right: 12px;">Assigned: <strong>${getAssigneeName(task)}</strong></span>
              <span>Due: <strong>${formatDueDate(task.due_date)}</strong></span>
            </div>
            ${note ? `
              <div style="margin-top: 8px; padding: 8px; background: #fffbeb; border-radius: 4px; font-size: 13px; color: #92400e;">
                <strong>Notes:</strong> ${note}
              </div>
            ` : ''}
          </div>
        `;
      });

      html += `</div>`;
      borrowerIndex++;
    }

    html += `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #666; font-size: 13px;">
          <p>Best,<br><br>Bolt CRM</p>
        </div>
      </div>
    `;

    return html;
  };

  const handleSendEmail = async () => {
    if (!toEmail) {
      toast({
        title: "Error",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const html = generateEmailHtml();

      const { data, error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: toEmail,
          subject: subject,
          html: html,
          from_email: 'yousif@mortgagebolt.org',
          from_name: 'Bolt CRM',
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: `Task summary sent to ${toEmail}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while sending the email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const updateTaskNote = (taskId: string, note: string) => {
    setTaskNotes(prev => ({ ...prev, [taskId]: note }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Task Summary ({tasks.length} tasks)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to-email">To</Label>
              <Input
                id="to-email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([borrowerName, data], borrowerIndex) => (
                <div key={borrowerName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {borrowerIndex + 1}. {borrowerName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {data.stage}
                    </Badge>
                  </div>

                  <div className="space-y-2 pl-4">
                    {data.tasks.map((task, taskIndex) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 bg-card space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {String.fromCharCode(97 + taskIndex)}. {task.title}
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 pl-3 border-l-2 border-muted">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <Badge
                                variant={
                                  task.priority === 'Critical' ? 'destructive' :
                                  task.priority === 'High' ? 'default' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {formatPriority(task.priority)}
                              </Badge>
                              <span>Assigned: {getAssigneeName(task)}</span>
                              <span>Due: {formatDueDate(task.due_date)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Textarea
                            placeholder="Add notes for this task..."
                            value={taskNotes[task.id] || ''}
                            onChange={(e) => updateTaskNote(task.id, e.target.value)}
                            className="text-sm min-h-[60px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
