import { useState, useEffect, useMemo } from "react";
import { useFields } from "@/contexts/FieldsContext";
import { Search, Plus, Filter, Phone, Mail, CheckCircle, Lock, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercentage, formatDateShort } from "@/utils/formatters";
import { transformLeadToClient } from "@/utils/clientTransform";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditPercentage } from "@/components/ui/inline-edit-percentage";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
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
import { BulkUpdateDialog } from "@/components/ui/bulk-update-dialog";
import { Loader2 } from "lucide-react";

// Main view default columns
const MAIN_VIEW_COLUMNS = [
  "name",
  "preQualifiedOn",
  "phone",
  "email",
  "realEstateAgent",
  "status",
  "loanNumber",
  "creditScore",
  "dti",
  "loanAmount",
  "salesPrice",
  "user",
  "loanType",
  "dueDate",
  "baStatus"
];

// Map database field names to frontend accessorKey names
const FIELD_NAME_MAP: Record<string, string> = {
  'real_estate_agent': 'realEstateAgent',
  'buyer_agent_id': 'realEstateAgent',
  'task_eta': 'dueDate',
  'teammate_assigned': 'user',
  'converted': 'status',
  'estimated_fico': 'fico',
  'loan_type': 'loanType',
  'loan_amount': 'loanAmount',
  'sales_price': 'salesPrice',
  'pre_qualified_at': 'preQualifiedOn',
  'arrive_loan_number': 'loanNumber',
  'ba_status': 'baStatus',
};

type DisplayLead = {
  id: string;
  name: string;
  preQualifiedOn: string;
  phone: string;
  email: string;
  realEstateAgent: string;
  realEstateAgentData?: any;
  status: string;
  loanNumber: string;
  fico: number;
  dti: number | null;
  loanAmount: number | null;
  salesPrice: number | null;
  user: string;
  userData?: any;
  loanType: string;
  dueDate?: string;
  baStatus: string;
  [key: string]: any; // Allow dynamic fields
};

