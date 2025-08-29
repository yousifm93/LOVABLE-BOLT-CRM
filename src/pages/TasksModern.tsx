import { useState, useEffect } from "react";
import { Search, Plus, Filter, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditBorrower } from "@/components/ui/inline-edit-borrower";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { formatDateModern } from "@/utils/dateUtils";

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
  borrower?: { first_name: string; last_name: string };
}

const USERS = [
  { id: "b06a12ea-00b9-4725-b368-e8a416d4028d", first_name: "Yousif", last_name: "Mohamed", email: "yousif@mortgagebolt.com" },
  { id: "159376ae-30e9-4997-b61f-76ab8d7f224b", first_name: "Salma", last_name: "Mohamed", email: "salma@mortgagebolt.com" },
  { id: "fa92a4c6-890d-4d69-99a8-c3adc6c904ee", first_name: "Herman", last_name: "Daza", email: "herman@mortgagebolt.com" }
];

const columns = (handleUpdate: (taskId: string, field: string, value: any) => void, leads: any[], users: any[]): ColumnDef<ModernTask>[] => [
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
      <div className="w-64">
        <div className="font-medium truncate">{row.original.title}</div>
        {row.original.description && (
          <div className="text-sm text-muted-foreground mt-1 truncate">{row.original.description}</div>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "borrower",
    header: "Borrower",
    cell: ({ row }) => (
      <InlineEditBorrower
        value={row.original.borrower ? `${row.original.borrower.first_name} ${row.original.borrower.last_name}` : undefined}
        borrowerId={row.original.borrower_id}
        leads={leads}
        onValueChange={(leadId, leadName) => {
          handleUpdate(row.original.id, 'borrower_id', leadId);
        }}
        className="w-32"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.priority}
        options={[
          { value: "High", label: "High" },
          { value: "Medium", label: "Medium" },
          { value: "Low", label: "Low" }
        ]}
        onValueChange={(value) => handleUpdate(row.original.id, "priority", value)}
        showAsStatusBadge
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "task_order",
    header: "Order",
    cell: ({ row }) => (
      <InlineEditNumber
        value={row.original.task_order}
        onValueChange={(value) => handleUpdate(row.original.id, "task_order", value)}
        min={0}
      />
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
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.original.due_date ? new Date(row.original.due_date) : null;
      const isOverdue = date && date < new Date() && row.original.status !== "Done";
      const isDueSoon = date && date <= new Date(Date.now() + 24 * 60 * 60 * 1000) && row.original.status !== "Done";
      
      return (
        <div className="flex items-center gap-2">
          {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
          {isDueSoon && !isOverdue && <Clock className="h-4 w-4 text-warning" />}
          {row.original.status === "Done" && <CheckCircle className="h-4 w-4 text-success" />}
          <InlineEditDate
            value={row.original.due_date}
            onValueChange={(date) => {
              const dateStr = date ? date.toISOString().split('T')[0] : null;
              handleUpdate(row.original.id, "due_date", dateStr);
            }}
            placeholder="No date"
            className={isOverdue ? "text-destructive" : ""}
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
  const [userFilter, setUserFilter] = useState<string>("");
  const { toast } = useToast();

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [fetchedTasks, fetchedLeads] = await Promise.all([
        databaseService.getTasks(),
        databaseService.getLeads()
      ]);
      // Sort tasks so newest appear first
      const sortedTasks = (fetchedTasks as ModernTask[]).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTasks(sortedTasks);
      setLeads(fetchedLeads);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
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

  // Filter tasks by search term and user filter
  const filteredTasks = tasks.filter(task => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        (task.borrower?.first_name && `${task.borrower.first_name} ${task.borrower.last_name}`.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }
    
    // User filter
    if (userFilter) {
      return task.assignee_id === userFilter;
    }
    
    return true;
  });

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

  const completedTasks = filteredTasks.filter(task => task.status === "Done").length;
  const overdueTasks = filteredTasks.filter(task => {
    if (!task.due_date || task.status === "Done") return false;
    const dueDate = new Date(task.due_date);
    return dueDate < new Date();
  }).length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {completedTasks} completed • {overdueTasks} overdue • {filteredTasks.length - completedTasks} remaining
          {userFilter && (
            <span className="ml-2 text-primary">
              • Filtered by {USERS.find(u => u.id === userFilter)?.first_name}
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
              {USERS.map((user) => (
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
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-muted-foreground">Loading tasks...</div>
            </div>
          ) : (
            <DataTable
              columns={columns(handleUpdate, leads, USERS)}
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
      />
    </div>
  );
}