import { useState, useEffect, useMemo } from "react";
import { Plus, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { ColumnVisibilityButton } from "@/components/ui/column-visibility-button";
import { ViewPills } from "@/components/ui/view-pills";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreateLeadModalModern } from "@/components/modals/CreateLeadModalModern";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { databaseService, Lead, BuyerAgent, User } from "@/services/database";
import { transformLeadToClient } from "@/utils/clientTransform";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Main view default columns
const MAIN_VIEW_COLUMNS = [
  "name",
  "leadCreatedOn",
  "referredVia",
  "referralSource",
  "realEstateAgent",
  "mdStatus",
  "user",
  "dueDate"
];

// Map database field names to frontend accessorKey names
const FIELD_NAME_MAP: Record<string, string> = {
  'first_name': 'name',
  'buyer_agent_id': 'realEstateAgent',
  'converted': 'mdStatus',
  'teammate_assigned': 'user',
  'task_eta': 'dueDate',
  'created_at': 'leadCreatedOn',
  'referred_via': 'referredVia',
  'referral_source': 'referralSource',
};

interface ModernLead extends Lead {
  buyer_agent?: BuyerAgent | null;
  teammate?: User | null;
  pipeline_stage?: any;
}

// Display type for table rows
type DisplayLead = {
  id: string;
  name: string;
  leadCreatedOn: string;
  realEstateAgent: string;
  realEstateAgentData?: any;
  mdStatus: string;
  user: string;
  userData?: any;
  dueDate?: string;
  referredVia: string;
  referralSource: string;
  [key: string]: any;
};

const CONVERTED_OPTIONS = [
  { value: 'Working on it', label: 'Working on it' },
  { value: 'Pending App', label: 'Pending App' },
  { value: 'Nurture', label: 'Nurture' },
  { value: 'Dead', label: 'Dead' },
  { value: 'Needs Attention', label: 'Needs Attention' },
];

const REFERRED_VIA_OPTIONS = [
  { value: 'Email', label: 'Email' },
  { value: 'Text', label: 'Text' },
  { value: 'Call', label: 'Call' },
  { value: 'Web', label: 'Web' },
  { value: 'In Person', label: 'In Person' },
];

