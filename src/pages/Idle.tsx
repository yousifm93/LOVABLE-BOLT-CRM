import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { databaseService, type BuyerAgent } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditAgent } from "@/components/ui/inline-edit-agent";
import { formatDateShort } from "@/utils/formatters";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { transformLeadToClient } from "@/utils/clientTransform";
import { Checkbox } from "@/components/ui/checkbox";

// Idle stage ID from database
const IDLE_PIPELINE_STAGE_ID = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a';

interface IdleLead {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  lead_on_date: string | null;
  notes: string | null;
  buyer_agent_id: string | null;
  buyer_agent?: {
    id: string;
    first_name: string;
    last_name: string;
    brokerage?: string;
    email?: string;
    phone?: string;
  } | null;
}

export default function Idle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [leads, setLeads] = useState<IdleLead[]>([]);
  const [agents, setAgents] = useState<BuyerAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch leads in Idle stage
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          created_at,
          lead_on_date,
          notes,
          buyer_agent_id,
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone)
        `)
        .eq('pipeline_stage_id', IDLE_PIPELINE_STAGE_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data || []) as IdleLead[]);
    } catch (error) {
      console.error('Error fetching idle leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch idle leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch agents
  const fetchAgents = async () => {
    try {
      const agentData = await databaseService.getBuyerAgents();
      setAgents(agentData || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchAgents();
  }, []);

  // Handle URL parameter for opening specific lead
  useEffect(() => {
    const openLeadId = searchParams.get('openLead');
    if (openLeadId && leads.length > 0) {
      const lead = leads.find(l => l.id === openLeadId);
      if (lead) {
        handleRowClick(lead);
        searchParams.delete('openLead');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, leads]);

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      // If we updated buyer_agent_id, refetch to get the agent data
      if (field === 'buyer_agent_id') {
        fetchLeads();
      } else {
        // Update local state
        setLeads(prev => prev.map(lead =>
          lead.id === id ? { ...lead, [field]: value } : lead
        ));
      }

      toast({
        title: "Updated",
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

  const handleRowClick = async (lead: IdleLead) => {
    try {
      const fullLead = await databaseService.getLeadByIdWithEmbeds(lead.id);
      if (fullLead) {
        const client = transformLeadToClient(fullLead);
        setSelectedClient(client);
        setIsDrawerOpen(true);
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
    }
  };

  const handleStageChange = async (clientId: number, newStage: PipelineStage) => {
    // Handle stage change - refetch leads after
    fetchLeads();
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(lead =>
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(term) ||
        (lead.notes || '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [leads, searchTerm]);

  // Create columns
  const columns: ColumnDef<IdleLead>[] = useMemo(() => [
    {
      accessorKey: "borrower_name",
      header: "Borrower",
      className: "text-left",
      headerClassName: "text-left",
      cell: ({ row }) => (
        <div 
          className="text-sm text-foreground hover:text-warning cursor-pointer transition-colors truncate max-w-[160px] text-left"
          title={`${row.original.first_name} ${row.original.last_name}`}
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row.original);
          }}
        >
          {`${row.original.first_name} ${row.original.last_name}`}
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "createdOn",
      header: "Lead Created On",
      cell: ({ row }) => {
        const dateValue = row.original.lead_on_date || row.original.created_at;
        return (
          <span className="text-sm text-muted-foreground">
            {dateValue ? formatDateShort(dateValue) : '-'}
          </span>
        );
      },
      sortable: true,
    },
    {
      accessorKey: "realEstateAgent",
      header: "Real Estate Agent",
      cell: ({ row }) => {
        const agentData = row.original.buyer_agent;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineEditAgent
              value={agentData}
              agents={agents}
              onValueChange={(agent) =>
                handleUpdate(row.original.id, "buyer_agent_id", agent?.id ?? null)
              }
              type="buyer"
            />
          </div>
        );
      },
      sortable: true,
    },
    {
      accessorKey: "notes",
      header: "About the Borrower",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditText
            value={row.original.notes || ''}
            onValueChange={(value) =>
              handleUpdate(row.original.id, "notes", value)
            }
            placeholder="Add notes..."
            className="min-w-[200px]"
          />
        </div>
      ),
      sortable: false,
    },
  ], [agents, leads]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Idle</h1>
              <p className="text-sm text-muted-foreground">
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} in idle status
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedIds.length > 0 && (
              <Badge variant="secondary">
                {selectedIds.length} selected
              </Badge>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="flex-1">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredLeads}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getRowId={(row) => row.id}
              onRowClick={handleRowClick}
              showRowNumbers
              initialColumnWidths={{
                borrower_name: 150,
                createdOn: 120,
                realEstateAgent: 150,
                notes: 250,
              }}
            />
          </CardContent>
        </Card>

        {/* Client Detail Drawer */}
        {selectedClient && (
          <ClientDetailDrawer
            client={selectedClient}
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              setSelectedClient(null);
            }}
            onStageChange={handleStageChange}
            pipelineType="leads"
            onLeadUpdated={fetchLeads}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}