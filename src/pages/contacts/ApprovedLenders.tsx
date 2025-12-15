import { useState, useEffect } from "react";
import { Search, Filter, Phone, Mail, Building, Users, Upload, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { LenderDetailDialog } from "@/components/LenderDetailDialog";
import { SendLenderEmailModal } from "@/components/modals/SendLenderEmailModal";
import { BulkLenderEmailModal } from "@/components/modals/BulkLenderEmailModal";
import { InlineEditLenderType } from "@/components/ui/inline-edit-lender-type";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: "Conventional" | "Non-QM" | "Private" | "HELOC";
  account_executive?: string;
  account_executive_email?: string;
  account_executive_phone?: string;
  broker_portal_url?: string;
  broker_portal_username?: string;
  broker_portal_password?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const initialColumns = [
  { id: "rowNumber", label: "#", visible: true },
  { id: "lender_name", label: "Lender Name", visible: true },
  { id: "lender_type", label: "Lender Type", visible: true },
  { id: "account_executive", label: "Account Executive", visible: true },
  { id: "contact", label: "AE Contact", visible: true },
  { id: "broker_portal_url", label: "Broker Portal", visible: true },
  { id: "send_email", label: "Send Email", visible: true },
];

export default function ApprovedLenders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailModalLender, setEmailModalLender] = useState<Lender | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lenderToDelete, setLenderToDelete] = useState<Lender | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const {
    columns: columnVisibility,
    toggleColumn,
    toggleAll,
    saveView,
    reorderColumns,
  } = useColumnVisibility(initialColumns, "lenders-column-visibility");

  useEffect(() => {
    loadLenders();
  }, []);

  const loadLenders = async () => {
    try {
      const lenderData = await databaseService.getLenders();
      setLenders(lenderData);
    } catch (error) {
      console.error('Error loading lenders:', error);
      toast({
        title: "Error",
        description: "Failed to load lenders.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportLenders = async () => {
    setIsImporting(true);
    toast({
      title: "Importing...",
      description: "Fetching lender data from CSV file.",
    });

    try {
      const response = await fetch('/lenders-import.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch CSV file');
      }
      const csvData = await response.text();

      const { data, error } = await supabase.functions.invoke('import-lenders', {
        body: { csvData }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Import Complete",
        description: `Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}, Errors: ${data.errors}`,
      });

      await loadLenders();
    } catch (error) {
      console.error('Error importing lenders:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import lenders.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateLender = async (id: string, updates: Partial<Lender>) => {
    try {
      await databaseService.updateLender(id, updates);
      setLenders(prev => prev.map(lender => 
        lender.id === id ? { ...lender, ...updates } : lender
      ));
      toast({
        title: "Success",
        description: "Lender updated successfully.",
      });
    } catch (error) {
      console.error('Error updating lender:', error);
      toast({
        title: "Error",
        description: "Failed to update lender.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = (lender: Lender, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmailModalLender(lender);
    setIsEmailModalOpen(true);
  };

  const handleContactCreated = () => {
    loadLenders();
  };

  const handleRowClick = (lender: Lender) => {
    setSelectedLender(lender);
    setIsDrawerOpen(true);
  };

  const handleDeleteLender = async () => {
    if (!lenderToDelete) return;
    setIsDeleting(true);
    try {
      await databaseService.softDeleteLender(lenderToDelete.id);
      toast({
        title: "Success",
        description: "Lender deleted successfully.",
      });
      loadLenders();
    } catch (error) {
      console.error('Error deleting lender:', error);
      toast({
        title: "Error",
        description: "Failed to delete lender.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setLenderToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const lendersWithIndex = lenders.map((lender, index) => ({
    ...lender,
    rowNumber: index + 1
  }));

  const isColumnVisible = (columnId: string) => {
    const col = columnVisibility.find(c => c.id === columnId);
    return col ? col.visible : true;
  };

  const columns: ColumnDef<Lender & { rowNumber?: number }>[] = [
    ...(isColumnVisible("rowNumber") ? [{
      accessorKey: "rowNumber",
      header: "#",
      cell: ({ row }: any) => (
        <span className="text-muted-foreground text-sm">{row.original.rowNumber}</span>
      ),
    }] : []),
    ...(isColumnVisible("lender_name") ? [{
      accessorKey: "lender_name",
      header: "Lender Name",
      cell: ({ row }: any) => (
        <div className="flex items-center justify-start text-left">
          <Building className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{row.original.lender_name}</span>
        </div>
      ),
      sortable: true,
    }] : []),
    ...(isColumnVisible("lender_type") ? [{
      accessorKey: "lender_type",
      header: "Lender Type",
      cell: ({ row }: any) => (
        <div className="flex justify-center">
          <InlineEditLenderType
            value={row.original.lender_type}
            onValueChange={(value) => handleUpdateLender(row.original.id, { lender_type: value as "Conventional" | "Non-QM" | "Private" | "HELOC" })}
          />
        </div>
      ),
      sortable: true,
    }] : []),
    ...(isColumnVisible("account_executive") ? [{
      accessorKey: "account_executive",
      header: "Account Executive",
      cell: ({ row }: any) => (
        <div className="text-center">
          <span className="text-sm">{row.original.account_executive || "—"}</span>
        </div>
      ),
      sortable: true,
    }] : []),
    ...(isColumnVisible("contact") ? [{
      accessorKey: "contact",
      header: "AE Contact",
      cell: ({ row }: any) => (
        <div className="space-y-1 text-left">
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Mail className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{row.original.account_executive_email || "—"}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{row.original.account_executive_phone || "—"}</span>
          </div>
        </div>
      ),
    }] : []),
    ...(isColumnVisible("broker_portal_url") ? [{
      accessorKey: "broker_portal_url",
      header: "Broker Portal",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <InlineEditLink
            value={row.original.broker_portal_url}
            onValueChange={(value) => handleUpdateLender(row.original.id, { broker_portal_url: value })}
            placeholder="Portal URL"
          />
        </div>
      ),
    }] : []),
    ...(isColumnVisible("send_email") ? [{
      accessorKey: "send_email",
      header: "Send Email",
      cell: ({ row }: any) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => handleSendEmail(row.original, e)}
          disabled={!row.original.account_executive_email}
        >
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Button>
      ),
    }] : []),
  ];

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lenders</h1>
        <p className="text-xs italic text-muted-foreground/70">Manage your approved lending partners</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Lender Directory</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search lenders..."
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
              onReorderColumns={reorderColumns}
            />
            <Button 
              variant="outline" 
              onClick={handleImportLenders}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import from CSV"}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Button 
                  variant="default"
                  onClick={() => setIsBulkEmailModalOpen(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Email {selectedIds.size} Selected
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={lendersWithIndex}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
            selectable={true}
            selectedIds={Array.from(selectedIds)}
            onSelectionChange={(ids) => setSelectedIds(new Set(ids))}
            getRowId={(row) => row.id}
            onDelete={(lender) => {
              setLenderToDelete(lender);
              setIsDeleteDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>
      
      <CreateContactModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onContactCreated={handleContactCreated}
        defaultType="lender"
      />

      <LenderDetailDialog
        lender={selectedLender}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLender(null);
        }}
        onLenderUpdated={loadLenders}
      />

      <SendLenderEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setEmailModalLender(null);
        }}
        lender={emailModalLender}
      />

      <BulkLenderEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => {
          setIsBulkEmailModalOpen(false);
          setSelectedIds(new Set());
        }}
        lenders={lenders.filter(l => selectedIds.has(l.id))}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Lender?"
        description={`Are you sure you want to delete "${lenderToDelete?.lender_name}"? This action cannot be undone.`}
        onConfirm={handleDeleteLender}
        isLoading={isDeleting}
      />
    </div>
  );
}
