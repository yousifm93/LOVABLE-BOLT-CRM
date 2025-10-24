import { useState, useEffect, useMemo } from "react";
import { Search, Filter, X, Lock, Unlock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
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
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsiblePipelineSection } from "@/components/CollapsiblePipelineSection";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface ActiveLoan {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  sales_price: number | null;
  arrive_loan_number: number | null;
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
  { value: "New", label: "New" },
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
  { value: "Signed", label: "Signed" }
];

const packageStatusOptions = [
  { value: "Initial", label: "Initial" },
  { value: "Final", label: "Final" }
];

const baStatusOptions = [
  { value: "Send", label: "Send" },
  { value: "Sent", label: "Sent" },
  { value: "Signed", label: "Signed" }
];

const epoStatusOptions = [
  { value: "Send", label: "Send" },
  { value: "Sent", label: "Sent" },
  { value: "Signed", label: "Signed" }
];

const createColumns = (
  users: any[], 
  lenders: any[], 
  agents: any[], 
  handleUpdate: (id: string, field: string, value: any) => void,
  handleRowClick: (loan: ActiveLoan) => void,
  toast: any,
  onCloseLoan: (loanId: string) => void
): ColumnDef<ActiveLoan>[] => [
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
    header: "Team",
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
    accessorKey: "arrive_loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditNumber
          value={row.original.arrive_loan_number || 0}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "arrive_loan_number", value)
          }
          placeholder="0"
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
    accessorKey: "is_closed",
    header: "Closed",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.original.is_closed || false}
          onCheckedChange={(checked) => {
            if (checked) {
              onCloseLoan(row.original.id);
            }
          }}
        />
      </div>
    ),
    sortable: false,
  },
];

// Define initial column configuration
  const initialColumns = [
    { id: "borrower_name", label: "Borrower", visible: true },
    { id: "team", label: "Team", visible: true },
    { id: "arrive_loan_number", label: "Loan #", visible: true },
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
    { id: "is_closed", label: "Closed", visible: true },
  ];

