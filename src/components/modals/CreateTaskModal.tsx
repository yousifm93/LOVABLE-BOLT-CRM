import React, { useState, useEffect, useRef } from "react";
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
import { Check, ChevronsUpDown, X, Plus, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  preselectedBorrowerId?: string;
}


export function CreateTaskModal({ open, onOpenChange, onTaskCreated, preselectedBorrowerId }: CreateTaskModalProps) {
  const { crmUser } = useAuth();
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
  const [isRecording, setIsRecording] = useState(false);
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
      if (preselectedBorrowerId) {
        setFormData(prev => ({ ...prev, borrower_id: preselectedBorrowerId }));
      }
    }
  }, [open, preselectedBorrowerId]);

  // Voice recording handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processVoiceRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to use voice input.',
        variant: 'destructive',
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceRecording = async (audioBlob: Blob) => {
    setIsParsingVoice(true);
    try {
      // First, transcribe the audio
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      // Call voice transcribe function
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('voice-transcribe', {
        body: { audio: base64Audio }
      });

      if (transcribeError) throw transcribeError;
      
      const transcript = transcribeData?.text;
      if (!transcript) {
        throw new Error('No transcription returned');
      }

      console.log('Voice transcript:', transcript);

      // Now parse the transcript to extract task details
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-voice-task', {
        body: { 
          transcript,
          users: users.filter(u => u.is_active === true && u.is_assignable !== false).map(u => ({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
          })),
          leads: leads.slice(0, 100).map(l => ({
            id: l.id,
            first_name: l.first_name,
            last_name: l.last_name,
          })),
        }
      });

      if (parseError) throw parseError;

      console.log('Parsed task data:', parseData);

      // Auto-fill the form with parsed data
      if (parseData) {
        setFormData(prev => ({
          ...prev,
          title: parseData.title || prev.title,
          description: parseData.description || prev.description,
          due_date: parseData.due_date || prev.due_date,
        }));

        // Match assignee by name
        if (parseData.assignee_name) {
          const matchedUser = users.find(u => {
            const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
            return fullName.includes(parseData.assignee_name.toLowerCase());
          });
          if (matchedUser) {
            setFormData(prev => ({ ...prev, assignee_id: matchedUser.id }));
          }
        }

        // Match borrower by name
        if (parseData.borrower_name) {
          const matchedLead = leads.find(l => {
            const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
            return fullName.includes(parseData.borrower_name.toLowerCase());
          });
          if (matchedLead) {
            setFormData(prev => ({ ...prev, borrower_id: matchedLead.id }));
          }
        }

        toast({
          title: 'Voice Input Processed',
          description: 'Task details have been filled in. Review and submit.',
        });
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      toast({
        title: 'Voice Processing Failed',
        description: 'Could not process voice input. Please try again or enter manually.',
        variant: 'destructive',
      });
    } finally {
      setIsParsingVoice(false);
    }
  };

  const handleVoiceClick = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

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

      if (!crmUser) {
        toast({
          title: "Error",
          description: "User profile not loaded. Please refresh the page.",
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
          created_by: crmUser.id,
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
              author_id: crmUser.id,
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

      if (!crmUser) {
        toast({
          title: "Error",
          description: "User profile not loaded. Please refresh the page.",
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
              created_by: crmUser.id,
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
                  author_id: crmUser.id,
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>Create New Task{mode === 'multiple' ? 's' : ''}</DialogTitle>
              {mode === 'single' && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleVoiceClick}
                  disabled={isParsingVoice}
                  className={cn(
                    "w-9 h-9 rounded-full transition-all",
                    isRecording && "animate-pulse bg-red-500/10 border-red-500 hover:bg-red-500/20"
                  )}
                  title={isRecording ? "Stop recording" : "Speak to create task"}
                >
                  {isParsingVoice ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className={cn("h-4 w-4", isRecording && "text-red-500")} />
                  )}
                </Button>
              )}
            </div>
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
                          value={`${lead.first_name} ${lead.last_name} ${lead.email || ''}`}
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
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Task Title *</TableHead>
                    <TableHead className="w-[18%]">Due Date</TableHead>
                    <TableHead className="w-[18%]">Assigned To</TableHead>
                    <TableHead className="w-[20%]">Borrower</TableHead>
                    <TableHead className="w-[4%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkTasks.map((task, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...bulkTasks];
                            newTasks[index].title = e.target.value;
                            setBulkTasks(newTasks);
                          }}
                          placeholder="Enter task title"
                          className="h-9 min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={task.due_date}
                          onChange={(e) => {
                            const newTasks = [...bulkTasks];
                            newTasks[index].due_date = e.target.value;
                            setBulkTasks(newTasks);
                          }}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.assignee_id}
                          onValueChange={(value) => {
                            const newTasks = [...bulkTasks];
                            newTasks[index].assignee_id = value;
                            setBulkTasks(newTasks);
                          }}
                        >
                          <SelectTrigger className="h-9">
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
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 w-full justify-start text-left font-normal truncate">
                              {task.borrower_id ? 
                                (() => {
                                  const borrower = leads.find(l => l.id === task.borrower_id);
                                  return borrower ? `${borrower.first_name} ${borrower.last_name}` : "Select";
                                })() : 
                                "Select"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0 bg-popover" align="start">
                            <Command>
                              <CommandInput placeholder="Search borrowers..." />
                              <CommandList>
                                <CommandEmpty>No borrower found.</CommandEmpty>
                                <CommandGroup>
                                  {leads.map((lead) => (
                                    <CommandItem
                                      key={lead.id}
                                      value={`${lead.first_name} ${lead.last_name}`}
                                      onSelect={() => {
                                        const newTasks = [...bulkTasks];
                                        newTasks[index].borrower_id = lead.id;
                                        setBulkTasks(newTasks);
                                      }}
                                    >
                                      {lead.first_name} {lead.last_name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        {bulkTasks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newTasks = bulkTasks.filter((_, i) => i !== index);
                              setBulkTasks(newTasks);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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