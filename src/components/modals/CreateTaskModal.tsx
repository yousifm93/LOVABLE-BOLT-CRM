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
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  preselectedBorrowerId?: string;
}


export function CreateTaskModal({ open, onOpenChange, onTaskCreated, preselectedBorrowerId }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: new Date().toISOString().split('T')[0],
    assignee_id: "",
    borrower_id: preselectedBorrowerId || "",
  });
  const [bulkTasks, setBulkTasks] = useState<Array<{
    title: string;
    due_date: string;
    assignee_id: string;
    borrower_id: string;
  }>>([{
    title: "",
    due_date: new Date().toISOString().split('T')[0],
    assignee_id: "",
    borrower_id: "",
  }]);
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
    
    if (mode === 'single') {
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
        const normalizedDueDate = formData.due_date ? formData.due_date : null;

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
          }
        }

        toast({
          title: "Success",
          description: "Task created successfully",
        });

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
    } else {
      // Bulk mode
      const validTasks = bulkTasks.filter(t => t.title.trim());
      
      if (validTasks.length === 0) {
        toast({
          title: "Error",
          description: "At least one task must have a title",
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
        let successCount = 0;
        let failCount = 0;

        for (const task of validTasks) {
          try {
            const createdTask = await databaseService.createTask({
              title: task.title,
              description: null,
              due_date: task.due_date || null,
              priority: "Medium" as any,
              status: "Working on it" as any,
              assignee_id: task.assignee_id || null,
              borrower_id: task.borrower_id || null,
              task_order: 0,
              created_by: user.id,
              creation_log: [],
            });

            if (task.borrower_id && createdTask) {
              const assignedUser = users.find(u => u.id === task.assignee_id);
              const assigneeName = assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}`.trim() : undefined;
              
              try {
                await databaseService.createTaskActivityLog({
                  lead_id: task.borrower_id,
                  task_id: createdTask.id,
                  task_title: task.title,
                  assignee_name: assigneeName,
                  due_date: task.due_date,
                  author_id: user.id,
                });
              } catch (logError) {
                console.error('Failed to create task activity log:', logError);
              }
            }

            successCount++;
          } catch (error) {
            console.error("Error creating task:", error);
            failCount++;
          }
        }

        if (successCount > 0) {
          toast({
            title: "Success",
            description: `${successCount} task${successCount > 1 ? 's' : ''} created successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
          });
        }

        if (failCount === 0) {
          setBulkTasks([{
            title: "",
            due_date: new Date().toISOString().split('T')[0],
            assignee_id: "",
            borrower_id: "",
          }]);
          onTaskCreated();
          onOpenChange(false);
        }
      } catch (error) {
        console.error("Error creating tasks:", error);
        toast({
          title: "Error",
          description: "Failed to create tasks",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Task{mode === 'multiple' ? 's' : ''}</DialogTitle>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as any)} className="border rounded-md">
              <ToggleGroupItem value="single" className="px-3 py-1 text-sm">Single</ToggleGroupItem>
              <ToggleGroupItem value="multiple" className="px-3 py-1 text-sm">Multiple</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">{mode === 'single' ? (
          // Single Task Mode
          <>
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

          </>
          ) : (
            // Multiple Tasks Mode
            <div className="space-y-3">
              {bulkTasks.map((task, index) => (
                <div key={index} className="border rounded-md p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Task {index + 1}</span>
                    {bulkTasks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBulkTasks(bulkTasks.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label>Task Title *</Label>
                    <Input
                      value={task.title}
                      onChange={(e) => {
                        const newTasks = [...bulkTasks];
                        newTasks[index].title = e.target.value;
                        setBulkTasks(newTasks);
                      }}
                      placeholder="Enter task title"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={task.due_date}
                        onChange={(e) => {
                          const newTasks = [...bulkTasks];
                          newTasks[index].due_date = e.target.value;
                          setBulkTasks(newTasks);
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label>Assigned To</Label>
                      <Select
                        value={task.assignee_id}
                        onValueChange={(value) => {
                          const newTasks = [...bulkTasks];
                          newTasks[index].assignee_id = value;
                          setBulkTasks(newTasks);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {users.filter(u => u.is_active === true && u.is_assignable !== false).map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.first_name} {user.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Borrower</Label>
                      <Select
                        value={task.borrower_id}
                        onValueChange={(value) => {
                          const newTasks = [...bulkTasks];
                          newTasks[index].borrower_id = value;
                          setBulkTasks(newTasks);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-[200px]">
                          {leads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.first_name} {lead.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkTasks([...bulkTasks, {
                  title: "",
                  due_date: new Date().toISOString().split('T')[0],
                  assignee_id: "",
                  borrower_id: "",
                }])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Task
              </Button>
            </div>
          )}

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
              {loading ? "Creating..." : mode === 'single' ? "Create Task" : `Create ${bulkTasks.filter(t => t.title.trim()).length} Task${bulkTasks.filter(t => t.title.trim()).length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}