import React, { useState, useEffect } from "react";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { databaseService, Task, Lead, User } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ModernTask extends Task {
  assignee?: User | null;
  borrower?: Lead | null;
  related_lead?: Lead | null;
}

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'Done', label: 'Done' },
  { value: 'Done for Now', label: 'Done for Now' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Didn\'t Get to It', label: 'Didn\'t Get to It' },
  { value: 'Need Help', label: 'Need Help' },
  { value: 'Open', label: 'Open' },
];

const PIPELINE_OPTIONS = [
  { value: 'Leads', label: 'Leads' },
  { value: 'Pending App', label: 'Pending App' },
  { value: 'Screening', label: 'Screening' },
  { value: 'Pre-Qualified', label: 'Pre-Qualified' },
  { value: 'Pre-Approved', label: 'Pre-Approved' },
  { value: 'Active', label: 'Active' },
  { value: 'Past Client', label: 'Past Client' },
];

export function TasksModern() {
  const [tasks, setTasks] = useState<ModernTask[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const filterColumns = [
    { value: 'due_date', label: 'Due Date', type: 'date' as const },
    { value: 'priority', label: 'Priority', type: 'select' as const, options: PRIORITY_OPTIONS.map(o => o.label) },
    { value: 'status', label: 'Task Status', type: 'select' as const, options: STATUS_OPTIONS.map(o => o.label) },
    { value: 'pipeline_stage', label: 'Pipeline', type: 'select' as const, options: PIPELINE_OPTIONS.map(o => o.label) },
    { value: 'title', label: 'Task Name', type: 'text' as const },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, leadsData, usersData] = await Promise.all([
        databaseService.getTasks(),
        databaseService.getLeads(),
        databaseService.getUsers(),
      ]);
      
      setTasks((tasksData as unknown as ModernTask[]) || []);
      setLeads((leadsData as unknown as Lead[]) || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, field: string, value: any) => {
    try {
      const updateData: any = { [field]: value };
      await databaseService.updateTask(taskId, updateData);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, [field]: value } : task
      ));
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!task.title?.toLowerCase().includes(searchLower) && 
          !task.description?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Advanced filters (simplified for now)
    return true;
  });

  const borrowerOptions = leads.map(lead => ({
    value: lead.id,
    label: `${lead.first_name} ${lead.last_name}`
  }));

  const assigneeOptions = users.map(user => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name}`
  }));

  if (loading) {
    return <div className="pl-4 pr-0 pt-2 pb-0">Loading...</div>;
  }

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <div className="bg-card p-4 rounded-lg border">
            <FilterBuilder
              filters={filters}
              onFiltersChange={setFilters}
              columns={filterColumns}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Modern Data Table */}
      <div className="bg-card rounded-lg border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Task Name</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Borrower</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Priority</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Task Order</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Assign To</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Due Date</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Task Status</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr 
                  key={task.id} 
                  className="border-b hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <InlineEditSelect
                      value={task.borrower_id || ''}
                      options={borrowerOptions}
                      onValueChange={(value) => handleUpdateTask(task.id, 'borrower_id', value)}
                      placeholder="Select borrower"
                    />
                  </td>
                  <td className="p-3">
                    <InlineEditSelect
                      value={task.priority || ''}
                      options={PRIORITY_OPTIONS}
                      onValueChange={(value) => handleUpdateTask(task.id, 'priority', value)}
                      placeholder="Set priority"
                      showAsStatusBadge
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      value={task.task_order || 1}
                      onChange={(e) => handleUpdateTask(task.id, 'task_order', parseInt(e.target.value))}
                      className="w-20 h-8"
                      min="1"
                    />
                  </td>
                  <td className="p-3">
                    <InlineEditSelect
                      value={task.assignee_id || ''}
                      options={assigneeOptions}
                      onValueChange={(value) => handleUpdateTask(task.id, 'assignee_id', value)}
                      placeholder="Assign to"
                    />
                  </td>
                  <td className="p-3">
                    <InlineEditDate
                      value={task.due_date}
                      onValueChange={(date) => handleUpdateTask(task.id, 'due_date', date)}
                      placeholder="Set due date"
                    />
                  </td>
                  <td className="p-3">
                    <InlineEditSelect
                      value={task.status || ''}
                      options={STATUS_OPTIONS}
                      onValueChange={(value) => handleUpdateTask(task.id, 'status', value)}
                      placeholder="Set status"
                      showAsStatusBadge
                    />
                  </td>
                  <td className="p-3">
                    <InlineEditSelect
                      value={task.pipeline_stage || ''}
                      options={PIPELINE_OPTIONS}
                      onValueChange={(value) => handleUpdateTask(task.id, 'pipeline_stage', value)}
                      placeholder="Set pipeline"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No tasks found matching your criteria
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTaskCreated={loadData}
      />
    </div>
  );
}