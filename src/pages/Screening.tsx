import { useState, useEffect, useMemo } from "react";
import { useFields } from "@/contexts/FieldsContext";
import { Search, Plus, Filter, Phone, Mail, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
// Sheet removed - using inline filters
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
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { BulkUpdateDialog } from "@/components/ui/bulk-update-dialog";
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
  "appCompleteOn",
  "loanNumber",
  "status",
  "realEstateAgent",
  "user",
  "dueDate",
  "loanAmount",
  "salesPrice",
  "ltv"
];

// Map database field names to frontend accessorKey names
const FIELD_NAME_MAP: Record<string, string> = {
  'real_estate_agent': 'realEstateAgent',
  'buyer_agent_id': 'realEstateAgent',
  'task_eta': 'dueDate',
  'teammate_assigned': 'user',
  'converted': 'status',
  'fico_score': 'creditScore',
  'loan_type': 'loanType',
  'loan_amount': 'loanAmount',
  'app_complete_at': 'appCompleteOn',
  'mb_loan_number': 'loanNumber',
  'notes': 'notes',
  'sales_price': 'salesPrice',
  'ltv': 'ltv',
};

// Exclude legacy/computed alias fields from dynamic column generation
const ALIAS_FIELD_NAMES = new Set([
  'pendingAppOn',
  'appCompleteOn',
  'preQualifiedOn',
  'preApprovedOn',
  'createdOn',
]);

// Display type for table rows
type DisplayLead = {
  id: string;
  name: string;
  appCompleteOn: string;
  loanNumber: string;
  realEstateAgent: string;
  realEstateAgentData?: any;
  status: string;
  user: string;
  userData?: any;
  phone: string;
  email: string;
  loanType: string;
  creditScore: number;
  loanAmount: number | null;
  salesPrice: number | null;
  ltv: number | null;
  dti: number | null;
  dueDate?: string;
  incomeType: string;
  nextStep: string;
  priority: "High" | "Medium" | "Low";
  [key: string]: any; // Allow dynamic fields
};