export default function Active() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [users, setUsers] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [sortLocked, setSortLocked] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [loanToClose, setLoanToClose] = useState<string | null>(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  
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
    reorderColumns
  } = useColumnVisibility(initialColumns, 'active-pipeline-columns');

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

  // Filter configuration
  const filterColumns = [
    { value: 'borrower_name', label: 'Borrower', type: 'text' as const },
    { value: 'lender', label: 'Lender', type: 'text' as const },
    { value: 'pr_type', label: 'P/R', type: 'select' as const, options: prTypeOptions.map(opt => opt.value) },
    { value: 'loan_amount', label: 'Loan Amount', type: 'text' as const },
    { value: 'loan_status', label: 'Loan Status', type: 'select' as const, options: loanStatusOptions.map(opt => opt.value) },
    { value: 'close_date', label: 'Close Date', type: 'date' as const },
    { value: 'disclosure_status', label: 'Disclosure Status', type: 'select' as const, options: disclosureStatusOptions.map(opt => opt.value) },
    { value: 'appraisal_status', label: 'Appraisal Status', type: 'select' as const, options: appraisalStatusOptions.map(opt => opt.value) },
  ];

  // Load and save filters to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('active-pipeline-filters');
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
    
    // Load sort lock state
    const savedSortLocked = localStorage.getItem('active-sort-locked');
    if (savedSortLocked) {
      setSortLocked(JSON.parse(savedSortLocked));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('active-pipeline-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Phase 1: Load loans first (critical data)
      const loansData = await databaseService.getActiveLoans();
      setActiveLoans(loansData || []);
      
      // Phase 2: Load auxiliary data with Promise.allSettled (non-blocking)
      const [usersRes, lendersRes, agentsRes] = await Promise.allSettled([
        databaseService.getUsers(),
        databaseService.getLenders(),
        databaseService.getRealEstateAgents()
      ]);

      setUsers(usersRes.status === 'fulfilled' ? usersRes.value ?? [] : []);
      setLenders(lendersRes.status === 'fulfilled' ? lendersRes.value ?? [] : []);
      setAgents(agentsRes.status === 'fulfilled' ? agentsRes.value ?? [] : []);

      if (usersRes.status === 'rejected') {
        console.error('Users load failed:', usersRes.reason);
      }
      if (lendersRes.status === 'rejected') {
        console.error('Lender contacts load failed:', lendersRes.reason);
      }
      if (agentsRes.status === 'rejected') {
        console.error('Agents load failed:', agentsRes.reason);
      }
    } catch (error: any) {
      console.error('Error loading active loans:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load active loans data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshRow = async (id: string) => {
    try {
      const fresh = await databaseService.getLeadByIdWithEmbeds(id);
      setActiveLoans(prev => prev.map(loan => loan.id === id ? (fresh as any) : loan));
    } catch (e) {
      console.error('Failed to refresh row', e);
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      const updateData: any = { [field]: value };
      
      // Automation: When CTC (Clear To Close), move to Past Clients
      if (field === 'loan_status' && value === 'CTC') {
        updateData.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'; // Past Clients
        updateData.is_closed = true;
        updateData.closed_at = new Date().toISOString();
        updateData.converted = 'Closed'; // Set status to Closed
        toast({
          title: "Moving to Past Clients",
          description: "Loan moved to Past Clients board",
        });
      }
      
      await databaseService.updateLead(id, updateData);
      
      // Refresh embedded data for relationship fields
      if (['approved_lender_id', 'lender_id', 'buyer_agent_id', 'listing_agent_id'].includes(field)) {
        await refreshRow(id);
      } else {
        // Update local state optimistically for simple fields
        setActiveLoans(prev => prev.map(loan => 
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
      // Reload data to revert optimistic update
      loadData();
    }
  };

  const handleRowClick = (loan: ActiveLoan) => {
    // Convert ActiveLoan to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: Date.now(), // Placeholder numeric ID for legacy compatibility
        firstName: loan.first_name,
        lastName: loan.last_name,
        email: "", // ActiveLoan doesn't have email, will be empty
        phoneMobile: "" // ActiveLoan doesn't have phone, will be empty
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
        stage: "active",
        status: loan.loan_status || "NEW",
        priority: "High"
      },
      dates: {
        createdOn: new Date().toISOString(), // ActiveLoan doesn't have creation date
        appliedOn: new Date().toISOString()
      },
      meta: {},
      name: `${loan.first_name} ${loan.last_name}`,
      teammateAssigned: loan.teammate?.first_name && loan.teammate?.last_name 
        ? `${loan.teammate.first_name} ${loan.teammate.last_name}` 
        : undefined,
      buyersAgent: loan.buyer_agent?.first_name && loan.buyer_agent?.last_name
        ? `${loan.buyer_agent.first_name} ${loan.buyer_agent.last_name}`
        : undefined
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  const handleDelete = async (loan: ActiveLoan) => {
    setDeleteLeadId(loan.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      toast({
        title: "Success",
        description: "Lead deleted successfully.",
      });
      await loadData();
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

  const handleCloseLoan = async () => {
    if (!loanToClose) return;
    
    try {
      await databaseService.updateLead(loanToClose, {
        pipeline_section: 'Closed',
        is_closed: true,
        closed_at: new Date().toISOString()
      });
      
      // Remove from active loans list
      setActiveLoans(prev => prev.filter(loan => loan.id !== loanToClose));
      
      toast({
        title: "Loan Closed",
        description: "The loan has been moved to Past Clients",
      });
    } catch (error) {
      console.error('Error closing loan:', error);
      toast({
        title: "Error",
        description: "Failed to close loan",
        variant: "destructive"
      });
    } finally {
      setIsCloseDialogOpen(false);
      setLoanToClose(null);
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
          description: `${successCount} lead${successCount > 1 ? 's' : ''} deleted successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }
      
      await loadData();
      setSelectedLeadIds([]);
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (selectedLeadIds.length === 0) return;
    
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => handleUpdate(id, field, value))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} lead${successCount > 1 ? 's' : ''} updated successfully.`,
        });
      }
      
      await loadData();
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error during bulk update:', error);
    }
  };

  const handleViewDetails = (loan: ActiveLoan) => {
    handleRowClick(loan);
  };

  const handleEdit = (loan: ActiveLoan) => {
    handleRowClick(loan);
  };

  // Advanced filter functionality
  const applyAdvancedFilters = (loans: ActiveLoan[]) => {
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
            fieldValue = loan.lender ? `${loan.lender.first_name} ${loan.lender.last_name}`.toLowerCase() : '';
            break;
          case 'loan_amount':
            fieldValue = loan.loan_amount || 0;
            break;
          case 'close_date':
            fieldValue = loan.close_date;
            break;
          default:
            fieldValue = loan[filter.column as keyof ActiveLoan];
        }

        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return fieldValue === filterValue;
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'not_equals':
            return fieldValue !== filterValue;
          case 'greater_than':
            return Number(fieldValue) > Number(filterValue);
          case 'less_than':
            return Number(fieldValue) < Number(filterValue);
          case 'is_after':
            return fieldValue && new Date(fieldValue) > new Date(filterValue);
          case 'is_before':
            return fieldValue && new Date(fieldValue) < new Date(filterValue);
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

  const allColumns = createColumns(
    users, 
    lenders, 
    agents, 
    handleUpdate, 
    handleRowClick, 
    toast,
    (loanId: string) => {
      setLoanToClose(loanId);
      setIsCloseDialogOpen(true);
    }
  );
  
  // Filter columns based on visibility settings
  const columns = visibleColumns
    .map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id))
    .filter((col): col is ColumnDef<ActiveLoan> => col !== undefined);

  // Group loans by pipeline section and apply filters
  const { liveLoans, incomingLoans, onHoldLoans } = useMemo(() => {
    const filteredLoans = applyAdvancedFilters(activeLoans);
    
    const live = filteredLoans.filter(loan => loan.pipeline_section === 'Live' || !loan.pipeline_section);
    const incoming = filteredLoans.filter(loan => loan.pipeline_section === 'Incoming');
    const onHold = filteredLoans.filter(loan => loan.pipeline_section === 'On Hold');
    
    return {
      liveLoans: live,
      incomingLoans: incoming,
      onHoldLoans: onHold
    };
  }, [activeLoans, filters]);

  if (loading) {
    return (
      <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Pipeline</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading active loans...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Active Pipeline</h1>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search active loans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
        
        <Button
          variant={sortLocked ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const newValue = !sortLocked;
            setSortLocked(newValue);
            localStorage.setItem('active-sort-locked', JSON.stringify(newValue));
            toast({
              title: newValue ? "Sort Locked" : "Sort Unlocked",
              description: newValue ? "Loans will stay in creation order" : "You can now sort by any column",
            });
          }}
          title={sortLocked ? "Unlock sorting" : "Lock sorting to creation date"}
        >
          {sortLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </Button>
        
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
                <h4 className="font-medium">Filter Active Loans</h4>
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
          onReorderColumns={reorderColumns}
          onViewSaved={handleViewSaved}
        />
        
        <ViewPills
          views={views}
          activeView={activeView}
          onLoadView={loadView}
          onDeleteView={deleteView}
        />
      </div>

      {/* Filter chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
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

      <div className="space-y-4">
        <CollapsiblePipelineSection
          title="Live"
          data={liveLoans}
          columns={columns}
          searchTerm={searchTerm}
          defaultOpen={true}
          onRowClick={handleRowClick}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onColumnReorder={handleColumnReorder}
          selectable
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          getRowId={(row) => row.id}
        />
        
        <CollapsiblePipelineSection
          title="Incoming"
          data={incomingLoans}
          columns={columns}
          searchTerm={searchTerm}
          defaultOpen={false}
          onRowClick={handleRowClick}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onColumnReorder={handleColumnReorder}
          selectable
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          getRowId={(row) => row.id}
        />
        
        <CollapsiblePipelineSection
          title="On Hold"
          data={onHoldLoans}
          columns={columns}
          searchTerm={searchTerm}
          defaultOpen={false}
          onRowClick={handleRowClick}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onColumnReorder={handleColumnReorder}
          selectable
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          getRowId={(row) => row.id}
        />
      </div>

      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedClient(null);
          }}
          onStageChange={handleStageChange}
          onLeadUpdated={loadData}
          pipelineType="active"
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this loan as closed? It will be moved to the Past Clients tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseLoan}>
              Close Loan
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
                <Button onClick={() => setIsBulkUpdateOpen(true)} size="sm">Update Field</Button>
                <Button onClick={() => setIsBulkDeleteOpen(true)} variant="destructive" size="sm">Delete</Button>
                <Button onClick={() => setSelectedLeadIds([])} variant="outline" size="sm">Clear</Button>
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
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
          { value: 'loan_status', label: 'Loan Status', type: 'select', options: loanStatusOptions },
          { value: 'disclosure_status', label: 'Disclosure Status', type: 'select', options: disclosureStatusOptions },
          { value: 'pr_type', label: 'P/R Type', type: 'select', options: prTypeOptions },
          { value: 'appraisal_status', label: 'Appraisal Status', type: 'select', options: appraisalStatusOptions },
          { value: 'title_status', label: 'Title Status', type: 'select', options: titleStatusOptions },
        ]}
      />
    </div>
  );
}