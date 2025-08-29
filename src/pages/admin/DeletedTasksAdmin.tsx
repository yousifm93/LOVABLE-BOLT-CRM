import { useState, useEffect } from "react";
import { Search, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { formatDateModern } from "@/utils/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";

interface DeletedTask {
  id: string;
  title: string;
  description?: string;
  deleted_at: string;
  status: string;
  priority: string;
  assignee?: { first_name: string; last_name: string; email: string };
  borrower?: { first_name: string; last_name: string };
  deleted_by_user?: { first_name: string; last_name: string; email: string };
}

const columns = (
  handleRestore: (task: DeletedTask) => void,
  handlePermanentDelete: (task: DeletedTask) => void
): ColumnDef<DeletedTask>[] => [
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <div className="w-96 min-w-96 flex-shrink-0">
        <div className="font-medium text-sm">{row.original.title}</div>
        {row.original.description && (
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed truncate whitespace-nowrap overflow-hidden" title={row.original.description}>
            {row.original.description}
          </div>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "borrower",
    header: "Borrower",
    cell: ({ row }) => (
      <div className="w-32">
        {row.original.borrower ? `${row.original.borrower.first_name} ${row.original.borrower.last_name}` : '-'}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge status={row.original.priority} />
    ),
    sortable: true,
  },
  {
    accessorKey: "assignee",
    header: "Assigned To",
    cell: ({ row }) => (
      <div className="w-32">
        {row.original.assignee ? `${row.original.assignee.first_name} ${row.original.assignee.last_name}` : '-'}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "deleted_at",
    header: "Deleted At",
    cell: ({ row }) => (
      <div className="text-sm">
        {formatDateModern(new Date(row.original.deleted_at))}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "deleted_by_user",
    header: "Deleted By",
    cell: ({ row }) => (
      <div className="w-32">
        {row.original.deleted_by_user ? `${row.original.deleted_by_user.first_name} ${row.original.deleted_by_user.last_name}` : '-'}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} />
    ),
    sortable: true,
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRestore(row.original)}
          className="text-green-600 hover:text-green-700"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Restore
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePermanentDelete(row.original)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Forever
        </Button>
      </div>
    ),
  },
];

export default function DeletedTasksAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState<DeletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadDeletedTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await databaseService.getDeletedTasks();
      setTasks(fetchedTasks as any);
    } catch (error) {
      console.error("Error loading deleted tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load deleted tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedTasks();
  }, []);

  const handleRestore = async (task: DeletedTask) => {
    if (window.confirm(`Are you sure you want to restore "${task.title}"?`)) {
      try {
        await databaseService.restoreTask(task.id);
        setTasks(prev => prev.filter(t => t.id !== task.id));
        toast({
          title: "Task restored successfully",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error restoring task:', error);
        toast({
          title: "Error restoring task",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const handlePermanentDelete = async (task: DeletedTask) => {
    if (window.confirm(`Are you sure you want to permanently delete "${task.title}"? This action cannot be undone.`)) {
      try {
        await databaseService.permanentlyDeleteTask(task.id);
        setTasks(prev => prev.filter(t => t.id !== task.id));
        toast({
          title: "Task permanently deleted",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error permanently deleting task:', error);
        toast({
          title: "Error deleting task",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  // Filter tasks by search term
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.borrower && `${task.borrower.first_name} ${task.borrower.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deleted Tasks (Admin)</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {filteredTasks.length} deleted task{filteredTasks.length !== 1 ? 's' : ''} • Admin access only
        </p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search deleted tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-muted-foreground">Loading deleted tasks...</div>
            </div>
          ) : (
            <DataTable
              columns={columns(handleRestore, handlePermanentDelete)}
              data={filteredTasks}
              searchTerm={searchTerm}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}