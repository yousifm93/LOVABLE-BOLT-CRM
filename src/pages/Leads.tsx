import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  loanAmount: string;
  creditScore: number;
  created: string;
  lastContact: string;
  leadOnDate?: string;
  buyersAgent?: string;
  referredVia?: string;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  teammateAssigned?: string;
}

// Transform database lead to display format
const transformLeadToDisplay = (dbLead: DatabaseLead & { teammate?: any, buyer_agent?: any }): Lead => ({
  id: parseInt(dbLead.id),
  name: `${dbLead.first_name} ${dbLead.last_name}`,
  email: dbLead.email || '',
  phone: dbLead.phone || '',
  source: dbLead.source || 'Unknown',
  status: dbLead.status || 'Working on it',
  loanAmount: dbLead.loan_amount ? `$${dbLead.loan_amount.toLocaleString()}` : '$0',
  creditScore: 750, // TODO: Add credit score to database
  created: new Date(dbLead.created_at).toLocaleDateString(),
  lastContact: new Date(dbLead.created_at).toLocaleDateString(),
  leadOnDate: new Date(dbLead.lead_on_date).toLocaleDateString(),
  buyersAgent: dbLead.buyer_agent ? `${dbLead.buyer_agent.first_name} ${dbLead.buyer_agent.last_name}` : '',
  referredVia: dbLead.referred_via || '',
  lastFollowUpDate: '', // TODO: Calculate from activities
  nextFollowUpDate: '', // TODO: Calculate from tasks
  teammateAssigned: dbLead.teammate ? `${dbLead.teammate.first_name} ${dbLead.teammate.last_name}` : ''
});

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: "Lead Name",
    sortable: true,
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="flex items-center text-sm">
          <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
          {row.original.email}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="h-3 w-3 mr-1" />
          {row.original.phone}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "leadOnDate",
    header: "Lead On Date",
    sortable: true,
  },
  {
    accessorKey: "buyersAgent",
    header: "Buyer's Agent",
    sortable: true,
  },
  {
    accessorKey: "referredVia",
    header: "Referred Via",
    sortable: true,
  },
  {
    accessorKey: "loanAmount",
    header: "Loan Amount",
    sortable: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const getStatusLabel = (status: string) => {
        switch (status) {
          case "working_on_it": return "Working On It";
          case "pending_app": return "Pending App";
          case "nurture": return "Nurture";
          case "dead": return "Dead";
          case "need_attention": return "Need Attention";
          default: return status;
        }
      };
      return <StatusBadge status={getStatusLabel(row.original.status)} />;
    },
    sortable: true,
  },
  {
    accessorKey: "lastFollowUpDate",
    header: "Last Follow-Up",
    sortable: true,
  },
  {
    accessorKey: "nextFollowUpDate",
    header: "Next Follow-Up",
    sortable: true,
  },
  {
    accessorKey: "teammateAssigned",
    header: "Teammate",
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
];

export default function Leads() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const dbLeads = await databaseService.getLeads();
      const transformedLeads = dbLeads.map(transformLeadToDisplay);
      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeadCreated = (newLead: any) => {
    const transformedLead = transformLeadToDisplay(newLead);
    setLeads(prev => [transformedLead, ...prev]);
  };

  const handleRowClick = (lead: Lead) => {
    // Convert Lead to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: lead.id,
        firstName: lead.name.split(' ')[0],
        lastName: lead.name.split(' ').slice(1).join(' '),
        email: lead.email,
        phoneMobile: lead.phone
      },
      loan: {
        loanAmount: lead.loanAmount,
        loanType: "Purchase",
        prType: "Primary Residence"
      },
      ops: {
        stage: "leads",
        status: lead.status,
        priority: "Medium",
        referralSource: lead.source
      },
      dates: {
        createdOn: lead.created
      },
      meta: {},
      name: lead.name,
      creditScore: lead.creditScore
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Potential clients and prospects</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
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

      <CreateLeadModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onLeadCreated={handleLeadCreated}
      />

      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onStageChange={handleStageChange}
        />
      )}
    </div>
  );
}