import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Plus, Search, Filter, CheckCircle, Clock } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CondoDetailDialog } from "@/components/CondoDetailDialog";
import { CondoDocumentUpload } from "@/components/ui/condo-document-upload";
import { DocumentPreviewModal } from "@/components/lead-details/DocumentPreviewModal";
import { CreateCondoModal } from "@/components/modals/CreateCondoModal";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Condo {
  id: string;
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source_uwm: boolean | null;
  source_ad: boolean | null;
  past_mb_closing: boolean | null;
  review_type: string | null;
  approval_expiration_date: string | null;
  primary_down: string | null;
  second_down: string | null;
  investment_down: string | null;
  budget_doc: string | null;
  mip_doc: string | null;
  cq_doc: string | null;
  budget_doc_uploaded_at: string | null;
  mip_doc_uploaded_at: string | null;
  cq_doc_uploaded_at: string | null;
  updated_at: string;
  updated_by: string | null;
  updated_by_name?: string | null;
}

const reviewTypeOptions = [
  { value: "Non-QM Limited", label: "Non-QM Limited" },
  { value: "Non-QM Full", label: "Non-QM Full" },
  { value: "Conventional Limited", label: "Conventional Limited" },
  { value: "Conventional Full", label: "Conventional Full" },
  { value: "Restricted", label: "Restricted" }
];

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return "—";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "—";
  }
};

