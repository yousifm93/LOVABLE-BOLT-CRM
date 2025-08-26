import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";

interface PreApprovedClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: "new" | "shopping" | "offers_out" | "under_contract" | "ready_to_proceed";
  approvedAmount: string;
  requestedAmount: string;
  creditScore: number;
  dti: number;
  approvedDate: string;
  expirationDate: string;
  buyersAgent: string;
  lastFollowUpDate: string;
  nextFollowUpDate: string;
  teammateAssigned: string;
  buyersAgreement: "signed" | "pending" | "not_applicable";
}

const preApprovedData: PreApprovedClient[] = [
  {
    id: 1,
    name: "David Martinez",
    email: "david.m@email.com",
    phone: "(555) 234-5678",
    loanType: "Purchase",
    status: "shopping",
    approvedAmount: "$525,000",
    requestedAmount: "$500,000",
    creditScore: 795,
    dti: 25,
    approvedDate: "2024-01-02",
    expirationDate: "2024-05-02",
    buyersAgent: "Jennifer Walsh",
    lastFollowUpDate: "2024-01-20",
    nextFollowUpDate: "2024-01-27",
    teammateAssigned: "Sarah Wilson",
    buyersAgreement: "signed"
  },
  {
    id: 2,
    name: "Amanda Foster",
    email: "amanda.f@email.com",
    phone: "(555) 345-6789",
    loanType: "Purchase",
    status: "offers_out",
    approvedAmount: "$475,000",
    requestedAmount: "$450,000",
    creditScore: 762,
    dti: 30,
    approvedDate: "2024-01-01",
    expirationDate: "2024-05-01",
    buyersAgent: "Robert Kim",
    lastFollowUpDate: "2024-01-19",
    nextFollowUpDate: "2024-01-26",
    teammateAssigned: "Mark Johnson",
    buyersAgreement: "signed"
  }
];

const statusOptions = {
  new: "New",
  shopping: "Shopping",
  offers_out: "Offers Out",
  under_contract: "Under Contract",
  ready_to_proceed: "Ready to Proceed"
};

const columns: ColumnDef<PreApprovedClient>[] = [
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={statusOptions[row.original.status]} />,
    sortable: true,
  },
  {
    accessorKey: "approvedAmount",
    header: "Approved Amount",
    sortable: true,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-success">{row.original.approvedAmount}</div>
        <div className="text-xs text-muted-foreground">Requested: {row.original.requestedAmount}</div>
      </div>
    ),
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
    accessorKey: "buyersAgent",
    header: "Buyer's Agent",
    sortable: true,
  },
  {
    accessorKey: "buyersAgreement",
    header: "Buyer's Agreement",
    cell: ({ row }) => (
      <StatusBadge 
        status={row.original.buyersAgreement === "signed" ? "Signed" : 
               row.original.buyersAgreement === "pending" ? "Pending" : "N/A"} 
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "teammateAssigned",
    header: "Team Member",
    sortable: true,
  },
  {
    accessorKey: "expirationDate",
    header: "Expires",
    cell: ({ row }) => {
      const expirationDate = new Date(row.original.expirationDate);
      const today = new Date();
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return (
        <div className="flex items-center gap-1">
          <Shield className={`h-3 w-3 ${daysUntilExpiration <= 30 ? 'text-warning' : 'text-success'}`} />
          <span className={`text-sm ${daysUntilExpiration <= 30 ? 'text-warning' : 'text-muted-foreground'}`}>
            {row.original.expirationDate}
          </span>
        </div>
      );
    },
    sortable: true,
  },
];

export default function PreApproved() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRowClick = (client: PreApprovedClient) => {
    // Convert PreApprovedClient to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: client.id,
        firstName: client.name.split(' ')[0],
        lastName: client.name.split(' ').slice(1).join(' '),
        email: client.email,
        phoneMobile: client.phone
      },
      loan: {
        loanAmount: client.approvedAmount,
        loanType: client.loanType,
        prType: "Primary Residence"
      },
      ops: {
        stage: "pre-approved",
        status: statusOptions[client.status],
        priority: "High"
      },
      dates: {
        createdOn: client.approvedDate,
        appliedOn: client.approvedDate
      },
      meta: {},
      name: client.name,
      creditScore: client.creditScore,
      buyersAgent: client.buyersAgent,
      lastFollowUpDate: client.lastFollowUpDate,
      nextFollowUpDate: client.nextFollowUpDate,
      teammateAssigned: client.teammateAssigned,
      buyersAgreement: client.buyersAgreement
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pre-Approved</h1>
          <p className="text-xs italic text-muted-foreground/70">Clients with approved loan pre-approvals</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Pre-Approved Clients</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search pre-approved clients..."
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
            data={preApprovedData}
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