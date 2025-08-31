import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { transformPreQualifiedToClient } from "@/utils/clientTransform";

interface PreQualifiedClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  loanAmount: string;
  qualifiedAmount: string;
  creditScore: number;
  dti: number;
  qualifiedDate: string;
  expirationDate: string;
  loanOfficer: string;
}

const preQualifiedData: PreQualifiedClient[] = [
  {
    id: 1,
    name: "Rachel Green",
    email: "rachel.g@email.com",
    phone: "(555) 654-3210",
    loanType: "Purchase",
    status: "Pre-Qualified",
    loanAmount: "$500,000",
    qualifiedAmount: "$475,000",
    creditScore: 780,
    dti: 28,
    qualifiedDate: "2024-01-05",
    expirationDate: "2024-04-05",
    loanOfficer: "John Smith"
  },
  {
    id: 2,
    name: "Tom Wilson",
    email: "tom.w@email.com",
    phone: "(555) 765-4321",
    loanType: "Purchase",
    status: "Pre-Qualified",
    loanAmount: "$425,000",
    qualifiedAmount: "$400,000",
    creditScore: 745,
    dti: 32,
    qualifiedDate: "2024-01-03",
    expirationDate: "2024-04-03",
    loanOfficer: "Emily Davis"
  }
];

// Define initial column configuration
const initialColumns = [
  { id: "name", label: "Client Name", visible: true },
  { id: "contact", label: "Contact", visible: true },
  { id: "loanType", label: "Loan Type", visible: true },
  { id: "qualifiedAmount", label: "Qualified Amount", visible: true },
  { id: "creditScore", label: "Credit Score", visible: true },
  { id: "dti", label: "DTI", visible: true },
  { id: "loanOfficer", label: "Loan Officer", visible: true },
  { id: "qualifiedDate", label: "Qualified Date", visible: true },
  { id: "expirationDate", label: "Expires", visible: true },
];

export default function PreQualified() {
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
  } = useColumnVisibility(initialColumns, 'pre-qualified-columns');

  const handleRowClick = (client: PreQualifiedClient) => {
    const crmClient = transformPreQualifiedToClient(client);
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = (clientId: number, newStage: PipelineStage) => {
    console.log(`Client ${clientId} moved to stage ${newStage}`);
    setIsDrawerOpen(false);
  };

  const allColumns: ColumnDef<PreQualifiedClient>[] = [
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
      accessorKey: "qualifiedAmount",
      header: "Qualified Amount",
      sortable: true,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-success">{row.original.qualifiedAmount}</div>
          <div className="text-xs text-muted-foreground">Requested: {row.original.loanAmount}</div>
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
      accessorKey: "dti",
      header: "DTI",
      cell: ({ row }) => (
        <span className={`font-medium ${
          row.original.dti <= 30 
            ? 'text-success' 
            : row.original.dti <= 40 
            ? 'text-warning' 
            : 'text-destructive'
        }`}>
          {row.original.dti}%
        </span>
      ),
      sortable: true,
    },
    {
      accessorKey: "loanOfficer",
      header: "Loan Officer",
      sortable: true,
    },
    {
      accessorKey: "qualifiedDate",
      header: "Qualified Date",
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
            <CheckCircle className={`h-3 w-3 ${daysUntilExpiration <= 30 ? 'text-warning' : 'text-success'}`} />
            <span className={`text-sm ${daysUntilExpiration <= 30 ? 'text-warning' : 'text-muted-foreground'}`}>
              {row.original.expirationDate}
            </span>
          </div>
        );
      },
      sortable: true,
    },
  ];

  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const columns = allColumns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pre-Qualified</h1>
          <p className="text-xs italic text-muted-foreground/70">Clients who have been pre-qualified for loans</p>
        </div>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Pre-Qualified Clients</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search pre-qualified clients..."
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
            columns={columns}
            data={preQualifiedData}
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
          pipelineType="leads"
        />
      )}
    </div>
  );
}