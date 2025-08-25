import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";

interface PreApprovedClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  approvedAmount: string;
  interestRate: number;
  creditScore: number;
  dti: number;
  approvalDate: string;
  expirationDate: string;
  loanOfficer: string;
  underwriter: string;
  lockStatus: "Locked" | "Float" | "Expired";
}

const preApprovedData: PreApprovedClient[] = [
  {
    id: 1,
    name: "Sarah Mitchell",
    email: "sarah.m@email.com",
    phone: "(555) 111-2222",
    loanType: "Purchase",
    status: "Pre-Approved",
    approvedAmount: "$525,000",
    interestRate: 6.75,
    creditScore: 795,
    dti: 25,
    approvalDate: "2023-12-28",
    expirationDate: "2024-03-28",
    loanOfficer: "Mike Johnson",
    underwriter: "Linda Chen",
    lockStatus: "Locked"
  },
  {
    id: 2,
    name: "James Rodriguez",
    email: "james.r@email.com",
    phone: "(555) 333-4444",
    loanType: "Refinance",
    status: "Pre-Approved",
    approvedAmount: "$450,000",
    interestRate: 6.95,
    creditScore: 765,
    dti: 30,
    approvalDate: "2023-12-25",
    expirationDate: "2024-03-25",
    loanOfficer: "Jessica Lee",
    underwriter: "Robert Kim",
    lockStatus: "Float"
  }
];

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
    accessorKey: "approvedAmount",
    header: "Approved Amount",
    sortable: true,
    cell: ({ row }) => (
      <div className="font-medium text-primary">{row.original.approvedAmount}</div>
    ),
  },
  {
    accessorKey: "interestRate",
    header: "Interest Rate",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.interestRate}%</span>
    ),
    sortable: true,
  },
  {
    accessorKey: "lockStatus",
    header: "Rate Lock",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Shield className={`h-3 w-3 ${
          row.original.lockStatus === "Locked" 
            ? "text-success" 
            : row.original.lockStatus === "Float"
            ? "text-warning"
            : "text-destructive"
        }`} />
        <StatusBadge status={row.original.lockStatus} />
      </div>
    ),
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
    accessorKey: "underwriter",
    header: "Underwriter",
    sortable: true,
  },
  {
    accessorKey: "approvalDate",
    header: "Approval Date",
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
        <span className={`text-sm ${daysUntilExpiration <= 30 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
          {row.original.expirationDate}
        </span>
      );
    },
    sortable: true,
  },
];

export default function PreApproved() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleRowClick = (client: PreApprovedClient) => {
    console.log("View pre-approval details:", client);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pre-Approved</h1>
          <p className="text-muted-foreground">Clients with full underwriter approval</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          New Pre-Approval
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Pre-Approved Clients</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
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
    </div>
  );
}