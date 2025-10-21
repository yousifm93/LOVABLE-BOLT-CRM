import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercentage, formatDate, formatBoolean, formatPhone } from "@/utils/formatters";

// Display type for table rows
type DisplayLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  loanAmount: string;
  creditScore: number;
  incomeType: string;
  screeningDate: string;
  nextStep: string;
  priority: "High" | "Medium" | "Low";
};

// ALL 71 Fields - Screening stage shows all fields
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
  { id: "income_type", label: "Income Type", visible: true },
  { id: "reo", label: "REO", visible: false },
  { id: "property_type", label: "Property Type", visible: true },
  { id: "occupancy", label: "Occupancy", visible: false },
  { id: "borrower_current_address", label: "Current Address", visible: false },
  { id: "own_rent_current_address", label: "Own/Rent", visible: false },
  { id: "time_at_current_address_years", label: "Years at Address", visible: false },
  { id: "time_at_current_address_months", label: "Months at Address", visible: false },
  { id: "military_veteran", label: "Military/Veteran", visible: false },
  { id: "dob", label: "Date of Birth", visible: false },
  { id: "estimated_fico", label: "Estimated FICO", visible: true },
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
  { id: "interest_rate", label: "Interest Rate", visible: false },
  { id: "piti", label: "PITI", visible: false },
  { id: "program", label: "Program", visible: false },
  { id: "total_monthly_income", label: "Monthly Income", visible: false },
  { id: "escrows", label: "Escrows", visible: false },
  { id: "dti", label: "DTI", visible: true },
  { id: "close_date", label: "Close Date", visible: false },
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

export default function Screening() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<DatabaseLead[]>([]);
  const [loading, setLoading] = useState(true);

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
    deleteView
  } = useColumnVisibility(initialColumns, 'screening-columns');

  // Load leads from database filtered by Screening pipeline stage
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
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
  }, [toast]);

  const handleRowClick = (lead: DatabaseLead) => {
    const crmClient: CRMClient = {
      person: {
        id: Date.now(),
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email || '',
        phoneMobile: lead.phone || ''
      },
      databaseId: lead.id,
      loan: {
        loanAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : "$0",
        loanType: lead.loan_type || "Purchase",
        prType: "Primary Residence"
      },
      ops: {
        status: lead.status || "Screening",
        stage: "screening",
        priority: "Medium",
        referralSource: lead.referral_source || "N/A"
      },
      dates: {
        createdOn: new Date(lead.created_at).toLocaleDateString()
      },
      meta: {},
      name: `${lead.first_name} ${lead.last_name}`
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  // Transform leads to use directly with inline editing (no DisplayLead needed)
  const allColumns: ColumnDef<DatabaseLead>[] = [
    {
      accessorKey: "first_name",
      header: "First Name",
      sortable: true,
      cell: ({ row }) => (
        <span 
          className="cursor-pointer hover:text-primary transition-colors font-medium"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row.original);
          }}
        >
          {row.original.first_name} {row.original.last_name}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div className="flex items-center text-sm">
          <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
          {formatPhone(row.original.phone)}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center text-sm truncate max-w-[200px]">
          <Mail className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{row.original.email || '—'}</span>
        </div>
      ),
    },
    {
      accessorKey: "loan_type",
      header: "Loan Type",
      sortable: true,
      cell: ({ row }) => row.original.loan_type || '—',
    },
    {
      accessorKey: "income_type",
      header: "Income Type",
      cell: ({ row }) => row.original.income_type || '—',
    },
    {
      accessorKey: "property_type",
      header: "Property Type",
      cell: ({ row }) => row.original.property_type || '—',
    },
    {
      accessorKey: "estimated_fico",
      header: "FICO",
      sortable: true,
      cell: ({ row }) => (
        <span className={`font-medium ${
          (row.original.estimated_fico || 0) >= 740 ? 'text-success' : 
          (row.original.estimated_fico || 0) >= 670 ? 'text-warning' : 'text-destructive'
        }`}>
          {row.original.estimated_fico || '—'}
        </span>
      ),
    },
    {
      accessorKey: "loan_amount",
      header: "Loan Amount",
      sortable: true,
      cell: ({ row }) => formatCurrency(row.original.loan_amount),
    },
    {
      accessorKey: "dti",
      header: "DTI",
      sortable: true,
      cell: ({ row }) => formatPercentage(row.original.dti),
    },
    // Additional fields available but hidden by default (shown via column visibility)
    {
      accessorKey: "middle_name",
      header: "Middle Name",
      cell: ({ row }) => row.original.middle_name || '—',
    },
    {
      accessorKey: "monthly_pmt_goal",
      header: "Monthly Pmt Goal",
      cell: ({ row }) => formatCurrency(row.original.monthly_pmt_goal),
    },
    {
      accessorKey: "cash_to_close_goal",
      header: "Cash to Close Goal",
      cell: ({ row }) => formatCurrency(row.original.cash_to_close_goal),
    },
    {
      accessorKey: "reo",
      header: "REO",
      cell: ({ row }) => formatBoolean(row.original.reo),
    },
    {
      accessorKey: "sales_price",
      header: "Sales Price",
      cell: ({ row }) => formatCurrency(row.original.sales_price),
    },
    {
      accessorKey: "down_pmt",
      header: "Down Payment",
      cell: ({ row }) => row.original.down_pmt || '—',
    },
    {
      accessorKey: "term",
      header: "Term",
      cell: ({ row }) => row.original.term ? `${row.original.term} yrs` : '—',
    },
    {
      accessorKey: "monthly_liabilities",
      header: "Liabilities",
      cell: ({ row }) => formatCurrency(row.original.monthly_liabilities),
    },
    {
      accessorKey: "assets",
      header: "Assets",
      cell: ({ row }) => formatCurrency(row.original.assets),
    },
    {
      accessorKey: "dob",
      header: "DOB",
      cell: ({ row }) => formatDate(row.original.dob),
    },
    {
      accessorKey: "interest_rate",
      header: "Rate",
      cell: ({ row }) => formatPercentage(row.original.interest_rate),
    },
    {
      accessorKey: "piti",
      header: "PITI",
      cell: ({ row }) => formatCurrency(row.original.piti),
    },
    {
      accessorKey: "close_date",
      header: "Close Date",
      cell: ({ row }) => formatDate(row.original.close_date),
    },
  ];

  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const columns = allColumns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Screening</h1>
          <p className="text-xs italic text-muted-foreground/70">Initial verification and qualification</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Screening Clients ({leads.length})</CardTitle>
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
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            
            <ColumnVisibilityButton
              columns={columnVisibility}
              onColumnToggle={toggleColumn}
              onToggleAll={toggleAll}
              onSaveView={saveView}
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
            columns={columns}
            data={leads}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
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
    </div>
  );
}