export default function PreQualified() {
  const { allFields } = useFields();
  
  // Core columns (original customized set)
  const coreColumns = [
    { id: "name", label: "Full Name", visible: true },
    { id: "preQualifiedOn", label: "Pre-Qualified On", visible: true },
    { id: "phone", label: "Lead Phone", visible: true },
    { id: "email", label: "Lead Email", visible: true },
    { id: "realEstateAgent", label: "Real Estate Agent", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "loanNumber", label: "Loan Number", visible: true },
    { id: "fico", label: "FICO", visible: true },
    { id: "dti", label: "DTI", visible: true },
    { id: "loanAmount", label: "Loan Amount", visible: true },
    { id: "salesPrice", label: "Sales Price", visible: true },
    { id: "user", label: "User", visible: true },
    { id: "loanType", label: "Loan Type", visible: true },
    { id: "dueDate", label: "Due Date", visible: true },
    { id: "baStatus", label: "BA Status", visible: true },
  ];

  // Load ALL database fields for Hide/Show modal
  const allAvailableColumns = useMemo(() => {
    const dbColumns = allFields
      .filter(f => f.is_in_use) // Show ALL 72 fields
      .map(field => ({
        id: FIELD_NAME_MAP[field.field_name] || field.field_name, // Use mapped frontend name
        label: field.display_name,
        visible: false
      }));
    
    const existingIds = new Set(coreColumns.map(c => c.id));
    const newColumns = dbColumns.filter(c => !existingIds.has(c.id));
    
    return [...coreColumns, ...newColumns];
  }, [allFields]);

  // Status/Converted options
  const convertedOptions = [
    { value: "Pre-Qualified", label: "Pre-Qualified" },
    { value: "Ready for Pre-Approval", label: "Ready for Pre-Approval" },
    { value: "Standby", label: "Standby" },
    { value: "Pre-Approved", label: "Pre-Approved" },
  ];

  // Loan Type options
  const loanTypeOptions = [
    { value: "Purchase", label: "Purchase" },
    { value: "Refinance", label: "Refinance" },
    { value: "Cash Out Refinance", label: "Cash Out Refinance" },
    { value: "HELOC", label: "HELOC" },
    { value: "Construction", label: "Construction" },
    { value: "VA Loan", label: "VA Loan" },
    { value: "FHA Loan", label: "FHA Loan" },
    { value: "Conventional", label: "Conventional" },
    { value: "Jumbo", label: "Jumbo" },
  ];

  // BA Status options
  const baStatusOptions = [
    { value: "Send", label: "Send" },
    { value: "Sent", label: "Sent" },
    { value: "Signed", label: "Signed" },
  ];
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<DatabaseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [sortLocked, setSortLocked] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Use column visibility with all available columns
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
    setColumns
  } = useColumnVisibility(allAvailableColumns, 'pre-qualified-columns');

  const handleViewSaved = (viewName: string) => {
    toast({
      title: "View Saved",
      description: `"${viewName}" has been saved successfully`,
    });
    loadView(viewName);
  };

  const handleColumnReorder = (oldVisibleIndex: number, newVisibleIndex: number) => {
    // Get the column IDs from the visible columns array
    const oldColumnId = visibleColumns[oldVisibleIndex]?.id;
    const newColumnId = visibleColumns[newVisibleIndex]?.id;
    
    if (!oldColumnId || !newColumnId) return;
    
    // Find the indices in the full columns array
    const oldFullIndex = columnVisibility.findIndex(col => col.id === oldColumnId);
    const newFullIndex = columnVisibility.findIndex(col => col.id === newColumnId);
    
    if (oldFullIndex === -1 || newFullIndex === -1) return;
    
    // Reorder using the full array indices
    reorderColumns(oldFullIndex, newFullIndex);
    
    toast({
      title: "Column Reordered",
      description: "Table column order has been updated",
    });
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, email');
    if (data) setUsers(data);
  };

  const loadAgents = async () => {
    const { data } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, brokerage, email, phone');
    if (data) setAgents(data);
  };

  // Load leads from database filtered by Pre-Qualified pipeline stage
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          teammate:users!leads_teammate_assigned_fkey(id, first_name, last_name, email),
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone)
        `)
        .eq('pipeline_stage_id', '09162eec-d2b2-48e5-86d0-9e66ee8b2af7') // Pre-Qualified stage
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading pre-qualified clients:', error);
      toast({
        title: "Error",
        description: "Failed to load pre-qualified clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    loadUsers();
    loadAgents();
    
    // Load sort lock state from localStorage
    const savedSortLocked = localStorage.getItem('prequalified-sort-locked');
    if (savedSortLocked) {
      setSortLocked(JSON.parse(savedSortLocked));
    }
    
    // Load filters from localStorage
    const savedFilters = localStorage.getItem('prequalified-filters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, [toast]);
  
  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('prequalified-filters', JSON.stringify(filters));
  }, [filters]);
  
  // Filter columns definition
  const filterColumns = [
    { value: 'name', label: 'Name', type: 'text' as const },
    { value: 'status', label: 'Status', type: 'text' as const },
    { value: 'loanType', label: 'Loan Type', type: 'text' as const },
    { value: 'baStatus', label: 'BA Status', type: 'select' as const, options: baStatusOptions.map(opt => opt.value) },
    { value: 'fico', label: 'FICO', type: 'text' as const },
    { value: 'preQualifiedOn', label: 'Pre-Qualified On', type: 'date' as const },
  ];
  
  const clearAllFilters = () => {
    setFilters([]);
    setIsFilterOpen(false);
  };
  
  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const handleRowClick = async (lead: DatabaseLead) => {
    try {
      const dbLead = await databaseService.getLeadByIdWithEmbeds(lead.id);
      const crmClient = transformLeadToClient(dbLead);
      setSelectedClient(crmClient);
      setIsDrawerOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load lead details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  const handleDelete = async (row: DisplayLead) => {
    setDeleteLeadId(row.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      toast({
        title: "Success",
        description: "Lead deleted successfully.",
      });
      await fetchLeads();
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete lead.",
        variant: "destructive",
      });
    } finally {
      setDeleteLeadId(null);
    }
  };

  const handleViewDetails = (row: DisplayLead) => {
    const lead = leads.find(l => l.id === row.id);
    if (lead) handleRowClick(lead);
  };

  const handleEdit = (row: DisplayLead) => {
    const lead = leads.find(l => l.id === row.id);
    if (lead) handleRowClick(lead);
  };

  const handleFieldUpdate = async (id: string, field: string, value: any) => {
    const fieldMapping: Record<string, string> = {
      'phone': 'phone',
      'email': 'email',
      'estimated_fico': 'estimated_fico',
      'fico': 'estimated_fico',
      'loan_amount': 'loan_amount',
      'loanAmount': 'loan_amount',
      'sales_price': 'sales_price',
      'salesPrice': 'sales_price',
      'dti': 'dti',
      'loan_type': 'loan_type',
      'loanType': 'loan_type',
      'converted': 'converted',
      'status': 'converted',
      'teammate_assigned': 'teammate_assigned',
      'user': 'teammate_assigned',
      'buyer_agent_id': 'buyer_agent_id',
      'realEstateAgent': 'buyer_agent_id',
      'arrive_loan_number': 'arrive_loan_number',
      'loanNumber': 'arrive_loan_number',
      'due_date': 'task_eta',
      'dueDate': 'task_eta',
      'ba_status': 'ba_status',
      'baStatus': 'ba_status',
    };
    
    const dbField = fieldMapping[field] || field;
    const updateData: any = { [dbField]: value };
    
    // Automation: When Pre-Approved, move to Pre-Approved board
    if (field === 'converted' && value === 'Pre-Approved') {
      updateData.pipeline_stage_id = '3cbf38ff-752e-4163-a9a3-1757499b4945'; // Pre-Approved
      toast({
        title: "Moving to Pre-Approved",
        description: "Lead moved to Pre-Approved board",
      });
    }
    
    await databaseService.updateLead(id, updateData);
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => databaseService.deleteLead(id))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} lead${successCount > 1 ? 's' : ''} deleted successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }
      
      await fetchLeads();
      setSelectedLeadIds([]);
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (selectedLeadIds.length === 0) return;
    
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => handleFieldUpdate(id, field, value))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} lead${successCount > 1 ? 's' : ''} updated successfully.`,
        });
      }
      
      await fetchLeads();
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error during bulk update:', error);
    }
  };

  // Transform leads to display format
  const displayData: DisplayLead[] = leads.map(lead => ({
    id: lead.id,
    name: `${lead.first_name} ${lead.last_name}`,
    preQualifiedOn: lead.pre_qualified_at || lead.created_at,
    phone: lead.phone || '',
    email: lead.email || '',
    realEstateAgent: lead.buyer_agent_id || '',
    realEstateAgentData: (lead as any).buyer_agent || null,
    status: lead.converted || 'Working on it',
    loanNumber: lead.arrive_loan_number?.toString() || '—',
    fico: lead.estimated_fico || 0,
    dti: lead.dti || 0,
    loanAmount: lead.loan_amount || 0,
    salesPrice: lead.sales_price || 0,
    user: lead.teammate_assigned || '',
    userData: (lead as any).teammate || null,
    loanType: lead.loan_type || '',
    dueDate: lead.task_eta || '',
    baStatus: lead.ba_status || '',
    // Add all database fields dynamically
    ...Object.fromEntries(
      allFields
        .filter(f => ['APP COMPLETE', 'APP REVIEW'].includes(f.section) && f.is_in_use)
        .map(field => [field.field_name, (lead as any)[field.field_name]])
    )
  }));

  // Generate column definition for dynamic fields
  const generateColumnDef = (field: any): ColumnDef<DisplayLead> => {
    const frontendFieldName = FIELD_NAME_MAP[field.field_name] || field.field_name;
    const baseColumn: ColumnDef<DisplayLead> = {
      accessorKey: frontendFieldName, // Use mapped frontend name
      header: field.display_name,
      sortable: true,
    };

    switch (field.field_type) {
      case 'text':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditText
              value={row.original[field.field_name] || ''}
              onValueChange={(value) => {
                handleFieldUpdate(row.original.id, field.field_name, value);
                fetchLeads();
              }}
              placeholder={`Enter ${field.display_name.toLowerCase()}`}
            />
          </div>
        );
        break;
      
      case 'number':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditNumber
              value={row.original[field.field_name] || 0}
              onValueChange={(value) => {
                handleFieldUpdate(row.original.id, field.field_name, value);
                fetchLeads();
              }}
              placeholder="0"
            />
          </div>
        );
        break;
      
      case 'currency':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditCurrency
              value={row.original[field.field_name] || 0}
              onValueChange={(value) => {
                handleFieldUpdate(row.original.id, field.field_name, value);
                fetchLeads();
              }}
              placeholder="$0"
            />
          </div>
        );
        break;
      
      case 'percentage':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditPercentage
              value={row.original[field.field_name] || 0}
              onValueChange={(value) => {
                handleFieldUpdate(row.original.id, field.field_name, value);
                fetchLeads();
              }}
              decimals={1}
            />
          </div>
        );
        break;
      
      case 'date':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditDate
              value={row.original[field.field_name]}
              onValueChange={(date) => {
                const dateString = date ? (typeof date === 'string' ? date : date.toISOString().split('T')[0]) : null;
                handleFieldUpdate(row.original.id, field.field_name, dateString);
                fetchLeads();
              }}
              placeholder="Select date"
            />
          </div>
        );
        break;
      
      case 'select':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditSelect
              value={row.original[field.field_name] || ''}
              options={(field.dropdown_options || []).map((opt: string) => ({ value: opt, label: opt }))}
              onValueChange={(value) => {
                handleFieldUpdate(row.original.id, field.field_name, value);
                fetchLeads();
              }}
              placeholder="Select option"
            />
          </div>
        );
        break;
      
      default:
        baseColumn.cell = ({ row }) => (
          <span className="text-sm">{String(row.original[field.field_name] || '—')}</span>
        );
    }

    return baseColumn;
  };

  const allColumns: ColumnDef<DisplayLead>[] = useMemo(() => {
    const hardcodedColumns: ColumnDef<DisplayLead>[] = [
    {
      accessorKey: "name",
      header: "Borrower",
      sortable: true,
      className: "text-left",
      headerClassName: "text-left",
      cell: ({ row }) => (
        <span 
          className="cursor-pointer hover:text-primary transition-colors font-medium"
          onClick={(e) => {
            e.stopPropagation();
            const lead = leads.find(l => l.id === row.original.id);
            if (lead) handleRowClick(lead);
          }}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "preQualifiedOn",
      header: "Pre-Qualified On",
      cell: ({ row }) => formatDateShort(row.original.preQualifiedOn),
      sortable: true,
    },
    {
      accessorKey: "phone",
      header: "Lead Phone",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditPhone
            value={row.original.phone}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "phone", value);
              fetchLeads();
            }}
            placeholder="Enter phone"
          />
        </div>
      )
    },
    {
      accessorKey: "email",
      header: "Lead Email",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditText
            value={row.original.email}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "email", value);
              fetchLeads();
            }}
            placeholder="Enter email"
          />
        </div>
      )
    },
    {
      accessorKey: "realEstateAgent",
      header: "Real Estate Agent",
      sortable: true,
      className: "text-left",
      headerClassName: "text-left",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditAgent
            value={row.original.realEstateAgentData ? {
              id: row.original.realEstateAgentData.id,
              first_name: row.original.realEstateAgentData.first_name,
              last_name: row.original.realEstateAgentData.last_name,
              brokerage: row.original.realEstateAgentData.company,
              email: row.original.realEstateAgentData.email,
              phone: row.original.realEstateAgentData.phone
            } : null}
            agents={agents}
            onValueChange={(agent) => {
              handleFieldUpdate(row.original.id, "buyer_agent_id", agent?.id || null);
              fetchLeads();
            }}
            type="buyer"
          />
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.status}
            options={convertedOptions}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "converted", value);
              fetchLeads();
            }}
            showAsStatusBadge={true}
            fixedWidth="w-36"
          />
        </div>
      ),
    },
    {
      accessorKey: "loanNumber",
      header: "Loan Number",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditNumber
            value={row.original.loanNumber === '—' ? 0 : parseInt(row.original.loanNumber) || 0}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "arrive_loan_number", value);
              fetchLeads();
            }}
            placeholder="Enter loan #"
          />
        </div>
      ),
    },
    {
      accessorKey: "fico",
      header: "FICO",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditNumber
            value={row.original.fico}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "estimated_fico", value);
              fetchLeads();
            }}
            placeholder="0"
            min={300}
            max={850}
          />
        </div>
      )
    },
    {
      accessorKey: "dti",
      header: "DTI",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditPercentage
            value={row.original.dti || 0}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "dti", value);
              fetchLeads();
            }}
            decimals={1}
          />
        </div>
      )
    },
    {
      accessorKey: "loanAmount",
      header: "Loan Amount",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditCurrency
            value={row.original.loanAmount}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "loan_amount", value);
              fetchLeads();
            }}
            placeholder="$0"
          />
        </div>
      )
    },
    {
      accessorKey: "salesPrice",
      header: "Sales Price",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditCurrency
            value={row.original.salesPrice}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "sales_price", value);
              fetchLeads();
            }}
            placeholder="$0"
          />
        </div>
      )
    },
    {
      accessorKey: "user",
      header: "User",
      className: "text-center",
      sortable: true,
      cell: ({ row }) => (
        <InlineEditAssignee
          assigneeId={row.original.user}
          users={users}
          onValueChange={(userId) => {
            handleFieldUpdate(row.original.id, "teammate_assigned", userId);
            fetchLeads();
          }}
          showNameText={false}
        />
      ),
    },
    {
      accessorKey: "baStatus",
      header: "BA",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.baStatus}
            options={baStatusOptions}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "ba_status", value);
              fetchLeads();
            }}
            showAsStatusBadge={true}
            fixedWidth="w-32"
          />
        </div>
      ),
    },
    {
      accessorKey: "loanType",
      header: "Loan Type",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.loanType}
            options={loanTypeOptions}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "loan_type", value);
              fetchLeads();
            }}
            placeholder="Select type"
          />
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditDate
            value={row.original.dueDate || ''}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "task_eta", value);
              fetchLeads();
            }}
            placeholder="Set date"
          />
        </div>
      ),
    },
  ];

    const hardcodedIds = new Set(hardcodedColumns.map(col => col.accessorKey));

    const dynamicColumns = allFields
      .filter(f => 
        f.is_in_use &&
        !hardcodedIds.has(f.field_name)
      )
      .map(field => generateColumnDef(field));

    return [...hardcodedColumns, ...dynamicColumns];
  }, [allFields, leads, users, agents]);

  // Filter columns based on visibility settings
  const columns = visibleColumns
    .map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id))
    .filter((col): col is ColumnDef<DisplayLead> => col !== undefined);

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pre-Qualified ({displayData.length})</h1>
          <p className="text-xs italic text-muted-foreground/70">Clients with conditional approval</p>
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap mb-3">
          {filters.map(filter => (
            <Badge key={filter.id} variant="secondary" className="gap-1 pr-1">
              <span>{filterColumns.find(col => col.value === filter.column)?.label}: {String(filter.value)}</span>
              <button onClick={() => removeFilter(filter.id)} className="hover:bg-background/20 rounded p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-6">
            Clear All
          </Button>
        </div>
      )}

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pre-Qualified Clients ({leads.length})</CardTitle>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search clients..."
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
                localStorage.setItem('prequalified-sort-locked', JSON.stringify(newValue));
                toast({
                  title: newValue ? "Sort Locked" : "Sort Unlocked",
                  description: newValue ? "Clients will stay in creation order" : "You can now sort by any column",
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
                    <h4 className="font-medium">Filter Clients</h4>
                    {filters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
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
                variant={activeView === "Main" ? "default" : "outline"}
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
                  
                  toast({
                    title: "Main View Loaded",
                    description: "Default column configuration restored"
                  });
                }}
                className="h-8 text-xs"
              >
                Main
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
            storageKey="prequalified-table"
            columns={columns}
            data={displayData}
            searchTerm={searchTerm}
            lockSort={sortLocked}
            onRowClick={(row) => {
              const lead = leads.find(l => l.id === row.id);
              if (lead) handleRowClick(lead);
            }}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onColumnReorder={handleColumnReorder}
            selectable
            selectedIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>

      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedClient(null);
          }}
          onStageChange={handleStageChange}
          pipelineType="leads"
          onLeadUpdated={fetchLeads}
        />
      )}

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="flex items-center gap-4 p-4">
              <Badge variant="secondary" className="text-sm">
                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
              </Badge>
              <div className="flex gap-2">
                <Button onClick={() => setIsBulkUpdateOpen(true)} size="sm">
                  Update Field
                </Button>
                <Button onClick={() => setIsBulkDeleteOpen(true)} variant="destructive" size="sm">
                  Delete
                </Button>
                <Button onClick={() => setSelectedLeadIds([])} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
        fieldOptions={[
          { value: 'converted', label: 'Status', type: 'select', options: [
            { value: 'Working on it', label: 'Working on it' },
            { value: 'Converted', label: 'Converted' },
            { value: 'Dead', label: 'Dead' }
          ]},
        ]}
      />
    </div>
  );
}
