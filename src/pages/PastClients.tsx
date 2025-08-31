import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { transformPastClientToClient } from "@/utils/clientTransform";

interface PastClient {
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
  loanOfficer: string;
  satisfaction: number;
  referrals: number;
  lastContact: string;
}

const pastClientsData: PastClient[] = [
  {
    id: 1,
    name: "Robert Johnson",
    email: "robert.j@email.com",
    phone: "(555) 123-9999",
    loanType: "Purchase",
    status: "Closed",
    loanAmount: "$425,000",
    interestRate: 6.25,
    creditScore: 775,
    closingDate: "2023-12-15",
    loanOfficer: "Sarah Wilson",
    satisfaction: 5,
    referrals: 2,
    lastContact: "2024-01-10"
  },
  {
    id: 2,
    name: "Maria Garcia",
    email: "maria.g@email.com",
    phone: "(555) 456-7777",
    loanType: "Refinance",
    status: "Closed",
    loanAmount: "$385,000",
    interestRate: 5.95,
    creditScore: 790,
    closingDate: "2023-11-30",
    loanOfficer: "Mike Davis",
    satisfaction: 5,
    referrals: 1,
    lastContact: "2023-12-20"
  },
  {
    id: 3,
    name: "David Thompson",
    email: "david.t@email.com",
    phone: "(555) 789-5555",
    loanType: "Purchase",
    status: "Closed",
    loanAmount: "$550,000",
    interestRate: 6.50,
    creditScore: 785,
    closingDate: "2023-10-25",
    loanOfficer: "Emily Chen",
    satisfaction: 4,
    referrals: 0,
    lastContact: "2023-11-15"
  }
];

const columns: ColumnDef<PastClient>[] = [
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
    accessorKey: "loanType",
    header: "Loan Type",
    sortable: true,
  },
  {
    accessorKey: "loanAmount",
    header: "Loan Amount",
    sortable: true,
    cell: ({ row }) => (
      <div className="font-medium">{row.original.loanAmount}</div>
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
    accessorKey: "closingDate",
    header: "Closing Date",
    sortable: true,
  },
  {
    accessorKey: "satisfaction",
    header: "Satisfaction",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span className="text-lg">{'★'.repeat(row.original.satisfaction)}</span>
        <span className="text-sm text-muted-foreground">({row.original.satisfaction}/5)</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "referrals",
    header: "Referrals",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3 text-success" />
        <span className="font-medium text-success">{row.original.referrals}</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "loanOfficer",
    header: "Loan Officer",
    sortable: true,
  },
  {
    accessorKey: "lastContact",
    header: "Last Contact",
    sortable: true,
  },
];

// Define initial column configuration
const initialColumns = [
  { id: "name", label: "Client Name", visible: true },
  { id: "contact", label: "Contact", visible: true },
  { id: "loanType", label: "Loan Type", visible: true },
  { id: "loanAmount", label: "Loan Amount", visible: true },
  { id: "interestRate", label: "Rate", visible: true },
  { id: "closingDate", label: "Closing Date", visible: true },
  { id: "satisfaction", label: "Satisfaction", visible: true },
  { id: "referrals", label: "Referrals", visible: true },
  { id: "loanOfficer", label: "Loan Officer", visible: true },
  { id: "lastContact", label: "Last Contact", visible: true },
];

export default function PastClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Column visibility management
  const {
    columns: columnVisibility,
    views,
    visibleColumns,
    activeView,
    toggleColumn,
    toggleAll,
    saveView,
    loadView,
    deleteView
  } = useColumnVisibility(initialColumns, 'past-clients-columns');

  const handleRowClick = (client: PastClient) => {
    const crmClient = transformPastClientToClient(client);
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Client ${clientId} moved to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const filteredColumns = columns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Past Clients</h1>
          <p className="text-xs italic text-muted-foreground/70">Previously completed loans and client history</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Closed Loans & Client History</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search past clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            
            <ColumnVisibilityButton
              columns={columnVisibility}
              onColumnToggle={toggleColumn}
              onToggleAll={toggleAll}
              onSaveView={saveView}
            />
            
            <ViewPills
              views={views}
              activeView={activeView}
              onLoadView={loadView}
              onDeleteView={deleteView}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={filteredColumns}
            data={pastClientsData}
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
          pipelineType="past-clients"
        />
      )}
    </div>
  );
}