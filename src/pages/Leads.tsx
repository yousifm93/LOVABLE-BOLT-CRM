import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateModern } from "@/utils/dateUtils";
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

interface Lead {
  id: string;
  name: string;
  creationDate: string;
  email: string;
  phone: string;
  referredVia: string;
  referralSource: string;
  converted: string;
  leadStrength: string;
  dueDate?: string;
}

// Transform database lead to display format  
const transformLeadToDisplay = (dbLead: DatabaseLead & { task_due_date?: string }): Lead => {
  // Migrate old lead strength values to new ones
  const migrateLeadStrength = (oldValue: string): string => {
    switch (oldValue?.toLowerCase()) {
      case 'hot': return 'High';
      case 'warm': return 'Medium';
      case 'cold': return 'Low';
      case 'qualified': return 'High';
      default: return ['High', 'Medium', 'Low'].includes(oldValue) ? oldValue : 'Medium';
    }
  };

  // Migrate old converted values to new ones
  const migrateConverted = (oldValue: string): string => {
    switch (oldValue) {
      case 'Working On It': return 'Working on it';
      case 'Pending App': return 'Working on it';
      case 'Needs Attention': return 'Working on it';
      default: return ['Working on it', 'Converted', 'Nurture', 'Dead'].includes(oldValue) ? oldValue : 'Working on it';
    }
  };

  return {
    id: dbLead.id,
    name: `${dbLead.first_name} ${dbLead.last_name}`,
    creationDate: formatDateModern(new Date(dbLead.created_at)),
    email: dbLead.email || '',
    phone: dbLead.phone || '',
    referredVia: dbLead.referred_via || 'Email',
    referralSource: dbLead.referral_source || 'Agent',
    converted: migrateConverted(dbLead.converted || 'Working on it'),
    leadStrength: migrateLeadStrength(dbLead.lead_strength || 'Medium'),
    dueDate: dbLead.task_due_date ? new Date(dbLead.task_due_date).toLocaleDateString() : ''
  };
};

// Option arrays for dropdowns
const referredViaOptions = [
  { value: "Email", label: "Email" },
  { value: "Text", label: "Text" },
  { value: "Call", label: "Call" },
  { value: "Web", label: "Web" },
  { value: "In Person", label: "In Person" },
];

const referralSourceOptions = [
  { value: "Agent", label: "Agent" },
  { value: "New Agent", label: "New Agent" },
  { value: "Past Client", label: "Past Client" },
  { value: "Personal", label: "Personal" },
  { value: "Social", label: "Social" },
  { value: "Miscellaneous", label: "Miscellaneous" },
];

const convertedOptions = [
  { value: "Working on it", label: "Working on it" },
  { value: "Converted", label: "Converted" },
  { value: "Nurture", label: "Nurture" },
  { value: "Dead", label: "Dead" },
];

