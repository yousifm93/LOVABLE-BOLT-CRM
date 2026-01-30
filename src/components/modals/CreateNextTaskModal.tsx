import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CreateNextTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName?: string;
  onTaskCreated?: () => void;
}

const DEFAULT_ASSIGNEE_ID = "230ccf6d-48f5-4f3c-89fd-f2907ebdba1e"; // Yousif Mohamed

// Quick task templates - same as CreateTaskModal
const QUICK_TASK_TEMPLATES = [
  {
    id: 'lead_followup',
    label: 'Lead Follow-up',
    title: 'Lead Follow-up',
    description: 'Follow up with the lead regarding their loan application',
    completion_requirement_type: 'log_any_activity',
  },
  {
    id: 'pending_followup',
    label: 'Pending App Follow-up',
    title: 'Pending App Follow-up',
    description: 'Follow up on pending app conditions that need to be addressed',
    completion_requirement_type: 'log_any_activity',
  },
  {
    id: 'screen',
    label: 'Screen',
    title: 'Screen',
    description: 'Screen the lead and move to Pre-Qualified if they pass screening criteria.',
    completion_requirement_type: 'field_value',
    default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
    priority: 'High',
  },
  {
    id: 'conditions',
    label: 'Conditions',
    title: 'Conditions',
    description: 'Clear borrower conditions',
    default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
    priority: 'High',
    completion_requirement_type: 'none',
  },
  {
    id: 'pre_qualify',
    label: 'Pre-Qualify',
    title: 'Pre-Qualify',
    description: 'Pre-qualify the borrower',
    default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
    priority: 'High',
    completion_requirement_type: 'none',
  },
  {
    id: 'pre_approve',
    label: 'Pre-Approve',
    title: 'Pre-Approve',
    description: 'Pre-approve the borrower',
    default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
    priority: 'High',
    completion_requirement_type: 'none',
  },
  {
    id: 'borrower_call',
    label: 'Borrower Call',
    title: 'Borrower Call',
    description: 'Make a call to the borrower to discuss the loan file',
    completion_requirement_type: 'log_call_borrower',
  },
  {
    id: 'buyer_agent_call',
    label: "Buyer's Agent Call",
    title: "Call Buyer's Agent",
    description: "Call the buyer's agent to discuss the loan status",
    completion_requirement_type: 'log_call_buyer_agent',
  },
  {
    id: 'listing_agent_call',
    label: 'Listing Agent Call',
    title: 'Call Listing Agent',
    description: 'Call the listing agent regarding the property',
    completion_requirement_type: 'log_call_listing_agent',
  },
  {
    id: 'hsci',
    label: 'HSCI',
    title: 'HSCI (Home Search Check-in)',
    description: 'Do a home search check-in on the borrower to see where they are in their loan process.',
    default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
    priority: 'Medium',
    completion_requirement_type: 'log_any_activity',
  },
  {
    id: 'disclose',
    label: 'Disclose',
    title: 'Disclose',
    description: 'Send out initial disclosures to the borrower',
    default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
    priority: 'High',
    completion_requirement_type: 'none',
  },
];

// Task contingency options - conditions that must be met on the lead before task can be completed
const CONTINGENCY_OPTIONS = [
  { id: 'finance_contingency', label: 'Finance Contingency', field: 'fin_cont', type: 'date_passed' },
  { id: 'appraisal_received', label: 'Appraisal Received', field: 'appraisal_status', value: 'Received' },
  { id: 'title_clear', label: 'Title Clear', field: 'title_status', value: 'Clear' },
  { id: 'insurance_received', label: 'Insurance Received', field: 'hoi_status', value: 'Received' },
  { id: 'ctc_status', label: 'CTC Status', field: 'cd_status', value: 'CTC' },
  { id: 'contract_uploaded', label: 'Contract Uploaded', field: 'contract_file', type: 'not_null' },
  { id: 'initial_approval', label: 'Initial Approval', field: 'initial_approval_file', type: 'not_null' },
];

export function CreateNextTaskModal({
  open,
  onOpenChange,
  leadId,
  leadName,
  onTaskCreated
}: CreateNextTaskModalProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedContingencies, setSelectedContingencies] = useState<string[]>([]);
  
  const getDefaultAssigneeId = () => DEFAULT_ASSIGNEE_ID; // Always default to Yousif Mohamed
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: new Date().toISOString().split('T')[0],
    priority: "Medium",
    assignee_id: DEFAULT_ASSIGNEE_ID,
    completion_requirement_type: null as string | null,
  });

  useEffect(() => {
    if (open) {
      loadUsers();
      // Reset form when modal opens
      const defaultAssignee = getDefaultAssigneeId();
      setFormData({
        title: "",
        description: "",
        due_date: new Date().toISOString().split('T')[0],
        priority: "Medium",
        assignee_id: defaultAssignee,
        completion_requirement_type: null,
      });
      setSelectedTemplate(null);
      setSelectedContingencies([]);
    }
  }, [open, crmUser?.id]);

  const loadUsers = async () => {
    try {
      const usersData = await databaseService.getUsers();
      setUsers(usersData.filter((u: any) => u.is_active && u.is_assignable !== false));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  // Apply quick task template
  const applyTemplate = (templateId: string) => {
    const template = QUICK_TASK_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    setSelectedTemplate(templateId);
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      due_date: new Date().toISOString().split('T')[0], // Today
      // Only use template's assignee if explicitly set, otherwise keep current selection
      assignee_id: (template as any).default_assignee_id || prev.assignee_id || getDefaultAssigneeId(),
      priority: (template as any).priority || 'Medium',
      completion_requirement_type: template.completion_requirement_type,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await databaseService.createTask({
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date || null,
        priority: formData.priority as "Critical" | "High" | "Low" | "Medium",
        status: "To Do" as any,
        borrower_id: leadId,
        assignee_id: formData.assignee_id || null,
        completion_requirement_type: formData.completion_requirement_type || null,
        contingency_requirements: selectedContingencies.length > 0 ? selectedContingencies : null,
      });

      toast({
        title: "Task Created",
        description: "The next task has been added successfully"
      });

      onOpenChange(false);
      onTaskCreated?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await databaseService.checkAndCreateNoOpenTaskFound(leadId);
      toast({
        title: "Placeholder Task Created",
        description: `"No open task found" task added for ${leadName || 'this lead'}`
      });
    } catch (error) {
      console.error("Error creating placeholder task:", error);
    } finally {
      setSkipping(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>No Active Tasks</DialogTitle>
              <DialogDescription className="text-left">
                {leadName ? `${leadName} has` : 'This lead has'} no other open tasks.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            Every lead should have an active task. Please add the next task:
          </p>

          {/* Quick Task Templates */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm font-medium">Quick Tasks</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TASK_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyTemplate(template.id)}
                  className="text-xs"
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setSelectedTemplate(null);
                }}
                placeholder="e.g., Follow up with borrower"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional task details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASAP">ASAP</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={formData.assignee_id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(user => user.id).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Requirements Section */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Lead Requirements (Optional)</Label>
              <p className="text-xs text-muted-foreground">These lead conditions must be met before the task can be completed</p>
              <div className="flex flex-wrap gap-2">
                {CONTINGENCY_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={selectedContingencies.includes(option.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedContingencies(prev => 
                        prev.includes(option.id) 
                          ? prev.filter(id => id !== option.id)
                          : [...prev, option.id]
                      );
                    }}
                    className="text-xs h-7"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} disabled={loading || skipping}>
            {skipping ? "Creating placeholder..." : "Skip"}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
