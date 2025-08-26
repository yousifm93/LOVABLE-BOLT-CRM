import { useState, useEffect } from "react";
import { Search, Plus, Filter, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";

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
  assignee?: { first_name: string; last_name: string };
  borrower?: { first_name: string; last_name: string };
}

const columns: ColumnDef<ModernTask>[] = [
  {
    accessorKey: "status",
    header: "",
    cell: ({ row }) => (
      <Checkbox checked={row.original.status === "Done"} />
    ),
  },
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.title}</div>
        {row.original.description && (
          <div className="text-sm text-muted-foreground mt-1">{row.original.description}</div>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "borrower",
    header: "Borrower",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.borrower 
          ? `${row.original.borrower.first_name} ${row.original.borrower.last_name}`
          : "No borrower"
        }
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge status={row.original.priority || "Medium"} />
    ),
    sortable: true,
  },
  {
    accessorKey: "task_order",
    header: "Order",
    cell: ({ row }) => (
      <div className="text-sm">{row.original.task_order}</div>
    ),
    sortable: true,
  },
  {
    accessorKey: "assignee",
    header: "Assigned To",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.assignee 
          ? `${row.original.assignee.first_name} ${row.original.assignee.last_name}`
          : "Unassigned"
        }
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      if (!row.original.due_date) return <span className="text-muted-foreground">No date</span>;
      
      const date = new Date(row.original.due_date);
      const isOverdue = date < new Date() && row.original.status !== "Done";
      const isDueSoon = date <= new Date(Date.now() + 24 * 60 * 60 * 1000) && row.original.status !== "Done";
      
      return (
        <div className="flex items-center gap-2">
          {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
          {isDueSoon && !isOverdue && <Clock className="h-4 w-4 text-warning" />}
          {row.original.status === "Done" && <CheckCircle className="h-4 w-4 text-success" />}
          <span className={isOverdue ? "text-destructive" : ""}>
            {row.original.due_date}
          </span>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status || "To Do"} />
    ),
    sortable: true,
  },
];

export default function TasksModern() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState<ModernTask[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await databaseService.getTasks();
      setTasks(fetchedTasks as ModernTask[]);
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
    console.log("View task details:", task);
  };

  const handleTaskCreated = () => {
    loadTasks();
    setIsCreateModalOpen(false);
  };

  const completedTasks = tasks.filter(task => task.status === "Done").length;
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date || task.status === "Done") return false;
    const dueDate = new Date(task.due_date);
    return dueDate < new Date();
  }).length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {completedTasks} completed • {overdueTasks} overdue • {tasks.length - completedTasks} remaining
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{tasks.length - completedTasks}</p>
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
          <CardTitle>Task List</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
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
              columns={columns}
              data={tasks}
              searchTerm={searchTerm}
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}