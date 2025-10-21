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

// Define initial column configuration
const initialColumns = [
  { id: "name", label: "Client Name", visible: true },
  { id: "contact", label: "Contact", visible: true },
  { id: "loanType", label: "Loan Type", visible: true },
  { id: "loanAmount", label: "Loan Amount", visible: true },
  { id: "incomeType", label: "Income Type", visible: true },
  { id: "creditScore", label: "Credit Score", visible: true },
  { id: "priority", label: "Priority", visible: true },
  { id: "nextStep", label: "Next Step", visible: true },
  { id: "screeningDate", label: "Screening Date", visible: true },
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
  useEffect(() => {
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

  // Transform leads to display format
  const displayData: DisplayLead[] = leads.map(lead => ({
    id: lead.id,
    name: `${lead.first_name} ${lead.last_name}`,
    email: lead.email || '',
    phone: lead.phone || '',
    loanType: lead.loan_type || 'Purchase',
    status: lead.status || 'Screening',
    loanAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '$0',
    creditScore: 725,
    incomeType: 'W2',
    screeningDate: new Date(lead.created_at).toLocaleDateString(),
    nextStep: 'Income Verification',
    priority: 'Medium' as const
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
      accessorKey: "loanAmount",
      header: "Loan Amount",
      sortable: true,
    },
    {
      accessorKey: "incomeType",
      header: "Income Type",
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
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
      sortable: true,
    },
    {
      accessorKey: "nextStep",
      header: "Next Step",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.original.nextStep}</span>
        </div>
      ),
    },
    {
      accessorKey: "screeningDate",
      header: "Screening Date",
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
            data={displayData}
            searchTerm={searchTerm}
            onRowClick={(row) => {
              const lead = leads.find(l => l.id === row.id);
              if (lead) handleRowClick(lead);
            }}
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
        />
      )}
    </div>
  );
}
