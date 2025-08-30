import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditLender } from "@/components/ui/inline-edit-lender";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
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
  arrive_loan_number: number | null;
  pr_type: string | null;
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
  buyer_agent_id: string | null;
  listing_agent_id: string | null;
  pipeline_section: string | null;
  buyer_agent?: any;
  lender?: any;
  listing_agent?: any;
  teammate?: any;
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
  { value: "Need Signature", label: "Need Signature" }
];

const loanStatusOptions = [
  { value: "NEW", label: "NEW" },
  { value: "RFP", label: "RFP" },
  { value: "SUV", label: "SUV" },
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
  handleRowClick: (loan: ActiveLoan) => void
): ColumnDef<ActiveLoan>[] => [
  {
    accessorKey: "borrower_name",
    header: "Borrower",
    cell: ({ row }) => (
      <div 
        className="text-sm text-foreground hover:text-warning cursor-pointer transition-colors whitespace-nowrap w-32"
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
    ),
    sortable: true,
  },
  {
    accessorKey: "lender",
    header: "Lender",
    cell: ({ row }) => (
      <InlineEditLender
        value={row.original.lender ? {
          id: row.original.lender.id,
          first_name: row.original.lender.first_name,
          last_name: row.original.lender.last_name,
          company: row.original.lender.company,
          email: row.original.lender.email
        } : null}
        lenders={lenders}
        onValueChange={(lender) => 
          handleUpdate(row.original.id, "lender_id", lender?.id || null)
        }
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "arrive_loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <span className="text-sm font-medium whitespace-nowrap">
        #{row.original.arrive_loan_number || '0'}
      </span>
    ),
    sortable: true,
  },
  {
    accessorKey: "pr_type",
    header: "P/R",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.pr_type}
        options={prTypeOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "pr_type", value)
        }
        showAsStatusBadge
        className="w-12"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "loan_amount",
    header: "Loan Amount",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <InlineEditCurrency
          value={row.original.loan_amount}
          onValueChange={(value) => 
            handleUpdate(row.original.id, "loan_amount", value)
          }
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "disclosure_status",
    header: "DISC",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.disclosure_status}
        options={disclosureStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "disclosure_status", value)
        }
        showAsStatusBadge
        className="w-20"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "close_date",
    header: "Close Date",
    cell: ({ row }) => (
      <InlineEditDate
        value={row.original.close_date}
        onValueChange={(date) => 
          handleUpdate(row.original.id, "close_date", date?.toISOString().split('T')[0] || null)
        }
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "loan_status",
    header: "Loan Status",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.loan_status}
        options={loanStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "loan_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "appraisal_status",
    header: "Appraisal",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.appraisal_status}
        options={appraisalStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "appraisal_status", value)
        }
        showAsStatusBadge
        className="w-20"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "title_status",
    header: "Title",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.title_status}
        options={titleStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "title_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "hoi_status",
    header: "HOI",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.hoi_status}
        options={hoiStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "hoi_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "condo_status",
    header: "Condo",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.condo_status}
        options={condoStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "condo_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "cd_status",
    header: "CD",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.cd_status}
        options={cdStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "cd_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "package_status",
    header: "Package",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.package_status}
        options={packageStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "package_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "lock_expiration_date",
    header: "LOC EXP",
    cell: ({ row }) => (
      <InlineEditDate
        value={row.original.lock_expiration_date}
        onValueChange={(date) => 
          handleUpdate(row.original.id, "lock_expiration_date", date?.toISOString().split('T')[0] || null)
        }
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "ba_status",
    header: "BA",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.ba_status}
        options={baStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "ba_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "epo_status",
    header: "EPO",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.epo_status}
        options={epoStatusOptions}
        onValueChange={(value) => 
          handleUpdate(row.original.id, "epo_status", value)
        }
        showAsStatusBadge
        className="w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "buyer_agent",
    header: "Buyer's Agent",
    cell: ({ row }) => (
      <InlineEditAgent
        value={row.original.buyer_agent ? {
          id: row.original.buyer_agent.id,
          first_name: row.original.buyer_agent.first_name,
          last_name: row.original.buyer_agent.last_name,
          brokerage: row.original.buyer_agent.brokerage,
          email: row.original.buyer_agent.email
        } : null}
        agents={agents}
        onValueChange={(agent) => 
          handleUpdate(row.original.id, "buyer_agent_id", agent?.id || null)
        }
        type="buyer"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "listing_agent",
    header: "Listing Agent",
    cell: ({ row }) => (
      <InlineEditAgent
        value={row.original.listing_agent ? {
          id: row.original.listing_agent.id,
          first_name: row.original.listing_agent.first_name,
          last_name: row.original.listing_agent.last_name,
          brokerage: row.original.listing_agent.brokerage,
          email: row.original.listing_agent.email
        } : null}
        agents={agents}
        onValueChange={(agent) => 
          handleUpdate(row.original.id, "listing_agent_id", agent?.id || null)
        }
        type="listing"
      />
    ),
    sortable: true,
  },
];

