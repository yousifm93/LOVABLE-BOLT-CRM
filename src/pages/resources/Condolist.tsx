import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Plus, Search } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { FileUpload } from "@/components/ui/file-upload";
import { InlineEditApprovalSource } from "@/components/ui/inline-edit-approval-source";
import { InlineEditApprovalType } from "@/components/ui/inline-edit-approval-type";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Condo {
  id: string;
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  area: string | null;
  budget_file_url: string | null;
  cq_file_url: string | null;
  mip_file_url: string | null;
  approval_expiration_date: string | null;
  approval_source: string | null;
  approval_type: string | null;
  updated_at: string;
}

const approvalSourceOptions = [
  { value: "PennyMac", label: "PennyMac" },
  { value: "A&D", label: "A&D" },
  { value: "UWM", label: "UWM" }
];

const approvalTypeOptions = [
  { value: "Full", label: "Full" },
  { value: "Limited", label: "Limited" },
  { value: "Non-QM", label: "Non-QM" },
  { value: "Hard Money", label: "Hard Money" }
];

const createColumns = (
  handleUpdate: (id: string, field: string, value: any) => void
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
    accessorKey: "budget_file_url",
    header: "Budget",
    cell: ({ row }) => (
      <FileUpload
        value={row.original.budget_file_url}
        onValueChange={(url) => handleUpdate(row.original.id, "budget_file_url", url)}
        bucket="condo-documents"
        compact={true}
      />
    ),
  },
  {
    accessorKey: "cq_file_url",
    header: "CQ",
    cell: ({ row }) => (
      <FileUpload
        value={row.original.cq_file_url}
        onValueChange={(url) => handleUpdate(row.original.id, "cq_file_url", url)}
        bucket="condo-documents"
        compact={true}
      />
    ),
  },
  {
    accessorKey: "mip_file_url",
    header: "MIP",
    cell: ({ row }) => (
      <FileUpload
        value={row.original.mip_file_url}
        onValueChange={(url) => handleUpdate(row.original.id, "mip_file_url", url)}
        bucket="condo-documents"
        compact={true}
      />
    ),
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
    accessorKey: "area",
    header: "Area",
    cell: ({ row }) => (
      <Input
        value={row.original.area || ""}
        onChange={(e) => handleUpdate(row.original.id, "area", e.target.value)}
        className="border-none bg-transparent p-1 h-8 w-24"
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "approval_expiration_date",
    header: "Approval Expiration",
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
    accessorKey: "approval_source",
    header: "Approval Source",
    cell: ({ row }) => (
      <InlineEditApprovalSource
        value={row.original.approval_source}
        onValueChange={(value) => handleUpdate(row.original.id, "approval_source", value)}
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "approval_type",
    header: "Approval Type",
    cell: ({ row }) => (
      <InlineEditApprovalType
        value={row.original.approval_type}
        onValueChange={(value) => handleUpdate(row.original.id, "approval_type", value)}
      />
    ),
    sortable: true,
  },
  {
    accessorKey: "updated_at",
    header: "Updated",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.original.updated_at).toLocaleDateString()}
      </div>
    ),
    sortable: true,
  },
];

export default function Condolist() {
  const [searchTerm, setSearchTerm] = useState("");
  const [condos, setCondos] = useState<Condo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCondos();
  }, []);

  const loadCondos = async () => {
    try {
      setLoading(true);
      const data = await databaseService.getCondos();
      setCondos(data || []);
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

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await databaseService.updateCondo(id, { [field]: value });
      
      // Update local state optimistically
      setCondos(prev => prev.map(condo => 
        condo.id === id ? { ...condo, [field]: value } : condo
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

  const handleAddCondo = async () => {
    try {
      const newCondo = {
        condo_name: "New Condo",
        street_address: "",
        city: "",
        state: "",
        zip: "",
        area: "",
        approval_source: null,
        approval_type: null
      };
      
      const created = await databaseService.createCondo(newCondo);
      setCondos(prev => [created, ...prev]);
      
      toast({
        title: "Created",
        description: "New condo added successfully",
      });
    } catch (error) {
      console.error('Error creating condo:', error);
      toast({
        title: "Error",
        description: "Failed to create condo",
        variant: "destructive"
      });
    }
  };

  const columns = createColumns(handleUpdate);

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
            Approved Condominiums
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <Button onClick={handleAddCondo} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Condo
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={condos}
            searchTerm={searchTerm}
          />
        </CardContent>
      </Card>
    </div>
  );
}