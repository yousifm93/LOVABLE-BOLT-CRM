import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, Phone, Mail, X, Trash2, Edit3, Lock, Unlock } from "lucide-react";
import { useFields } from "@/contexts/FieldsContext";
import { fixUnclassifiedLeads } from "@/utils/fixUnclassifiedLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { CreateLeadModalModern } from "@/components/modals/CreateLeadModalModern";
import { databaseService, type Lead as DatabaseLead, type User, type BuyerAgent } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditPercentage } from "@/components/ui/inline-edit-percentage";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { formatCurrency, formatDateShort, formatPhone } from "@/utils/formatters";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateModern } from "@/utils/dateUtils";
import { BulkUpdateDialog } from "@/components/ui/bulk-update-dialog";
import { transformLeadToClient } from "@/utils/clientTransform";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Main view default columns
const MAIN_VIEW_COLUMNS = [
  "name",
  "createdOn",
  "referredVia",
  "referralSource",
  "realEstateAgent",
  "status",
  "user",
  "dueDate"
];

interface Lead {
  id: string;
  name: string;
  createdOn: string;
  createdAtTs: number;
  phone: string;
  email: string;
  realEstateAgent: string;
  realEstateAgentData?: any;
  user: string;
  userData?: any;
  referredVia: string;
  referralSource: string;
  converted: string;
  leadStrength: string;
  dueDate?: string;
  loanType: string | null;
  loanAmount: number | null;
  notes: string | null;
}

// Transform database lead to display format  
const transformLeadToDisplay = (
  dbLead: DatabaseLead & { 
    task_eta?: string;
    teammate?: any;
    buyer_agent?: any;
  }
): Lead => {
  // Migrate old lead strength values to new ones
  const migrateLeadStrength = (oldValue: string): string => {
    const mapping: Record<string, string> = {
      'High': 'Hot',
      'Medium': 'Warm',
      'Low': 'Cold',
    };
    return mapping[oldValue] || oldValue || 'Warm';
  };

  // Migrate old converted values to new ones
  const migrateConverted = (oldValue: string): string => {
    switch (oldValue) {
      case 'Working On It': return 'Working on it';
      case 'Pending App': return 'Working on it';
      case 'Needs Attention': return 'Working on it';
      default: return ['Working on it', 'Converted', 'Nurture', 'Dead'].includes(oldValue) ? oldValue : 'Working on it';
    }
  };

  return {
    id: dbLead.id,
    name: `${dbLead.first_name || ''} ${dbLead.last_name || ''}`.trim() || 'Unnamed Lead',
    createdOn: dbLead.created_at,
    createdAtTs: new Date(dbLead.created_at).getTime(),
    phone: dbLead.phone || '',
    email: dbLead.email || '',
    realEstateAgent: dbLead.buyer_agent_id || '',
    realEstateAgentData: dbLead.buyer_agent || null,
    user: dbLead.teammate_assigned || '',
    userData: dbLead.teammate || null,
    referredVia: dbLead.referred_via || '',
    referralSource: dbLead.referral_source || '',
    converted: migrateConverted(dbLead.converted || 'Working on it'),
    leadStrength: migrateLeadStrength(dbLead.lead_strength || 'Medium'),
    dueDate: dbLead.task_eta ? new Date(dbLead.task_eta + 'T00:00:00').toLocaleDateString() : '',
    loanType: dbLead.loan_type,
    loanAmount: dbLead.loan_amount,
    notes: dbLead.notes || null,
  };
};

// Option arrays for dropdowns
const referredViaOptions = [
  { value: "Email", label: "Email" },
  { value: "Text", label: "Text" },
  { value: "Call", label: "Call" },
  { value: "Web", label: "Web" },
  { value: "In Person", label: "In Person" },
];

const referralSourceOptions = [
  { value: "Agent", label: "Agent" },
  { value: "New Agent", label: "New Agent" },
  { value: "Past Client", label: "Past Client" },
  { value: "Personal", label: "Personal" },
  { value: "Social", label: "Social" },
  { value: "Miscellaneous", label: "Miscellaneous" },
];

const convertedOptions = [
  { value: "Working on it", label: "Working on it" },
  { value: "Converted", label: "Converted" },
  { value: "Nurture", label: "Nurture" },
  { value: "Dead", label: "Dead" },
];