// Define initial column configuration
const initialColumns = [
  { id: "borrower_name", label: "Borrower", visible: true },
  { id: "team", label: "Team", visible: true },
  { id: "lender", label: "Lender", visible: true },
  { id: "arrive_loan_number", label: "Loan #", visible: true },
  { id: "pr_type", label: "P/R", visible: true },
  { id: "loan_amount", label: "Loan Amount", visible: true },
  { id: "disclosure_status", label: "DISC", visible: true },
  { id: "close_date", label: "Close Date", visible: true },
  { id: "loan_status", label: "Loan Status", visible: true },
  { id: "appraisal_status", label: "Appraisal", visible: true },
  { id: "title_status", label: "Title", visible: true },
  { id: "hoi_status", label: "HOI", visible: true },
  { id: "condo_status", label: "Condo", visible: true },
  { id: "cd_status", label: "CD", visible: true },
  { id: "package_status", label: "Package", visible: true },
  { id: "lock_expiration_date", label: "LOC EXP", visible: true },
  { id: "ba_status", label: "BA", visible: true },
  { id: "epo_status", label: "EPO", visible: true },
  { id: "buyer_agent", label: "Buyer's Agent", visible: true },
  { id: "listing_agent", label: "Listing Agent", visible: true },
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
  const { toast } = useToast();

  // Column visibility management
  const {
    columns: columnVisibility,
    visibleColumns,
    toggleColumn,
    toggleAll,
    saveView
  } = useColumnVisibility(initialColumns, 'active-pipeline-columns');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loansData, usersData, lendersData, agentsData] = await Promise.all([
        databaseService.getActiveLoans(),
        databaseService.getUsers(),
        databaseService.getLenders(),
        databaseService.getAgents()
      ]);
      
      setActiveLoans(loansData || []);
      setUsers(usersData || []);
      setLenders(lendersData || []);
      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load active loans data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await databaseService.updateLead(id, { [field]: value });
      
      // Update local state optimistically
      setActiveLoans(prev => prev.map(loan => 
        loan.id === id ? { ...loan, [field]: value } : loan
      ));

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
        id: parseInt(loan.id),
        firstName: loan.first_name,
        lastName: loan.last_name,
        email: "", // ActiveLoan doesn't have email, will be empty
        phoneMobile: "" // ActiveLoan doesn't have phone, will be empty
      },
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

  const allColumns = createColumns(users, lenders, agents, handleUpdate, handleRowClick);
  
  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const columns = allColumns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  // Group loans by pipeline section
  const { liveLoans, incomingLoans, onHoldLoans } = useMemo(() => {
    const live = activeLoans.filter(loan => loan.pipeline_section === 'Live' || !loan.pipeline_section);
    const incoming = activeLoans.filter(loan => loan.pipeline_section === 'Incoming');
    const onHold = activeLoans.filter(loan => loan.pipeline_section === 'On Hold');
    
    return {
      liveLoans: live,
      incomingLoans: incoming,
      onHoldLoans: onHold
    };
  }, [activeLoans]);

  if (loading) {
    return (
      <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Pipeline</h1>
          <p className="text-muted-foreground">Track and manage active loans</p>
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
        <p className="text-muted-foreground">Track and manage active loans</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search active loans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <ColumnVisibilityButton
          columns={columnVisibility}
          onColumnToggle={toggleColumn}
          onToggleAll={toggleAll}
          onSaveView={saveView}
        />
      </div>

      <div className="space-y-4">
        <CollapsiblePipelineSection
          title="Live"
          data={liveLoans}
          columns={columns}
          searchTerm={searchTerm}
          defaultOpen={true}
        />
        
        <CollapsiblePipelineSection
          title="Incoming"
          data={incomingLoans}
          columns={columns}
          searchTerm={searchTerm}
          defaultOpen={false}
        />
        
        <CollapsiblePipelineSection
          title="On Hold"
          data={onHoldLoans}
          columns={columns}
          searchTerm={searchTerm}
          defaultOpen={false}
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
          pipelineType="active"
        />
      )}
    </div>
  );
}