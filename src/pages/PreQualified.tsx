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
import { formatCurrency, formatPercentage, formatDateTime } from "@/utils/formatters";
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

type DisplayLead = {
  id: string;
  name: string;
  preQualifiedOn: string;
  phone: string;
  email: string;
  realEstateAgent: string;
  status: string;
  loanNumber: string;
  fico: number;
  dti: number | null;
  loanAmount: number | null;
  salesPrice: number | null;
  user: string;
  loanType: string;
};

// PRE-QUALIFIED columns - 12 columns from Excel
const initialColumns = [
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
  // Additional fields available
  { id: "loanType", label: "Loan Type", visible: false },
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
    preQualifiedOn: lead.pre_qualified_at || lead.created_at,
    phone: lead.phone || '',
    email: lead.email || '',
    realEstateAgent: '—', // TODO: JOIN
    status: lead.status || 'Pre-Qualified',
    loanNumber: lead.arrive_loan_number?.toString() || '—',
    fico: lead.estimated_fico || 0,
    dti: lead.dti || 0,
    loanAmount: lead.loan_amount || 0,
    salesPrice: lead.sales_price || 0,
    user: '—', // TODO: JOIN
    loanType: lead.loan_type || '',
  }));

  const allColumns: ColumnDef<DisplayLead>[] = [
    {
      accessorKey: "name",
      header: "Full Name",
      sortable: true,
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
      cell: ({ row }) => formatDateTime(row.original.preQualifiedOn),
      sortable: true,
    },
    {
      accessorKey: "phone",
      header: "Lead Phone",
      cell: ({ row }) => row.original.phone || '—',
      sortable: true,
    },
    {
      accessorKey: "email",
      header: "Lead Email",
      cell: ({ row }) => row.original.email || '—',
      sortable: true,
    },
    {
      accessorKey: "realEstateAgent",
      header: "Real Estate Agent",
      cell: ({ row }) => row.original.realEstateAgent,
      sortable: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      sortable: true,
    },
    {
      accessorKey: "loanNumber",
      header: "Loan Number",
      cell: ({ row }) => row.original.loanNumber,
      sortable: true,
    },
    {
      accessorKey: "fico",
      header: "FICO",
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.fico >= 750 ? 'text-success' : 
          row.original.fico >= 700 ? 'text-warning' : 'text-destructive'
        }`}>
          {row.original.fico || '—'}
        </span>
      ),
      sortable: true,
    },
    {
      accessorKey: "dti",
      header: "DTI",
      cell: ({ row }) => formatPercentage(row.original.dti),
      sortable: true,
    },
    {
      accessorKey: "loanAmount",
      header: "Loan Amount",
      cell: ({ row }) => formatCurrency(row.original.loanAmount),
      sortable: true,
    },
    {
      accessorKey: "salesPrice",
      header: "Sales Price",
      cell: ({ row }) => formatCurrency(row.original.salesPrice),
      sortable: true,
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => row.original.user,
      sortable: true,
    },
    {
      accessorKey: "loanType",
      header: "Loan Type",
      cell: ({ row }) => row.original.loanType || '—',
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
