import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateTaskModalNew } from '@/components/modals/CreateTaskModalNew';
import { databaseService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TaskPriority, TaskStatus } from '@/types/task';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TasksModernNew() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await databaseService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (id: string, updates: any, originalTask: any) => {
    try {
      await databaseService.updateTask(id, updates, originalTask);
      await loadTasks(); // Reload to get updated data
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const getPriorityBadgeColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'High': return 'bg-destructive text-destructive-foreground';
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadgeColor = (status: TaskStatus) => {
    switch (status) {
      case 'Done': return 'bg-success text-success-foreground';
      case 'Open': return 'bg-info text-info-foreground';
      case 'Deferred': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <button
          className="text-left hover:text-primary transition-colors"
          onClick={() => {
            // TODO: Open edit modal
            console.log('Edit task:', row.original);
          }}
        >
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
              {row.original.description}
            </div>
          )}
        </button>
      ),
      sortable: true
    },
    {
      accessorKey: 'borrower',
      header: 'Borrower',
      cell: ({ row }) => {
        const borrower = row.original.borrower;
        return borrower ? (
          <span>{borrower.first_name} {borrower.last_name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      }
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <Select
          value={row.original.priority}
          onValueChange={(value: TaskPriority) => {
            handleTaskUpdate(row.original.id, { priority: value }, row.original);
          }}
        >
          <SelectTrigger className="w-20 h-6 border-0 p-0">
            <Badge className={getPriorityBadgeColor(row.original.priority)}>
              {TASK_PRIORITY_LABELS[row.original.priority as TaskPriority]}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    {
      accessorKey: 'task_order',
      header: 'Order',
      cell: ({ row }) => (
        <Input
          type="number"
          value={row.original.task_order}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0;
            handleTaskUpdate(row.original.id, { task_order: value }, row.original);
          }}
          className="w-16 h-6 text-xs"
          min="0"
        />
      )
    },
    {
      accessorKey: 'assignee',
      header: 'Assigned To',
      cell: ({ row }) => {
        const assignee = row.original.assignee;
        return assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {assignee.first_name?.[0]}{assignee.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{assignee.first_name} {assignee.last_name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      }
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => {
        const dueDate = row.original.due_date;
        if (!dueDate) return <span className="text-muted-foreground">—</span>;
        
        const formatted = format(new Date(dueDate), 'MMM d, yyyy');
        const overdue = isOverdue(dueDate);
        const dueSoon = isDueSoon(dueDate);
        
        return (
          <span
            className={cn(
              "text-sm",
              overdue && "text-destructive font-medium",
              dueSoon && !overdue && "text-warning font-medium"
            )}
          >
            {formatted}
          </span>
        );
      },
      sortable: true
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(value: TaskStatus) => {
            handleTaskUpdate(row.original.id, { status: value }, row.original);
          }}
        >
          <SelectTrigger className="w-28 h-6 border-0 p-0">
            <Badge className={getStatusBadgeColor(row.original.status)}>
              {TASK_STATUS_LABELS[row.original.status as TaskStatus]}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
  ];

  const filteredTasks = tasks.filter(task =>
    task.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="h-64 bg-muted rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#FFD300] hover:bg-[#FFD300]/90 text-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
        
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tasks…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredTasks}
          searchTerm={searchTerm}
        />
      ) : (
        <div className="text-center py-12">
          <div className="mb-4 text-muted-foreground">
            {searchTerm ? 'No tasks found matching your search.' : 'No tasks yet'}
          </div>
          {!searchTerm && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#FFD300] hover:bg-[#FFD300]/90 text-black"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModalNew
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTaskCreated={loadTasks}
      />
    </div>
  );
}