const leadStrengthOptions = [
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

// Define initial column configuration
const initialColumns = [
  { id: "name", label: "Lead Name", visible: true },
  { id: "creationDate", label: "Created", visible: true },
  { id: "referredVia", label: "Referred Via", visible: true },
  { id: "referralSource", label: "Referral Source", visible: true },
  { id: "converted", label: "Status", visible: true },
  { id: "leadStrength", label: "Lead Strength", visible: true },
  { id: "dueDate", label: "Due Date", visible: true },
];

export default function Leads() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
  } = useColumnVisibility(initialColumns, 'leads-columns');

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('leads-filters');
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('leads-filters', JSON.stringify(filters));
  }, [filters]);

  // Filter columns definition for the filter builder
  const filterColumns = [
    { value: 'name', label: 'Lead Name', type: 'text' as const },
    { 
      value: 'referredVia', 
      label: 'Referred Via', 
      type: 'select' as const, 
      options: referredViaOptions.map(opt => opt.value)
    },
    { 
      value: 'referralSource', 
      label: 'Referral Source', 
      type: 'select' as const, 
      options: referralSourceOptions.map(opt => opt.value)
    },
    { 
      value: 'converted', 
      label: 'Converted', 
      type: 'select' as const, 
      options: convertedOptions.map(opt => opt.value)
    },
    { 
      value: 'leadStrength', 
      label: 'Lead Strength', 
      type: 'select' as const, 
      options: leadStrengthOptions.map(opt => opt.value)
    },
    { value: 'dueDate', label: 'Due Date', type: 'date' as const }
  ];

  // Field update handler
  const handleFieldUpdate = async (leadId: string, field: string, value: string | Date | undefined) => {
    try {
      setIsUpdating(leadId);
      
      let updateData: Partial<DatabaseLead> = {};
      
      // Map field names to database columns
      switch (field) {
        case 'referredVia':
          updateData.referred_via = value as any;
          break;
        case 'referralSource':
          updateData.referral_source = value as any;
          break;
        case 'converted':
          updateData.converted = value as any;
          break;
        case 'leadStrength':
          updateData.lead_strength = value as any;
          break;
        case 'dueDate':
          // Handle due date updates - don't update local state immediately to prevent flickering
          if (value) {
            const dateStr = value instanceof Date ? value.toISOString().split('T')[0] : value;
            // For now, we'll just show success and let the next data refresh handle the display
            toast({
              title: "Due date updated",
              description: "Task deadline has been set",
            });
            setIsUpdating(null);
            return;
          } else {
            toast({
              title: "Due date cleared", 
              description: "Task deadline has been removed",
            });
            setIsUpdating(null);
            return;
          }
        default:
          setIsUpdating(null);
          return;
      }

      if (Object.keys(updateData).length > 0) {
        // Update database first
        await databaseService.updateLead(leadId, updateData);
        
        // Then refresh data to ensure consistency
        await loadLeads();

        toast({
          title: "Lead updated",
          description: "Changes have been saved",
        });
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Apply advanced filters
  const applyAdvancedFilters = (leads: Lead[], filters: FilterCondition[]) => {
    return leads.filter(lead => {
      return filters.every(filter => {
        let leadValue: any;
        
        switch (filter.column) {
          case 'name':
            leadValue = lead.name;
            break;
          case 'referredVia':
            leadValue = lead.referredVia;
            break;
          case 'referralSource':
            leadValue = lead.referralSource;
            break;
          case 'converted':
            leadValue = lead.converted;
            break;
          case 'leadStrength':
            leadValue = lead.leadStrength;
            break;
          case 'dueDate':
            leadValue = lead.dueDate || '';
            break;
          default:
            return true;
        }

        switch (filter.operator) {
          case 'is':
            return leadValue === filter.value;
          case 'is_not':
            return leadValue !== filter.value;
          case 'contains':
            return leadValue?.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
          default:
            return true;
        }
      });
    });
  };

  // Filter leads by search term and advanced filters
  const filteredLeads = (() => {
    let result = leads;

    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(lead => 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.phone.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply advanced filters
    if (filters.length > 0) {
      result = applyAdvancedFilters(result, filters);
    }
    
    return result;
  })();

  const clearAllFilters = () => {
    setFilters([]);
    setSearchTerm("");
  };

  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId));
  };

  // Delete handler
  const handleDelete = async (lead: Lead) => {
    setDeleteLeadId(lead.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      setLeads(prev => prev.filter(lead => lead.id !== deleteLeadId));
      toast({
        title: "Success",
        description: "Lead deleted.",
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setDeleteLeadId(null);
    }
  };

  // Columns definition with inline editing and normalized widths
  const allColumns: ColumnDef<Lead>[] = [
    {
      accessorKey: "name",
      header: "Lead Name",
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
      accessorKey: "creationDate",
      header: "Creation Date",
      sortable: true,
    },
    {
      accessorKey: "referredVia",
      header: "Referred Via",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referredVia}
            options={referredViaOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'referredVia', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
            forceGrayBadge={true}
            fixedWidth="w-24"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "referralSource",
      header: "Referral Source",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referralSource}
            options={referralSourceOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'referralSource', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
            fixedWidth="w-32"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "converted",
      header: "Converted",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.converted}
            options={convertedOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'converted', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
            fixedWidth="w-36"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "leadStrength",
      header: "Lead Strength",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.leadStrength}
            options={leadStrengthOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'leadStrength', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
            fixedWidth="w-20"
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditDate
            value={row.original.dueDate ? new Date(row.original.dueDate) : undefined}
            onValueChange={(date) => handleFieldUpdate(row.original.id, 'dueDate', date)}
            placeholder="Set due date"
            disabled={isUpdating === row.original.id}
          />
        </div>
      ),
      sortable: true,
    },
  ];

  // Filter columns based on visibility settings
  const visibleColumnIds = new Set(visibleColumns.map(col => col.id));
  const columns = allColumns.filter(col => visibleColumnIds.has(col.accessorKey as string));

  // Load leads on component mount with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await loadLeads();
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsDrawerOpen(false);
      setSelectedClient(null);
      setIsCreateModalOpen(false);
    };
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const dbLeads = await databaseService.getLeadsWithTaskDueDates();
      const transformedLeads = dbLeads.map(transformLeadToDisplay);
      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeadCreated = async () => {
    console.log('Lead created, refreshing data...');
    await loadLeads();
    toast({
      title: "Success",
      description: "Lead created and data refreshed",
    });
  };

  const handleRowClick = (lead: Lead) => {
    // Convert Lead to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: Number(lead.id) || Date.now(),
        firstName: lead.name.split(' ')[0],
        lastName: lead.name.split(' ').slice(1).join(' '),
        email: lead.email,
        phoneMobile: lead.phone
      },
      loan: {
        loanAmount: "$0",
        loanType: "Purchase",
        prType: "Primary Residence"
      },
      ops: {
        stage: "leads",
        status: lead.converted,
        priority: "Medium",
        referralSource: lead.referralSource
      },
      dates: {
        createdOn: new Date().toISOString()
      },
      meta: {},
      name: lead.name,
      creditScore: 750
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = async (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
    setSelectedClient(null);
    // Refresh data after stage change
    await loadLeads();
  };

  const handleDrawerClose = () => {
    console.log('Closing drawer and cleaning up state');
    setIsDrawerOpen(false);
    setSelectedClient(null);
  };

  return (
    <ErrorBoundary>
      <div className="pl-4 pr-0 pt-2 pb-0">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-xs italic text-muted-foreground/70">
              Prospective clients and new business opportunities
              {filters.length > 0 && (
                <span className="ml-2 text-primary">
                  • {filters.length} filter{filters.length > 1 ? 's' : ''} active
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter Chips */}
        {filters.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Badge key={filter.id} variant="secondary" className="flex items-center gap-2">
                <span className="text-xs">
                  {filterColumns.find(col => col.value === filter.column)?.label} {filter.operator} {typeof filter.value === 'string' ? filter.value : 'Date'}
                </span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-xs h-6"
            >
              Clear All
            </Button>
          </div>
        )}

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <Button 
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Lead
            </Button>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {filters.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {filters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[32rem] bg-background border border-border shadow-lg z-50" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filter Leads</h4>
                    {filters.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearAllFilters}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <FilterBuilder
                    filters={filters}
                    onFiltersChange={setFilters}
                    columns={filterColumns}
                  />
                </div>
              </PopoverContent>
            </Popover>
            
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
            data={filteredLeads}
            searchTerm=""
            onRowClick={() => {}} // Disable generic row click
            onViewDetails={handleRowClick}
            onEdit={handleRowClick}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <CreateLeadModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onLeadCreated={handleLeadCreated}
      />

      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onStageChange={handleStageChange}
          pipelineType="leads"
        />
      )}

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}