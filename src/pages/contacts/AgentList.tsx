import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Building2, Upload, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { AgentDetailDialog } from "@/components/AgentDetailDialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface DateFilter {
  field: string;
  operator: 'before' | 'after' | 'on' | null;
  date: Date | null;
}

const columns: ColumnDef<any>[] = [
  {
    accessorKey: "row_number",
    header: "#",
    cell: ({ row }) => {
      // Row number will be set by DataTable via showRowNumbers prop
      return null;
    },
    className: "text-center w-[40px]",
  },
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => {
      const agent = row.original;
      const fullName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || 'Unknown';
      
      return (
        <div className="text-left">
          <div className="font-medium">{fullName}</div>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="flex items-center justify-center text-sm">
        <Mail className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{row.original.email || 'N/A'}</span>
      </div>
    ),
    className: "text-center",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.original.phone;
      const formatPhone = (p: string | null) => {
        if (!p) return 'N/A';
        const digits = p.replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return p;
      };
      return (
        <div className="flex items-center justify-center text-sm">
          <Phone className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
          <span>{formatPhone(phone)}</span>
        </div>
      );
    },
    className: "text-center",
  },
  {
    accessorKey: "last_agent_call",
    header: "Last Call",
    cell: ({ row }) => {
      const date = row.original.last_agent_call;
      if (!date) return <span className="text-muted-foreground text-sm">Never</span>;
      return <span className="text-sm">{new Date(date).toLocaleDateString()}</span>;
    },
    sortable: true,
  },
  {
    accessorKey: "next_agent_call",
    header: "Next Call",
    cell: ({ row }) => {
      const date = row.original.next_agent_call;
      if (!date) return <span className="text-muted-foreground text-sm">—</span>;
      
      const isOverdue = new Date(date) < new Date();
      return (
        <span className={cn("text-sm", isOverdue && "text-destructive font-medium")}>
          {new Date(date).toLocaleDateString()}
        </span>
      );
    },
    sortable: true,
  },
];