const leadStrengthOptions = [
  { value: "Hot", label: "Hot" },
  { value: "Warm", label: "Warm" },
  { value: "Cold", label: "Cold" },
  { value: "Qualified", label: "Qualified" },
];

// Map database field names to frontend accessorKey names
const FIELD_NAME_MAP: Record<string, string> = {
  'real_estate_agent': 'realEstateAgent',
  'buyer_agent_id': 'realEstateAgent',
  'task_eta': 'dueDate',
  'teammate_assigned': 'user',
  'converted': 'status',
  'estimated_fico': 'creditScore',
  'referred_via': 'referredVia',
  'referral_source': 'referralSource',
  'lead_strength': 'leadStrength',
  'created_at': 'createdOn',
  'loan_type': 'loanType',
  'loan_amount': 'loanAmount',
  'notes': 'notes',
};

export default function Leads() {
  const { allFields } = useFields();
  
  // Core columns (original customized set) - IDs match hardcoded accessorKey values
  const coreColumns = [
    { id: "name", label: "Full Name", visible: true },
    { id: "createdOn", label: "Lead Created On", visible: true },
    { id: "phone", label: "Lead Phone", visible: true },
    { id: "email", label: "Lead Email", visible: true },
    { id: "realEstateAgent", label: "Buyer's Agent", visible: true },
    { id: "referredVia", label: "Referred Via", visible: true },
    { id: "referralSource", label: "Referral Source", visible: true },
    { id: "status", label: "Lead Status", visible: true },
    { id: "dueDate", label: "Task ETA", visible: true },
    { id: "user", label: "Team", visible: true },
  ];

  // Load ALL database fields for Hide/Show modal
  const allAvailableColumns = useMemo(() => {
    const dbColumns = allFields
      .filter(f => f.is_in_use) // Show ALL 72 fields
      .map(field => ({
        id: FIELD_NAME_MAP[field.field_name] || field.field_name, // Use mapped frontend name
        label: field.display_name,
        visible: false // hidden by default for new fields
      }));
    
    // Merge: existing columns take precedence
    const existingIds = new Set(coreColumns.map(c => c.id));
    const newColumns = dbColumns.filter(c => !existingIds.has(c.id));
    
    return [...coreColumns, ...newColumns];
  }, [allFields]);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dbLeadsMap, setDbLeadsMap] = useState<Map<string, DatabaseLead>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; first_name: string; last_name: string; brokerage?: string; email?: string; phone?: string }>>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [sortLocked, setSortLocked] = useState(() => {
    const saved = localStorage.getItem('leads-sort-locked');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Use column visibility with all available columns (core + database)
  const {
    columns: columnVisibility,
    views,
    visibleColumns,
    activeView,
    toggleColumn,
    toggleAll,
    saveView,
    loadView,
    deleteView,
    reorderColumns,
    setColumns,
    setActiveView
  } = useColumnVisibility(allAvailableColumns, 'leads-columns');

  const handleViewSaved = (viewName: string) => {
    toast({
      title: "View Saved",
      description: `"${viewName}" has been saved successfully`,
    });
    loadView(viewName);
  };

  // Auto-load Main View on initial mount
  useEffect(() => {
    const hasCustomization = localStorage.getItem('leads-columns');
    
    if (!activeView && !hasCustomization) {
      const orderedMainColumns = MAIN_VIEW_COLUMNS
        .map(id => columnVisibility.find(col => col.id === id))
        .filter((col): col is { id: string; label: string; visible: boolean } => col !== undefined)
        .map(col => ({ ...col, visible: true }));
      
      const existingIds = new Set(MAIN_VIEW_COLUMNS);
      const remainingColumns = columnVisibility
        .filter(col => !existingIds.has(col.id))
        .map(col => ({ ...col, visible: false }));
      
      const newColumnOrder = [...orderedMainColumns, ...remainingColumns];
      setColumns(newColumnOrder);
      setActiveView("Main View");
    }
  }, []);

  const handleColumnReorder = (oldIndex: number, newIndex: number) => {
    // Convert visible column indices to actual column indices in the full array
    const oldColumnId = visibleColumns[oldIndex].id;
    const newColumnId = visibleColumns[newIndex].id;
    
    const actualOldIndex = columnVisibility.findIndex(col => col.id === oldColumnId);
    const actualNewIndex = columnVisibility.findIndex(col => col.id === newColumnId);
    
    reorderColumns(actualOldIndex, actualNewIndex);
    toast({
      title: "Column Reordered",
      description: "Table column order has been updated",
    });
  };

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('leads-filters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('leads-filters', JSON.stringify(filters));
  }, [filters]);

  // Filter columns definition for the filter builder
  const filterColumns = [
    { value: 'name', label: 'Lead Name', type: 'text' as const },
    { 
      value: 'referredVia', 
      label: 'Referred Via', 
      type: 'select' as const, 
      options: referredViaOptions.map(opt => opt.value)
    },
    { 
      value: 'referralSource', 
      label: 'Referral Source', 
      type: 'select' as const, 
      options: referralSourceOptions.map(opt => opt.value)
    },
    { 
      value: 'converted', 
      label: 'Converted', 
      type: 'select' as const, 
      options: convertedOptions.map(opt => opt.value)
    },
    { 
      value: 'leadStrength', 
      label: 'Lead Strength', 
      type: 'select' as const, 
      options: leadStrengthOptions.map(opt => opt.value)
    },
    { value: 'dueDate', label: 'Due Date', type: 'date' as const }
  ];

  // Field update handler
  const handleFieldUpdate = async (leadId: string, field: string, value: string | Date | undefined | null) => {
    try {
      setIsUpdating(leadId);
      
      let updateData: Partial<DatabaseLead> = {};
      
      // Map field names to database columns
      switch (field) {
        case 'phone':
          updateData.phone = value as string;
          break;
        case 'email':
          updateData.email = value as string;
          break;
        case 'teammate_assigned':
          updateData.teammate_assigned = value as string;
          break;
        case 'buyer_agent_id':
          updateData.buyer_agent_id = value as string;
          break;
        case 'referredVia':
          updateData.referred_via = value as any;
          break;
        case 'referralSource':
          updateData.referral_source = value as any;
          break;
        case 'converted':
          updateData.converted = value as any;
          // When converted to "Converted", also set pipeline_stage_id to Pending App
          if (value === 'Converted') {
            updateData.pipeline_stage_id = '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945'; // Pending App
            updateData.pending_app_at = new Date().toISOString(); // Set timestamp
          }
          break;
        case 'leadStrength':
          updateData.lead_strength = value as any;
          break;
      case 'due_date':
          if (value === undefined || value === null) {
            updateData.task_eta = null;
          } else {
            // Convert Date to YYYY-MM-DD format using local timezone
            updateData.task_eta = value instanceof Date 
              ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
              : value;
          }
          break;
        case 'notes':
          updateData.notes = value as string;
          break;
        default:
          setIsUpdating(null);
          return;
      }

      if (Object.keys(updateData).length > 0) {
        await databaseService.updateLead(leadId, updateData);
        await loadLeads();

        toast({
          title: "Lead updated",
          description: "Changes have been saved",
        });
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Apply advanced filters
  const applyAdvancedFilters = (leads: Lead[], filters: FilterCondition[]) => {
    return leads.filter(lead => {
      return filters.every(filter => {
        let leadValue: any;
        
        switch (filter.column) {
          case 'name':
            leadValue = lead.name;
            break;
          case 'referredVia':
            leadValue = lead.referredVia;
            break;
          case 'referralSource':
            leadValue = lead.referralSource;
            break;
          case 'converted':
            leadValue = lead.converted;
            break;
          case 'leadStrength':
            leadValue = lead.leadStrength;
            break;
          case 'dueDate':
            leadValue = lead.dueDate || '';
            break;
          default:
            return true;
        }

        switch (filter.operator) {
          case 'is':
            return leadValue === filter.value;
          case 'is_not':
            return leadValue !== filter.value;
          case 'contains':
            return leadValue?.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
          default:
            return true;
        }
      });
    });
  };

  // Filter leads by search term and advanced filters
  const filteredLeads = (() => {
    let result = leads;

    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(lead => 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.phone.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply advanced filters
    if (filters.length > 0) {
      result = applyAdvancedFilters(result, filters);
    }
    
    return result;
  })();

  const clearAllFilters = () => {
    setFilters([]);
    setSearchTerm("");
  };

  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId));
  };

  // Delete handler
  const handleDelete = async (lead: Lead) => {
    setDeleteLeadId(lead.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      setLeads(prev => prev.filter(lead => lead.id !== deleteLeadId));
      toast({
        title: "Success",
        description: "Lead deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete lead. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setDeleteLeadId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => databaseService.deleteLead(id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      await loadLeads();
      setSelectedLeadIds([]);
      setIsBulkDeleteOpen(false);
      
      if (failed === 0) {
        toast({
          title: "Success",
          description: `${successful} lead${successful > 1 ? 's' : ''} deleted successfully`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `${successful} deleted, ${failed} failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => handleFieldUpdate(id, field, value))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      await loadLeads();
      setSelectedLeadIds([]);
      
      if (failed === 0) {
        toast({
          title: "Success",
          description: `${successful} lead${successful > 1 ? 's' : ''} updated successfully`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `${successful} updated, ${failed} failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating leads:', error);
      toast({
        title: "Error",
        description: "Failed to update leads",
        variant: "destructive",
      });
    }
  };

  const bulkUpdateFieldOptions = [
    { value: 'converted', label: 'Status', type: 'select', options: convertedOptions },
    { value: 'leadStrength', label: 'Lead Strength', type: 'select', options: leadStrengthOptions },
    { value: 'referredVia', label: 'Referral Method', type: 'select', options: referredViaOptions },
    { value: 'referralSource', label: 'Referral Source', type: 'select', options: referralSourceOptions },
  ];

  // Generate column definition for dynamic fields
  const generateColumnDef = (field: any): ColumnDef<Lead> => {
    const frontendFieldName = FIELD_NAME_MAP[field.field_name] || field.field_name;
    const baseColumn: ColumnDef<Lead> = {
      accessorKey: frontendFieldName, // Use mapped frontend name
      header: field.display_name,
      sortable: true,
    };

    switch (field.field_type) {
      case 'text':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditText
              value={(row.original as any)[frontendFieldName] || ''}
              onValueChange={(value) => handleFieldUpdate(row.original.id, field.field_name, value as any)}
              placeholder={`Enter ${field.display_name.toLowerCase()}`}
            />
          </div>
        );
        break;
      
      case 'number':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditNumber
              value={(row.original as any)[frontendFieldName] || 0}
              onValueChange={(value) => handleFieldUpdate(row.original.id, field.field_name, value as any)}
              placeholder="0"
            />
          </div>
        );
        break;
      
      case 'currency':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditCurrency
              value={(row.original as any)[frontendFieldName] || 0}
              onValueChange={(value) => handleFieldUpdate(row.original.id, field.field_name, value as any)}
              placeholder="$0"
            />
          </div>
        );
        break;
      
      case 'percentage':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditPercentage
              value={(row.original as any)[frontendFieldName] || 0}
              onValueChange={(value) => handleFieldUpdate(row.original.id, field.field_name, value as any)}
              decimals={1}
            />
          </div>
        );
        break;
      
      case 'date':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditDate
              value={(row.original as any)[frontendFieldName]}
              onValueChange={(date) => handleFieldUpdate(row.original.id, field.field_name, date)}
              placeholder="Select date"
            />
          </div>
        );
        break;
      
      case 'datetime':
        // Check if this is a timeline field
        const timelineFields = ['pending_app_at', 'app_complete_at', 'pre_qualified_at', 'pre_approved_at', 'active_at', 'lead_on_date', 'created_at'];
        if (timelineFields.includes(field.field_name)) {
          baseColumn.cell = ({ row }) => (
            <span className="text-sm">
              {formatDateShort((row.original as any)[frontendFieldName])}
            </span>
          );
        } else {
          // Regular datetime fields remain editable
          baseColumn.cell = ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <InlineEditDateTime
                value={(row.original as any)[frontendFieldName]}
                onValueChange={(value: string) => {
                  handleFieldUpdate(row.original.id, field.field_name, value);
                }}
              />
            </div>
          );
        }
        break;
      
      case 'select':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditSelect
              value={(row.original as any)[frontendFieldName] || ''}
              options={(field.dropdown_options || []).map((opt: string) => ({ value: opt, label: opt }))}
              onValueChange={(value) => handleFieldUpdate(row.original.id, field.field_name, value as any)}
              placeholder="Select option"
            />
          </div>
        );
        break;
      
      case 'phone':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditPhone
              value={(row.original as any)[frontendFieldName] || ''}
              onValueChange={(value) => handleFieldUpdate(row.original.id, field.field_name, value as any)}
              placeholder="Enter phone"
            />
          </div>
        );
        break;
      
      default:
        baseColumn.cell = ({ row }) => (
          <span className="text-sm">{String((row.original as any)[frontendFieldName] || '—')}</span>
        );
    }

    return baseColumn;
  };

  const allColumns: ColumnDef<Lead>[] = useMemo(() => {
    const hardcodedColumns: ColumnDef<Lead>[] = [
    {
      accessorKey: "name",
      header: "Borrower",
      className: "text-left",
      headerClassName: "text-left",
      cell: ({ row }) => (
        <div
          className="text-sm text-foreground hover:text-warning cursor-pointer transition-colors font-medium text-left"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row.original);
          }}
        >
          {row.original.name}
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "createdOn",
      header: "Lead Created On",
      cell: ({ row }) => formatDateShort(row.original.createdOn),
      sortable: true,
    },
    {
      accessorKey: "phone",
      header: "Borrower Phone",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditPhone
            value={row.original.phone}
            onValueChange={(value) =>
              handleFieldUpdate(row.original.id, "phone", value)
            }
            placeholder="Enter phone"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "email",
      header: "Borrower Email",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditText
            value={row.original.email}
            onValueChange={(value) =>
              handleFieldUpdate(row.original.id, "email", value)
            }
            placeholder="Enter email"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "realEstateAgent",
      header: "Real Estate Agent",
      className: "text-left",
      cell: ({ row }) => (
        <InlineEditAgent
          value={row.original.realEstateAgentData}
          agents={agents}
          onValueChange={(agent) =>
            handleFieldUpdate(row.original.id, "buyer_agent_id", agent?.id || null)
          }
          type="buyer"
          placeholder="Select agent"
        />
      ),
      sortable: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.converted}
            options={convertedOptions}
            onValueChange={(value) =>
              handleFieldUpdate(row.original.id, "converted", value)
            }
            showAsStatusBadge
            fixedWidth="w-36"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "user",
      header: "User",
      className: "text-center",
      cell: ({ row }) => (
        <InlineEditAssignee
          assigneeId={row.original.user}
          users={users}
          onValueChange={(userId) =>
            handleFieldUpdate(row.original.id, "teammate_assigned", userId)
          }
          showNameText={false}
        />
      ),
      sortable: true,
    },
    // Additional columns (hidden by default)
    {
      accessorKey: "referredVia",
      header: "Referral Method",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referredVia}
            options={referredViaOptions}
            onValueChange={(value) =>
              handleFieldUpdate(row.original.id, "referredVia", value)
            }
            showAsStatusBadge
            forceGrayBadge={true}
            fixedWidth="w-24"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "referralSource",
      header: "Referral Source",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referralSource}
            options={referralSourceOptions}
            onValueChange={(value) =>
              handleFieldUpdate(row.original.id, "referralSource", value)
            }
            showAsStatusBadge
            fixedWidth="w-32"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "leadStrength",
      header: "Lead Strength",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.leadStrength}
            options={leadStrengthOptions}
            onValueChange={(value) =>
              handleFieldUpdate(row.original.id, "leadStrength", value)
            }
            showAsStatusBadge
            fixedWidth="w-20"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditDate
            value={row.original.dueDate ? new Date(row.original.dueDate) : undefined}
            onValueChange={(date) =>
              handleFieldUpdate(row.original.id, "due_date", date)
            }
            placeholder="Set due date"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "loanType",
      header: "Loan Type",
      cell: ({ row }) => row.original.loanType || '—',
      sortable: true,
    },
    {
      accessorKey: "loanAmount",
      header: "Loan Amount",
      cell: ({ row }) => formatCurrency(row.original.loanAmount),
      sortable: true,
    },
  ];

    const hardcodedIds = new Set(hardcodedColumns.map(col => col.accessorKey));

    const dynamicColumns = allFields
      .filter(f => f.is_in_use && !hardcodedIds.has(f.field_name))
      .map(field => generateColumnDef(field));

    return [...hardcodedColumns, ...dynamicColumns];
  }, [allFields, users, agents]);

  // Filter columns based on visibility settings
  const columns = visibleColumns
    .map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id))
    .filter((col): col is ColumnDef<Lead> => col !== undefined);

  // Load leads and users/agents on component mount with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        // Fix any unclassified leads before loading (one-time fix)
        await fixUnclassifiedLeads();
        await loadLeads();
        await loadUsers();
        await loadAgents();
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadUsers = async () => {
    try {
      const data = await databaseService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await databaseService.getBuyerAgents();
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsDrawerOpen(false);
      setSelectedClient(null);
      setIsCreateModalOpen(false);
    };
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      
      // Get the "Leads" pipeline stage ID
      const { data: leadsStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('name', 'Leads')
        .single();
      
      // Fetch leads in the "Leads" pipeline stage
      const { data: dbLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('pipeline_stage_id', leadsStage?.id || '')
        .order('created_at', { ascending: false });
      
      if (leadsError) throw leadsError;
      
      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email');
      
      // Fetch all buyer agents
      const { data: agentsData } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone');
      
      // Create lookup maps for efficient matching
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
      const agentsMap = new Map(agentsData?.map(a => [a.id, a]) || []);
      
      // Enrich leads with related user and agent data
      const enrichedLeads = (dbLeads || []).map(lead => ({
        ...lead,
        teammate: lead.teammate_assigned ? usersMap.get(lead.teammate_assigned) : null,
        buyer_agent: lead.buyer_agent_id ? agentsMap.get(lead.buyer_agent_id) : null,
      }));
      
      // Store full database leads for drawer access
      const leadsMap = new Map(enrichedLeads.map(lead => [lead.id, lead]));
      setDbLeadsMap(leadsMap);
      
      const transformedLeads = enrichedLeads.map(transformLeadToDisplay);
      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeadCreated = async () => {
    console.log('Lead created, refreshing data...');
    await loadLeads();
    toast({
      title: "Success",
      description: "Lead created and data refreshed",
    });
  };

  const handleLeadUpdated = async () => {
    console.log('[Leads] handleLeadUpdated called');
    await loadLeads();
    // If a lead is currently selected in the drawer, refresh its data
    if (selectedClient?.databaseId) {
      try {
        console.log('[Leads] Refetching lead with ID:', selectedClient.databaseId);
        const { data: updatedLead, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', selectedClient.databaseId)
          .single();
        
        console.log('[Leads] Refetched lead:', updatedLead);
        
        if (!error && updatedLead) {
          // Fetch related data for the updated lead
          const { data: userData } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .eq('id', updatedLead.teammate_assigned)
            .single();
          
          const { data: agentData } = await supabase
            .from('buyer_agents')
            .select('id, first_name, last_name, brokerage, email, phone')
            .eq('id', updatedLead.buyer_agent_id)
            .single();
          
          const enrichedLead = {
            ...updatedLead,
            teammate: userData,
            buyer_agent: agentData,
          };
          
          console.log('[Leads] Enriched lead notes:', enrichedLead.notes);
          const crmClient = transformLeadToClient(enrichedLead);
          console.log('[Leads] Transformed client notes:', (crmClient as any).notes);
          setSelectedClient(crmClient);
          console.log('[Leads] selectedClient updated');
        }
      } catch (error) {
        console.error('[Leads] Error updating selected client:', error);
      }
    }
  };

  const handleRowClick = (lead: Lead) => {
    // Get full database lead data
    const dbLead = dbLeadsMap.get(lead.id);
    if (!dbLead) {
      console.error('Database lead not found for ID:', lead.id);
      toast({
        title: "Error",
        description: "Could not load lead details. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Use transformLeadToClient for proper field mapping
    const crmClient = transformLeadToClient(dbLead);
    
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = async (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
    setSelectedClient(null);
    // Refresh data after stage change
    await loadLeads();
  };

  const handleDrawerClose = () => {
    console.log('Closing drawer and cleaning up state');
    setIsDrawerOpen(false);
    setSelectedClient(null);
  };

  return (
    <ErrorBoundary>
      <div className="pl-4 pr-0 pt-2 pb-0">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">New ({filteredLeads.length})</h1>
            <p className="text-xs italic text-muted-foreground/70">
              New leads entering the pipeline
              {filters.length > 0 && (
                <span className="ml-2 text-primary">
                  • {filters.length} filter{filters.length > 1 ? 's' : ''} active
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter Chips */}
        {filters.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Badge key={filter.id} variant="secondary" className="flex items-center gap-2">
                <span className="text-xs">
                  {filterColumns.find(col => col.value === filter.column)?.label} {filter.operator} {typeof filter.value === 'string' ? filter.value : 'Date'}
                </span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-xs h-6"
            >
              Clear All
            </Button>
          </div>
        )}

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <Button 
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Lead
            </Button>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search new leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant={sortLocked ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newValue = !sortLocked;
                setSortLocked(newValue);
                localStorage.setItem('leads-sort-locked', JSON.stringify(newValue));
                toast({
                  title: newValue ? "Sort Locked" : "Sort Unlocked",
                  description: newValue ? "Leads will stay in creation order" : "You can now sort by any column",
                });
              }}
              title={sortLocked ? "Unlock sorting" : "Lock sorting to creation date"}
            >
              {sortLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
            
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {filters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {filters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[32rem] bg-background border border-border shadow-lg z-50" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filter Leads</h4>
                    {filters.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearAllFilters}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <FilterBuilder
                    filters={filters}
                    onFiltersChange={setFilters}
                    columns={filterColumns}
                  />
                </div>
              </PopoverContent>
            </Popover>
            
              <ColumnVisibilityButton
                columns={columnVisibility}
                onColumnToggle={toggleColumn}
                onToggleAll={toggleAll}
                onSaveView={saveView}
                onReorderColumns={reorderColumns}
                onViewSaved={handleViewSaved}
              />
            
              <Button
                variant={activeView === "Main View" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const orderedMainColumns = MAIN_VIEW_COLUMNS
                    .map(id => columnVisibility.find(col => col.id === id))
                    .filter((col): col is { id: string; label: string; visible: boolean } => col !== undefined)
                    .map(col => ({ ...col, visible: true }));
                  
                  const existingIds = new Set(MAIN_VIEW_COLUMNS);
                  const remainingColumns = columnVisibility
                    .filter(col => !existingIds.has(col.id))
                    .map(col => ({ ...col, visible: false }));
                  
                  const newColumnOrder = [...orderedMainColumns, ...remainingColumns];
                  setColumns(newColumnOrder);
                  setActiveView("Main View");
                  
                  toast({
                    title: "Main View Loaded",
                    description: "Default column configuration restored"
                  });
                }}
                className="h-8 text-xs"
              >
                Main View
              </Button>
            
            <ViewPills
              views={views}
              activeView={activeView}
              onLoadView={loadView}
              onDeleteView={deleteView}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredLeads}
            searchTerm=""
            storageKey="leads-table"
            onRowClick={() => {}} // Disable generic row click
            onViewDetails={handleRowClick}
            onEdit={handleRowClick}
            onDelete={handleDelete}
            onColumnReorder={handleColumnReorder}
            selectable
            selectedIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            getRowId={(row) => row.id}
            defaultSortColumn="createdAtTs"
            defaultSortDirection="desc"
            lockSort={sortLocked}
          />
        </CardContent>
      </Card>

      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="flex items-center gap-4 p-4">
              <Badge variant="secondary" className="text-sm">
                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkUpdateOpen(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Update Field
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeadIds([])}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <CreateLeadModalModern
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onLeadCreated={() => {
          handleLeadCreated();
          loadLeads();
        }}
      />

      {selectedClient && (
        <ClientDetailDrawer
          key={selectedClient?.databaseId}
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onStageChange={handleStageChange}
          pipelineType="leads"
          onLeadUpdated={handleLeadUpdated}
        />
      )}

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedLeadIds.length} Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkUpdateDialog
        open={isBulkUpdateOpen}
        onOpenChange={setIsBulkUpdateOpen}
        selectedCount={selectedLeadIds.length}
        onUpdate={handleBulkUpdate}
        fieldOptions={bulkUpdateFieldOptions}
      />
      </div>
    </ErrorBoundary>
  );
}