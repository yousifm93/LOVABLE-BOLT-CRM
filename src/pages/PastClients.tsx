import { useState, useEffect, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { useFields } from "@/contexts/FieldsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ColumnDef } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient } from "@/types/crm";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface PastClientLoan {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  sales_price: number | null;
  mb_loan_number: string | null;
  pr_type: string | null;
  occupancy: string | null;
  disclosure_status: string | null;
  close_date: string | null;
  loan_status: string | null;
  appraisal_status: string | null;
  title_status: string | null;
  hoi_status: string | null;
  condo_status: string | null;
  cd_status: string | null;
  package_status: string | null;
  lock_expiration_date: string | null;
  ba_status: string | null;
  epo_status: string | null;
  teammate_assigned: string | null;
  lender_id: string | null;
  approved_lender_id: string | null;
  buyer_agent_id: string | null;
  listing_agent_id: string | null;
  pipeline_section: string | null;
  is_closed: boolean | null;
  closed_at: string | null;
  notes: string | null;
  lender?: {
    id: string;
    first_name: string;
    last_name: string;
    company?: string;
    email?: string;
  } | null;
  approved_lender?: {
    id: string;
    lender_name: string;
    lender_type?: string;
  } | null;
  buyer_agent?: {
    id: string;
    first_name: string;
    last_name: string;
    company?: string;
    email?: string;
    phone?: string;
  } | null;
  listing_agent?: {
    id: string;
    first_name: string;
    last_name: string;
    brokerage?: string;
    email?: string;
  } | null;
  teammate?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null;
}

// Status options for dropdowns
const prTypeOptions = [
  { value: "P", label: "P" },
  { value: "R", label: "R" },
  { value: "HELOC", label: "HELOC" }
];

const disclosureStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Sent", label: "Sent" },
  { value: "Signed", label: "Signed" },
  { value: "Need SIG", label: "Need SIG" }
];

const loanStatusOptions = [
  { value: "Closed", label: "Closed" },
  { value: "Need Support", label: "Need Support" },
  { value: "New Lead", label: "New Lead" }
];

// Keep original options for other fields
const originalLoanStatusOptions = [
  { value: "NEW", label: "NEW" },
  { value: "RFP", label: "RFP" },
  { value: "SUB", label: "SUB" },
  { value: "AWC", label: "AWC" },
  { value: "CTC", label: "CTC" }
];

const appraisalStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Inspected", label: "Inspected" },
  { value: "Received", label: "Received" },
  { value: "Waiver", label: "Waiver" }
];

const titleStatusOptions = [
  { value: "Requested", label: "Requested" },
  { value: "Received", label: "Received" }
];

const hoiStatusOptions = [
  { value: "Quoted", label: "Quoted" },
  { value: "Ordered", label: "Ordered" },
  { value: "Received", label: "Received" }
];

const condoStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Received", label: "Received" },
  { value: "Approved", label: "Approved" }
];

const cdStatusOptions = [
  { value: "Requested", label: "Requested" },
  { value: "Sent", label: "Sent" },
  { value: "Signed", label: "Signed" },
  { value: "N/A", label: "N/A" }
];

const packageStatusOptions = [
  { value: "Initial", label: "Initial" },
  { value: "Final", label: "Final" }
];

const baStatusOptions = [
  { value: "Send", label: "Send" },
  { value: "Sent", label: "Sent" },
  { value: "Signed", label: "Signed" },
  { value: "N/A", label: "N/A" }
];

const epoStatusOptions = [
  { value: "Send", label: "Send" },
  { value: "Sent", label: "Sent" },
  { value: "Signed", label: "Signed" }
];

// Main view default columns
const MAIN_VIEW_COLUMNS = [
  "borrower_name",
  "team",
  "lender",
  "mb_loan_number",
  "loan_amount",
  "sales_price",
  "close_date",
  "closed_at",
  "loan_status",
  "appraisal_status",
  "title_status",
  "hoi_status",
  "condo_status",
  "cd_status",
  "disclosure_status",
  "package_status",
  "ba_status",
  "real_estate_agent",
  "listing_agent"
];

