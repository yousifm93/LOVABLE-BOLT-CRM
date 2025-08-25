import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";

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

const leadsData: Lead[] = [
  {
    id: 1,
    name: "Jennifer Martinez",
    email: "jennifer.m@email.com",
    phone: "(555) 123-4567",
    source: "Website",
    status: "working_on_it",
    loanAmount: "$425,000",
    creditScore: 745,
    created: "2024-01-20",
    lastContact: "2024-01-20",
    leadOnDate: "2024-01-20",
    buyersAgent: "Sarah Johnson",
    referredVia: "Website",
    lastFollowUpDate: "2024-01-19",
    nextFollowUpDate: "2024-01-22",
    teammateAssigned: "Yousif"
  },
  {
    id: 2,
    name: "Robert Kim",
    email: "robert.k@email.com",
    phone: "(555) 234-5678",
    source: "Referral",
    status: "pending_app",
    loanAmount: "$380,000",
    creditScore: 720,
    created: "2024-01-19",
    lastContact: "2024-01-19",
    leadOnDate: "2024-01-19",
    buyersAgent: "Mike Chen",
    referredVia: "Personal",
    lastFollowUpDate: "2024-01-18",
    nextFollowUpDate: "2024-01-21",
    teammateAssigned: "Salma"
  },
  {
    id: 3,
    name: "Amanda Chen",
    email: "amanda.c@email.com",
    phone: "(555) 345-6789",
    source: "Social Media",
    status: "nurture",
    loanAmount: "$525,000",
    creditScore: 780,
    created: "2024-01-18",
    lastContact: "2024-01-18",
    leadOnDate: "2024-01-18",
    buyersAgent: "Lisa Rodriguez",
    referredVia: "Social Media",
    lastFollowUpDate: "2024-01-17",
    nextFollowUpDate: "2024-01-25",
    teammateAssigned: "Hermit"
  }
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Potential clients and prospects</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
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
            data={leadsData}
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
        />
      )}
    </div>
  );
}