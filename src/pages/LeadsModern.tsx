import React, { useState, useEffect } from "react";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { FilterBuilder, FilterCondition } from "@/components/ui/filter-builder";
import { CreateLeadModalModern } from "@/components/modals/CreateLeadModalModern";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { databaseService, Lead, BuyerAgent, User } from "@/services/database";
import { transformLeadToClient } from "@/utils/clientTransform";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ModernLead extends Lead {
  buyer_agent?: BuyerAgent | null;
  teammate?: User | null;
  pipeline_stage?: any;
}

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
  { value: 'In-Person', label: 'In-Person' },
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
  const [leads, setLeads] = useState<ModernLead[]>([]);
  const [dbLeadsMap, setDbLeadsMap] = useState<Map<string, ModernLead>>(new Map());
  const [buyerAgents, setBuyerAgents] = useState<BuyerAgent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ModernLead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const filterColumns = [
    { value: 'created_at', label: 'Created Date', type: 'date' as const },
    { value: 'converted', label: 'Converted', type: 'select' as const, options: CONVERTED_OPTIONS.map(o => o.label) },
    { value: 'referred_via', label: 'Referred Via', type: 'select' as const, options: REFERRED_VIA_OPTIONS.map(o => o.label) },
    { value: 'referral_source', label: 'Referral Source', type: 'select' as const, options: REFERRAL_SOURCE_OPTIONS.map(o => o.label) },
    { value: 'first_name', label: 'Lead Name', type: 'text' as const },
    { value: 'email', label: 'Email', type: 'text' as const },
    { value: 'phone', label: 'Phone', type: 'text' as const },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, agentsData, usersData] = await Promise.all([
        databaseService.getLeads(),
        databaseService.getBuyerAgents(),
        databaseService.getUsers(),
      ]);
      
      // Create lookup maps for enrichment
      const agentsMap = new Map(agentsData?.map(a => [a.id, a]) || []);
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
      
      // Enrich leads with related buyer_agent and teammate data
      const enrichedLeads = (leadsData as unknown as ModernLead[] || []).map(lead => ({
        ...lead,
        buyer_agent: lead.buyer_agent_id ? agentsMap.get(lead.buyer_agent_id) : null,
        teammate: lead.teammate_assigned ? usersMap.get(lead.teammate_assigned) : null,
      }));
      
      setLeads(enrichedLeads);
      
      // Build map of full database leads for drawer access
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
    try {
      const updateData: any = { [field]: value };
      await databaseService.updateLead(leadId, updateData);
      
      // Update local state
      setLeads(prev => prev.map(lead => {
        if (lead.id !== leadId) return lead;
        
        // Special handling for buyer_agent_id to keep buyer_agent object in sync
        if (field === 'buyer_agent_id') {
          const agentObj = value ? buyerAgents.find(a => a.id === value) : null;
          return { 
            ...lead, 
            buyer_agent_id: value,
            buyer_agent: agentObj || null
          };
        }
        
        // Special handling for teammate_assigned to keep teammate object in sync
        if (field === 'teammate_assigned') {
          const userObj = value ? users.find(u => u.id === value) : null;
          return {
            ...lead,
            teammate_assigned: value,
            teammate: userObj || null
          };
        }
        
        // Default: just update the field
        return { ...lead, [field]: value };
      }));
      
      // Also update the dbLeadsMap for drawer access
      setDbLeadsMap(prev => {
        const newMap = new Map(prev);
        const existingLead = newMap.get(leadId);
        if (existingLead) {
          if (field === 'buyer_agent_id') {
            const agentObj = value ? buyerAgents.find(a => a.id === value) : null;
            newMap.set(leadId, {
              ...existingLead,
              buyer_agent_id: value,
              buyer_agent: agentObj || null
            });
          } else if (field === 'teammate_assigned') {
            const userObj = value ? users.find(u => u.id === value) : null;
            newMap.set(leadId, {
              ...existingLead,
              teammate_assigned: value,
              teammate: userObj || null
            });
          } else {
            newMap.set(leadId, { ...existingLead, [field]: value });
          }
        }
        return newMap;
      });
      
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
      if (!fullName.includes(searchLower) && 
          !lead.email?.toLowerCase().includes(searchLower) &&
          !lead.phone?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Advanced filters (simplified for now)
    return true;
  });

  const handleRowClick = (lead: ModernLead) => {
    // Get full database lead data with enriched relationships
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
    
    // Use transformLeadToClient for proper CRMClient structure
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

  if (loading) {
    return <div className="pl-4 pr-0 pt-2 pb-0">Loading...</div>;
  }

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Leads (Modern)</h1>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <div className="bg-card p-4 rounded-lg border">
            <FilterBuilder
              filters={filters}
              onFiltersChange={setFilters}
              columns={filterColumns}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Modern Data Table */}
      <div className="bg-card rounded-lg border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Lead Name</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Created Date</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Buyer's Agent</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Referred Via</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Referral Source</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Converted</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Task ETA</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Team</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(lead)}
                >
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-sm">{lead.first_name} {lead.last_name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                      <div className="text-xs text-muted-foreground">{lead.phone}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">
                      {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : '-'}
                    </span>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <InlineEditAgent
                      value={lead.buyer_agent}
                      agents={buyerAgents}
                      onValueChange={(agent) => handleUpdateLead(lead.id, 'buyer_agent_id', agent?.id || null)}
                      placeholder="Select agent"
                      type="buyer"
                    />
                  </td>
                   <td className="p-3" onClick={(e) => e.stopPropagation()}>
                     <InlineEditSelect
                       value={lead.referred_via || ''}
                       options={REFERRED_VIA_OPTIONS}
                       onValueChange={(value) => handleUpdateLead(lead.id, 'referred_via', value)}
                       placeholder="Select method"
                       showAsStatusBadge
                       forceGrayBadge
                     />
                   </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <InlineEditSelect
                      value={lead.referral_source || ''}
                      options={REFERRAL_SOURCE_OPTIONS}
                      onValueChange={(value) => handleUpdateLead(lead.id, 'referral_source', value)}
                      placeholder="Select source"
                    />
                  </td>
                   <td className="p-3" onClick={(e) => e.stopPropagation()}>
                     <InlineEditSelect
                       value={lead.converted || ''}
                       options={CONVERTED_OPTIONS}
                       onValueChange={(value) => handleUpdateLead(lead.id, 'converted', value)}
                       placeholder="Select status"
                       showAsStatusBadge
                       forceGrayBadge
                     />
                   </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <InlineEditDate
                      value={lead.task_eta}
                      onValueChange={(date) => handleUpdateLead(lead.id, 'task_eta', date)}
                      placeholder="Set date"
                    />
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <InlineEditSelect
                      value={lead.teammate_assigned || ''}
                      options={teamOptions}
                      onValueChange={(value) => handleUpdateLead(lead.id, 'teammate_assigned', value)}
                      placeholder="Assign team"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No leads found matching your criteria
          </div>
        )}
      </div>

      {/* Modals */}
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