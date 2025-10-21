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
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

// ALL 71 Fields - PreApproved shows all fields
const initialColumns = [
  // LEAD Fields (1-10)
  { id: "first_name", label: "First Name", visible: true },
  { id: "middle_name", label: "Middle Name", visible: false },
  { id: "last_name", label: "Last Name", visible: true },
  { id: "phone", label: "Phone", visible: true },
  { id: "email", label: "Email", visible: true },
  { id: "referred_via", label: "Referral Method", visible: false },
  { id: "referral_source", label: "Referral Source", visible: false },
  { id: "converted", label: "Lead Status", visible: false },
  { id: "monthly_pmt_goal", label: "Monthly Pmt Goal", visible: false },
  { id: "cash_to_close_goal", label: "Cash to Close Goal", visible: false },
  
  // APP COMPLETE Fields (11-34)
  { id: "loan_type", label: "Loan Type", visible: true },
  { id: "income_type", label: "Income Type", visible: false },
  { id: "reo", label: "REO", visible: false },
  { id: "property_type", label: "Property Type", visible: false },
  { id: "occupancy", label: "Occupancy", visible: false },
  { id: "borrower_current_address", label: "Current Address", visible: false },
  { id: "own_rent_current_address", label: "Own/Rent", visible: false },
  { id: "time_at_current_address_years", label: "Years at Address", visible: false },
  { id: "time_at_current_address_months", label: "Months at Address", visible: false },
  { id: "military_veteran", label: "Military/Veteran", visible: false },
  { id: "dob", label: "Date of Birth", visible: false },
  { id: "estimated_fico", label: "Credit Score", visible: true },
  { id: "loan_amount", label: "Approved Amount", visible: true },
  { id: "sales_price", label: "Sales Price", visible: false },
  { id: "down_pmt", label: "Down Payment", visible: false },
  { id: "term", label: "Term", visible: false },
  { id: "monthly_liabilities", label: "Liabilities", visible: false },
  { id: "assets", label: "Assets", visible: false },
  { id: "subject_address_1", label: "Subject Addr 1", visible: false },
  { id: "subject_address_2", label: "Subject Addr 2", visible: false },
  { id: "subject_city", label: "Subject City", visible: false },
  { id: "subject_state", label: "Subject State", visible: false },
  { id: "subject_zip", label: "Subject Zip", visible: false },
  { id: "arrive_loan_number", label: "Loan #", visible: false },
  
  // APP REVIEW Fields (35-45)
  { id: "interest_rate", label: "Interest Rate", visible: false },
  { id: "piti", label: "PITI", visible: false },
  { id: "program", label: "Program", visible: false },
  { id: "total_monthly_income", label: "Monthly Income", visible: false },
  { id: "escrows", label: "Escrows", visible: false },
  { id: "dti", label: "DTI", visible: false },
  { id: "close_date", label: "Close Date", visible: false },
  { id: "principal_interest", label: "P&I", visible: false },
  { id: "property_taxes", label: "Taxes", visible: false },
  { id: "homeowners_insurance", label: "HOI", visible: false },
  { id: "mortgage_insurance", label: "MI", visible: false },
  { id: "hoa_dues", label: "HOA", visible: false },
  
  // ACTIVE Fields (46-73)
  { id: "disclosure_status", label: "Disclosures", visible: false },
  { id: "loan_status", label: "Loan Status", visible: false },
  { id: "appraisal_status", label: "Appraisal", visible: false },
  { id: "title_status", label: "Title", visible: false },
  { id: "hoi_status", label: "HOI Status", visible: false },
  { id: "mi_status", label: "MI Status", visible: false },
  { id: "condo_status", label: "Condo", visible: false },
  { id: "cd_status", label: "CD", visible: false },
  { id: "package_status", label: "Package", visible: false },
  { id: "lock_expiration_date", label: "Lock Exp", visible: false },
  { id: "ba_status", label: "BA", visible: false },
  { id: "epo_status", label: "EPO", visible: false },
  { id: "lender_id", label: "Lender", visible: false },
  { id: "title_eta", label: "Title ETA", visible: false },
  { id: "appr_date_time", label: "Appr Date/Time", visible: false },
  { id: "appr_eta", label: "Appr ETA", visible: false },
  { id: "appraisal_value", label: "Appr Value", visible: false },
  { id: "fin_cont", label: "Fin Contingency", visible: false },
  { id: "les_file", label: "LES File", visible: false },
  { id: "contract_file", label: "Contract", visible: false },
  { id: "initial_approval_file", label: "Initial Approval", visible: false },
  { id: "disc_file", label: "Disc File", visible: false },
  { id: "appraisal_file", label: "Appr File", visible: false },
  { id: "insurance_file", label: "Insurance", visible: false },
  { id: "icd_file", label: "ICD", visible: false },
  { id: "fcp_file", label: "FCP", visible: false },
  { id: "search_stage", label: "Search Stage", visible: true },
];

export default function PreApproved() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<DatabaseLead[]>([]);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

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

  const displayData: DisplayLead[] = leads.map(lead => ({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, email: lead.email || '', phone: lead.phone || '', loanType: lead.loan_type || 'Purchase', status: lead.status || 'Pre-Approved', approvedAmount: lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '$0', creditScore: 770 }));

  const allColumns: ColumnDef<DisplayLead>[] = [{ accessorKey: "name", header: "Client Name", sortable: true, cell: ({ row }) => <span className="cursor-pointer hover:text-primary" onClick={(e) => { e.stopPropagation(); const lead = leads.find(l => l.id === row.original.id); if (lead) handleRowClick(lead); }}>{row.original.name}</span> }, { accessorKey: "contact", header: "Contact", cell: ({ row }) => <div className="flex gap-3"><Mail className="h-3 w-3 mr-1" /><span>{row.original.email}</span></div> }, { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> }, { accessorKey: "approvedAmount", header: "Approved Amount", cell: ({ row }) => <span className="font-medium text-success">{row.original.approvedAmount}</span>, sortable: true }, { accessorKey: "creditScore", header: "Credit Score", sortable: true }];

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
    </div>
  );
}
