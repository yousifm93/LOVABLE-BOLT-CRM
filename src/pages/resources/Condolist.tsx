import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Plus, Search, Filter } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditBoolean } from "@/components/ui/inline-edit-boolean";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CondoDetailDrawer } from "@/components/CondoDetailDrawer";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Condo {
  id: string;
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source_uwm: boolean | null;
  source_ad: boolean | null;
  review_type: string | null;
  approval_expiration_date: string | null;
  primary_down: string | null;
  second_down: string | null;
  investment_down: string | null;
  updated_at: string;
}

const reviewTypeOptions = [
  { value: "Non-QM Limited", label: "Non-QM Limited" },
  { value: "Non-QM Full", label: "Non-QM Full" },
  { value: "Conventional Limited", label: "Conventional Limited" },
  { value: "Conventional Full", label: "Conventional Full" },
  { value: "Restricted", label: "Restricted" }
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
        <InlineEditBoolean
          value={row.original.source_uwm}
          onValueChange={(value) => handleUpdate(row.original.id, "source_uwm", value)}
        />
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "source_ad",
    header: "A&D",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <InlineEditBoolean
          value={row.original.source_ad}
          onValueChange={(value) => handleUpdate(row.original.id, "source_ad", value)}
        />
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
];

export default function Condolist() {
  const [searchTerm, setSearchTerm] = useState("");
  const [condos, setCondos] = useState<Condo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetMarketFilter, setTargetMarketFilter] = useState<string>("all");
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>("all");
  const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
        source_uwm: false,
        source_ad: false,
        review_type: null,
        primary_down: null,
        second_down: null,
        investment_down: null
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

  const handleViewDetails = (condo: Condo) => {
    setSelectedCondo(condo);
    setIsDrawerOpen(true);
  };

  // Filter condos based on selected filters
  const filteredCondos = useMemo(() => {
    let result = condos;
    
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
    
    return result;
  }, [condos, targetMarketFilter, reviewTypeFilter]);

  const columns = createColumns(handleUpdate);

  const activeFiltersCount = [
    targetMarketFilter !== "all",
    reviewTypeFilter !== "all"
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

            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setTargetMarketFilter("all");
                  setReviewTypeFilter("all");
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
            <Button onClick={handleAddCondo} className="flex items-center gap-2">
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

      <CondoDetailDrawer
        condo={selectedCondo}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCondoUpdated={loadCondos}
      />
    </div>
  );
}
