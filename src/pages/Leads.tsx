import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";

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
}

const leadsData: Lead[] = [
  {
    id: 1,
    name: "Jennifer Martinez",
    email: "jennifer.m@email.com",
    phone: "(555) 123-4567",
    source: "Website",
    status: "Lead",
    loanAmount: "$425,000",
    creditScore: 745,
    created: "2024-01-20",
    lastContact: "2024-01-20"
  },
  {
    id: 2,
    name: "Robert Kim",
    email: "robert.k@email.com",
    phone: "(555) 234-5678",
    source: "Referral",
    status: "Lead",
    loanAmount: "$380,000",
    creditScore: 720,
    created: "2024-01-19",
    lastContact: "2024-01-19"
  },
  {
    id: 3,
    name: "Amanda Chen",
    email: "amanda.c@email.com",
    phone: "(555) 345-6789",
    source: "Social Media",
    status: "Lead",
    loanAmount: "$525,000",
    creditScore: 780,
    created: "2024-01-18",
    lastContact: "2024-01-18"
  }
];

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: "Name",
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
    accessorKey: "source",
    header: "Source",
    sortable: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    sortable: true,
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
    accessorKey: "created",
    header: "Created",
    sortable: true,
  },
  {
    accessorKey: "lastContact",
    header: "Last Contact",
    sortable: true,
  },
];

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (lead: Lead) => {
    console.log("View lead details:", lead);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">New prospects and potential clients</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
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
    </div>
  );
}