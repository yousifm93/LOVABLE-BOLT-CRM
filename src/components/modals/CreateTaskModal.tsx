import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  preselectedBorrowerId?: string;
}


export function CreateTaskModal({ open, onOpenChange, onTaskCreated, preselectedBorrowerId }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: new Date().toISOString().split('T')[0],
    assignee_id: "",
    borrower_id: preselectedBorrowerId || "",
  });
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [borrowerOpen, setBorrowerOpen] = useState(false);
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
      if (preselectedBorrowerId) {
        setFormData(prev => ({ ...prev, borrower_id: preselectedBorrowerId }));
      }
    }
  }, [open, preselectedBorrowerId]);

  const loadData = async () => {
    const results = await Promise.allSettled([
      databaseService.getUsers(),
      databaseService.getLeads(),
    ]);
    
    // Handle users result
    if (results[0].status === 'fulfilled') {
      setUsers(results[0].value);
    } else {
      console.error("Error loading users:", results[0].reason);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
    
    // Handle leads result
    if (results[1].status === 'fulfilled') {
      setLeads(results[1].value);
    } else {
      console.error("Error loading leads:", results[1].reason);
      toast({
        title: "Error",
        description: "Failed to load borrowers",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be signed in to create tasks",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Normalize date to avoid timezone issues
      const normalizedDueDate = formData.due_date ? 
        formData.due_date : 
        null;

      const createdTask = await databaseService.createTask({
        title: formData.title,
        description: formData.description || null,
        due_date: normalizedDueDate,
        priority: "Medium" as any,
        status: "Working on it" as any,
        assignee_id: formData.assignee_id || null,
        borrower_id: formData.borrower_id || null,
        task_order: 0,
        created_by: user.id,
        creation_log: [],
      });

      // Log task creation in activity feed if borrower is selected
      if (formData.borrower_id && createdTask) {
        const assignedUser = users.find(u => u.id === formData.assignee_id);
        const assigneeName = assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}`.trim() : undefined;
        
        try {
          await databaseService.createTaskActivityLog({
            lead_id: formData.borrower_id,
            task_id: createdTask.id,
            task_title: formData.title,
            assignee_name: assigneeName,
            due_date: formData.due_date,
            author_id: user.id,
          });
        } catch (logError) {
          console.error('Failed to create task activity log:', logError);
          // Don't fail the whole operation if logging fails
        }
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        due_date: new Date().toISOString().split('T')[0],
        assignee_id: "",
        borrower_id: "",
      });

      onTaskCreated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <Label htmlFor="borrower">Borrower</Label>
            <Popover open={borrowerOpen} onOpenChange={setBorrowerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={borrowerOpen}
                  className="w-full justify-between"
                >
                  {formData.borrower_id
                    ? (() => {
                        const lead = leads.find((l) => l.id === formData.borrower_id);
                        return lead ? `${lead.first_name} ${lead.last_name}` : "Select borrower";
                      })()
                    : "Select borrower"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search borrower..." 
                    value={borrowerSearch}
                    onValueChange={setBorrowerSearch}
                  />
                  <CommandEmpty>No borrower found.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {leads
                      .filter((lead) => {
                        const searchLower = borrowerSearch.toLowerCase();
                        const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
                        const email = (lead.email || "").toLowerCase();
                        return fullName.includes(searchLower) || email.includes(searchLower);
                      })
                      .map((lead) => (
                        <CommandItem
                          key={lead.id}
                          value={lead.id}
                          onSelect={() => {
                            setFormData({ ...formData, borrower_id: lead.id });
                            setBorrowerOpen(false);
                            setBorrowerSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.borrower_id === lead.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{lead.first_name} {lead.last_name}</span>
                            {lead.email && (
                              <span className="text-xs text-muted-foreground">{lead.email}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="assignee">Assigned To</Label>
              <Select
                value={formData.assignee_id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {users
                    .filter(u => u.is_active === true && u.is_assignable !== false)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}