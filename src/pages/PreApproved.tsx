import { useState, useEffect } from "react";
import { Search, Filter, Phone, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BulkUpdateDialog } from "@/components/ui/bulk-update-dialog";
import { Loader2 } from "lucide-react";

type DisplayLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loanType: string;
  status: string;
  approvedAmount: string;
  creditScore: number;
  loanAmount: number | null;
};

// Display columns that match allColumns accessorKeys
const initialColumns = [
  { id: "name", label: "Client Name", visible: true },
  { id: "email", label: "Email", visible: true },
  { id: "phone", label: "Phone", visible: true },
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
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const { columns: columnVisibility, views, visibleColumns, activeView, toggleColumn, toggleAll, saveView, loadView, deleteView, reorderColumns } = useColumnVisibility(initialColumns, 'pre-approved-columns');

  const handleViewSaved = (viewName: string) => {
    toast({
      title: "View Saved",
      description: `"${viewName}" has been saved successfully`,
    });
    loadView(viewName);
  };

  const handleColumnReorder = (oldIndex: number, newIndex: number) => {
    reorderColumns(oldIndex, newIndex);
    toast({
      title: "Column Reordered",
      description: "Table column order has been updated",
    });
  };

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

  const handleDelete = async (row: DisplayLead) => {
    setDeleteLeadId(row.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      toast({
        title: "Success",
        description: "Lead deleted successfully.",
      });
      await fetchLeads();
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete lead.",
        variant: "destructive",
      });
    } finally {
      setDeleteLeadId(null);
    }
  };

  const handleViewDetails = (row: DisplayLead) => {
    const lead = leads.find(l => l.id === row.id);
    if (lead) handleRowClick(lead);
  };

  const handleEdit = (row: DisplayLead) => {
    const lead = leads.find(l => l.id === row.id);
    if (lead) handleRowClick(lead);
  };

  const handleFieldUpdate = async (id: string, field: string, value: any) => {
    await databaseService.updateLead(id, { [field]: value });
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => databaseService.deleteLead(id))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} lead${successCount > 1 ? 's' : ''} deleted successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      }
      
      await fetchLeads();
      setSelectedLeadIds([]);
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (selectedLeadIds.length === 0) return;
    
    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map(id => handleFieldUpdate(id, field, value))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} lead${successCount > 1 ? 's' : ''} updated successfully.`,
        });
      }
      
      await fetchLeads();
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error during bulk update:', error);
    }
  };

  const displayData: DisplayLead[] = leads.map(lead => ({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, email: lead.email || '', phone: lead.phone || '', loanType: lead.loan_type || 'Purchase', status: lead.status || 'Pre-Approved', approvedAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '$0', creditScore: lead.estimated_fico || 0, loanAmount: lead.loan_amount || 0 }));

  const allColumns: ColumnDef<DisplayLead>[] = [
    { 
      accessorKey: "name", 
      header: "Client Name", 
      sortable: true, 
      cell: ({ row }) => (
        <span 
          className="cursor-pointer hover:text-primary" 
          onClick={(e) => { 
            e.stopPropagation(); 
            const lead = leads.find(l => l.id === row.original.id); 
            if (lead) handleRowClick(lead); 
          }}
        >
          {row.original.name}
        </span>
      ) 
    },
    { 
      accessorKey: "email", 
      header: "Email", 
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditText
            value={row.original.email}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "email", value);
              fetchLeads();
            }}
            placeholder="Enter email"
          />
        </div>
      )
    },
    { 
      accessorKey: "phone", 
      header: "Phone", 
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditText
            value={row.original.phone}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "phone", value);
              fetchLeads();
            }}
            placeholder="Enter phone"
          />
        </div>
      )
    },
    { 
      accessorKey: "status", 
      header: "Status", 
      cell: ({ row }) => <StatusBadge status={row.original.status} /> 
    }, 
    { 
      accessorKey: "approvedAmount", 
      header: "Approved Amount", 
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditCurrency
            value={row.original.loanAmount}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "loan_amount", value);
              fetchLeads();
            }}
            placeholder="$0"
          />
        </div>
      )
    }, 
    { 
      accessorKey: "creditScore", 
      header: "Credit Score", 
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditNumber
            value={row.original.creditScore}
            onValueChange={(value) => {
              handleFieldUpdate(row.original.id, "estimated_fico", value);
              fetchLeads();
            }}
            placeholder="0"
            min={300}
            max={850}
          />
        </div>
      )
    }
  ];

  const columns = visibleColumns
    .map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id))
    .filter((col): col is ColumnDef<DisplayLead> => col !== undefined);

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <h1 className="text-2xl font-bold">Pre-Approved</h1>
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Pre-Approved Clients ({leads.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
            <ColumnVisibilityButton columns={columnVisibility} onColumnToggle={toggleColumn} onToggleAll={toggleAll} onSaveView={saveView} onReorderColumns={reorderColumns} onViewSaved={handleViewSaved} />
            <ViewPills views={views} activeView={activeView} onLoadView={loadView} onDeleteView={deleteView} />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={displayData} 
            searchTerm={searchTerm} 
            onRowClick={(row) => { const lead = leads.find(l => l.id === row.id); if (lead) handleRowClick(lead); }} 
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onColumnReorder={handleColumnReorder}
            selectable
            selectedIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>
      {selectedClient && <ClientDetailDrawer client={selectedClient} isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setSelectedClient(null); }} onStageChange={() => setIsDrawerOpen(false)} pipelineType="leads" onLeadUpdated={fetchLeads} />}
      
      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-lg border-2">
            <CardContent className="flex items-center gap-4 p-4">
              <Badge variant="secondary" className="text-sm">
                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
              </Badge>
              <div className="flex gap-2">
                <Button onClick={() => setIsBulkUpdateOpen(true)} size="sm">
                  Update Field
                </Button>
                <Button onClick={() => setIsBulkDeleteOpen(true)} variant="destructive" size="sm">
                  Delete
                </Button>
                <Button onClick={() => setSelectedLeadIds([])} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedLeadIds.length} Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkUpdateDialog
        open={isBulkUpdateOpen}
        onOpenChange={setIsBulkUpdateOpen}
        selectedCount={selectedLeadIds.length}
        onUpdate={handleBulkUpdate}
        fieldOptions={[
          { value: 'converted', label: 'Status', type: 'select', options: [
            { value: 'Working on it', label: 'Working on it' },
            { value: 'Converted', label: 'Converted' },
            { value: 'Dead', label: 'Dead' }
          ]},
        ]}
      />
    </div>
  );
}
