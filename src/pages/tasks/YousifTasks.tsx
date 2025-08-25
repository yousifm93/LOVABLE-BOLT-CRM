import { useState } from "react";
import { Search, Plus, Filter, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/crm";

const yousifTasks: Task[] = [
  {
    id: 1,
    title: "Follow up with Jessica Lee - Income verification",
    description: "Need to collect updated W2 documents",
    dueDate: "2024-01-20",
    completed: false,
    assignee: "Yousif",
    priority: "High",
    clientId: 1
  },
  {
    id: 2,
    title: "Schedule property appraisal for David Park",
    description: "Contact appraiser for $350K refinance",
    dueDate: "2024-01-18",
    completed: true,
    assignee: "Yousif",
    priority: "Medium",
    clientId: 2
  },
  {
    id: 3,
    title: "Review credit report anomalies",
    description: "Client has questions about credit inquiries",
    dueDate: "2024-01-22",
    completed: false,
    assignee: "Yousif",
    priority: "Medium"
  }
];

const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "completed",
    header: "",
    cell: ({ row }) => (
      <Checkbox checked={row.original.completed} />
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
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge status={row.original.priority || "Medium"} />
    ),
    sortable: true,
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const date = new Date(row.original.dueDate || '');
      const isOverdue = date < new Date() && !row.original.completed;
      const isDueSoon = date <= new Date(Date.now() + 24 * 60 * 60 * 1000) && !row.original.completed;
      
      return (
        <div className="flex items-center gap-2">
          {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
          {isDueSoon && !isOverdue && <Clock className="h-4 w-4 text-warning" />}
          {row.original.completed && <CheckCircle className="h-4 w-4 text-success" />}
          <span className={isOverdue ? "text-destructive" : ""}>
            {row.original.dueDate}
          </span>
        </div>
      );
    },
    sortable: true,
  },
];

export default function YousifTasks() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (task: Task) => {
    console.log("View task details:", task);
  };

  const completedTasks = yousifTasks.filter(task => task.completed).length;
  const overdueTasks = yousifTasks.filter(task => {
    const dueDate = new Date(task.dueDate || '');
    return dueDate < new Date() && !task.completed;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Yousif's Tasks</h1>
          <p className="text-muted-foreground">
            {completedTasks} completed • {overdueTasks} overdue • {yousifTasks.length - completedTasks} remaining
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{yousifTasks.length - completedTasks}</p>
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
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tasks..."
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
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={yousifTasks}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}