import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";

interface ActiveClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  loanAmount: string;
  interestRate: number;
  creditScore: number;
  closingDate: string;
  processor: string;
  underwriter: string;
  progress: number;
  daysToClosing: number;
  currentStage: string;
}

const activeData: ActiveClient[] = [
  {
    id: 1,
    name: "Michael Chen",
    email: "michael.c@email.com",
    phone: "(555) 777-8888",
    loanType: "Purchase",
    status: "Active",
    loanAmount: "$485,000",
    interestRate: 6.50,
    creditScore: 785,
    closingDate: "2024-02-15",
    processor: "Anna Wilson",
    underwriter: "Mark Davis",
    progress: 75,
    daysToClosing: 25,
    currentStage: "Underwriting"
  },
  {
    id: 2,
    name: "Jennifer Park",
    email: "jennifer.p@email.com",
    phone: "(555) 999-0000",
    loanType: "Refinance",
    status: "Active",
    loanAmount: "$375,000",
    interestRate: 6.75,
    creditScore: 760,
    closingDate: "2024-02-20",
    processor: "Kevin Lee",
    underwriter: "Sandra Kim",
    progress: 85,
    daysToClosing: 30,
    currentStage: "Clear to Close"
  }
];

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
    cell: ({ row }) => (
      <div className="font-medium text-success">{row.original.loanAmount}</div>
    ),
  },
  {
    accessorKey: "interestRate",
    header: "Rate",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.interestRate}%</span>
    ),
    sortable: true,
  },
  {
    accessorKey: "currentStage",
    header: "Current Stage",
    cell: ({ row }) => <StatusBadge status={row.original.currentStage} />,
    sortable: true,
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-success transition-all duration-300"
            style={{ width: `${row.original.progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{row.original.progress}%</span>
      </div>
    ),
  },
  {
    accessorKey: "closingDate",
    header: "Closing Date",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <span className={`text-sm ${
          row.original.daysToClosing <= 14 
            ? 'text-warning font-medium' 
            : 'text-muted-foreground'
        }`}>
          {row.original.closingDate}
        </span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "daysToClosing",
    header: "Days to Close",
    cell: ({ row }) => (
      <span className={`font-medium ${
        row.original.daysToClosing <= 7 
          ? 'text-destructive' 
          : row.original.daysToClosing <= 14 
          ? 'text-warning' 
          : 'text-success'
      }`}>
        {row.original.daysToClosing} days
      </span>
    ),
    sortable: true,
  },
  {
    accessorKey: "processor",
    header: "Processor",
    sortable: true,
  },
];

export default function Active() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (client: ActiveClient) => {
    console.log("View active loan details:", client);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Loans</h1>
          <p className="text-muted-foreground">Loans currently in process to closing</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          Start New Loan
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Active Loan Pipeline</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
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
    </div>
  );
}