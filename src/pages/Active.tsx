import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";

interface ActiveClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: "under_contract" | "in_underwriting" | "conditions_pending" | "clear_to_close" | "docs_signing";
  loanAmount: string;
  creditScore: number;
  closingDate: string;
  processor: string;
  underwriter: string;
  progress: number;
  lastUpdate: string;
}

const activeData: ActiveClient[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    email: "sarah.m@email.com",
    phone: "(555) 890-1234",
    loanType: "Purchase",
    status: "in_underwriting",
    loanAmount: "$625,000",
    creditScore: 780,
    closingDate: "2024-02-15",
    processor: "Lisa Chen",
    underwriter: "Michael Rodriguez",
    progress: 65,
    lastUpdate: "2024-01-22"
  },
  {
    id: 2,
    name: "James Patterson",
    email: "james.p@email.com",
    phone: "(555) 901-2345",
    loanType: "Refinance",
    status: "clear_to_close",
    loanAmount: "$380,000",
    creditScore: 745,
    closingDate: "2024-02-08",
    processor: "Karen Wong",
    underwriter: "David Kim",
    progress: 95,
    lastUpdate: "2024-01-21"
  }
];

const statusOptions = {
  under_contract: "Under Contract",
  in_underwriting: "In Underwriting", 
  conditions_pending: "Conditions Pending",
  clear_to_close: "Clear to Close",
  docs_signing: "Docs Signing"
};

const columns: ColumnDef<ActiveClient>[] = [
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
    accessorKey: "loanAmount",
    header: "Loan Amount",
    sortable: true,
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${row.original.progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{row.original.progress}%</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "closingDate",
    header: "Closing Date",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">{row.original.closingDate}</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "processor",
    header: "Processor",
    sortable: true,
  },
  {
    accessorKey: "underwriter",
    header: "Underwriter",
    sortable: true,
  },
];

export default function Active() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRowClick = (client: ActiveClient) => {
    // Convert ActiveClient to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: client.id,
        firstName: client.name.split(' ')[0],
        lastName: client.name.split(' ').slice(1).join(' '),
        email: client.email,
        phoneMobile: client.phone
      },
      loan: {
        loanAmount: client.loanAmount,
        loanType: client.loanType,
        prType: "Primary Residence"
      },
      ops: {
        stage: "active",
        status: statusOptions[client.status],
        priority: "High"
      },
      dates: {
        createdOn: client.lastUpdate,
        appliedOn: client.lastUpdate
      },
      meta: {},
      name: client.name,
      creditScore: client.creditScore,
      progress: client.progress
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
          <h1 className="text-2xl font-bold text-foreground">Active Loans</h1>
          <p className="text-xs italic text-muted-foreground/70">Currently active loans and their status</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search active loans..."
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
            data={activeData}
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
          pipelineType="active"
        />
      )}
    </div>
  );
}