export default function Screening() {
  const { allFields } = useFields();
  
  // Core columns (original customized set)
  const coreColumns = [
    { id: "name", label: "Full Name", visible: true },
    { id: "appCompleteOn", label: "App Complete On", visible: true },
    { id: "loanNumber", label: "Loan Number", visible: true },
    { id: "realEstateAgent", label: "Real Estate Agent", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "user", label: "User", visible: true },
    { id: "phone", label: "Lead Phone", visible: true },
    { id: "email", label: "Lead Email", visible: true },
    { id: "loanType", label: "Loan Type", visible: true },
    { id: "creditScore", label: "FICO", visible: true },
    { id: "loanAmount", label: "Loan Amount", visible: true },
    { id: "dti", label: "DTI", visible: true },
    { id: "dueDate", label: "Due Date", visible: true },
  ];

  // Load ALL database fields for Hide/Show modal - showing all 124+ fields
const allAvailableColumns = useMemo(() => {
  // Get ALL active fields from database
  const dbColumns = allFields
    .filter(f => f.is_in_use) // Only active fields (124+)
    .map(field => ({
      id: field.field_name, // Use DATABASE field name directly
      label: field.display_name,
      visible: false
    }));
  
  const coreColumnIds = new Set(coreColumns.map(c => c.id));
  const additionalColumns = dbColumns.filter(c => !coreColumnIds.has(c.id));
  
  return [...coreColumns, ...additionalColumns];
}, [allFields]);

  // Status/Converted options
  const convertedOptions = [
    { value: "Just Applied", label: "Just Applied" },
    { value: "Screening", label: "Screening" },
    { value: "Pre-Qualified", label: "Pre-Qualified" },
    { value: "Standby", label: "Standby" },
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<DatabaseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
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
    setColumns,
    setActiveView
  } = useColumnVisibility(allAvailableColumns, 'screening-columns', 'screening');

  const handleViewSaved = (viewName: string) => {
    toast({
      title: "View Saved",
      description: `"${viewName}" has been saved successfully`,
    });
    loadView(viewName);
  };

  // Auto-load Main View on every page navigation
  useEffect(() => {
    // Reset to Main View whenever the component mounts (user navigates to this page)
    if (activeView !== "Main View") {
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
    // Map visible column indices to full column indices
    const oldColumnId = visibleColumns[oldIndex]?.id;
    const newColumnId = visibleColumns[newIndex]?.id;
    
    if (!oldColumnId || !newColumnId) return;
    
    const actualOldIndex = columnVisibility.findIndex(col => col.id === oldColumnId);
    const actualNewIndex = columnVisibility.findIndex(col => col.id === newColumnId);
    
    if (actualOldIndex === -1 || actualNewIndex === -1) return;
    
    reorderColumns(actualOldIndex, actualNewIndex);
    
    toast({
      title: "Column Reordered",
      description: "Table column order has been updated",
    });
  };

  const loadUsers = async () => {
    try {
      const data = await databaseService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAgents = async () => {
    const { data } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, brokerage, email, phone');
    if (data) setAgents(data);
  };

  // Load leads from database filtered by Screening pipeline stage
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
        .eq('pipeline_stage_id', 'a4e162e0-5421-4d17-8ad5-4b1195bbc995') // Screening stage
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading screening clients:', error);
      toast({
        title: "Error",
        description: "Failed to load screening clients",
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
    
    // Load filters from localStorage
    const savedFilters = localStorage.getItem('screening-filters');
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
    localStorage.setItem('screening-filters', JSON.stringify(filters));
  }, [filters]);
  
  // Filter columns definition with proper types and options
  const filterColumns = [
    { value: 'first_name', label: 'First Name', type: 'text' as const },
    { value: 'last_name', label: 'Last Name', type: 'text' as const },
    { value: 'email', label: 'Email', type: 'text' as const },
    { value: 'phone', label: 'Phone', type: 'text' as const },
    { value: 'converted', label: 'Status', type: 'select' as const, options: convertedOptions.map(o => o.value) },
    { value: 'loan_type', label: 'Loan Type', type: 'select' as const, options: loanTypeOptions.map(o => o.value) },
    { value: 'loan_amount', label: 'Loan Amount', type: 'number' as const },
    { value: 'sales_price', label: 'Sales Price', type: 'number' as const },
    { value: 'fico_score', label: 'Credit Score', type: 'number' as const },
    { value: 'dti', label: 'DTI', type: 'number' as const },
    { value: 'property_type', label: 'Property Type', type: 'select' as const, options: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', '2-4 Units', 'Other'] },
    { value: 'occupancy', label: 'Occupancy', type: 'select' as const, options: ['Primary Residence', 'Second Home', 'Investment'] },
    { value: 'app_complete_at', label: 'App Complete On', type: 'date' as const },
    { value: 'task_eta', label: 'Due Date', type: 'date' as const },
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

  const handleFieldUpdate = async (id: string, field: string, value: any) => {
    const fieldMapping: Record<string, string> = {
      'phone': 'phone',
      'email': 'email',
      'fico_score': 'fico_score',
      'creditScore': 'fico_score',
      'loan_amount': 'loan_amount',
      'loanAmount': 'loan_amount',
      'dti': 'dti',
      'loan_type': 'loan_type',
      'loanType': 'loan_type',
      'converted': 'converted',
      'status': 'converted',
      'teammate_assigned': 'teammate_assigned',
      'user': 'teammate_assigned',
      'buyer_agent_id': 'buyer_agent_id',
      'realEstateAgent': 'buyer_agent_id',
      'due_date': 'task_eta',
      'dueDate': 'task_eta',
      'mb_loan_number': 'mb_loan_number',
    };
    
    const dbField = fieldMapping[field] || field;
    const updateData: any = { [dbField]: value };
    
    // Automation: When App Complete, ensure status is "Just Applied"
    if (field === 'converted' && value === 'App Complete') {
      updateData.converted = 'Just Applied'; // Set status to "Just Applied"
    }
    
    // Automation: When Pre-Qualified, move to Pre-Qualified board
    if (field === 'converted' && value === 'Pre-Qualified') {
      updateData.pipeline_stage_id = '09162eec-d2b2-48e5-86d0-9e66ee8b2af7'; // Pre-Qualified
      updateData.pre_qualified_at = new Date().toISOString(); // Set timestamp
      toast({
        title: "Moving to Pre-Qualified",
        description: "Lead moved to Pre-Qualified board",
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

  // Transform leads to DisplayLead format
  const displayData: DisplayLead[] = leads.map(lead => ({
    id: lead.id,
    name: `${lead.first_name} ${lead.last_name}`,
    appCompleteOn: lead.app_complete_at || lead.created_at,
    loanNumber: lead.mb_loan_number?.toString() || '—',
    realEstateAgent: lead.buyer_agent_id || '',
    realEstateAgentData: (lead as any).buyer_agent || null,
    status: lead.converted || 'Working on it',
    user: lead.teammate_assigned || '',
    userData: (lead as any).teammate || null,
    phone: lead.phone || '',
    email: lead.email || '',
    loanType: lead.loan_type || '',
    creditScore: lead.fico_score || 0,
    loanAmount: lead.loan_amount || 0,
    salesPrice: lead.sales_price || 0,
    ltv: (lead as any).ltv || null,
    dti: lead.dti || 0,
    dueDate: lead.task_eta || '',
    incomeType: lead.income_type || '',
    nextStep: 'Review',
    priority: 'Medium' as const,
    // Add all database fields dynamically
...allFields
      .filter(f => f.is_in_use && !ALIAS_FIELD_NAMES.has(f.field_name) && f.field_type !== 'computed')
      .reduce((acc, field) => {
        const key = FIELD_NAME_MAP[field.field_name] || field.field_name;
        const val = (lead as any)[field.field_name];
        if (val !== undefined && val !== null && !(typeof val === 'string' && val === '')) {
          acc[key] = val;
        }
        return acc;
      }, {} as Record<string, any>)
  }));

  // Generate column definition for dynamic fields
  const generateColumnDef = (field: any): ColumnDef<DisplayLead> => {
    const frontendFieldName = FIELD_NAME_MAP[field.field_name] || field.field_name;
    const baseColumn: ColumnDef<DisplayLead> = {
      accessorKey: frontendFieldName, // Use mapped frontend name
      header: field.display_name,
      sortable: true,
    };

    // Add cell renderer based on field type
    switch (field.field_type) {
      case 'text':
        baseColumn.cell = ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditText
              value={row.original[frontendFieldName] || ''}
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
              value={row.original[frontendFieldName] || 0}
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
              value={row.original[frontendFieldName] || 0}
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
              value={row.original[frontendFieldName] || 0}
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
              value={row.original[frontendFieldName]}
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
      
      case 'datetime':
        // Check if this is a timeline field
        const timelineFields = ['pending_app_at', 'app_complete_at', 'pre_qualified_at', 'pre_approved_at', 'active_at'];
        if (timelineFields.includes(field.field_name)) {
          baseColumn.cell = ({ row }) => (
            <span className="text-sm">
              {formatDateShort(row.original[frontendFieldName])}
            </span>
          );
        } else {
          // Regular datetime fields remain editable
          baseColumn.cell = ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <InlineEditDateTime
                value={row.original[frontendFieldName]}
                onValueChange={(value: string) => {
                  handleFieldUpdate(row.original.id, field.field_name, value);
                  fetchLeads();
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
              value={row.original[frontendFieldName] || ''}
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
        // Fallback: display raw value
        baseColumn.cell = ({ row }) => (
          <span className="text-sm">{String(row.original[frontendFieldName] || '—')}</span>
        );
    }

    return baseColumn;
  };

  const allColumns: ColumnDef<DisplayLead>[] = useMemo(() => {
    // Hardcoded columns with custom rendering
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
      accessorKey: "appCompleteOn",
      header: "App Complete On",
      cell: ({ row }) => formatDateShort(row.original.appCompleteOn),
      sortable: true,
    },
    {
      accessorKey: "loanNumber",
      header: "Loan Number",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditText
            value={row.original.loanNumber === '—' ? '' : row.original.loanNumber}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "mb_loan_number", value);
              fetchLeads();
            }}
            placeholder="MB-"
          />
        </div>
      ),
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
            onValueChange={async (agent) => {
              await handleFieldUpdate(row.original.id, "buyer_agent_id", agent?.id || null);
              await fetchLeads();
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
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "converted", value);
              await fetchLeads();
            }}
            showAsStatusBadge={true}
            fillCell={true}
            fixedWidth="w-36"
          />
        </div>
      ),
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
          onValueChange={async (userId) => {
            await handleFieldUpdate(row.original.id, "teammate_assigned", userId);
            await fetchLeads();
          }}
          showNameText={false}
        />
      ),
    },
    // Additional columns
    {
      accessorKey: "phone",
      header: "Lead Phone",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditPhone
            value={row.original.phone}
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "phone", value);
              await fetchLeads();
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
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "email", value);
              await fetchLeads();
            }}
            placeholder="Enter email"
          />
        </div>
      )
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
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "loan_type", value);
              await fetchLeads();
            }}
            placeholder="Select type"
          />
        </div>
      ),
    },
    {
      accessorKey: "creditScore",
      header: "FICO",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditNumber
            value={row.original.creditScore}
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "fico_score", value);
              await fetchLeads();
            }}
            placeholder="0"
            min={300}
            max={850}
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
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "loan_amount", value);
              await fetchLeads();
            }}
            placeholder="$0"
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
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "dti", value);
              await fetchLeads();
            }}
            decimals={1}
          />
        </div>
      )
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditDate
            value={row.original.dueDate}
            onValueChange={async (date) => {
              const dateString = date ? date.toISOString().split('T')[0] : null;
              await handleFieldUpdate(row.original.id, "due_date", dateString);
              await fetchLeads();
            }}
            placeholder="Select date"
          />
        </div>
      ),
    },
    {
      accessorKey: "loanAmount",
      header: "Loan Amount",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditCurrency
            value={row.original.loanAmount}
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "loan_amount", value);
              await fetchLeads();
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
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "sales_price", value);
              await fetchLeads();
            }}
            placeholder="$0"
          />
        </div>
      )
    },
    {
      accessorKey: "ltv",
      header: "LTV",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditPercentage
            value={row.original.ltv || 0}
            onValueChange={async (value) => {
              await handleFieldUpdate(row.original.id, "ltv", value);
              await fetchLeads();
            }}
            decimals={1}
          />
        </div>
      )
    },
  ];

    // Get IDs of hardcoded columns to avoid duplicates
    const hardcodedIds = new Set(hardcodedColumns.map(col => col.accessorKey));

    // Generate column definitions for all other database fields
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
          <h1 className="text-2xl font-bold text-foreground">Screening ({displayData.length})</h1>
          <p className="text-xs italic text-muted-foreground/70">Initial verification and qualification</p>
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
              variant={isFilterOpen ? "default" : "outline"} 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {filters.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {filters.length}
                </Badge>
              )}
            </Button>
            
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
        {/* Inline Filter Section */}
        {isFilterOpen && (
          <div className="px-6 pb-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Filter Clients</h3>
                <div className="flex items-center gap-2">
                  {filters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7">
                      Clear All
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFilterOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <FilterBuilder
                filters={filters}
                onFiltersChange={setFilters}
                columns={filterColumns}
              />
            </div>
          </div>
        )}
        <CardContent>
          <DataTable
            storageKey="screening-table"
            columns={columns}
            data={displayData}
            searchTerm={searchTerm}
            onRowClick={(row) => {
              const lead = leads.find(l => l.id === row.id);
              if (lead) handleRowClick(lead);
            }}
            onColumnReorder={handleColumnReorder}
            selectable
            selectedIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            getRowId={(row) => row.id}
            showRowNumbers={true}
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
              onClick={async (e) => {
                e.preventDefault();
                await handleBulkDelete();
              }}
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
