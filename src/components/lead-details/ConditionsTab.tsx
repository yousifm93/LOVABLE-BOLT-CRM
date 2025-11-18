import { useState, useEffect, useMemo } from "react";
import { Plus, FileText, X, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Condition {
  id: string;
  lead_id: string;
  condition_type: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  document_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
}

interface ConditionsTabProps {
  leadId: string;
  onConditionsChange?: () => void;
}

const CONDITION_TYPES = [
  { value: "credit_report", label: "Credit Report", icon: "📊" },
  { value: "income_verification", label: "Income Verification", icon: "💰" },
  { value: "asset_verification", label: "Asset Verification", icon: "🏦" },
  { value: "employment_verification", label: "Employment Verification", icon: "💼" },
  { value: "appraisal", label: "Appraisal", icon: "🏠" },
  { value: "title_work", label: "Title Work", icon: "📋" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "other", label: "Other", icon: "📄" },
];

const STATUSES = [
  { value: "1_added", label: "1. Added", color: "bg-gray-100 text-gray-800" },
  { value: "2_requested", label: "2. Requested", color: "bg-blue-100 text-blue-800" },
  { value: "3_re_requested", label: "3. Re-requested", color: "bg-orange-100 text-orange-800" },
  { value: "4_collected", label: "4. Collected", color: "bg-purple-100 text-purple-800" },
  { value: "5_sent_to_lender", label: "5. Sent to Lender", color: "bg-yellow-100 text-yellow-800" },
  { value: "6_cleared", label: "6. Cleared", color: "bg-green-100 text-green-800" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "high", label: "High", color: "bg-red-100 text-red-800" },
];

export function ConditionsTab({ leadId, onConditionsChange }: ConditionsTabProps) {
  const { toast } = useToast();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'status' | 'due_date'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Group collapsible state
  const [isGroup1Open, setIsGroup1Open] = useState(true);
  const [isGroup2Open, setIsGroup2Open] = useState(true);

  // Detail modal state
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Single condition form data
  const [formData, setFormData] = useState({
    condition_type: "",
    description: "",
    status: "1_added",
    priority: "medium",
    due_date: "",
    notes: "",
  });

  // Bulk conditions data
  const [bulkConditions, setBulkConditions] = useState<Array<{
    condition_type: string;
    description: string;
    status: string;
    due_date: string;
    priority: string;
    notes: string;
  }>>([]);

  useEffect(() => {
    loadConditions();
    loadUsers();
  }, [leadId]);

  const loadConditions = async () => {
    try {
      setLoading(true);
      const data = await databaseService.getLeadConditions(leadId);
      setConditions(data || []);
    } catch (error: any) {
      console.error("Error loading conditions:", error);
      toast({
        title: "Error",
        description: "Failed to load conditions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Sort and group conditions
  const sortedConditions = useMemo(() => {
    return [...conditions].sort((a, b) => {
      if (sortBy === 'status') {
        const aNum = parseInt(a.status.split('_')[0]);
        const bNum = parseInt(b.status.split('_')[0]);
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      } else {
        const aDate = a.due_date ? new Date(a.due_date) : new Date(0);
        const bDate = b.due_date ? new Date(b.due_date) : new Date(0);
        return sortOrder === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }
    });
  }, [conditions, sortBy, sortOrder]);

  const group1Conditions = sortedConditions.filter(c => 
    ['1_added', '2_requested', '3_re_requested'].includes(c.status)
  );
  
  const group2Conditions = sortedConditions.filter(c => 
    ['4_collected', '5_sent_to_lender', '6_cleared'].includes(c.status)
  );

  const handleOpenDialog = (condition?: Condition) => {
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        condition_type: condition.condition_type,
        description: condition.description,
        status: condition.status,
        priority: condition.priority || "medium",
        due_date: condition.due_date || "",
        notes: condition.notes || "",
      });
    } else {
      setEditingCondition(null);
      setFormData({
        condition_type: "",
        description: "",
        status: "1_added",
        priority: "medium",
        due_date: "",
        notes: "",
      });
    }
    setIsBulkMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenConditionDetail = (condition: Condition) => {
    setSelectedCondition(condition);
    setIsDetailModalOpen(true);
  };

  const handleOpenBulkDialog = () => {
    setIsBulkMode(true);
    setEditingCondition(null);
    setBulkConditions([{
      condition_type: "",
      description: "",
      status: "1_added",
      due_date: "",
      priority: "medium",
      notes: "",
    }]);
    setIsDialogOpen(true);
  };

  const handleSaveCondition = async () => {
    if (!formData.condition_type || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingCondition) {
        await databaseService.updateLeadCondition(editingCondition.id, {
          ...formData,
          updated_at: new Date().toISOString(),
        });
        toast({
          title: "Success",
          description: "Condition updated successfully",
        });
      } else {
        await databaseService.createLeadCondition({
          lead_id: leadId,
          ...formData,
          created_by: user?.id || null,
        });
        toast({
          title: "Success",
          description: "Condition created successfully",
        });
      }
      
      await loadConditions();
      setIsDialogOpen(false);
      if (onConditionsChange) onConditionsChange();
    } catch (error: any) {
      console.error("Error saving condition:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save condition",
        variant: "destructive",
      });
    }
  };

  const handleBulkSaveConditions = async () => {
    // Validate all conditions
    for (const condition of bulkConditions) {
      if (!condition.condition_type || !condition.description) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields for each condition",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const conditionData of bulkConditions) {
        await databaseService.createLeadCondition({
          lead_id: leadId,
          ...conditionData,
          created_by: user?.id || null,
        });
      }
      
      toast({
        title: "Success",
        description: `${bulkConditions.length} conditions created successfully`,
      });
      
      await loadConditions();
      setIsDialogOpen(false);
      setBulkConditions([]);
      if (onConditionsChange) onConditionsChange();
    } catch (error: any) {
      console.error("Error creating bulk conditions:", error);
      toast({
        title: "Error",
        description: "Failed to create conditions",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCondition = async (conditionId: string) => {
    if (!confirm("Are you sure you want to delete this condition?")) {
      return;
    }

    try {
      await databaseService.deleteLeadCondition(conditionId);
      toast({
        title: "Success",
        description: "Condition deleted successfully",
      });
      await loadConditions();
    } catch (error: any) {
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
      await databaseService.updateLeadCondition(conditionId, {
        [field]: value,
        updated_at: new Date().toISOString(),
      });
      await loadConditions();
    } catch (error: any) {
      console.error("Error updating condition:", error);
      toast({
        title: "Error",
        description: "Failed to update condition",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = STATUSES.find(s => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const statusObj = STATUSES.find(s => s.value === status);
    return statusObj?.label || status;
  };

  const getUserById = (userId: string | null) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
  };

  const handleSortClick = (column: 'status' | 'due_date') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderConditionsTable = (conditionsList: Condition[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Description</TableHead>
          <TableHead 
            onClick={() => handleSortClick('status')}
            className="cursor-pointer hover:bg-muted w-[160px]"
          >
            Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            onClick={() => handleSortClick('due_date')}
            className="cursor-pointer hover:bg-muted w-[120px]"
          >
            ETA {sortBy === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {conditionsList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
              No conditions in this group
            </TableCell>
          </TableRow>
        ) : (
          conditionsList.map((condition) => {
            return (
              <TableRow 
                key={condition.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleOpenConditionDetail(condition)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{condition.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {CONDITION_TYPES.find(t => t.value === condition.condition_type)?.label || condition.condition_type}
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={condition.status}
                    onValueChange={(value) => handleInlineUpdate(condition.id, 'status', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <Badge className={getStatusColor(condition.status)}>
                        {getStatusLabel(condition.status)}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <Badge className={status.color}>{status.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {condition.due_date ? (
                    <div className="text-sm">
                      {format(new Date(condition.due_date), 'MMM dd')}
                    </div>
                  ) : (
                    <span 
                      className="cursor-pointer text-muted-foreground hover:text-foreground text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInlineUpdate(condition.id, 'due_date', new Date().toISOString().split('T')[0]);
                      }}
                    >
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCondition(condition.id)}
                    className="h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading conditions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Loan Conditions</h3>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
      </div>

      <div className="space-y-3">
        {/* Group 1: Added and Requested */}
        <Collapsible open={isGroup1Open} onOpenChange={setIsGroup1Open}>
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            {isGroup1Open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-semibold">Added and Requested ({group1Conditions.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="border rounded-lg overflow-hidden">
              {renderConditionsTable(group1Conditions)}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Group 2: Collected and Cleared */}
        <Collapsible open={isGroup2Open} onOpenChange={setIsGroup2Open}>
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            {isGroup2Open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-semibold">Collected and Cleared ({group2Conditions.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="border rounded-lg overflow-hidden">
              {renderConditionsTable(group2Conditions)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Add/Edit Condition Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isBulkMode ? "Add Multiple Conditions" : editingCondition ? "Edit Condition" : "Add Condition"}
            </DialogTitle>
            <DialogDescription>
              {isBulkMode ? "Create multiple conditions at once" : "Fill in the details for the loan condition"}
            </DialogDescription>
          </DialogHeader>

          {isBulkMode ? (
            <div className="space-y-4">
              {bulkConditions.map((condition, index) => (
                <Card key={index} className="p-4 bg-muted">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm">Condition {index + 1}</span>
                    {bulkConditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBulkConditions(prev => prev.filter((_, i) => i !== index))}
                        className="h-7 px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Type *</label>
                      <Select
                        value={condition.condition_type}
                        onValueChange={(value) => {
                          const newConditions = [...bulkConditions];
                          newConditions[index].condition_type = value;
                          setBulkConditions(newConditions);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={condition.status}
                        onValueChange={(value) => {
                          const newConditions = [...bulkConditions];
                          newConditions[index].status = value;
                          setBulkConditions(newConditions);
                        }}
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

                    <div className="col-span-2">
                      <label className="text-sm font-medium">Description *</label>
                      <Input
                        value={condition.description}
                        onChange={(e) => {
                          const newConditions = [...bulkConditions];
                          newConditions[index].description = e.target.value;
                          setBulkConditions(newConditions);
                        }}
                        placeholder="Brief description of the condition"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={condition.priority}
                        onValueChange={(value) => {
                          const newConditions = [...bulkConditions];
                          newConditions[index].priority = value;
                          setBulkConditions(newConditions);
                        }}
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

                    <div>
                      <label className="text-sm font-medium">Due Date</label>
                      <Input
                        type="date"
                        value={condition.due_date}
                        onChange={(e) => {
                          const newConditions = [...bulkConditions];
                          newConditions[index].due_date = e.target.value;
                          setBulkConditions(newConditions);
                        }}
                      />
                    </div>

                    <div></div>

                    <div className="col-span-2">
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={condition.notes}
                        onChange={(e) => {
                          const newConditions = [...bulkConditions];
                          newConditions[index].notes = e.target.value;
                          setBulkConditions(newConditions);
                        }}
                        placeholder="Additional notes or instructions"
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setBulkConditions(prev => [...prev, {
                  condition_type: "",
                  description: "",
                  status: "1_added",
                  due_date: "",
                  priority: "medium",
                  notes: "",
                }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Condition
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type *</label>
                <Select
                  value={formData.condition_type}
                  onValueChange={(value) => setFormData({ ...formData, condition_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
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

              <div className="col-span-2">
                <label className="text-sm font-medium">Description *</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the condition"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
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

              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div></div>

              <div className="col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or instructions"
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  if (!isBulkMode) {
                    setIsBulkMode(true);
                    setBulkConditions([
                      formData,
                      {
                        condition_type: "",
                        description: "",
                        status: "1_added",
                        due_date: "",
                        priority: "medium",
                        notes: "",
                      }
                    ]);
                  } else {
                    setBulkConditions([...bulkConditions, {
                      condition_type: "",
                      description: "",
                      status: "1_added",
                      due_date: "",
                      priority: "medium",
                      notes: "",
                    }]);
                  }
                }}
                className="text-sm"
              >
                + Add another condition
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={isBulkMode ? handleBulkSaveConditions : handleSaveCondition}>
                  {isBulkMode ? `Create ${bulkConditions.length} Conditions` : editingCondition ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