const createColumns = (
  users: any[], 
  lenders: any[], 
  agents: any[], 
  handleUpdate: (id: string, field: string, value: any) => void,
  handleRowClick: (loan: PastClientLoan) => void,
  toast: any
): ColumnDef<PastClientLoan>[] => [
  {
    accessorKey: "borrower_name",
    header: "Borrower",
    className: "text-left",
    headerClassName: "text-left",
    cell: ({ row }) => (
      <div 
        className="text-sm text-foreground hover:text-warning cursor-pointer transition-colors truncate max-w-[160px] text-left"
        title={`${row.original.first_name} ${row.original.last_name}`}
        onClick={(e) => {
          e.stopPropagation();
          handleRowClick(row.original);
        }}
      >
        {`${row.original.first_name} ${row.original.last_name}`}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "team",
    header: "User",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <div className="w-12">
          <InlineEditAssignee
            assigneeId={row.original.teammate_assigned}
            users={users}
            onValueChange={(userId) => 
              handleUpdate(row.original.id, "teammate_assigned", userId)
            }
            showNameText={false}
          />
        </div>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "lender",
    header: "Lender",
    cell: ({ row }) => {
      const matchedLender = row.original.approved_lender
        ? lenders.find(l => l.id === row.original.approved_lender!.id)
        : null;
      
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="whitespace-nowrap">
            <InlineEditApprovedLender
              value={matchedLender}
              lenders={lenders}
              onValueChange={async (lender) => {
                await handleUpdate(row.original.id, "approved_lender_id", lender?.id ?? null);
              }}
            />
          </div>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "mb_loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditText
          value={row.original.mb_loan_number || ''}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "mb_loan_number", value)
          }
          placeholder="MB-"
          className="w-20"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "pr_type",
    header: "P/R",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
      <InlineEditSelect
        value={row.original.pr_type}
        options={prTypeOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "pr_type", value)
        }
        showAsStatusBadge
        fillCell={true}
        className="w-12"
      />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "occupancy",
    header: "Occupancy",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.occupancy}
          options={[
            { value: 'Primary Residence', label: 'PRIMARY' },
            { value: 'Investment Property', label: 'INVESTMENT' },
            { value: 'Second Home', label: 'SECOND HOME' },
          ]}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "occupancy", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-32"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "loan_amount",
    header: "Loan Amount",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <div className="whitespace-nowrap">
          <InlineEditCurrency
            value={row.original.loan_amount}
            onValueChange={(value) => 
              handleUpdate(row.original.id, "loan_amount", value)
            }
          />
        </div>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "sales_price",
    header: "Sales Price",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <div className="whitespace-nowrap">
          <InlineEditCurrency
            value={row.original.sales_price}
            onValueChange={(value) => 
              handleUpdate(row.original.id, "sales_price", value)
            }
          />
        </div>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "disclosure_status",
    header: "DISC",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.disclosure_status}
          options={disclosureStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "disclosure_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-16"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "close_date",
    header: "Close Date",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditDate
          value={row.original.close_date}
          onValueChange={(date) => 
            handleUpdate(row.original.id, "close_date", date?.toISOString().split('T')[0] || null)
          }
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "loan_status",
    header: "Loan Status",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.loan_status}
          options={loanStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "loan_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-14"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "appraisal_status",
    header: "Appraisal",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.appraisal_status}
          options={appraisalStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "appraisal_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-18"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "title_status",
    header: "Title",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.title_status}
          options={titleStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "title_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-20"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "hoi_status",
    header: "HOI",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.hoi_status}
          options={hoiStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "hoi_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-14"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "condo_status",
    header: "Condo",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.condo_status}
          options={condoStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "condo_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-16"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "cd_status",
    header: "CD",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.cd_status}
          options={cdStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "cd_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-16"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "package_status",
    header: "Package",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.package_status}
          options={packageStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "package_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-12"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "lock_expiration_date",
    header: "LOC EXP",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditDate
          value={row.original.lock_expiration_date}
          onValueChange={(date) => 
            handleUpdate(row.original.id, "lock_expiration_date", date?.toISOString().split('T')[0] || null)
          }
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "ba_status",
    header: "BA",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.ba_status}
          options={baStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "ba_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-16"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "epo_status",
    header: "EPO",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditSelect
          value={row.original.epo_status}
          options={epoStatusOptions}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "epo_status", value)
          }
          showAsStatusBadge
          fillCell={true}
          className="w-16"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "buyer_agent",
    header: "Buyer's Agent",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditAgent
          value={row.original.buyer_agent ? {
            id: row.original.buyer_agent.id,
            first_name: row.original.buyer_agent.first_name,
            last_name: row.original.buyer_agent.last_name,
            brokerage: row.original.buyer_agent.company,
            email: row.original.buyer_agent.email,
            phone: row.original.buyer_agent.phone,
          } : null}
          agents={agents}
          onValueChange={async (agent) => 
            await handleUpdate(row.original.id, "buyer_agent_id", agent?.id || null)
          }
          type="buyer"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "listing_agent",
    header: "Listing Agent",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditAgent
          value={row.original.listing_agent ? {
            id: row.original.listing_agent.id,
            first_name: row.original.listing_agent.first_name,
            last_name: row.original.listing_agent.last_name,
            brokerage: row.original.listing_agent.brokerage,
            email: row.original.listing_agent.email,
          } : null}
          agents={agents}
          onValueChange={async (agent) => {
            if (!agent) {
              await handleUpdate(row.original.id, "listing_agent_id", null);
            } else {
              try {
                const buyerAgentId = await databaseService.ensureBuyerAgentFromContact(agent.id);
                await handleUpdate(row.original.id, "listing_agent_id", buyerAgentId);
              } catch (error) {
                console.error('Error mapping listing agent:', error);
                toast({
                  variant: "destructive",
                  title: "Failed to update listing agent",
                });
              }
            }
          }}
          type="listing"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "closed_at",
    header: "Closed Date",
    cell: ({ row }) => {
      if (!row.original.closed_at) return <span className="text-muted-foreground">—</span>;
      const date = new Date(row.original.closed_at);
      return (
        <span className="text-sm">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      );
    },
    sortable: true,
  },
];

