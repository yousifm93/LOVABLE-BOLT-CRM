import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ColumnDef } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { InlineEditAssignee } from "@/components/ui/inline-edit-assignee";
import { InlineEditApprovedLender } from "@/components/ui/inline-edit-approved-lender";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface PastClientLoan {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  arrive_loan_number: number | null;
  close_date: string | null;
  closed_at: string | null;
  teammate_assigned: string | null;
  approved_lender_id: string | null;
  approved_lender?: { id: string; lender_name: string; } | null;
  teammate?: { id: string; first_name: string; last_name: string; } | null;
}

const createColumns = (
  users: any[], 
  lenders: any[], 
  handleUpdate: (id: string, field: string, value: any) => void,
  handleRowClick: (loan: PastClientLoan) => void
): ColumnDef<PastClientLoan>[] => [
  {
    accessorKey: "borrower_name",
    header: "Borrower",
    cell: ({ row }) => (
      <div 
        className="text-sm text-foreground hover:text-warning cursor-pointer transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          handleRowClick(row.original);
        }}
      >
        {`${row.original.first_name} ${row.original.last_name}`}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "closed_at",
    header: "Closed Date",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.closed_at 
          ? new Date(row.original.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '-'}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "team",
    header: "Team",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditAssignee
          assigneeId={row.original.teammate_assigned}
          users={users}
          onValueChange={(userId) => handleUpdate(row.original.id, "teammate_assigned", userId)}
          showNameText={false}
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "lender",
    header: "Lender",
    cell: ({ row }) => {
      const matchedLender = row.original.approved_lender ? lenders.find(l => l.id === row.original.approved_lender!.id) : null;
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditApprovedLender
            value={matchedLender}
            lenders={lenders}
            onValueChange={async (lender) => await handleUpdate(row.original.id, "approved_lender_id", lender?.id ?? null)}
          />
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "arrive_loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditNumber
          value={row.original.arrive_loan_number || 0}
          onValueChange={(value) => handleUpdate(row.original.id, "arrive_loan_number", value)}
          placeholder="0"
          className="w-20"
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "loan_amount",
    header: "Loan Amount",
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <InlineEditCurrency
          value={row.original.loan_amount}
          onValueChange={(value) => handleUpdate(row.original.id, "loan_amount", value)}
        />
      </div>
    ),
    sortable: true,
  },
];

const initialColumns = [
  { id: "borrower_name", label: "Borrower", visible: true },
  { id: "closed_at", label: "Closed Date", visible: true },
  { id: "team", label: "Team", visible: true },
  { id: "arrive_loan_number", label: "Loan #", visible: true },
  { id: "lender", label: "Lender", visible: true },
  { id: "loan_amount", label: "Loan Amount", visible: true },
];

export default function PastClients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [pastClients, setPastClients] = useState<PastClientLoan[]>([]);
  const [users, setUsers] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { toast } = useToast();

  const {
    columns: columnVisibility,
    views,
    visibleColumns,
    activeView,
    toggleColumn,
    toggleAll,
    saveView,
    loadView,
    deleteView,
  } = useColumnVisibility(initialColumns, 'past-clients-columns');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loansData, usersData, lendersData] = await Promise.all([
        databaseService.getPastClientLoans(),
        databaseService.getUsers(),
        databaseService.getLenders(),
      ]);
      setPastClients(loansData || []);
      setUsers(usersData || []);
      setLenders(lendersData || []);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await databaseService.updateLead(id, { [field]: value });
      setPastClients(prev => prev.map(loan => loan.id === id ? { ...loan, [field]: value } : loan));
      toast({ title: "Updated", description: "Field updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update field", variant: "destructive" });
      loadData();
    }
  };

  const handleRowClick = (loan: PastClientLoan) => {
    const crmClient: CRMClient = {
      person: { id: Date.now(), firstName: loan.first_name, lastName: loan.last_name, email: "", phoneMobile: "" },
      databaseId: loan.id,
      loan: { loanAmount: loan.loan_amount ? `$${loan.loan_amount.toLocaleString()}` : "", loanType: "Purchase", prType: "", closeDate: loan.close_date, disclosureStatus: null },
      ops: { stage: "past-clients", status: "Closed", priority: "Low" },
      dates: { createdOn: new Date().toISOString(), appliedOn: new Date().toISOString() },
      meta: {},
      name: `${loan.first_name} ${loan.last_name}`,
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const allColumns = createColumns(users, lenders, handleUpdate, handleRowClick);
  const columns = visibleColumns.map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id)).filter((col): col is ColumnDef<PastClientLoan> => col !== undefined);
  const filteredLoans = pastClients.filter(loan => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return `${loan.first_name} ${loan.last_name}`.toLowerCase().includes(search) || loan.arrive_loan_number?.toString().includes(search);
  });

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-lg">Loading...</div></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Past Clients</h1>
            <p className="text-muted-foreground mt-1">{filteredLoans.length} closed {filteredLoans.length === 1 ? 'loan' : 'loans'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <ColumnVisibilityButton 
            columns={columnVisibility} 
            onColumnToggle={toggleColumn} 
            onToggleAll={toggleAll} 
            onSaveView={saveView}
            onReorderColumns={() => {}}
            onViewSaved={(name) => { 
              toast({ title: "View Saved", description: `"${name}" saved` }); 
              loadView(name); 
            }}
          />
        </div>
        {views.length > 0 && <ViewPills views={views} activeView={activeView} onLoadView={loadView} onDeleteView={deleteView} />}
      </div>
      <Card><CardContent className="p-0"><DataTable columns={columns} data={filteredLoans} searchTerm={searchTerm} onRowClick={handleRowClick} /></CardContent></Card>
      {selectedClient && <ClientDetailDrawer isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setSelectedClient(null); }} client={selectedClient} onStageChange={() => setIsDrawerOpen(false)} onLeadUpdated={loadData} pipelineType="past-clients" />}
    </div>
  );
}
