import { useState } from "react";
import { Plus, Filter, Clock, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/crm";

const hermanTasks: Task[] = [
  {
    id: 7,
    title: "Quality control review for Sarah Williams",
    description: "Final loan package review before funding",
    dueDate: "2024-01-17",
    completed: false,
    assignee: "Herman Daza",
    priority: "High",
    clientId: 5
  },
  {
    id: 8,
    title: "Process automation documentation",
    description: "Document new workflow processes",
    dueDate: "2024-01-25",
    completed: false,
    assignee: "Herman Daza",
    priority: "Low"
  },
  {
    id: 9,
    title: "Client satisfaction survey analysis",
    description: "Collected feedback from recent closings",
    dueDate: "2024-01-14",
    completed: true,
    assignee: "Herman Daza",
    priority: "Medium"
  }
];

const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "completed",
    header: "",
    cell: ({ row }) => (
      <Checkbox 
        checked={row.original.completed}
        className="h-4 w-4"
      />
    ),
  },
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <div>
        <p className={`font-medium ${row.original.completed ? 'line-through text-muted-foreground' : ''}`}>
          {row.original.title}
        </p>
        {row.original.description && (
          <p className="text-sm text-muted-foreground">{row.original.description}</p>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge 
        status={row.original.priority || "Medium"} 
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = new Date(row.original.dueDate || '');
      const today = new Date();
      const isOverdue = dueDate < today && !row.original.completed;
      const isDueSoon = dueDate <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) && !row.original.completed;
      
      return (
        <div className={`text-sm ${
          row.original.completed ? 'text-muted-foreground' :
          isOverdue ? 'text-destructive' :
          isDueSoon ? 'text-warning' : 'text-foreground'
        }`}>
          {row.original.dueDate}
        </div>
      );
    },
    sortable: true,
  },
];

export default function HermanTasks() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (task: Task) => {
    console.log("View task details:", task);
  };

  const completedTasks = hermanTasks.filter(task => task.completed).length;
  const overdueTasks = hermanTasks.filter(task => {
    const dueDate = new Date(task.dueDate || '');
    return dueDate < new Date() && !task.completed;
  }).length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Herman Daza's Tasks</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {completedTasks} completed • {overdueTasks} overdue • {hermanTasks.length - completedTasks} remaining
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{hermanTasks.length - completedTasks}</p>
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
              <Clock className="h-8 w-8 text-destructive" />
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
              <CheckSquare className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={hermanTasks}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}