import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { transformPastClientToClient } from "@/utils/clientTransform";

interface PastClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  loanAmount: string;
  interestRate: number;
  creditScore: number;
  closingDate: string;
  loanOfficer: string;
  satisfaction: number;
  referrals: number;
  lastContact: string;
}

const pastClientsData: PastClient[] = [
  {
    id: 1,
    name: "Robert Johnson",
    email: "robert.j@email.com",
    phone: "(555) 123-9999",
    loanType: "Purchase",
    status: "Closed",
    loanAmount: "$425,000",
    interestRate: 6.25,
    creditScore: 775,
    closingDate: "2023-12-15",
    loanOfficer: "Sarah Wilson",
    satisfaction: 5,
    referrals: 2,
    lastContact: "2024-01-10"
  },
  {
    id: 2,
    name: "Maria Garcia",
    email: "maria.g@email.com",
    phone: "(555) 456-7777",
    loanType: "Refinance",
    status: "Closed",
    loanAmount: "$385,000",
    interestRate: 5.95,
    creditScore: 790,
    closingDate: "2023-11-30",
    loanOfficer: "Mike Davis",
    satisfaction: 5,
    referrals: 1,
    lastContact: "2023-12-20"
  },
  {
    id: 3,
    name: "David Thompson",
    email: "david.t@email.com",
    phone: "(555) 789-5555",
    loanType: "Purchase",
    status: "Closed",
    loanAmount: "$550,000",
    interestRate: 6.50,
    creditScore: 785,
    closingDate: "2023-10-25",
    loanOfficer: "Emily Chen",
    satisfaction: 4,
    referrals: 0,
    lastContact: "2023-11-15"
  }
];

const columns: ColumnDef<PastClient>[] = [
  {
    accessorKey: "name",
    header: "Client Name",
    sortable: true,
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 whitespace-nowrap overflow-hidden text-ellipsis">
        <div className="flex items-center text-sm">
          <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
          <span className="truncate">{row.original.email}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="h-3 w-3 mr-1" />
          <span className="truncate">{row.original.phone}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "loanType",
    header: "Loan Type",
    sortable: true,
  },
  {
    accessorKey: "loanAmount",
    header: "Loan Amount",
    sortable: true,
    cell: ({ row }) => (
      <div className="font-medium">{row.original.loanAmount}</div>
    ),
  },
  {
    accessorKey: "interestRate",
    header: "Rate",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.interestRate}%</span>
    ),
    sortable: true,
  },
  {
    accessorKey: "closingDate",
    header: "Closing Date",
    sortable: true,
  },
  {
    accessorKey: "satisfaction",
    header: "Satisfaction",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span className="text-lg">{'★'.repeat(row.original.satisfaction)}</span>
        <span className="text-sm text-muted-foreground">({row.original.satisfaction}/5)</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "referrals",
    header: "Referrals",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3 text-success" />
        <span className="font-medium text-success">{row.original.referrals}</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "loanOfficer",
    header: "Loan Officer",
    sortable: true,
  },
  {
    accessorKey: "lastContact",
    header: "Last Contact",
    sortable: true,
  },
];