const REFERRAL_SOURCE_OPTIONS = [
  { value: 'Agent', label: 'Agent' },
  { value: 'New Agent', label: 'New Agent' },
  { value: 'Past Client', label: 'Past Client' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Social', label: 'Social' },
  { value: 'Miscellaneous', label: 'Miscellaneous' },
];

export function LeadsModern() {
  // Core columns for the table
  const coreColumns = [
    { id: "name", label: "Lead Name", visible: true },
    { id: "leadCreatedOn", label: "Lead Created On", visible: true },
    { id: "realEstateAgent", label: "Real Estate Agent", visible: true },
    { id: "referredVia", label: "Referred Via", visible: false },
    { id: "referralSource", label: "Referral Source", visible: false },
    { id: "mdStatus", label: "MD Status", visible: true },
    { id: "dueDate", label: "Due Date", visible: true },
    { id: "user", label: "User", visible: true },
  ];

  const [leads, setLeads] = useState<ModernLead[]>([]);
  const [dbLeadsMap, setDbLeadsMap] = useState<Map<string, ModernLead>>(new Map());
  const [buyerAgents, setBuyerAgents] = useState<BuyerAgent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ModernLead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Use column visibility
  const {
    columns: columnVisibility,
    views,
    visibleColumns,
    activeView,
    isMainViewActive,
    toggleColumn,
    toggleAll,
    saveView,
    loadView,
    deleteView,
    reorderColumns,
    setColumns,
    setActiveView
  } = useColumnVisibility(coreColumns, 'leads-columns', 'leads');

  const handleViewSaved = (viewName: string) => {
    toast({
      title: "View Saved",
      description: `"${viewName}" has been saved successfully`,
    });
    loadView(viewName);
  };

  // Auto-load Main View on initial mount
  useEffect(() => {
    const hasCustomization = localStorage.getItem('leads-columns');
    
    if (!activeView && !hasCustomization) {
      const orderedMainColumns = MAIN_VIEW_COLUMNS
        .map(id => columnVisibility.find(col => col.id === id))
        .filter((col): col is { id: string; label: string; visible: boolean } => col !== undefined)
        .map(col => ({ ...col, visible: true }));
      
      const existingIds = new Set(MAIN_VIEW_COLUMNS);
      const remainingColumns = columnVisibility
        .filter(col => !existingIds.has(col.id))
        .map(col => ({ ...col, visible: false }));
      
      const newColumnOrder = [...orderedMainColumns, ...remainingColumns];
      setColumns(newColumnOrder);
      setActiveView("Main View");
    }
  }, []);

  const handleColumnReorder = (oldIndex: number, newIndex: number) => {
    const oldColumnId = visibleColumns[oldIndex]?.id;
    const newColumnId = visibleColumns[newIndex]?.id;
    
    if (!oldColumnId || !newColumnId) return;
    
    const actualOldIndex = columnVisibility.findIndex(col => col.id === oldColumnId);
    const actualNewIndex = columnVisibility.findIndex(col => col.id === newColumnId);
    
    if (actualOldIndex === -1 || actualNewIndex === -1) return;
    
    reorderColumns(actualOldIndex, actualNewIndex);
    
    toast({
      title: "Column Reordered",
      description: "Table column order has been updated",
    });
  };

  // Filter columns definition with proper types and options
  const filterColumns = [
    { value: 'first_name', label: 'First Name', type: 'text' as const },
    { value: 'last_name', label: 'Last Name', type: 'text' as const },
    { value: 'email', label: 'Email', type: 'text' as const },
    { value: 'phone', label: 'Phone', type: 'text' as const },
    { value: 'converted', label: 'Status', type: 'select' as const, options: CONVERTED_OPTIONS.map(o => o.value) },
    { value: 'referred_via', label: 'Referred Via', type: 'select' as const, options: REFERRED_VIA_OPTIONS.map(o => o.value) },
    { value: 'referral_source', label: 'Referral Source', type: 'select' as const, options: REFERRAL_SOURCE_OPTIONS.map(o => o.value) },
    { value: 'lead_strength', label: 'Lead Strength', type: 'select' as const, options: ['Hot', 'Warm', 'Cold'] },
    { value: 'likely_to_apply', label: 'Likely to Apply', type: 'select' as const, options: ['Very Likely', 'Likely', 'Unlikely', 'Very Unlikely'] },
    { value: 'loan_type', label: 'Loan Type', type: 'select' as const, options: ['Purchase', 'Refinance', 'Cash Out Refinance', 'HELOC', 'Construction', 'VA Loan', 'FHA Loan', 'Conventional', 'Jumbo'] },
    { value: 'loan_amount', label: 'Loan Amount', type: 'number' as const },
    { value: 'fico_score', label: 'Credit Score', type: 'number' as const },
    { value: 'created_at', label: 'Created Date', type: 'date' as const },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, agentsData, usersData] = await Promise.all([
        databaseService.getNewLeads(),
        databaseService.getBuyerAgents(),
        databaseService.getUsers(),
      ]);
      
      const agentsMap = new Map(agentsData?.map(a => [a.id, a]) || []);
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
      
      const enrichedLeads = (leadsData as unknown as ModernLead[] || []).map(lead => ({
        ...lead,
        buyer_agent: lead.buyer_agent_id ? agentsMap.get(lead.buyer_agent_id) : null,
        teammate: lead.teammate_assigned ? usersMap.get(lead.teammate_assigned) : null,
      }));
      
      setLeads(enrichedLeads);
      
      const newDbLeadsMap = new Map<string, ModernLead>();
      enrichedLeads.forEach(lead => {
        newDbLeadsMap.set(lead.id, lead);
      });
      setDbLeadsMap(newDbLeadsMap);
      
      setBuyerAgents(agentsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLead = async (leadId: string, field: string, value: any) => {
    const key = `${leadId}:${field}`;
    try {
      let sanitizedValue = value;
      if (field === 'task_eta') {
        if (value instanceof Date) {
          sanitizedValue = format(value, 'yyyy-MM-dd');
        } else if (typeof value === 'string' && value) {
          sanitizedValue = value;
        } else if (!value) {
          sanitizedValue = null;
        }
      }
      if (field === 'buyer_agent_id') {
        if (sanitizedValue === '' || sanitizedValue === undefined) sanitizedValue = null;
        if (sanitizedValue !== null && typeof sanitizedValue !== 'string') {
          sanitizedValue = null;
        }
      }

      const updateData: any = { [field]: sanitizedValue };
      setUpdatingKey(key);

      await databaseService.updateLead(leadId, updateData);
      
      setLeads(prev => prev.map(lead => {
        if (lead.id !== leadId) return lead;
        
        if (field === 'buyer_agent_id') {
          const agentObj = sanitizedValue ? buyerAgents.find(a => a.id === sanitizedValue) : null;
          return { 
            ...lead, 
            buyer_agent_id: sanitizedValue,
            buyer_agent: agentObj || null
          } as ModernLead;
        }
        
        if (field === 'teammate_assigned') {
          const userObj = sanitizedValue ? users.find(u => u.id === sanitizedValue) : null;
          return {
            ...lead,
            teammate_assigned: sanitizedValue,
            teammate: userObj || null
          } as ModernLead;
        }
        
        return { ...lead, [field]: sanitizedValue } as ModernLead;
      }));
      
      setDbLeadsMap(prev => {
        const newMap = new Map(prev);
        const existingLead = newMap.get(leadId);
        if (existingLead) {
          if (field === 'buyer_agent_id') {
            const agentObj = sanitizedValue ? buyerAgents.find(a => a.id === sanitizedValue) : null;
            newMap.set(leadId, {
              ...existingLead,
              buyer_agent_id: sanitizedValue,
              buyer_agent: agentObj || null
            });
          } else if (field === 'teammate_assigned') {
            const userObj = sanitizedValue ? users.find(u => u.id === sanitizedValue) : null;
            newMap.set(leadId, {
              ...existingLead,
              teammate_assigned: sanitizedValue,
              teammate: userObj || null
            });
          } else {
            newMap.set(leadId, { ...existingLead, [field]: sanitizedValue });
          }
        }
        return newMap;
      });
      
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating lead:', { error, leadId, field, value });
      toast({
        title: "Error",
        description: error?.message ? String(error.message) : "Failed to update lead",
        variant: "destructive",
      });
    } finally {
      setUpdatingKey(prev => (prev === key ? null : prev));
    }
  };

  const handleRowClick = (lead: DisplayLead) => {
    const dbLead = dbLeadsMap.get(lead.id);
    if (!dbLead) {
      console.error('Database lead not found for ID:', lead.id);
      toast({
        title: "Error",
        description: "Could not load lead details. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    const crmClient = transformLeadToClient(dbLead);
    
    setSelectedLead(crmClient as any);
    setShowDetailDrawer(true);
  };

  const buyerAgentOptions = buyerAgents.map(agent => ({
    value: agent.id,
    label: `${agent.first_name} ${agent.last_name} (${agent.brokerage})`
  }));

  const teamOptions = users.map(user => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name}`
  }));

  const clearAllFilters = () => {
    setFilters([]);
    setIsFilterOpen(false);
  };
  
  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  // Load Main View configuration
  const loadMainView = () => {
    const orderedMainColumns = MAIN_VIEW_COLUMNS
      .map(id => columnVisibility.find(col => col.id === id))
      .filter((col): col is { id: string; label: string; visible: boolean } => col !== undefined)
      .map(col => ({ ...col, visible: true }));
    
    const existingIds = new Set(MAIN_VIEW_COLUMNS);
    const remainingColumns = columnVisibility
      .filter(col => !existingIds.has(col.id))
      .map(col => ({ ...col, visible: false }));
    
    const newColumnOrder = [...orderedMainColumns, ...remainingColumns];
    setColumns(newColumnOrder);
    setActiveView("Main View");
    
    toast({
      title: "Main View Loaded",
      description: "Default column configuration restored"
    });
  };

  // Transform leads to display format
  const displayData: DisplayLead[] = leads.map((lead: any) => ({
    id: lead.id,
    name: `${lead.first_name} ${lead.last_name}`,
    leadCreatedOn: lead.created_at,
    realEstateAgent: lead.buyer_agent_id || '',
    realEstateAgentData: lead.buyer_agent || null,
    referredVia: lead.referred_via || '',
    referralSource: lead.referral_source || '',
    mdStatus: lead.converted || '',
    dueDate: lead.task_eta || '',
    user: lead.teammate_assigned || '',
    userData: lead.teammate || null,
  }));

  // Column definitions
  const allColumns: ColumnDef<DisplayLead>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Lead Name",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "leadCreatedOn",
      header: "Lead Created On",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.leadCreatedOn ? format(new Date(row.original.leadCreatedOn), 'MMM dd, yyyy') : '-'}
        </span>
      ),
    },
    {
      accessorKey: "realEstateAgent",
      header: "Real Estate Agent",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditAgent
            value={row.original.realEstateAgentData}
            agents={buyerAgents}
            onValueChange={(agent) => handleUpdateLead(row.original.id, 'buyer_agent_id', agent?.id || null)}
            placeholder="Select agent"
            type="buyer"
            disabled={!buyerAgents.length || updatingKey === `${row.original.id}:buyer_agent_id`}
          />
        </div>
      ),
    },
    {
      accessorKey: "referredVia",
      header: "Referred Via",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referredVia || ''}
            options={REFERRED_VIA_OPTIONS}
            onValueChange={(value) => handleUpdateLead(row.original.id, 'referred_via', value)}
            placeholder="Select method"
            showAsStatusBadge
            forceGrayBadge
          />
        </div>
      ),
    },
    {
      accessorKey: "referralSource",
      header: "Referral Source",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referralSource || ''}
            options={REFERRAL_SOURCE_OPTIONS}
            onValueChange={(value) => handleUpdateLead(row.original.id, 'referral_source', value)}
            placeholder="Select source"
          />
        </div>
      ),
    },
    {
      accessorKey: "mdStatus",
      header: "MD Status",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.mdStatus || ''}
            options={CONVERTED_OPTIONS}
            onValueChange={(value) => handleUpdateLead(row.original.id, 'converted', value)}
            placeholder="Select status"
            showAsStatusBadge
            forceGrayBadge
          />
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditDate
            value={row.original.dueDate}
            onValueChange={(date) => handleUpdateLead(row.original.id, 'task_eta', date)}
            placeholder="Set date"
          />
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "User",
      headerClassName: "text-left",
      className: "text-left",
      sortable: true,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.user || ''}
            options={teamOptions}
            onValueChange={(value) => handleUpdateLead(row.original.id, 'teammate_assigned', value)}
            placeholder="Assign team"
          />
        </div>
      ),
    },
  ], [buyerAgents, users, updatingKey]);

  // Filter columns based on visibility settings
  const columns = visibleColumns
    .map(visibleCol => allColumns.find(col => col.accessorKey === visibleCol.id))
    .filter((col): col is ColumnDef<DisplayLead> => col !== undefined);

  if (loading) {
    return <div className="pl-4 pr-0 pt-2 pb-0">Loading...</div>;
  }

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </div>

      {filters.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          {filters.map(filter => (
            <Badge key={filter.id} variant="secondary" className="gap-1 pr-1">
              <span>{filterColumns.find(col => col.value === filter.column)?.label}: {String(filter.value)}</span>
              <button onClick={() => removeFilter(filter.id)} className="hover:bg-background/20 rounded p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-6">
            Clear All
          </Button>
        </div>
      )}

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Leads</CardTitle>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm">
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
                <Button variant="outline" size="sm" className="relative h-8">
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
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
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
              onReorderColumns={reorderColumns}
              onViewSaved={handleViewSaved}
            />
            
            <Button
              variant={isMainViewActive || activeView === "Main View" ? "default" : "outline"}
              size="sm"
              onClick={loadMainView}
              className="h-8 text-xs"
            >
              Main View
            </Button>
            
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
            data={displayData}
            searchTerm={searchTerm}
            storageKey="leads-table"
            onRowClick={handleRowClick}
            onColumnReorder={handleColumnReorder}
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>

      <CreateLeadModalModern
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onLeadCreated={loadData}
      />

      {selectedLead && showDetailDrawer && (
        <ClientDetailDrawer
          client={selectedLead as any}
          isOpen={showDetailDrawer}
          onClose={() => {
            setShowDetailDrawer(false);
            setSelectedLead(null);
          }}
          onStageChange={() => {
            setShowDetailDrawer(false);
            setSelectedLead(null);
            loadData();
          }}
          pipelineType="leads"
          onLeadUpdated={async () => {
            await loadData();
          }}
        />
      )}
    </div>
  );
}