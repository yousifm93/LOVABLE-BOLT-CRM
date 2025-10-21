import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, CheckCircle } from "lucide-react";
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

// Display type for table rows
type DisplayLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  loanAmount: string;
  qualifiedAmount: string;
  creditScore: number;
  dti: number;
  qualifiedDate: string;
  expirationDate: string;
  loanOfficer: string;
};

// ALL 71 Fields - PreQualified shows all fields
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
  { id: "loan_amount", label: "Qualified Amount", visible: true },
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
  { id: "search_stage", label: "Search Stage", visible: true },
];

export default function PreQualified() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<DatabaseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

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
  } = useColumnVisibility(initialColumns, 'pre-qualified-columns');

  // Load leads from database filtered by Pre-Qualified pipeline stage
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
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
        status: lead.status || "Pre-Qualified",
        stage: "pre-qualified",
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

  // Transform leads to display format
  const displayData: DisplayLead[] = leads.map(lead => ({
    id: lead.id,
    name: `${lead.first_name} ${lead.last_name}`,
    email: lead.email || '',
    phone: lead.phone || '',
    loanType: lead.loan_type || 'Purchase',
    status: lead.status || 'Pre-Qualified',
    loanAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '$0',
    qualifiedAmount: lead.loan_amount ? `$${(lead.loan_amount * 0.95).toLocaleString()}` : '$0',
    creditScore: 750,
    dti: 30,
    qualifiedDate: new Date(lead.created_at).toLocaleDateString(),
    expirationDate: new Date(new Date(lead.created_at).setMonth(new Date(lead.created_at).getMonth() + 3)).toLocaleDateString(),
    loanOfficer: 'Team'
  }));

  const allColumns: ColumnDef<DisplayLead>[] = [
    {
      accessorKey: "name",
      header: "Client Name",
      sortable: true,
      cell: ({ row }) => (
        <span 
          className="cursor-pointer hover:text-primary transition-colors"
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
      accessorKey: "qualifiedAmount",
      header: "Qualified Amount",
      cell: ({ row }) => (
        <span className="font-medium text-success">
          {row.original.qualifiedAmount}
        </span>
      ),
      sortable: true,
    },
    {
      accessorKey: "creditScore",
      header: "Credit Score",
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.creditScore >= 750 
            ? 'text-success' 
            : row.original.creditScore >= 700 
            ? 'text-warning' 
            : 'text-destructive'
        }`}>
          {row.original.creditScore}
        </span>
      ),
      sortable: true,
    },
    {
      accessorKey: "dti",
      header: "DTI",
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.dti <= 36 
            ? 'text-success' 
            : row.original.dti <= 43 
            ? 'text-warning' 
            : 'text-destructive'
        }`}>
          {row.original.dti}%
        </span>
      ),
      sortable: true,
    },
    {
      accessorKey: "loanOfficer",
      header: "Loan Officer",
      sortable: true,
    },
    {
      accessorKey: "qualifiedDate",
      header: "Qualified Date",
      sortable: true,
    },
    {
      accessorKey: "expirationDate",
      header: "Expires",
      cell: ({ row }) => {
        const expDate = new Date(row.original.expirationDate);
        const daysUntilExpiry = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        const isExpired = daysUntilExpiry <= 0;
        
        return (
          <span className={`text-sm ${
            isExpired ? 'text-destructive font-medium' : 
            isExpiringSoon ? 'text-warning font-medium' : 
            'text-muted-foreground'
          }`}>
            {row.original.expirationDate}
            {isExpiringSoon && ` (${daysUntilExpiry}d)`}
            {isExpired && ' (Expired)'}
          </span>
        );
      },
      sortable: true,
    },
  ];

  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const columns = allColumns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pre-Qualified</h1>
          <p className="text-xs italic text-muted-foreground/70">Clients with conditional approval</p>
        </div>
      </div>

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
            data={displayData}
            searchTerm={searchTerm}
            onRowClick={(row) => {
              const lead = leads.find(l => l.id === row.id);
              if (lead) handleRowClick(lead);
            }}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
    </div>
  );
}
