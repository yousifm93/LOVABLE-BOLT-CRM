import { useState, useEffect, useMemo } from "react";
import { Search, Filter, X, Pencil } from "lucide-react";
import { useFields } from "@/contexts/FieldsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ButtonFilterBuilder, FilterCondition } from "@/components/ui/button-filter-builder";
import { countActiveFilters } from "@/utils/filterUtils";
// Sheet removed - using inline filters
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
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
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsiblePipelineSection } from "@/components/CollapsiblePipelineSection";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { usePipelineView } from "@/hooks/usePipelineView";

// Main view - streamlined columns (default)
const DEFAULT_MAIN_VIEW_COLUMNS = [
  "borrower_name",
  "team",
  "lender",
  "mb_loan_number",
  "loan_amount",
  "disclosure_status",
  "close_date",
  "loan_status",
  "appraisal_status",
  "title_status",
  "hoi_status",
  "condo_status",
  "cd_status",
  "package_status",
  "lock_expiration_date",
  "ba_status",
  "epo_status",
  "buyer_agent",
  "listing_agent"
];

const MAIN_VIEW_STORAGE_KEY = 'active_main_view_custom';

interface ActiveLoan {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
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
    brokerage?: string;
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
  { value: "Approved", label: "Approved" },
  { value: "N/A", label: "N/A" }
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
  { value: "Signed", label: "Signed" },
  { value: "N/A", label: "N/A" }
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
    header: "BORROWER",
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
    accessorKey: "email",
    header: "EMAIL",
    className: "text-center",
    headerClassName: "text-center",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditText
          value={row.original.email || ""}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "email", value || null)
          }
          placeholder="Email"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "phone",
    header: "PHONE",
    className: "text-center",
    headerClassName: "text-center",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditPhone
          value={row.original.phone || ""}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "phone", value || null)
          }
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "team",
    header: "USER",
    className: "text-center",
    headerClassName: "text-center",
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
    header: "LENDER",
    className: "text-center",
    headerClassName: "text-center",
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
    header: "LOAN #",
    className: "text-center",
    headerClassName: "text-center",
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
      className: "text-center",
      headerClassName: "text-center",
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
      header: "OCCUPANCY",
      className: "text-center",
      headerClassName: "text-center",
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
      header: "LOAN AMT",
      className: "text-center",
      headerClassName: "text-center",
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
      header: "SALES PRICE",
      className: "text-center",
      headerClassName: "text-center",
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
    className: "text-center",
    headerClassName: "text-center",
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
    header: "CLOSE DATE",
    className: "text-center",
    headerClassName: "text-center",
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
    header: "LOAN STATUS",
    className: "text-center",
    headerClassName: "text-center",
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
    header: "APPRAISAL",
    className: "text-center",
    headerClassName: "text-center",
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
    header: "TITLE",
    className: "text-center",
    headerClassName: "text-center",
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
    className: "text-center",
    headerClassName: "text-center",
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
    header: "CONDO",
    className: "text-center",
    headerClassName: "text-center",
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
    className: "text-center",
    headerClassName: "text-center",
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
    header: "PACKAGE",
    className: "text-center",
    headerClassName: "text-center",
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
    header: "LOCK EXP",
    className: "text-center",
    headerClassName: "text-center",
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
    className: "text-center",
    headerClassName: "text-center",
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
    className: "text-center",
    headerClassName: "text-center",
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
    header: "BUYER'S AGENT",
    className: "text-center",
    headerClassName: "text-center",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditAgent
          value={row.original.buyer_agent ? {
            id: row.original.buyer_agent.id,
            first_name: row.original.buyer_agent.first_name,
            last_name: row.original.buyer_agent.last_name,
            brokerage: row.original.buyer_agent.brokerage,
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
    header: "LISTING AGENT",
    className: "text-center",
    headerClassName: "text-center",
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
          onValueChange={async (agent) => 
            await handleUpdate(row.original.id, "listing_agent_id", agent?.id ?? null)
          }
          type="listing"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "is_closed",
    header: "CLOSED",
    className: "text-center",
    headerClassName: "text-center",
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

export default function Active() {
  const { allFields } = useFields();
  const { columnOrder: savedColumnOrder, columnWidths: savedColumnWidths, loading: viewLoading } = usePipelineView('active');
  
  // Use saved view column order if available, otherwise fallback to defaults
  const defaultColumns = savedColumnOrder.length > 0 ? savedColumnOrder : DEFAULT_MAIN_VIEW_COLUMNS;
  
  // Core columns that should appear first with default visibility
  const coreColumns = useMemo(() => {
    // Map saved column order with proper labels and widths
    return defaultColumns.map(id => {
      const width = savedColumnWidths[id] || 150;
      // Find label from existing mapping or use uppercase ID
      const existingMapping: Record<string, string> = {
        "borrower_name": "BORROWER",
        "email": "EMAIL",
        "phone": "PHONE",
        "team": "USER",
        "lender": "LENDER",
        "mb_loan_number": "LOAN #",
        "lender_loan_number": "LENDER LOAN #",
        "loan_amount": "LOAN AMT",
        "sales_price": "SALES PRICE",
        "disclosure_status": "DISC",
        "close_date": "CLOSE DATE",
        "loan_status": "LOAN STATUS",
        "appraisal_status": "APPRAISAL",
        "title_status": "TITLE",
        "hoi_status": "HOI",
        "condo_status": "CONDO",
        "cd_status": "CD",
        "package_status": "PACKAGE",
        "lock_expiration_date": "LOCK EXP",
        "ba_status": "BA",
        "epo_status": "EPO",
        "buyer_agent": "BUYER'S AGENT",
        "listing_agent": "LISTING AGENT",
        "pr_type": "P/R",
        "occupancy": "OCCUPANCY",
        "is_closed": "CLOSED",
      };
      
      const label = existingMapping[id] || id.toUpperCase().replace(/_/g, ' ');
      const visible = defaultColumns.includes(id);
      
      return { id, label, visible, width };
    });
  }, [defaultColumns, savedColumnWidths]);
  
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
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [loanToClose, setLoanToClose] = useState<string | null>(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isEditMainViewOpen, setIsEditMainViewOpen] = useState(false);
  
  const { toast } = useToast();

  // Custom main view columns (editable)
  const [mainViewColumns, setMainViewColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(MAIN_VIEW_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_MAIN_VIEW_COLUMNS;
      }
    }
    return DEFAULT_MAIN_VIEW_COLUMNS;
  });

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
  } = useColumnVisibility(allAvailableColumns, 'active-pipeline-columns', 'active');

  const handleViewSaved = (viewName: string) => {
    toast({
      title: "View Saved",
      description: `"${viewName}" has been saved successfully`,
    });
    loadView(viewName);
  };

  // Auto-load Main View on initial mount
  useEffect(() => {
    const hasCustomization = localStorage.getItem('active-pipeline-columns');
    const existingViews = views;
    
    // Check if "Main View" exists in saved views
    const hasMainView = existingViews.some(v => v.name === "Main View");
    
    // If no Main View exists, create it with the new default configuration
    if (!hasMainView) {
      const orderedMainColumns = DEFAULT_MAIN_VIEW_COLUMNS
        .map(id => columnVisibility.find(col => col.id === id))
        .filter((col): col is { id: string; label: string; visible: boolean } => col !== undefined)
        .map(col => ({ ...col, visible: true }));
      
      const existingMainIds = new Set(DEFAULT_MAIN_VIEW_COLUMNS);
      const remainingColumns = columnVisibility
        .filter(col => !existingMainIds.has(col.id))
        .map(col => ({ ...col, visible: false }));
      
      const mainViewColumnOrder = [...orderedMainColumns, ...remainingColumns];
      
      // Temporarily set columns and save as "Main View"
      setColumns(mainViewColumnOrder);
      setTimeout(() => {
        saveView("Main View");
        setActiveView("Main View");
      }, 100);
    }
    
    // If Main View exists and no active view is set, load Main View
    if (!activeView && hasMainView && !hasCustomization) {
      loadView("Main View");
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

  // Filter configuration with proper types and options
  const filterColumns = [
    { value: 'first_name', label: 'First Name', type: 'text' as const },
    { value: 'last_name', label: 'Last Name', type: 'text' as const },
    { value: 'mb_loan_number', label: 'Loan Number', type: 'text' as const },
    { value: 'pr_type', label: 'P/R', type: 'select' as const, options: prTypeOptions.map(o => o.value) },
    { value: 'disclosure_status', label: 'Disclosure Status', type: 'select' as const, options: disclosureStatusOptions.map(o => o.value) },
    { value: 'loan_status', label: 'Loan Status', type: 'select' as const, options: loanStatusOptions.map(o => o.value) },
    { value: 'appraisal_status', label: 'Appraisal Status', type: 'select' as const, options: appraisalStatusOptions.map(o => o.value) },
    { value: 'title_status', label: 'Title Status', type: 'select' as const, options: titleStatusOptions.map(o => o.value) },
    { value: 'hoi_status', label: 'HOI Status', type: 'select' as const, options: hoiStatusOptions.map(o => o.value) },
    { value: 'condo_status', label: 'Condo Status', type: 'select' as const, options: condoStatusOptions.map(o => o.value) },
    { value: 'cd_status', label: 'CD Status', type: 'select' as const, options: cdStatusOptions.map(o => o.value) },
    { value: 'package_status', label: 'Package Status', type: 'select' as const, options: packageStatusOptions.map(o => o.value) },
    { value: 'ba_status', label: 'BA Status', type: 'select' as const, options: baStatusOptions.map(o => o.value) },
    { value: 'epo_status', label: 'EPO Status', type: 'select' as const, options: epoStatusOptions.map(o => o.value) },
    { value: 'loan_amount', label: 'Loan Amount', type: 'number' as const },
    { value: 'close_date', label: 'Close Date', type: 'date' as const },
    { value: 'lock_expiration_date', label: 'Lock Expiration', type: 'date' as const },
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
        databaseService.getAgents()
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
      
      // Automation: When SUB, AWC, or CTC, move from Incoming to Live
      if (field === 'loan_status' && ['SUB', 'AWC', 'CTC'].includes(value?.toUpperCase())) {
        const currentLoan = activeLoans.find(loan => loan.id === id);
        if (currentLoan?.pipeline_section === 'Incoming') {
          updateData.pipeline_section = 'Live';
          toast({
            title: "Moved to Live",
            description: "Loan moved from Incoming to Live section",
          });
        }
      }
      
      // Automation: When NEW or RFP, move from Live/On Hold back to Incoming (case-insensitive)
      if (field === 'loan_status' && (value?.toUpperCase() === 'NEW' || value?.toUpperCase() === 'RFP')) {
        const currentLoan = activeLoans.find(loan => loan.id === id);
        if (currentLoan?.pipeline_section === 'Live' || currentLoan?.pipeline_section === 'On Hold') {
          updateData.pipeline_section = 'Incoming';
          toast({
            title: "Moved to Incoming",
            description: "Loan moved back to Incoming section",
          });
        }
      }
      
      // Handle notes field (typically edited in drawer)
      if (field === 'notes') {
        // Just pass through - notes are saved via drawer
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

  const handleRowClick = async (loan: ActiveLoan) => {
    try {
      const dbLead = await databaseService.getLeadByIdWithEmbeds(loan.id);
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
          variant={isFilterOpen ? "default" : "outline"} 
          size="sm"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter {countActiveFilters(filters) > 0 && `(${countActiveFilters(filters)})`}
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
            const orderedMainColumns = mainViewColumns
              .map(id => columnVisibility.find(col => col.id === id))
              .filter((col): col is { id: string; label: string; visible: boolean } => col !== undefined)
              .map(col => ({ ...col, visible: true }));
            
            const existingIds = new Set(mainViewColumns);
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditMainViewOpen(true)}
          className="h-8 px-2"
          title="Edit Main View"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>

      {/* Inline Filter Section */}
      {isFilterOpen && (
        <div className="mb-4">
          <ButtonFilterBuilder
            filters={filters}
            columns={filterColumns}
            onFiltersChange={setFilters}
          />
        </div>
      )}

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
          showRowNumbers={true}
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
          showRowNumbers={true}
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
          showRowNumbers={true}
        />
      </div>

      {/* Sum Row Footer */}
      <Card className="mt-4 border-primary bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              Total Active Pipeline
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Volume</div>
                <div className="text-lg font-bold text-foreground">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    activeLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0)
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Units</div>
                <div className="text-lg font-bold text-foreground">
                  {activeLoans.length}
                </div>
              </div>
            </div>
          </div>
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

      <AlertDialog open={isEditMainViewOpen} onOpenChange={setIsEditMainViewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Main View</AlertDialogTitle>
            <AlertDialogDescription>
              Update the Main view to show your currently visible columns ({visibleColumns.length} columns), 
              or reset to the factory default ({DEFAULT_MAIN_VIEW_COLUMNS.length} columns).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">Currently visible columns:</p>
            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
              {visibleColumns.map(col => (
                <Badge key={col.id} variant="secondary" className="text-xs">{col.label}</Badge>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => {
                setMainViewColumns(DEFAULT_MAIN_VIEW_COLUMNS);
                localStorage.removeItem(MAIN_VIEW_STORAGE_KEY);
                
                toast({
                  title: "Main View Reset",
                  description: "Main view restored to factory default"
                });
                
                setIsEditMainViewOpen(false);
              }}
            >
              Reset to Default
            </Button>
            <AlertDialogAction 
              onClick={() => {
                const currentVisibleColumns = columnVisibility
                  .filter(col => col.visible)
                  .map(col => col.id);
                
                setMainViewColumns(currentVisibleColumns);
                localStorage.setItem(MAIN_VIEW_STORAGE_KEY, JSON.stringify(currentVisibleColumns));
                
                toast({
                  title: "Main View Updated",
                  description: `Main view now shows ${currentVisibleColumns.length} columns`
                });
                
                setIsEditMainViewOpen(false);
              }}
            >
              Update Main View
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}