export default function AgentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [showAgentDrawer, setShowAgentDrawer] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFilters, setDateFilters] = useState<DateFilter[]>([
    { field: 'last_agent_call', operator: null, date: null },
    { field: 'next_agent_call', operator: null, date: null },
    { field: 'face_to_face_meeting', operator: null, date: null },
  ]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleImportAgents = async () => {
    setIsImporting(true);
    try {
      // Fetch the CSV file from public folder
      const response = await fetch('/agent-import.csv');
      if (!response.ok) throw new Error('Failed to fetch CSV file');
      const csvData = await response.text();
      
      toast({
        title: "Import Started",
        description: `Processing ${csvData.split('\n').length - 1} agents...`,
      });

      // Call the edge function with CSV data
      const { data, error } = await supabase.functions.invoke('import-agents', {
        body: { csvData }
      });

      if (error) throw error;

      toast({
        title: "Import Complete!",
        description: `Created: ${data.created}, Updated: ${data.updated}, Preserved: ${data.preserved}, Soft-deleted: ${data.softDeleted}`,
      });

      // Reload agents to show updated list
      loadAgents();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import agents",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await databaseService.getBuyerAgents();
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error", 
        description: "Failed to load agents.",
        variant: "destructive"
      });
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (newContact: any) => {
    loadAgents(); // Reload agents after creation
  };

  const handleRowClick = (agent: any) => {
    setSelectedAgent(agent);
    setShowAgentDrawer(true);
  };

  const handleDeleteAgent = (agent: any) => {
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;
    setIsDeleting(true);
    try {
      await databaseService.softDeleteBuyerAgent(agentToDelete.id);
      toast({
        title: "Agent Deleted",
        description: `${agentToDelete.first_name} ${agentToDelete.last_name} has been removed.`,
      });
      loadAgents();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const updateDateFilter = (index: number, updates: Partial<DateFilter>) => {
    setDateFilters(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const clearFilters = () => {
    setDateFilters([
      { field: 'last_agent_call', operator: null, date: null },
      { field: 'next_agent_call', operator: null, date: null },
      { field: 'face_to_face_meeting', operator: null, date: null },
    ]);
  };

  const getFilteredAgents = () => {
    return agents.filter(agent => {
      for (const filter of dateFilters) {
        if (filter.operator && filter.date) {
          const agentDate = agent[filter.field] ? new Date(agent[filter.field]) : null;
          const filterDate = new Date(filter.date);
          filterDate.setHours(0, 0, 0, 0);
          
          if (filter.operator === 'before') {
            if (!agentDate || agentDate >= filterDate) return false;
          } else if (filter.operator === 'after') {
            if (!agentDate || agentDate <= filterDate) return false;
          } else if (filter.operator === 'on') {
            if (!agentDate) return false;
            const agentDateOnly = new Date(agentDate);
            agentDateOnly.setHours(0, 0, 0, 0);
            if (agentDateOnly.getTime() !== filterDate.getTime()) return false;
          }
        }
      }
      return true;
    });
  };

  const activeFilterCount = dateFilters.filter(f => f.operator && f.date).length;
  const filteredAgents = getFilteredAgents();

  if (isLoading) {
    return <div className="p-4">Loading Real Estate Agents...</div>;
  }

  const filterFieldLabels: Record<string, string> = {
    last_agent_call: 'Last Call',
    next_agent_call: 'Next Call',
    face_to_face_meeting: 'F2F Meeting',
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Real Estate Agents</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {agents.length.toLocaleString()} agents in directory
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{agents.length.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {agents.filter(a => {
                    if (!a.created_at) return false;
                    const createdDate = new Date(a.created_at);
                    const now = new Date();
                    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
                  }).length.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Added This Month</p>
              </div>
              <Plus className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {agents.filter(a => {
                    if (!a.broker_open) return false;
                    const brokerOpenDate = new Date(a.broker_open);
                    const now = new Date();
                    return brokerOpenDate.getMonth() === now.getMonth() && brokerOpenDate.getFullYear() === now.getFullYear();
                  }).length.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Brokers Opens This Month</p>
              </div>
              <Building2 className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {agents.filter(a => {
                    if (!a.last_agent_call) return false;
                    const callDate = new Date(a.last_agent_call);
                    const now = new Date();
                    return callDate.getMonth() === now.getMonth() && callDate.getFullYear() === now.getFullYear();
                  }).length.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Called This Month</p>
              </div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {agents.filter(a => {
                    if (!a.face_to_face_meeting) return false;
                    const meetingDate = new Date(a.face_to_face_meeting);
                    const now = new Date();
                    return meetingDate.getMonth() === now.getMonth() && meetingDate.getFullYear() === now.getFullYear();
                  }).length.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Met This Month</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agent Directory</span>
            <div className="flex gap-2">
              <Button 
                size="default"
                variant="outline"
                className="px-6 py-2"
                onClick={handleImportAgents}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Import Agents
                  </>
                )}
              </Button>
              <Button 
                size="default"
                className="bg-primary hover:bg-primary/90 px-6 py-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Agent
              </Button>
            </div>
          </CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search agents..."
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
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Date Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                        Clear All
                      </Button>
                    )}
                  </div>
                  {dateFilters.map((filter, index) => (
                    <div key={filter.field} className="space-y-2">
                      <Label className="text-xs font-medium">{filterFieldLabels[filter.field]}</Label>
                      <div className="flex gap-2">
                        <Select
                          value={filter.operator || ''}
                          onValueChange={(value) => updateDateFilter(index, { operator: value as 'before' | 'after' | 'on' | null })}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before">Before</SelectItem>
                            <SelectItem value="after">After</SelectItem>
                            <SelectItem value="on">On</SelectItem>
                          </SelectContent>
                        </Select>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 flex-1 justify-start text-xs">
                              <Calendar className="h-3 w-3 mr-2" />
                              {filter.date ? format(filter.date, 'MMM d, yyyy') : 'Pick date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={filter.date || undefined}
                              onSelect={(date) => updateDateFilter(index, { date: date || null })}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns.filter(c => c.accessorKey !== 'row_number')}
            data={filteredAgents}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
            onDelete={handleDeleteAgent}
            pageSize={15}
            showRowNumbers
            compact
          />
        </CardContent>
      </Card>
      
      <CreateContactModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onContactCreated={handleContactCreated}
        defaultType="agent"
      />
      
      <AgentDetailDialog
        agent={selectedAgent}
        isOpen={showAgentDrawer}
        onClose={() => {
          setShowAgentDrawer(false);
          setSelectedAgent(null);
        }}
        onAgentUpdated={loadAgents}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteAgent}
        title="Delete Agent"
        description={`Are you sure you want to delete ${agentToDelete?.first_name || ''} ${agentToDelete?.last_name || ''}? This action can be undone from the Deleted Items section.`}
        isLoading={isDeleting}
      />
    </div>
  );
}