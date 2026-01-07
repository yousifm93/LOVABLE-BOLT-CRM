import { useState, useEffect, useMemo } from "react";
import { Plus, FileText, X, ChevronDown, ChevronRight, Trash2, CalendarIcon } from "lucide-react";
import { format, formatDistance } from "date-fns";
import { formatDateModern } from "@/utils/dateUtils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useAuth } from "@/hooks/useAuth";

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
  needed_from: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
}

const NEEDED_FROM_OPTIONS = [
  { value: "Borrower", label: "Borrower" },
  { value: "Lender", label: "Lender" },
  { value: "Broker", label: "Broker" },
  { value: "Third Party", label: "Third Party" },
];

interface ConditionsTabProps {
  leadId: string | null;
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
  { value: "1_added", label: "1. ADDED", color: "bg-gray-200 text-gray-900" },
  { value: "2_requested", label: "2. REQUESTED", color: "bg-pink-200 text-pink-900" },
  { value: "3_re_requested", label: "3. RE-REQUESTED", color: "bg-yellow-400 text-yellow-900" },
  { value: "4_collected", label: "4. COLLECTED", color: "bg-green-300 text-green-900" },
  { value: "5_sent_to_lender", label: "5. SENT TO LENDER", color: "bg-lime-400 text-lime-900" },
  { value: "6_cleared", label: "6. CLEARED!", color: "bg-green-400 text-green-900" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "high", label: "High", color: "bg-red-100 text-red-800" },
];