const createColumns = (
  handleUpdate: (id: string, field: string, value: any) => void,
  handleDocUpdate: (id: string, field: string, path: string | null, uploadedAt?: string, uploadedBy?: string) => void,
  onPreview: (url: string, fileName: string) => void
): ColumnDef<Condo>[] => [
  {
    accessorKey: "condo_name",
    header: "Condo Name",
    cell: ({ row }) => (
      <Input
        value={row.original.condo_name}
        onChange={(e) => handleUpdate(row.original.id, "condo_name", e.target.value)}
        className="border-none bg-transparent p-1 h-8"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "street_address",
    header: "Street Address",
    cell: ({ row }) => (
      <Input
        value={row.original.street_address || ""}
        onChange={(e) => handleUpdate(row.original.id, "street_address", e.target.value)}
        className="border-none bg-transparent p-1 h-8 w-40"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => (
      <Input
        value={row.original.city || ""}
        onChange={(e) => handleUpdate(row.original.id, "city", e.target.value)}
        className="border-none bg-transparent p-1 h-8 w-24"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => (
      <Input
        value={row.original.state || ""}
        onChange={(e) => handleUpdate(row.original.id, "state", e.target.value)}
        className="border-none bg-transparent p-1 h-8 w-16"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "zip",
    header: "Zip",
    cell: ({ row }) => (
      <Input
        value={row.original.zip || ""}
        onChange={(e) => handleUpdate(row.original.id, "zip", e.target.value)}
        className="border-none bg-transparent p-1 h-8 w-20"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "source_uwm",
    header: "UWM",
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.source_uwm ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "source_ad",
    header: "A&D",
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.source_ad ? (
          <CheckCircle className="h-4 w-4 text-amber-600" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "past_mb_closing",
    header: "Past MB",
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.past_mb_closing ? (
          <CheckCircle className="h-4 w-4 text-blue-600" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "review_type",
    header: "Review Type",
    cell: ({ row }) => (
      <InlineEditSelect
        value={row.original.review_type}
        onValueChange={(value) => handleUpdate(row.original.id, "review_type", value)}
        options={reviewTypeOptions}
        placeholder="-"
        className="text-xs"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "approval_expiration_date",
    header: "Expiration",
    cell: ({ row }) => (
      <InlineEditDate
        value={row.original.approval_expiration_date}
        onValueChange={(date) => 
          handleUpdate(row.original.id, "approval_expiration_date", date?.toISOString().split('T')[0] || null)
        }
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "primary_down",
    header: "Primary",
    cell: ({ row }) => {
      const numValue = row.original.primary_down 
        ? parseInt(row.original.primary_down.replace('%', '')) 
        : null;
      return (
        <InlineEditNumber
          value={numValue}
          onValueChange={(value) => handleUpdate(row.original.id, "primary_down", `${value}%`)}
          suffix="%"
          min={0}
          max={100}
        />
      );
    },
    sortable: true,
  },
  {
    accessorKey: "second_down",
    header: "Second",
    cell: ({ row }) => {
      const numValue = row.original.second_down 
        ? parseInt(row.original.second_down.replace('%', '')) 
        : null;
      return (
        <InlineEditNumber
          value={numValue}
          onValueChange={(value) => handleUpdate(row.original.id, "second_down", `${value}%`)}
          suffix="%"
          min={0}
          max={100}
        />
      );
    },
    sortable: true,
  },
  {
    accessorKey: "investment_down",
    header: "Investment",
    cell: ({ row }) => {
      const numValue = row.original.investment_down 
        ? parseInt(row.original.investment_down.replace('%', '')) 
        : null;
      return (
        <InlineEditNumber
          value={numValue}
          onValueChange={(value) => handleUpdate(row.original.id, "investment_down", `${value}%`)}
          suffix="%"
          min={0}
          max={100}
        />
      );
    },
    sortable: true,
  },
  {
    accessorKey: "budget_doc",
    header: "Budget",
    cell: ({ row }) => (
      <CondoDocumentUpload
        condoId={row.original.id}
        fieldName="budget_doc"
        currentFile={row.original.budget_doc}
        uploadedAt={row.original.budget_doc_uploaded_at}
        onUpload={(path, uploadedAt, uploadedBy) => handleDocUpdate(row.original.id, "budget_doc", path, uploadedAt, uploadedBy)}
        onPreview={onPreview}
        compact={true}
      />
    ),
  },
  {
    accessorKey: "mip_doc",
    header: "MIP",
    cell: ({ row }) => (
      <CondoDocumentUpload
        condoId={row.original.id}
        fieldName="mip_doc"
        currentFile={row.original.mip_doc}
        uploadedAt={row.original.mip_doc_uploaded_at}
        onUpload={(path, uploadedAt, uploadedBy) => handleDocUpdate(row.original.id, "mip_doc", path, uploadedAt, uploadedBy)}
        onPreview={onPreview}
        compact={true}
      />
    ),
  },
  {
    accessorKey: "cq_doc",
    header: "CQ",
    cell: ({ row }) => (
      <CondoDocumentUpload
        condoId={row.original.id}
        fieldName="cq_doc"
        currentFile={row.original.cq_doc}
        uploadedAt={row.original.cq_doc_uploaded_at}
        onUpload={(path, uploadedAt, uploadedBy) => handleDocUpdate(row.original.id, "cq_doc", path, uploadedAt, uploadedBy)}
        onPreview={onPreview}
        compact={true}
      />
    ),
  },
  {
    accessorKey: "updated_at",
    header: "Last Updated",
    cell: ({ row }) => {
      const date = row.original.updated_at;
      const updatedBy = row.original.updated_by_name;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(date)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{new Date(date).toLocaleString()}</p>
            {updatedBy && <p className="text-muted-foreground">by {updatedBy}</p>}
          </TooltipContent>
        </Tooltip>
      );
    },
    sortable: true,
  },
];

export default function Condolist() {
  const [searchTerm, setSearchTerm] = useState("");
  const [condos, setCondos] = useState<Condo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetMarketFilter, setTargetMarketFilter] = useState<string>("all");
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>("all");
  const [uwmFilter, setUwmFilter] = useState<string>("all");
  const [adFilter, setAdFilter] = useState<string>("all");
  const [pastMbFilter, setPastMbFilter] = useState<string>("all");
  const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Document preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewPdfData, setPreviewPdfData] = useState<ArrayBuffer | null>(null);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [condoToDelete, setCondoToDelete] = useState<Condo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadCondos();
  }, []);

  const loadCondos = async () => {
    try {
      setLoading(true);
      const PAGE_SIZE = 1000;
      let allCondos: any[] = [];
      let hasMore = true;
      let offset = 0;

      // Fetch all condos with pagination to bypass the 1000 row limit
      while (hasMore) {
        const { data, error } = await supabase
          .from('condos')
          .select(`
            *,
            updated_by_user:users!condos_updated_by_fkey(first_name, last_name)
          `)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allCondos = [...allCondos, ...data];
          offset += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      // Transform data to include updated_by_name
      const transformedData = allCondos.map((condo: any) => ({
        ...condo,
        updated_by_name: condo.updated_by_user 
          ? `${condo.updated_by_user.first_name || ''} ${condo.updated_by_user.last_name || ''}`.trim()
          : null,
        updated_by_user: undefined, // Remove the nested object
      }));
      
      setCondos(transformedData);
    } catch (error) {
      console.error('Error loading condos:', error);
      toast({
        title: "Error",
        description: "Failed to load condos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;
    
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    
    return data?.id || null;
  };

  const logCondoChange = async (condoId: string, field: string, oldValue: any, newValue: any) => {
    const userId = await getCurrentUserId();
    try {
      await supabase.from('condo_change_logs').insert({
        condo_id: condoId,
        field_name: field,
        old_value: oldValue?.toString() || null,
        new_value: newValue?.toString() || null,
        changed_by: userId
      });
    } catch (error) {
      console.error('Error logging condo change:', error);
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    const condo = condos.find(c => c.id === id);
    const oldValue = condo?.[field as keyof Condo];
    
    // Skip if value hasn't changed
    if (oldValue === value) return;
    
    try {
      const userId = await getCurrentUserId();
      await databaseService.updateCondo(id, { [field]: value, updated_by: userId });
      
      // Log the change
      await logCondoChange(id, field, oldValue, value);
      
      // Update local state optimistically
      setCondos(prev => prev.map(condo => 
        condo.id === id ? { ...condo, [field]: value, updated_at: new Date().toISOString() } : condo
      ));

      toast({
        title: "Updated",
        description: "Condo updated successfully",
      });
    } catch (error) {
      console.error('Error updating condo:', error);
      toast({
        title: "Error", 
        description: "Failed to update condo",
        variant: "destructive"
      });
      loadCondos();
    }
  };

  const handleDocUpdate = async (
    id: string, 
    field: string, 
    path: string | null, 
    uploadedAt?: string, 
    uploadedBy?: string
  ) => {
    const condo = condos.find(c => c.id === id);
    const oldValue = condo?.[field as keyof Condo];
    
    try {
      const userId = await getCurrentUserId();
      const updates: Record<string, any> = { [field]: path, updated_by: userId };
      
      // Add metadata fields if provided
      if (uploadedAt) {
        updates[`${field}_uploaded_at`] = uploadedAt;
      }
      if (uploadedBy) {
        updates[`${field}_uploaded_by`] = uploadedBy;
      }
      
      // If path is null (delete), clear metadata too
      if (path === null) {
        updates[`${field}_uploaded_at`] = null;
        updates[`${field}_uploaded_by`] = null;
      }
      
      await databaseService.updateCondo(id, updates);
      
      // Log the change
      await logCondoChange(id, field, oldValue ? 'document' : null, path ? 'document uploaded' : null);
      
      // Update local state
      setCondos(prev => prev.map(condo => 
        condo.id === id ? { ...condo, ...updates, updated_at: new Date().toISOString() } : condo
      ));

      toast({
        title: path ? "Uploaded" : "Deleted",
        description: path ? "Document uploaded successfully" : "Document removed",
      });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error", 
        description: "Failed to update document",
        variant: "destructive"
      });
      loadCondos();
    }
  };

  const handlePreview = async (url: string, fileName: string) => {
    setPreviewFileName(fileName);
    setPreviewUrl(url);
    setPreviewPdfData(null);
    setPreviewOpen(true);
    
    // Fetch PDF data for preview
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      setPreviewPdfData(arrayBuffer);
    } catch (error) {
      console.error('Error fetching PDF:', error);
    }
  };

  const handleViewDetails = (condo: Condo) => {
    setSelectedCondo(condo);
    setIsDialogOpen(true);
  };

  const handleDeleteCondo = async () => {
    if (!condoToDelete) return;
    
    setIsDeleting(true);
    try {
      const userId = await getCurrentUserId();
      
      // Soft delete - set deleted_at and deleted_by
      const { error } = await supabase
        .from('condos')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: userId 
        })
        .eq('id', condoToDelete.id);
      
      if (error) throw error;
      
      // Remove from local state
      setCondos(prev => prev.filter(c => c.id !== condoToDelete.id));
      
      toast({
        title: "Condo deleted",
        description: `"${condoToDelete.condo_name}" has been moved to deleted items`,
      });
    } catch (error) {
      console.error('Error deleting condo:', error);
      toast({
        title: "Error",
        description: "Failed to delete condo",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCondoToDelete(null);
    }
  };

  const initiateDeleteCondo = (condo: Condo) => {
    setCondoToDelete(condo);
    setDeleteDialogOpen(true);
  };

  // Filter and sort condos (most recently updated first)
  const filteredCondos = useMemo(() => {
    let result = condos;
    
    // UWM filter
    if (uwmFilter === "yes") {
      result = result.filter(condo => condo.source_uwm === true);
    } else if (uwmFilter === "no") {
      result = result.filter(condo => condo.source_uwm !== true);
    }
    
    // A&D filter
    if (adFilter === "yes") {
      result = result.filter(condo => condo.source_ad === true);
    } else if (adFilter === "no") {
      result = result.filter(condo => condo.source_ad !== true);
    }
    
    // Past MB Closing filter
    if (pastMbFilter === "yes") {
      result = result.filter(condo => condo.past_mb_closing === true);
    } else if (pastMbFilter === "no") {
      result = result.filter(condo => condo.past_mb_closing !== true);
    }
    
    // Target Market filter (zip codes 33125-33181)
    if (targetMarketFilter === "target") {
      result = result.filter(condo => {
        if (!condo.zip) return false;
        const zipNum = parseInt(condo.zip, 10);
        return zipNum >= 33125 && zipNum <= 33181;
      });
    }
    
    // Review Type filter
    if (reviewTypeFilter !== "all") {
      result = result.filter(condo => condo.review_type === reviewTypeFilter);
    }
    
    // Sort by updated_at DESC (already sorted from DB, but re-sort for local updates)
    return result.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [condos, targetMarketFilter, reviewTypeFilter, uwmFilter, adFilter, pastMbFilter]);

  const columns = createColumns(handleUpdate, handleDocUpdate, handlePreview);

  const activeFiltersCount = [
    targetMarketFilter !== "all",
    reviewTypeFilter !== "all",
    uwmFilter !== "all",
    adFilter !== "all",
    pastMbFilter !== "all"
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Condolist</h1>
          <p className="text-muted-foreground">Approved condominium directory</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading condos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Condolist</h1>
        <p className="text-muted-foreground">Approved condominium directory</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2 text-primary" />
            Approved Condominiums ({filteredCondos.length})
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (filtered from {condos.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filters:</span>
            </div>
            
            <Select value={targetMarketFilter} onValueChange={setTargetMarketFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Target Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zip Codes</SelectItem>
                <SelectItem value="target">Target Market (33125-33181)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={uwmFilter} onValueChange={setUwmFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="UWM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All UWM</SelectItem>
                <SelectItem value="yes">UWM Approved</SelectItem>
                <SelectItem value="no">Not UWM</SelectItem>
              </SelectContent>
            </Select>

            <Select value={adFilter} onValueChange={setAdFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="A&D" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All A&D</SelectItem>
                <SelectItem value="yes">A&D Approved</SelectItem>
                <SelectItem value="no">Not A&D</SelectItem>
              </SelectContent>
            </Select>

            <Select value={reviewTypeFilter} onValueChange={setReviewTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Review Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Review Types</SelectItem>
                <SelectItem value="Non-QM Limited">Non-QM Limited</SelectItem>
                <SelectItem value="Non-QM Full">Non-QM Full</SelectItem>
                <SelectItem value="Conventional Limited">Conventional Limited</SelectItem>
                <SelectItem value="Conventional Full">Conventional Full</SelectItem>
                <SelectItem value="Restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pastMbFilter} onValueChange={setPastMbFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Past MB" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Past MB</SelectItem>
                <SelectItem value="yes">Past MB ✓</SelectItem>
                <SelectItem value="no">No History</SelectItem>
              </SelectContent>
            </Select>

            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setTargetMarketFilter("all");
                  setReviewTypeFilter("all");
                  setUwmFilter("all");
                  setAdFilter("all");
                  setPastMbFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Search and Add Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search condos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Condo
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={filteredCondos}
            searchTerm={searchTerm}
            pageSize={15}
            showRowNumbers={true}
            selectable={true}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            getRowId={(row) => row.id}
            onViewDetails={handleViewDetails}
            limitedActions={true}
          />
        </CardContent>
      </Card>

      <CondoDetailDialog
        condo={selectedCondo}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCondoUpdated={loadCondos}
        onPreview={handlePreview}
        onDelete={initiateDeleteCondo}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Condo?"
        description={`Are you sure you want to delete "${condoToDelete?.condo_name}"? This condo will be moved to Deleted Items and can be restored later.`}
        onConfirm={handleDeleteCondo}
        isLoading={isDeleting}
      />

      <CreateCondoModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCondoCreated={loadCondos}
      />

      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentName={previewFileName}
        documentUrl={previewUrl}
        mimeType="application/pdf"
        pdfData={previewPdfData || undefined}
      />
    </div>
  );
}
