import { useState, useEffect } from "react";
import { Search, Filter, Phone, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type DisplayLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  approvedAmount: string;
  creditScore: number;
};

const initialColumns = [
  { id: "name", label: "Client Name", visible: true },
  { id: "contact", label: "Contact", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "approvedAmount", label: "Approved Amount", visible: true },
  { id: "creditScore", label: "Credit Score", visible: true },
];

export default function PreApproved() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<DatabaseLead[]>([]);

  const { columns: columnVisibility, views, visibleColumns, activeView, toggleColumn, toggleAll, saveView, loadView, deleteView } = useColumnVisibility(initialColumns, 'pre-approved-columns');

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').eq('pipeline_stage_id', '3cbf38ff-752e-4163-a9a3-1757499b4945').order('created_at', { ascending: false });
    if (error) { toast({ title: "Error", description: "Failed to load pre-approved clients", variant: "destructive" }); return; }
    setLeads(data || []);
  };

  useEffect(() => {
    fetchLeads();
  }, [toast]);

  const handleRowClick = (lead: DatabaseLead) => {
    setSelectedClient({ person: { id: Date.now(), firstName: lead.first_name, lastName: lead.last_name, email: lead.email || '', phoneMobile: lead.phone || '' }, databaseId: lead.id, loan: { loanAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : "$0", loanType: lead.loan_type || "Purchase", prType: "Primary Residence" }, ops: { status: lead.status || "Pre-Approved", stage: "pre-approved", priority: "Medium", referralSource: lead.referral_source || "N/A" }, dates: { createdOn: new Date(lead.created_at).toLocaleDateString() }, meta: {}, name: `${lead.first_name} ${lead.last_name}` });
    setIsDrawerOpen(true);
  };

  const displayData: DisplayLead[] = leads.map(lead => ({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, email: lead.email || '', phone: lead.phone || '', loanType: lead.loan_type || 'Purchase', status: lead.status || 'Pre-Approved', approvedAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '$0', creditScore: 770 }));

  const allColumns: ColumnDef<DisplayLead>[] = [{ accessorKey: "name", header: "Client Name", sortable: true, cell: ({ row }) => <span className="cursor-pointer hover:text-primary" onClick={(e) => { e.stopPropagation(); const lead = leads.find(l => l.id === row.original.id); if (lead) handleRowClick(lead); }}>{row.original.name}</span> }, { accessorKey: "contact", header: "Contact", cell: ({ row }) => <div className="flex gap-3"><Mail className="h-3 w-3 mr-1" /><span>{row.original.email}</span></div> }, { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> }, { accessorKey: "approvedAmount", header: "Approved Amount", cell: ({ row }) => <span className="font-medium text-success">{row.original.approvedAmount}</span>, sortable: true }, { accessorKey: "creditScore", header: "Credit Score", sortable: true }];

  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const columns = allColumns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <h1 className="text-2xl font-bold">Pre-Approved</h1>
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Pre-Approved Clients ({leads.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
            <ColumnVisibilityButton columns={columnVisibility} onColumnToggle={toggleColumn} onToggleAll={toggleAll} onSaveView={saveView} />
            <ViewPills views={views} activeView={activeView} onLoadView={loadView} onDeleteView={deleteView} />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={displayData} searchTerm={searchTerm} onRowClick={(row) => { const lead = leads.find(l => l.id === row.id); if (lead) handleRowClick(lead); }} />
        </CardContent>
      </Card>
      {selectedClient && <ClientDetailDrawer client={selectedClient} isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setSelectedClient(null); }} onStageChange={() => setIsDrawerOpen(false)} pipelineType="leads" onLeadUpdated={fetchLeads} />}
    </div>
  );
}