export function ConditionsTab({ leadId, onConditionsChange }: ConditionsTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'status' | 'due_date' | 'condition' | 'needed_from'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Group collapsible state
  const [isGroup1Open, setIsGroup1Open] = useState(true);
  const [isGroup2Open, setIsGroup2Open] = useState(true);

  // Detail modal state
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

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
    if (leadId) {
      loadConditions();
      loadUsers();
    } else {
      setLoading(false);
      setConditions([]);
    }
  }, [leadId]);

  const loadConditions = async () => {
    if (!leadId) {
      setConditions([]);
      setLoading(false);
      return;
    }
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
      } else if (sortBy === 'condition') {
        return sortOrder === 'asc' 
          ? a.description.localeCompare(b.description)
          : b.description.localeCompare(a.description);
      } else if (sortBy === 'needed_from') {
        const aFrom = a.needed_from || '';
        const bFrom = b.needed_from || '';
        return sortOrder === 'asc' 
          ? aFrom.localeCompare(bFrom)
          : bFrom.localeCompare(aFrom);
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

  const handleOpenConditionDetail = async (condition: Condition) => {
    setSelectedCondition(condition);
    setIsDetailModalOpen(true);
    
    // Load status history
    try {
      const history = await databaseService.getConditionStatusHistory(condition.id);
      setStatusHistory(history);
    } catch (error) {
      console.error('Error loading status history:', error);
      setStatusHistory([]);
    }
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
        // Service handles setting created_by with correct CRM user ID
        await databaseService.createLeadCondition({
          lead_id: leadId,
          ...formData,
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
      // Service handles setting created_by with correct CRM user ID
      for (const conditionData of bulkConditions) {
        await databaseService.createLeadCondition({
          lead_id: leadId,
          ...conditionData,
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

  const handleUploadDocument = async (conditionId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.multiple = false;
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const uploadedDoc = await databaseService.uploadLeadDocument(leadId, file, {
          title: file.name
        });
        
        await databaseService.updateLeadCondition(conditionId, {
          document_id: uploadedDoc.id
        });
        
        toast({
          title: "Success",
          description: "Document uploaded and linked to condition"
        });
        
        await loadConditions();
        
        if (selectedCondition) {
          setSelectedCondition({ ...selectedCondition, document_id: uploadedDoc.id });
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload document",
          variant: "destructive"
        });
      }
    };
    
    input.click();
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
    if (field === 'status' && ['4_collected', '5_sent_to_lender', '6_cleared'].includes(value)) {
      const condition = conditions.find(c => c.id === conditionId);
      
      // Only validate if currently in statuses 1-3 (Added, Requested, Re-requested)
      const isInEarlyStatus = ['1_added', '2_requested', '3_re_requested'].includes(condition?.status || '');
      
      if (isInEarlyStatus && !condition?.document_id) {
        toast({
          title: "Document Required",
          description: "Please upload a document before marking as Collected, Sent to Lender, or Cleared",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Optimistically update local state first to prevent refresh flicker
    setConditions(prev => prev.map(c => 
      c.id === conditionId ? { ...c, [field]: value, updated_at: new Date().toISOString() } : c
    ));
    
    try {
      await databaseService.updateLeadCondition(conditionId, {
        [field]: value,
        updated_at: new Date().toISOString(),
      });
      // Only reload if status changed to completion statuses (for status history)
      if (field === 'status' && ['4_collected', '5_sent_to_lender', '6_cleared'].includes(value)) {
        await loadConditions();
      }
    } catch (error: any) {
      console.error("Error updating condition:", error);
      // Revert on error by reloading
      await loadConditions();
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

  const handleSortClick = (column: 'status' | 'due_date' | 'condition' | 'needed_from') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const viewDocument = async (documentId: string) => {
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .single();
      
      if (error) throw error;
      if (doc?.file_url) {
        window.open(doc.file_url, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive"
      });
    }
  };

  const renderConditionsTable = (conditionsList: Condition[]) => (
    <Table>
      <TableHeader>
        <TableRow className="h-8 text-xs">
          <TableHead className="w-[30px] text-center text-xs">#</TableHead>
          <TableHead 
            onClick={() => handleSortClick('condition')}
            className="cursor-pointer hover:bg-muted w-[340px] max-w-[340px] text-xs"
          >
            Condition {sortBy === 'condition' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            onClick={() => handleSortClick('status')}
            className="cursor-pointer hover:bg-muted w-[110px] text-center text-xs"
          >
            Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            onClick={() => handleSortClick('due_date')}
            className="cursor-pointer hover:bg-muted w-[90px] text-center text-xs"
          >
            ETA {sortBy === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            onClick={() => handleSortClick('needed_from')}
            className="cursor-pointer hover:bg-muted w-[70px] text-center text-xs"
          >
            From {sortBy === 'needed_from' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead className="w-[50px] text-center text-xs">Doc</TableHead>
          <TableHead className="w-[30px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {conditionsList.length === 0 ? (
          <TableRow>
          <TableCell colSpan={7} className="text-center text-muted-foreground py-8 px-3">
            No conditions in this group
          </TableCell>
          </TableRow>
        ) : (
          conditionsList.map((condition, index) => {
            return (
              <TableRow 
                key={condition.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleOpenConditionDetail(condition)}
              >
                <TableCell className="py-0.5 px-1 text-center text-muted-foreground text-xs">
                  {index + 1}
                </TableCell>
                <TableCell className="py-0.5 px-2 max-w-[340px]">
                  <div className="font-medium text-xs truncate" title={condition.description}>{condition.description}</div>
                </TableCell>
                <TableCell className="p-0" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={condition.status}
                    onValueChange={(value) => handleInlineUpdate(condition.id, 'status', value)}
                  >
                    <SelectTrigger className={cn(
                      "w-full border-0 h-full rounded-none font-medium text-xs text-center justify-center",
                      getStatusColor(condition.status)
                    )}>
                      <SelectValue>
                        <span className="font-semibold text-xs">{getStatusLabel(condition.status)}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[180px]">
                      {STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className={cn("px-2 py-0.5 rounded font-medium text-xs min-w-[150px] text-center", status.color)}>
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-0.5 px-1 text-center" onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-5 px-1 text-xs justify-center",
                          !condition.due_date && "text-muted-foreground"
                        )}
                      >
                        {condition.due_date ? formatDateModern(condition.due_date) : "—"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="single"
                        selected={condition.due_date ? new Date(condition.due_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            handleInlineUpdate(condition.id, 'due_date', format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="p-0" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={condition.needed_from || ""}
                    onValueChange={(value) => handleInlineUpdate(condition.id, 'needed_from', value)}
                  >
                    <SelectTrigger className="w-full border-0 h-full rounded-none text-xs text-center justify-center">
                      <SelectValue placeholder="—">
                        <span className="text-xs">{condition.needed_from || "—"}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {NEEDED_FROM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-0.5 px-1 text-center" onClick={(e) => e.stopPropagation()}>
                  {condition.document_id ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0"
                      onClick={() => viewDocument(condition.document_id!)}
                    >
                      <FileText className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0"
                      onClick={() => handleUploadDocument(condition.id)}
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="py-0.5 px-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteCondition(condition.id)}
                  >
                    <Trash2 className="h-3 w-3" />
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
    <div className="space-y-2 px-4 pb-4 pt-1">
      <div className="space-y-1">
        {/* Group 1: Added and Requested */}
        <Collapsible open={isGroup1Open} onOpenChange={setIsGroup1Open}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              {isGroup1Open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-semibold">Added and Requested ({group1Conditions.length})</span>
            </CollapsibleTrigger>
            
            <Button size="sm" onClick={() => handleOpenDialog()} className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Add Condition
            </Button>
          </div>
          <CollapsibleContent className="mt-2">
            <div className="border rounded-lg overflow-hidden">
              {renderConditionsTable(group1Conditions)}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Group 2: Collected and Cleared */}
        <Collapsible open={isGroup2Open} onOpenChange={setIsGroup2Open} className="mt-6">
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

      {/* Condition Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Condition Details</DialogTitle>
          </DialogHeader>
          
          {selectedCondition && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Condition Name</label>
                  <Input
                    value={selectedCondition.description}
                    onChange={(e) => {
                      handleInlineUpdate(selectedCondition.id, 'description', e.target.value);
                      setSelectedCondition({ ...selectedCondition, description: e.target.value });
                    }}
                    className="text-lg font-semibold"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {CONDITION_TYPES.find(t => t.value === selectedCondition.condition_type)?.label}
                </p>
              </div>

              {/* Details Grid - 3 columns in one row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ETA</label>
                  <Input
                    type="date"
                    value={selectedCondition.due_date || ''}
                    onChange={(e) => {
                      handleInlineUpdate(selectedCondition.id, 'due_date', e.target.value);
                      setSelectedCondition({ ...selectedCondition, due_date: e.target.value });
                    }}
                    className="w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select
                    value={selectedCondition.status}
                    onValueChange={async (value) => {
                      await handleInlineUpdate(selectedCondition.id, 'status', value);
                      setSelectedCondition({ ...selectedCondition, status: value });
                      // Reload status history after status change
                      try {
                        const history = await databaseService.getConditionStatusHistory(selectedCondition.id);
                        setStatusHistory(history);
                      } catch (error) {
                        console.error('Error reloading status history:', error);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <Badge className={status.color}>{status.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={selectedCondition.priority}
                    onValueChange={(value) => {
                      handleInlineUpdate(selectedCondition.id, 'priority', value);
                      setSelectedCondition({ ...selectedCondition, priority: value });
                    }}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <Badge className={priority.color}>{priority.label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description - shows full notes content */}
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap min-h-[60px]">
                  {selectedCondition.notes || <span className="text-muted-foreground italic">No description provided</span>}
                </div>
              </div>

              {/* Team Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Team Notes</label>
                
                {/* New note input */}
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  className="min-h-[80px]"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!newNote.trim()) return;
                    
                    const timestamp = format(new Date(), 'MMM dd, yyyy h:mm a');
                    const userName = user?.email || 'Team Member';
                    
                    const newNoteEntry = `[${timestamp} - ${userName}]\n${newNote}\n\n`;
                    const updatedNotes = (selectedCondition.notes || '') + newNoteEntry;
                    
                    await handleInlineUpdate(selectedCondition.id, 'notes', updatedNotes);
                    setSelectedCondition({ ...selectedCondition, notes: updatedNotes });
                    setNewNote('');
                    
                    toast({
                      title: "Note Added",
                      description: "Your note has been logged with timestamp"
                    });
                  }}
                  className="mt-2"
                >
                  Add Note
                </Button>
              </div>

              {/* Status History Section */}
              <div>
                <label className="text-sm font-medium mb-3 block">Status History</label>
                {statusHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-muted/10">
                    {statusHistory.map((entry, idx) => {
                      const statusObj = STATUSES.find(s => s.value === entry.status);
                      const userName = entry.changed_user 
                        ? `${entry.changed_user.first_name} ${entry.changed_user.last_name}`
                        : 'System';
                      const timeStr = format(new Date(entry.changed_at), 'MMM dd, yyyy h:mm a');
                      
                      return (
                        <div key={entry.id} className="flex items-center gap-3 text-sm">
                          <Badge className={cn("min-w-[140px] justify-center", statusObj?.color || "bg-gray-100 text-gray-800")}>
                            {statusObj?.label || entry.status}
                          </Badge>
                          <span className="text-muted-foreground">{timeStr}</span>
                          <span className="text-muted-foreground">by {userName}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/10">
                    No status changes recorded yet
                  </p>
                )}
              </div>

              {/* Documents Section */}
              <div>
                <label className="text-sm font-medium mb-2 block">Documents</label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUploadDocument(selectedCondition.id)}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {selectedCondition.document_id ? 'Replace Document' : 'Upload Document'}
                  </Button>

                  {/* Document Display */}
                  {selectedCondition.document_id ? (
                    <div className="border rounded-lg p-3 flex items-center justify-between bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Document attached</p>
                          <p className="text-xs text-muted-foreground">Linked to this condition</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            const docs = await databaseService.getLeadDocuments(leadId);
                            const doc = docs.find(d => d.id === selectedCondition.document_id);
                            if (doc) {
                              window.open(doc.file_url, '_blank');
                            }
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No documents uploaded yet
                      <br />
                      <span className="text-xs">Required before marking as Collected, Sent to Lender, or Cleared</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (selectedCondition) {
                  await handleDeleteCondition(selectedCondition.id);
                  setIsDetailModalOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
              <Button onClick={async () => {
                toast({
                  title: "Saved",
                  description: "All changes have been saved",
                });
                await loadConditions();
                setIsDetailModalOpen(false);
              }}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
