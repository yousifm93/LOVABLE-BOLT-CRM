import { useState, useEffect } from "react";
import { Search, Plus, Filter, Clock, CheckCircle, AlertCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { transformLeadToClient } from "@/utils/clientTransform";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditBorrower } from "@/components/ui/inline-edit-borrower";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { formatDateModern } from "@/utils/dateUtils";
import { validateTaskCompletion } from "@/services/taskCompletionValidation";
import { TaskCompletionRequirementModal } from "@/components/modals/TaskCompletionRequirementModal";
import { AgentCallLogModal } from "@/components/modals/AgentCallLogModal";

interface ModernTask {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  priority: string;
  assignee_id?: string;
  borrower_id?: string;
  task_order: number;
  created_at: string;
  updated_at: string;
  assignee?: { first_name: string; last_name: string; email: string };
  borrower?: { 
    first_name: string; 
    last_name: string;
    pipeline_stage?: {
      id: string;
      name: string;
      order_index: number;
    } | null;
  };
}

const columns = (
  handleUpdate: (taskId: string, field: string, value: any) => void, 
  leads: any[], 
  users: any[],
  handleBorrowerClick: (borrowerId: string) => void
): ColumnDef<ModernTask>[] => [
  {
    accessorKey: "status",
    header: "",
    cell: ({ row }) => (
      <Checkbox 
        checked={row.original.status === "Done"} 
        onCheckedChange={(checked) => 
          handleUpdate(row.original.id, "status", checked ? "Done" : "Working on it")
        }
      />
    ),
  },
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
    <div className="w-96 min-w-96 flex-shrink-0">
      <div className="font-medium text-sm">{row.original.title}</div>
      
      {/* Show description ONLY if no completion requirement */}
      {!(row.original as any).completion_requirement_type && row.original.description && (
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed truncate whitespace-nowrap overflow-hidden" title={row.original.description}>
          {row.original.description}
        </div>
      )}
      
      {/* Show contact info if completion requirement exists (REPLACES description) */}
      {(row.original as any).completion_requirement_type === 'log_call_buyer_agent' && (row.original as any).buyer_agent && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-2">
          <Phone className="h-3 w-3" />
          <span>{(row.original as any).buyer_agent.first_name} {(row.original as any).buyer_agent.last_name}</span>
          {(row.original as any).buyer_agent.phone && (
            <span className="font-mono">• {(row.original as any).buyer_agent.phone}</span>
          )}
        </div>
      )}
      {(row.original as any).completion_requirement_type === 'log_call_listing_agent' && (row.original as any).listing_agent && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-2">
          <Phone className="h-3 w-3" />
          <span>{(row.original as any).listing_agent.first_name} {(row.original as any).listing_agent.last_name}</span>
          {(row.original as any).listing_agent.phone && (
            <span className="font-mono">• {(row.original as any).listing_agent.phone}</span>
          )}
        </div>
      )}
      {(row.original as any).completion_requirement_type === 'log_call_borrower' && (row.original as any).borrower && (
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-2">
          <Phone className="h-3 w-3" />
          <span>{(row.original as any).borrower.first_name} {(row.original as any).borrower.last_name}</span>
          {(row.original as any).lead?.phone && (
            <span className="font-mono">• {(row.original as any).lead.phone}</span>
          )}
        </div>
      )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "created_at",
    header: "Creation Log",
    cell: ({ row }) => {
      const date = row.original.created_at ? new Date(row.original.created_at) : null;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="text-sm">
          <div>{format(date, 'MMM dd, yyyy')}</div>
          <div className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</div>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "borrower",
    header: "Borrower",
    cell: ({ row }) => (
      row.original.borrower_id ? (
        <InlineEditBorrower
          value={row.original.borrower ? `${row.original.borrower.first_name} ${row.original.borrower.last_name}` : undefined}
          borrowerId={row.original.borrower_id}
          leads={leads}
          onValueChange={(leadId, leadName) => {
            handleUpdate(row.original.id, 'borrower_id', leadId);
          }}
          onBorrowerClick={handleBorrowerClick}
          className="w-32"
        />
      ) : (
        <Badge variant="outline" className="text-xs">NBT</Badge>
      )
    ),
    sortable: true,
  },
  {
    accessorKey: "borrower.pipeline_stage.name",
    header: "Borrower Stage",
    cell: ({ row }) => {
      const stage = row.original.borrower?.pipeline_stage?.name;
      if (!row.original.borrower_id) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      if (!stage) {
        return (
          <div className="flex justify-center">
            <StatusBadge status="New" />
          </div>
        );
      }
      return (
        <div className="flex justify-center">
          <StatusBadge status={stage} />
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.priority}
        options={[
          { value: "Critical", label: "ASAP" },
          { value: "High", label: "High" },
          { value: "Medium", label: "Medium" },
          { value: "Low", label: "Low" }
        ]}
        onValueChange={(value) => handleUpdate(row.original.id, "priority", value)}
        showAsStatusBadge
        fillCell={true}
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "task_order",
    header: "Order",
    cell: ({ row }) => (
    <div className="w-16">
      <InlineEditNumber
        value={row.original.task_order}
        onValueChange={(value) => handleUpdate(row.original.id, "task_order", value)}
        min={0}
      />
    </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "assignee",
    header: "Assigned To",
    cell: ({ row }) => (
      <InlineEditAssignee
        assigneeId={row.original.assignee_id}
        users={users}
        onValueChange={(userId) => handleUpdate(row.original.id, 'assignee_id', userId)}
        className="w-32"
        showNameText={false}
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.original.due_date
        ? new Date(
            row.original.due_date.includes("T")
              ? row.original.due_date
              : `${row.original.due_date}T00:00:00`
          )
        : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = date ? new Date(date) : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);
      const isOverdue =
        dueDate && dueDate.getTime() < today.getTime() && row.original.status !== "Done";
      
      return (
        <div className={isOverdue ? "text-destructive" : ""}>
          <InlineEditDate
            value={row.original.due_date}
            onValueChange={(date) => {
              // Store date as-is to avoid timezone conversion
              const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
              handleUpdate(row.original.id, "due_date", dateStr);
            }}
            placeholder="No date"
          />
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.status}
        options={[
          { value: "Working on it", label: "Working on it" },
          { value: "Done", label: "Done" },
          { value: "Need help", label: "Need help" }
        ]}
        onValueChange={(value) => handleUpdate(row.original.id, "status", value)}
        showAsStatusBadge
        fillCell={true}
      />
    ),
    sortable: true,
  },
];

export default function TasksModern() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState<ModernTask[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ModernTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState<string>("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [completionRequirement, setCompletionRequirement] = useState<any>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ taskId: string; status: string } | null>(null);
  const [agentCallLogModalOpen, setAgentCallLogModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const { toast } = useToast();

  // Get assignable users
  const assignableUsers = users.filter(u => u.is_active === true && u.is_assignable !== false);

  // Filter columns definition for the filter builder
  const filterColumns = [
    { 
      value: 'priority', 
      label: 'Priority', 
      type: 'select' as const, 
      options: ['High', 'Medium', 'Low'] 
    },
    { 
      value: 'status', 
      label: 'Status', 
      type: 'select' as const, 
      options: ['Working on it', 'Done', 'Need help'] 
    },
    { 
      value: 'assignee_id', 
      label: 'Assigned To', 
      type: 'select' as const, 
      options: assignableUsers.map(u => u.first_name)
    },
    { 
      value: 'due_date', 
      label: 'Due Date', 
      type: 'date' as const
    }
  ];

  const loadTasks = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        databaseService.getTasks(),
        databaseService.getLeads(),
        databaseService.getUsers()
      ]);
      
      // Handle tasks result
      if (results[0].status === 'fulfilled') {
        const sortedTasks = (results[0].value as ModernTask[]).sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTasks(sortedTasks);
      } else {
        console.error("Error loading tasks:", results[0].reason);
        toast({
          title: "Error",
          description: results[0].reason instanceof Error ? results[0].reason.message : "Failed to load tasks",
          variant: "destructive",
        });
      }
      
      // Handle leads result (non-critical for tasks page)
      if (results[1].status === 'fulfilled') {
        setLeads(results[1].value);
      } else {
        console.error("Error loading leads:", results[1].reason);
        setLeads([]);
      }

      // Handle users result
      if (results[2].status === 'fulfilled') {
        setUsers(results[2].value);
      } else {
        console.error("Error loading users:", results[2].reason);
        setUsers([]);
      }
    } catch (error) {
      console.error("Unexpected error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleRowClick = (task: ModernTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleTaskCreated = () => {
    loadTasks();
  };

  const handleUpdate = async (taskId: string, field: string, value: any) => {
    // If trying to mark as Done, validate completion requirements first
    if (field === 'status' && value === 'Done') {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const validation = await validateTaskCompletion(task);

      if (!validation.canComplete) {
        setCompletionRequirement(validation);
        setPendingStatusChange({ taskId, status: value });
        setRequirementModalOpen(true);
        return; // Don't update status yet
      }
    }

    try {
      await databaseService.updateTask(taskId, { [field]: value });
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, [field]: value } : task
      ));
      
      // No toast for inline edits - they're too frequent and distracting
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleLogCallFromModal = () => {
    if (!completionRequirement?.contactInfo) return;

    const contactInfo = completionRequirement.contactInfo;

    if (contactInfo.type === 'buyer_agent' || contactInfo.type === 'listing_agent') {
      // Open agent call log modal
      setSelectedAgent({ id: contactInfo.id, first_name: contactInfo.name.split(' ')[0], last_name: contactInfo.name.split(' ').slice(1).join(' ') });
      setAgentCallLogModalOpen(true);
      setRequirementModalOpen(false);
    } else if (contactInfo.type === 'borrower') {
      // For borrower, we need to open the lead drawer to log call
      const lead = leads.find(l => l.id === contactInfo.id);
      if (lead) {
        setSelectedLead(transformLeadToClient(lead));
        setIsLeadDrawerOpen(true);
        setRequirementModalOpen(false);
      }
    }
  };

  const handleAgentCallLogged = () => {
    setAgentCallLogModalOpen(false);
    
    // Retry the pending status change after call is logged
    if (pendingStatusChange) {
      handleUpdate(pendingStatusChange.taskId, 'status', pendingStatusChange.status);
      setPendingStatusChange(null);
    }
  };

  // Apply advanced filters
  const applyAdvancedFilters = (tasks: ModernTask[], filters: FilterCondition[]) => {
    return tasks.filter(task => {
      return filters.every(filter => {
        let taskValue: any;
        
        switch (filter.column) {
          case 'priority':
            taskValue = task.priority;
            break;
          case 'status':
            taskValue = task.status;
            break;
          case 'assignee_id':
            const assignee = assignableUsers.find(u => u.id === task.assignee_id);
            taskValue = assignee?.first_name || '';
            break;
          case 'due_date':
            taskValue = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
            break;
          default:
            return true;
        }

        switch (filter.operator) {
          case 'is':
            return taskValue === filter.value;
          case 'is_not':
            return taskValue !== filter.value;
          case 'contains':
            return taskValue?.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
          default:
            return true;
        }
      });
    });
  };

  // Filter tasks by search term, user filter, and advanced filters
  const filteredTasks = (() => {
    let result = tasks;

    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        (task.borrower?.first_name && `${task.borrower.first_name} ${task.borrower.last_name}`.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply user filter
    if (userFilter) {
      result = result.filter(task => task.assignee_id === userFilter);
    }
    
    // Apply advanced filters
    if (filters.length > 0) {
      result = applyAdvancedFilters(result, filters);
    }
    
    return result;
  })();

  // Action handlers for DataTable
  const handleViewDetails = (task: ModernTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (task: ModernTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (task: ModernTask) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await databaseService.deleteTask(task.id);
        setTasks(prev => prev.filter(t => t.id !== task.id));
        toast({
          title: "Task deleted successfully",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error deleting task:', error);
        toast({
          title: "Error deleting task",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const handleBorrowerClick = async (borrowerId: string) => {
    try {
      // Fetch full lead details with all embedded data
      const fullLead = await databaseService.getLeadByIdWithEmbeds(borrowerId);
      // Transform to the format ClientDetailDrawer expects
      const transformedLead = transformLeadToClient(fullLead);
      setSelectedLead(transformedLead);
      setIsLeadDrawerOpen(true);
    } catch (error) {
      console.error("Error loading lead details:", error);
      toast({
        title: "Error",
        description: "Failed to load borrower details",
        variant: "destructive",
      });
    }
  };

  const clearAllFilters = () => {
    setFilters([]);
    setUserFilter("");
    setSearchTerm("");
  };

  const completedTasks = filteredTasks.filter(task => task.status === "Done").length;
  const overdueTasks = filteredTasks.filter(task => {
    if (!task.due_date || task.status === "Done") return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
  }).length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {completedTasks} completed • {overdueTasks} overdue • {filteredTasks.length - completedTasks} remaining
          {userFilter && (
            <span className="ml-2 text-primary">
              • Filtered by {assignableUsers.find(u => u.id === userFilter)?.first_name}
            </span>
          )}
          {filters.length > 0 && (
            <span className="ml-2 text-primary">
              • {filters.length} filter{filters.length > 1 ? 's' : ''} active
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{filteredTasks.length - completedTasks}</p>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-destructive">{overdueTasks}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-success">{completedTasks}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* User Filter Icons */}
            <div className="flex items-center gap-2">
              {assignableUsers.map((user) => (
                <Button
                  key={user.id}
                  variant={userFilter === user.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUserFilter(userFilter === user.id ? "" : user.id)}
                  className="h-8 w-8 p-0"
                >
                  <UserAvatar
                    firstName={user.first_name}
                    lastName={user.last_name}
                    email={user.email}
                    size="sm"
                  />
                </Button>
              ))}
            </div>
            
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {filters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {filters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[32rem]" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filter Tasks</h4>
                    {(filters.length > 0 || userFilter || searchTerm) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearAllFilters}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <FilterBuilder
                    filters={filters}
                    onFiltersChange={setFilters}
                    columns={filterColumns}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-muted-foreground">Loading tasks...</div>
            </div>
          ) : (
            <DataTable
              columns={columns(handleUpdate, leads, assignableUsers, handleBorrowerClick)}
              data={filteredTasks}
              searchTerm={searchTerm}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onTaskCreated={handleTaskCreated}
      />

      <TaskDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        task={selectedTask}
        onTaskUpdated={handleTaskCreated}
      />

      {selectedLead && (
        <ClientDetailDrawer
          client={selectedLead}
          isOpen={isLeadDrawerOpen}
          onClose={() => {
            setIsLeadDrawerOpen(false);
            setSelectedLead(null);
          }}
          onStageChange={() => setIsLeadDrawerOpen(false)}
          pipelineType="leads"
          onLeadUpdated={loadTasks}
        />
      )}

      {completionRequirement && (
        <TaskCompletionRequirementModal
          open={requirementModalOpen}
          onOpenChange={setRequirementModalOpen}
          requirement={completionRequirement}
          onLogCall={handleLogCallFromModal}
        />
      )}

      {selectedAgent && (
        <AgentCallLogModal
          isOpen={agentCallLogModalOpen}
          onClose={() => setAgentCallLogModalOpen(false)}
          agentId={selectedAgent.id}
          agentName={`${selectedAgent.first_name} ${selectedAgent.last_name}`}
          onCallLogged={handleAgentCallLogged}
        />
      )}
    </div>
  );
}