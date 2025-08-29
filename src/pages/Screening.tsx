import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";

interface ScreeningClient {
  id: number;
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
}

const screeningData: ScreeningClient[] = [
  {
    id: 1,
    name: "Jessica Lee",
    email: "jessica.l@email.com",
    phone: "(555) 321-9876",
    loanType: "Purchase",
    status: "Screening",
    loanAmount: "$475,000",
    creditScore: 790,
    incomeType: "W2",
    screeningDate: "2024-01-10",
    nextStep: "Income Verification",
    priority: "High"
  },
  {
    id: 2,
    name: "David Park",
    email: "david.p@email.com",
    phone: "(555) 432-1098",
    loanType: "Refinance",
    status: "Screening",
    loanAmount: "$350,000",
    creditScore: 725,
    incomeType: "Self-Employed",
    screeningDate: "2024-01-09",
    nextStep: "Asset Verification",
    priority: "Medium"
  }
];

export default function Screening() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRowClick = (client: any) => {
    // Convert legacy data to CRMClient format for the drawer
    const crmClient: CRMClient = {
      person: {
        id: client.id,
        firstName: client.name.split(' ')[0],
        lastName: client.name.split(' ')[1] || '',
        email: client.email,
        phoneMobile: client.phone
      },
      loan: {
        loanAmount: client.loanAmount,
        loanType: client.loanType,
        prType: client.pr || "Primary Residence"
      },
      ops: {
        stage: "screening",
        status: client.status,
        priority: client.priority
      },
      dates: {
        createdOn: client.screeningDate,
        appliedOn: client.screeningDate
      },
      meta: {},
      name: client.name,
      creditScore: client.creditScore,
      incomeType: client.incomeType,
      nextStep: client.nextStep
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  const columns: ColumnDef<ScreeningClient>[] = [
    {
      accessorKey: "name",
      header: "Client Name",
      sortable: true,
      cell: ({ row }) => (
        <span 
          className="cursor-pointer hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row.original);
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
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.priority} 
        />
      ),
      sortable: true,
    },
    {
      accessorKey: "nextStep",
      header: "Next Step",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
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

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">Screening</h1>
        <p className="text-xs italic text-muted-foreground/70">Initial application review and verification</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Clients ({screeningData.length})</CardTitle>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search screening clients..."
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
            data={screeningData}
            searchTerm={searchTerm}
            onRowClick={() => {}} // Disable generic row click
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
        />
      )}
    </div>
  );
}