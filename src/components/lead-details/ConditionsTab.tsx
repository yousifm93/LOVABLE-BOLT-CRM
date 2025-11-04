import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, User, AlertCircle } from "lucide-react";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Condition {
  id: string;
  condition_type: string;
  description: string;
  status: string;
  due_date: string | null;
  priority: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  assigned_user?: { first_name: string; last_name: string } | null;
  created_user?: { first_name: string; last_name: string } | null;
}

interface ConditionsTabProps {
  leadId: string | null;
  onConditionsChange?: () => void;
}

const CONDITION_TYPES = [
  "Title",
  "Appraisal",
  "Insurance",
  "Income Verification",
  "Credit Review",
  "Asset Documentation",
  "Property Documents",
  "Loan Documents",
  "HOA Documents",
  "Other",
];

const STATUSES = [
  { value: "pending", label: "Pending", variant: "secondary" as const },
  { value: "in_progress", label: "In Progress", variant: "default" as const },
  { value: "satisfied", label: "Satisfied", variant: "default" as const },
  { value: "waived", label: "Waived", variant: "outline" as const },
  { value: "not_applicable", label: "N/A", variant: "outline" as const },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function ConditionsTab({ leadId, onConditionsChange }: ConditionsTabProps) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    condition_type: "",
    description: "",
    status: "pending",
    due_date: "",
    priority: "medium",
    assigned_to: "",
    notes: "",
  });

  useEffect(() => {
    if (leadId) {
      loadConditions();
      loadUsers();
    }
  }, [leadId]);

  const loadConditions = async () => {
    if (!leadId) return;
    try {
      setIsLoading(true);
      const data = await databaseService.getLeadConditions(leadId);
      setConditions(data || []);
    } catch (error) {
      console.error("Error loading conditions:", error);
      toast({
        title: "Error",
        description: "Failed to load conditions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await databaseService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleOpenDialog = (condition?: Condition) => {
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        condition_type: condition.condition_type,
        description: condition.description,
        status: condition.status,
        due_date: condition.due_date || "",
        priority: condition.priority,
        assigned_to: condition.assigned_to || "",
        notes: condition.notes || "",
      });
    } else {
      setEditingCondition(null);
      setFormData({
        condition_type: "",
        description: "",
        status: "pending",
        due_date: "",
        priority: "medium",
        assigned_to: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveCondition = async () => {
    if (!leadId || !formData.condition_type || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const conditionData = {
        lead_id: leadId,
        condition_type: formData.condition_type,
        description: formData.description,
        status: formData.status,
        due_date: formData.due_date || null,
        priority: formData.priority,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes || null,
      };

      if (editingCondition) {
        await databaseService.updateLeadCondition(editingCondition.id, conditionData);
        toast({
          title: "Success",
          description: "Condition updated successfully",
        });
      } else {
        await databaseService.createLeadCondition(conditionData);
        toast({
          title: "Success",
          description: "Condition created successfully",
        });
      }

      setIsDialogOpen(false);
      loadConditions();
      if (onConditionsChange) onConditionsChange();
    } catch (error) {
      console.error("Error saving condition:", error);
      toast({
        title: "Error",
        description: "Failed to save condition",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCondition = async (id: string) => {
    if (!confirm("Are you sure you want to delete this condition?")) return;

    try {
      await databaseService.deleteLeadCondition(id);
      toast({
        title: "Success",
        description: "Condition deleted successfully",
      });
      loadConditions();
      if (onConditionsChange) onConditionsChange();
    } catch (error) {
      console.error("Error deleting condition:", error);
      toast({
        title: "Error",
        description: "Failed to delete condition",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const statusObj = STATUSES.find((s) => s.value === status);
    return statusObj?.variant || "secondary";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-muted-foreground",
      medium: "text-blue-600",
      high: "text-orange-600",
      critical: "text-red-600",
    };
    return colors[priority] || "text-muted-foreground";
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading conditions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage loan conditions and requirements for this borrower
        </p>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No conditions added yet. Click "Add Condition" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition) => (
            <Card key={condition.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{condition.condition_type}</Badge>
                      <Badge variant={getStatusBadgeVariant(condition.status)}>
                        {STATUSES.find((s) => s.value === condition.status)?.label}
                      </Badge>
                      {condition.priority !== "medium" && (
                        <span className={`text-xs font-medium ${getPriorityColor(condition.priority)}`}>
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {PRIORITIES.find((p) => p.value === condition.priority)?.label}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-sm font-medium">
                      {condition.description}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(condition)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCondition(condition.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {condition.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {format(new Date(condition.due_date), "MMM dd, yyyy")}
                    </div>
                  )}
                  {condition.assigned_user && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {condition.assigned_user.first_name} {condition.assigned_user.last_name}
                    </div>
                  )}
                </div>
                {condition.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{condition.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCondition ? "Edit Condition" : "Add Condition"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition_type">Type *</Label>
                <Select
                  value={formData.condition_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, condition_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the condition..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select
                value={formData.assigned_to || "unassigned"}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_to: value === "unassigned" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCondition}>
              {editingCondition ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
