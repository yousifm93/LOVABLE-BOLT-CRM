import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";

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

const columns: ColumnDef<ScreeningClient>[] = [
  {
    accessorKey: "name",
    header: "Client Name",
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

export default function Screening() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (client: ScreeningClient) => {
    console.log("View screening details:", client);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Screening</h1>
          <p className="text-muted-foreground">Initial application review and verification</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Screening
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Screening Pipeline</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
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
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}