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
  referredVia: string;
  referralSource: string;
  converted: string;
  leadStrength: string;
  dueDate?: string;
}

// Transform database lead to display format
const transformLeadToDisplay = (dbLead: DatabaseLead & { task_due_date?: string }): Lead => ({
  id: parseInt(dbLead.id),
  name: `${dbLead.first_name} ${dbLead.last_name}`,
  email: dbLead.email || '',
  phone: dbLead.phone || '',
  referredVia: dbLead.referred_via || 'Unknown',
  referralSource: dbLead.referral_source || 'Unknown',
  converted: dbLead.converted || 'Working on it',
  leadStrength: dbLead.lead_strength || 'Warm',
  dueDate: dbLead.task_due_date ? new Date(dbLead.task_due_date).toLocaleDateString() : ''
});

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: "Lead Name",
    sortable: true,
  },
  {
    accessorKey: "referredVia",
    header: "Referred Via",
    cell: ({ row }) => <StatusBadge status={row.original.referredVia} />,
    sortable: true,
  },
  {
    accessorKey: "referralSource",
    header: "Referral Source",
    cell: ({ row }) => <StatusBadge status={row.original.referralSource} />,
    sortable: true,
  },
  {
    accessorKey: "converted",
    header: "Converted",
    cell: ({ row }) => <StatusBadge status={row.original.converted} />,
    sortable: true,
  },
  {
    accessorKey: "leadStrength",
    header: "Lead Strength",
    cell: ({ row }) => <StatusBadge status={row.original.leadStrength} />,
    sortable: true,
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
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
      const dbLeads = await databaseService.getLeadsWithTaskDueDates();
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
        loanAmount: "$0",
        loanType: "Purchase",
        prType: "Primary Residence"
      },
      ops: {
        stage: "leads",
        status: lead.converted,
        priority: "Medium",
        referralSource: lead.referralSource
      },
      dates: {
        createdOn: new Date().toISOString()
      },
      meta: {},
      name: lead.name,
      creditScore: 750
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-xs italic text-muted-foreground/70">Prospective clients and new business opportunities</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <Button 
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
            <div className="relative max-w-sm">
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