export default function PastClients() {
  const { allFields } = useFields();
  
  // Core columns that should appear first with default visibility
  const coreColumns = useMemo(() => [
    { id: "borrower_name", label: "Borrower", visible: true },
    { id: "team", label: "Team", visible: true },
    { id: "mb_loan_number", label: "Loan #", visible: true },
    { id: "lender", label: "Lender", visible: true },
    { id: "loan_amount", label: "Loan Amount", visible: true },
    { id: "sales_price", label: "Sales Price", visible: true },
    { id: "close_date", label: "Close Date", visible: true },
    { id: "pr_type", label: "P/R", visible: true },
    { id: "occupancy", label: "Occupancy", visible: true },
    { id: "disclosure_status", label: "DISC", visible: true },
    { id: "loan_status", label: "Loan Status", visible: true },
    { id: "title_status", label: "Title", visible: true },
    { id: "hoi_status", label: "HOI", visible: true },
    { id: "appraisal_status", label: "Appraisal", visible: true },
    { id: "cd_status", label: "CD", visible: true },
    { id: "package_status", label: "Package", visible: true },
    { id: "condo_status", label: "Condo", visible: true },
    { id: "lock_expiration_date", label: "LOC EXP", visible: true },
    { id: "ba_status", label: "BA", visible: true },
    { id: "epo_status", label: "EPO", visible: true },
    { id: "buyer_agent", label: "Buyer's Agent", visible: true },
    { id: "listing_agent", label: "Listing Agent", visible: true },
    { id: "closed_at", label: "Closed Date", visible: true },
  ], []);
  
  // Load ALL database fields for Hide/Show modal (~85 total)
  const allAvailableColumns = useMemo(() => {
    const dbColumns = allFields
      .filter(f => f.is_in_use)
      .map(field => ({
        id: field.field_name,
        label: field.display_name,
        visible: false
      }));
    
    const existingIds = new Set(coreColumns.map(c => c.id));
    const newColumns = dbColumns.filter(c => !existingIds.has(c.id));
    
    return [...coreColumns, ...newColumns];
  }, [allFields, coreColumns]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pastClients, setPastClients] = useState<PastClientLoan[]>([]);
  const [users, setUsers] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const { toast } = useToast();

  // Column visibility management
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
  } = useColumnVisibility(allAvailableColumns, 'past-clients-columns', 'past_clients');

  // Filter columns definition with proper types and options
  const filterColumns = [
    { value: 'first_name', label: 'First Name', type: 'text' as const },
    { value: 'last_name', label: 'Last Name', type: 'text' as const },
    { value: 'email', label: 'Email', type: 'text' as const },
    { value: 'phone', label: 'Phone', type: 'text' as const },
    { value: 'mb_loan_number', label: 'Loan Number', type: 'text' as const },
    { value: 'loan_type', label: 'Loan Type', type: 'select' as const, options: ['Purchase', 'Refinance', 'Cash Out Refinance', 'HELOC', 'Construction', 'VA Loan', 'FHA Loan', 'Conventional', 'Jumbo'] },
    { value: 'pr_type', label: 'P/R Type', type: 'select' as const, options: prTypeOptions.map(o => o.value) },
    { value: 'loan_status', label: 'Loan Status', type: 'select' as const, options: loanStatusOptions.map(o => o.value) },
    { value: 'loan_amount', label: 'Loan Amount', type: 'number' as const },
    { value: 'sales_price', label: 'Sales Price', type: 'number' as const },
    { value: 'close_date', label: 'Close Date', type: 'date' as const },
    { value: 'closed_at', label: 'Closed Date', type: 'date' as const },
  ];

  // Auto-load Main View on initial mount
  useEffect(() => {
    const hasCustomization = localStorage.getItem('past-clients-columns');
    
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loansData, usersData, lendersData, agentsData] = await Promise.all([
        databaseService.getPastClientLoans(),
        databaseService.getUsers(),
        databaseService.getLenders(),
        databaseService.getRealEstateAgents(),
      ]);
      setPastClients(loansData || []);
      setUsers(usersData || []);
      setLenders(lendersData || []);
      setAgents(agentsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load past clients data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      // Handle notes field (typically edited in drawer)
      if (field === 'notes') {
        // Just pass through - notes are saved via drawer
      }
      
      await databaseService.updateLead(id, { [field]: value });
      
      // For relationship fields, reload the entire dataset to get fresh embedded objects
      if (['approved_lender_id', 'lender_id', 'buyer_agent_id', 'listing_agent_id', 'teammate_assigned'].includes(field)) {
        await loadData();
      } else {
        // For simple fields, just update optimistically
        setPastClients(prev => prev.map(loan => 
          loan.id === id ? { ...loan, [field]: value } : loan
        ));
      }
      
      toast({
        title: "Updated",
        description: "Field updated successfully",
      });
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive"
      });
      await loadData(); // Reload on error to revert
    }
  };

  const handleRowClick = (loan: PastClientLoan) => {
    // Convert PastClientLoan to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: Date.now(), // Placeholder numeric ID for legacy compatibility
        firstName: loan.first_name,
        lastName: loan.last_name,
        email: "", // PastClientLoan doesn't have email, will be empty
        phoneMobile: "" // PastClientLoan doesn't have phone, will be empty
      },
      databaseId: loan.id, // Real UUID from database
      loan: {
        loanAmount: loan.loan_amount ? `$${loan.loan_amount.toLocaleString()}` : "",
        loanType: loan.pr_type || "Purchase",
        prType: loan.pr_type || "",
        closeDate: loan.close_date,
        disclosureStatus: loan.disclosure_status
      },
      ops: {
        stage: "past-clients",
        status: "Closed",
        priority: "Low"
      },
      dates: {
        createdOn: new Date().toISOString(),
        appliedOn: new Date().toISOString()
      },
      meta: {},
      name: `${loan.first_name} ${loan.last_name}`,
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (row: PastClientLoan) => {
    setDeleteLeadId(row.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      toast({
        title: "Success",
        description: "Past client deleted successfully.",
      });
      await loadData();
    } catch (error: any) {
      console.error('Error deleting past client:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete past client.",
        variant: "destructive",
      });
    } finally {
      setDeleteLeadId(null);
    }
  };

  const handleViewDetails = (row: PastClientLoan) => {
    handleRowClick(row);
  };

  const handleEdit = (row: PastClientLoan) => {
    handleRowClick(row);
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (selectedLeadIds.length === 0) return;
    
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => databaseService.updateLead(id, { [field]: value }))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} past client${successCount > 1 ? 's' : ''} updated successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }
      
      if (failCount > 0 && successCount === 0) {
        toast({
          title: "Error",
          description: `Failed to update ${failCount} past client${failCount > 1 ? 's' : ''}.`,
          variant: "destructive",
        });
      }
      
      await loadData();
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error during bulk update:', error);
      toast({
        title: "Error",
        description: "An error occurred during bulk update.",
        variant: "destructive",
      });
    }
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
          description: `${successCount} past client${successCount > 1 ? 's' : ''} deleted successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }
      
      if (failCount > 0 && successCount === 0) {
        toast({
          title: "Error",
          description: `Failed to delete ${failCount} past client${failCount > 1 ? 's' : ''}.`,
          variant: "destructive",
        });
      }
      
      await loadData();
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toast({
        title: "Error",
        description: "An error occurred during bulk deletion.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const applyAdvancedFilters = (loans: PastClientLoan[]) => {
    if (filters.length === 0) return loans;

    return loans.filter(loan => {
      return filters.every(filter => {
        if (!filter.column || !filter.operator || filter.value === undefined) return true;

        let fieldValue: any;
        switch (filter.column) {
          case 'borrower_name':
            fieldValue = `${loan.first_name} ${loan.last_name}`.toLowerCase();
            break;
          case 'lender':
            fieldValue = loan.approved_lender?.lender_name?.toLowerCase() || '';
            break;
          case 'loan_amount':
            fieldValue = loan.loan_amount || 0;
            break;
          case 'sales_price':
            fieldValue = loan.sales_price || 0;
            break;
          case 'close_date':
            fieldValue = loan.close_date;
            break;
          case 'closed_at':
            fieldValue = loan.closed_at;
            break;
          default:
            fieldValue = loan[filter.column as keyof PastClientLoan];
        }

        const filterValue = filter.value;

        switch (filter.operator) {
          case 'is':
            return String(fieldValue).toLowerCase() === String(filterValue).toLowerCase();
          case 'is_not':
            return String(fieldValue).toLowerCase() !== String(filterValue).toLowerCase();
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'is_after':
            return fieldValue && new Date(fieldValue) > new Date(filterValue as string);
          case 'is_before':
            return fieldValue && new Date(fieldValue) < new Date(filterValue as string);
          default:
            return true;
        }
      });
    });
  };

  const clearAllFilters = () => {
    setFilters([]);
  };

  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId));
  };

  // Generate columns with current data
  const allColumns = createColumns(users, lenders, agents, handleUpdate, handleRowClick, toast);
  
  // Filter columns based on visibility
  const columns = visibleColumns
    .map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id))
    .filter((col): col is ColumnDef<PastClientLoan> => col !== undefined);

  // Filter loans based on search and advanced filters
  const filteredLoans = useMemo(() => {
    // First apply search term
    let result = pastClients.filter(loan => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        `${loan.first_name} ${loan.last_name}`.toLowerCase().includes(search) ||
        loan.mb_loan_number?.toString().includes(search)
      );
    });
    
    // Then apply advanced filters
    result = applyAdvancedFilters(result);
    
    return result;
  }, [pastClients, searchTerm, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Past Clients</h1>
            <p className="text-muted-foreground mt-1">
              {filteredLoans.length} closed {filteredLoans.length === 1 ? 'loan' : 'loans'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter {filters.length > 0 && `(${filters.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="start">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Filter Past Clients</h4>
                  {filters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear All
                    </Button>
                  )}
                </div>
                <FilterBuilder
                  filters={filters}
                  columns={filterColumns}
                  onFiltersChange={setFilters}
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <ColumnVisibilityButton 
            columns={columnVisibility} 
            onColumnToggle={toggleColumn} 
            onToggleAll={toggleAll} 
            onSaveView={saveView}
            onReorderColumns={handleColumnReorder}
            onViewSaved={(name) => { 
              toast({ title: "View Saved", description: `"${name}" saved` }); 
              loadView(name); 
            }}
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

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Badge key={filter.id} variant="secondary" className="gap-1">
                <span className="text-xs">
                  {filterColumns.find(col => col.value === filter.column)?.label}: {filter.operator} {String(filter.value)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => removeFilter(filter.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
        <DataTable 
          columns={columns} 
          data={filteredLoans} 
          searchTerm={searchTerm} 
          onRowClick={handleRowClick}
          onColumnReorder={handleColumnReorder}
          storageKey="past-clients"
          selectable
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          getRowId={(row) => row.id}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
        />
        </CardContent>
      </Card>
      {selectedClient && (
        <ClientDetailDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => { 
            setIsDrawerOpen(false); 
            setSelectedClient(null); 
          }} 
          client={selectedClient} 
          onStageChange={() => setIsDrawerOpen(false)} 
          onLeadUpdated={loadData} 
          pipelineType="past-clients" 
        />
      )}

      {/* Floating Bulk Action Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="flex items-center gap-4 p-4">
              <Badge variant="secondary" className="text-sm">
                {selectedLeadIds.length} past client{selectedLeadIds.length > 1 ? 's' : ''} selected
              </Badge>
              <div className="flex gap-2">
                <Button onClick={() => setIsBulkUpdateOpen(true)} size="sm">Update Field</Button>
                <Button onClick={() => setIsBulkDeleteOpen(true)} variant="destructive" size="sm">Delete</Button>
                <Button onClick={() => setSelectedLeadIds([])} variant="outline" size="sm">Clear</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Past Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this past client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedLeadIds.length} Past Clients</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedLeadIds.length} past client{selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        open={isBulkUpdateOpen}
        onOpenChange={setIsBulkUpdateOpen}
        selectedCount={selectedLeadIds.length}
        onUpdate={handleBulkUpdate}
        fieldOptions={[
          { value: 'loan_status', label: 'Loan Status', type: 'select', options: loanStatusOptions },
          { value: 'pr_type', label: 'P/R Type', type: 'select', options: prTypeOptions },
          { value: 'disclosure_status', label: 'Disclosure Status', type: 'select', options: disclosureStatusOptions },
          { value: 'appraisal_status', label: 'Appraisal Status', type: 'select', options: appraisalStatusOptions },
          { value: 'title_status', label: 'Title Status', type: 'select', options: titleStatusOptions },
          { value: 'hoi_status', label: 'HOI Status', type: 'select', options: hoiStatusOptions },
          { value: 'condo_status', label: 'Condo Status', type: 'select', options: condoStatusOptions },
          { value: 'cd_status', label: 'CD Status', type: 'select', options: cdStatusOptions },
          { value: 'package_status', label: 'Package Status', type: 'select', options: packageStatusOptions },
          { value: 'ba_status', label: 'BA Status', type: 'select', options: baStatusOptions },
          { value: 'epo_status', label: 'EPO Status', type: 'select', options: epoStatusOptions },
          { value: 'teammate_assigned', label: 'Team Member', type: 'select', options: users.map(u => ({ 
            value: u.id, 
            label: `${u.first_name} ${u.last_name}` 
          })) },
        ]}
      />
    </div>
  );
}