// ALL 71 Fields - PastClients shows all fields
const initialColumns = [
  // LEAD Fields (1-10)
  { id: "first_name", label: "First Name", visible: true },
  { id: "middle_name", label: "Middle Name", visible: false },
  { id: "last_name", label: "Last Name", visible: true },
  { id: "phone", label: "Phone", visible: true },
  { id: "email", label: "Email", visible: true },
  { id: "referred_via", label: "Referral Method", visible: false },
  { id: "referral_source", label: "Referral Source", visible: false },
  { id: "converted", label: "Lead Status", visible: false },
  { id: "monthly_pmt_goal", label: "Monthly Pmt Goal", visible: false },
  { id: "cash_to_close_goal", label: "Cash to Close Goal", visible: false },
  
  // APP COMPLETE Fields (11-34)
  { id: "loan_type", label: "Loan Type", visible: true },
  { id: "income_type", label: "Income Type", visible: false },
  { id: "reo", label: "REO", visible: false },
  { id: "property_type", label: "Property Type", visible: false },
  { id: "occupancy", label: "Occupancy", visible: false },
  { id: "borrower_current_address", label: "Current Address", visible: false },
  { id: "own_rent_current_address", label: "Own/Rent", visible: false },
  { id: "time_at_current_address_years", label: "Years at Address", visible: false },
  { id: "time_at_current_address_months", label: "Months at Address", visible: false },
  { id: "military_veteran", label: "Military/Veteran", visible: false },
  { id: "dob", label: "Date of Birth", visible: false },
  { id: "estimated_fico", label: "Credit Score", visible: true },
  { id: "loan_amount", label: "Loan Amount", visible: true },
  { id: "sales_price", label: "Sales Price", visible: false },
  { id: "down_pmt", label: "Down Payment", visible: false },
  { id: "term", label: "Term", visible: false },
  { id: "monthly_liabilities", label: "Liabilities", visible: false },
  { id: "assets", label: "Assets", visible: false },
  { id: "subject_address_1", label: "Subject Addr 1", visible: false },
  { id: "subject_address_2", label: "Subject Addr 2", visible: false },
  { id: "subject_city", label: "Subject City", visible: false },
  { id: "subject_state", label: "Subject State", visible: false },
  { id: "subject_zip", label: "Subject Zip", visible: false },
  { id: "arrive_loan_number", label: "Loan #", visible: false },
  
  // APP REVIEW Fields (35-45)
  { id: "interest_rate", label: "Interest Rate", visible: true },
  { id: "piti", label: "PITI", visible: false },
  { id: "program", label: "Program", visible: false },
  { id: "total_monthly_income", label: "Monthly Income", visible: false },
  { id: "escrows", label: "Escrows", visible: false },
  { id: "dti", label: "DTI", visible: false },
  { id: "close_date", label: "Close Date", visible: true },
  { id: "principal_interest", label: "P&I", visible: false },
  { id: "property_taxes", label: "Taxes", visible: false },
  { id: "homeowners_insurance", label: "HOI", visible: false },
  { id: "mortgage_insurance", label: "MI", visible: false },
  { id: "hoa_dues", label: "HOA", visible: false },
  
  // ACTIVE Fields (46-73)
  { id: "disclosure_status", label: "Disclosures", visible: false },
  { id: "loan_status", label: "Loan Status", visible: false },
  { id: "appraisal_status", label: "Appraisal", visible: false },
  { id: "title_status", label: "Title", visible: false },
  { id: "hoi_status", label: "HOI Status", visible: false },
  { id: "mi_status", label: "MI Status", visible: false },
  { id: "condo_status", label: "Condo", visible: false },
  { id: "cd_status", label: "CD", visible: false },
  { id: "package_status", label: "Package", visible: false },
  { id: "lock_expiration_date", label: "Lock Exp", visible: false },
  { id: "ba_status", label: "BA", visible: false },
  { id: "epo_status", label: "EPO", visible: false },
  { id: "lender_id", label: "Lender", visible: false },
  { id: "title_eta", label: "Title ETA", visible: false },
  { id: "appr_date_time", label: "Appr Date/Time", visible: false },
  { id: "appr_eta", label: "Appr ETA", visible: false },
  { id: "appraisal_value", label: "Appr Value", visible: false },
  { id: "fin_cont", label: "Fin Contingency", visible: false },
  { id: "les_file", label: "LES File", visible: false },
  { id: "contract_file", label: "Contract", visible: false },
  { id: "initial_approval_file", label: "Initial Approval", visible: false },
  { id: "disc_file", label: "Disc File", visible: false },
  { id: "appraisal_file", label: "Appr File", visible: false },
  { id: "insurance_file", label: "Insurance", visible: false },
  { id: "icd_file", label: "ICD", visible: false },
  { id: "fcp_file", label: "FCP", visible: false },
  { id: "search_stage", label: "Search Stage", visible: false },
];

export default function PastClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
  } = useColumnVisibility(initialColumns, 'past-clients-columns');

  const handleRowClick = (client: PastClient) => {
    const crmClient = transformPastClientToClient(client);
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Client ${clientId} moved to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const filteredColumns = columns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Past Clients</h1>
          <p className="text-xs italic text-muted-foreground/70">Previously completed loans and client history</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Closed Loans & Client History</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search past clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            
            <ColumnVisibilityButton
              columns={columnVisibility}
              onColumnToggle={toggleColumn}
              onToggleAll={toggleAll}
              onSaveView={saveView}
              onReorderColumns={reorderColumns}
            />
            
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
            columns={filteredColumns}
            data={pastClientsData}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onStageChange={handleStageChange}
          pipelineType="past-clients"
        />
      )}
    </div>
  );
}