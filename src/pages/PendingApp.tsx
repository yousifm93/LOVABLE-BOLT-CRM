import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";

interface PendingApplication {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  loanAmount: string;
  creditScore: number;
  submitted: string;
  processor: string;
  progress: number;
}

const pendingData: PendingApplication[] = [
  {
    id: 1,
    name: "Michael Rodriguez",
    email: "michael.r@email.com",
    phone: "(555) 987-6543",
    loanType: "Purchase",
    status: "Pending",
    loanAmount: "$450,000",
    creditScore: 765,
    submitted: "2024-01-15",
    processor: "Sarah Wilson",
    progress: 25
  },
  {
    id: 2,
    name: "Lisa Thompson",
    email: "lisa.t@email.com",
    phone: "(555) 876-5432",
    loanType: "Refinance",
    status: "Pending",
    loanAmount: "$320,000",
    creditScore: 710,
    submitted: "2024-01-14",
    processor: "Mark Johnson",
    progress: 45
  }
];

const columns: ColumnDef<PendingApplication>[] = [
  {
    accessorKey: "name",
    header: "Applicant",
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "loanAmount",
    header: "Loan Amount",
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
  },
  {
    accessorKey: "processor",
    header: "Processor",
    sortable: true,
  },
  {
    accessorKey: "submitted",
    header: "Submitted",
    sortable: true,
  },
];

export default function PendingApp() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (application: PendingApplication) => {
    console.log("View application details:", application);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pending Applications</h1>
          <p className="text-muted-foreground">Applications currently being processed</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Application Processing</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search applications..."
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
            data={pendingData}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}