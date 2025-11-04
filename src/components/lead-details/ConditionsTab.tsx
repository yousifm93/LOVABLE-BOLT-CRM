import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, User, AlertCircle, FileText, DollarSign, Home, Shield, CreditCard, FileCheck, FileBox, Building } from "lucide-react";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditText } from "@/components/ui/inline-edit-text";
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
  updated_at: string;
  assigned_user?: { first_name: string; last_name: string; email?: string } | null;
  created_user?: { first_name: string; last_name: string; email?: string } | null;
}

interface ConditionsTabProps {
  leadId: string | null;
  onConditionsChange?: () => void;
}

const CONDITION_TYPES = [
  { value: "Title", label: "Title", icon: FileText },
  { value: "Appraisal", label: "Appraisal", icon: DollarSign },
  { value: "Insurance", label: "Insurance", icon: Shield },
  { value: "Income Verification", label: "Income Verification", icon: FileCheck },
  { value: "Credit Review", label: "Credit Review", icon: CreditCard },
  { value: "Asset Documentation", label: "Asset Documentation", icon: FileBox },
  { value: "Property Documents", label: "Property Documents", icon: Home },
  { value: "Loan Documents", label: "Loan Documents", icon: FileText },
  { value: "HOA Documents", label: "HOA Documents", icon: Building },
  { value: "Other", label: "Other", icon: FileText },
];

const STATUSES = [
  { value: "1_added", label: "1. ADDED", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "2_requested", label: "2. REQUESTED", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "3_re_requested", label: "3. RE-REQUESTED", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  { value: "4_collected", label: "4. COLLECTED", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "5_sent_to_lender", label: "5. SENT TO LENDER", color: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200" },
  { value: "6_cleared", label: "6. CLEARED", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" }
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
    status: "1_added",
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
      // Filter to only include specific team members
      const allowedNames = ['Youssef', 'Salma', 'Juan', 'Herman'];
      const filteredUsers = (data || []).filter(user => 
        allowedNames.includes(user.first_name)
      );
      setUsers(filteredUsers);
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
        status: "1_added",
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
      setEditingCondition(null);
      loadConditions();
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
    } catch (error) {
      console.error("Error deleting condition:", error);
      toast({
        title: "Error",
        description: "Failed to delete condition",
        variant: "destructive",
      });
    }
  };

  const handleInlineUpdate = async (conditionId: string, field: string, value: any) => {
    try {
      await databaseService.updateLeadCondition(conditionId, { [field]: value });
      
      // Update local state
      setConditions(prev => 
        prev.map(c => c.id === conditionId ? { ...c, [field]: value, updated_at: new Date().toISOString() } : c)
      );
      
      toast({
        title: "Success",
        description: "Condition updated successfully",
      });
    } catch (error) {
      console.error("Error updating condition:", error);
      toast({
        title: "Error",
        description: "Failed to update condition",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const statusConfig = STATUSES.find(s => s.value === status);
    return statusConfig?.color || "bg-gray-100 text-gray-800";
  };

  const getUserById = (userId: string | null) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
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
        <div className="text-center py-8 text-muted-foreground">
          No conditions added yet. Click "Add Condition" to get started.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">Condition</TableHead>
                <TableHead className="w-[18%]">Condition Status</TableHead>
                <TableHead className="w-[12%]">ETA</TableHead>
                <TableHead className="w-[13%]">Last updated</TableHead>
                <TableHead className="w-[30%]">Team Notes</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditions.map((condition) => {
                const conditionType = CONDITION_TYPES.find(t => t.value === condition.condition_type);
                const assignedUser = getUserById(condition.assigned_to);
                const updatedAt = condition.updated_at ? new Date(condition.updated_at) : new Date(condition.created_at);
                
                return (
                  <TableRow key={condition.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {conditionType && (
                            <conditionType.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm">{condition.description || conditionType?.label}</span>
                        </div>
                        {condition.description && conditionType && (
                          <span className="text-xs text-muted-foreground ml-6">{conditionType.label}</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <InlineEditSelect
                        value={condition.status}
                        options={STATUSES.map(s => ({ value: s.value, label: s.label }))}
                        onValueChange={(value) => handleInlineUpdate(condition.id, 'status', value)}
                        showAsStatusBadge={true}
                        className={getStatusColor(condition.status)}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <InlineEditDate
                        value={condition.due_date}
                        onValueChange={(date) => handleInlineUpdate(condition.id, 'due_date', date ? format(date, 'yyyy-MM-dd') : null)}
                        placeholder="Set date"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(updatedAt, { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <InlineEditText
                        value={condition.notes}
                        onValueChange={(value) => handleInlineUpdate(condition.id, 'notes', value)}
                        placeholder="Add notes..."
                        className="max-w-[300px]"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCondition(condition.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
