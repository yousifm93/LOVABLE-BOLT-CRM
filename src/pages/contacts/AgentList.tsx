import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Building2, Badge as BadgeIcon, Star, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { AgentDetailDialog } from "@/components/AgentDetailDialog";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";


const columns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => {
      const agent = row.original;
      const fullName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || 'Unknown';
      const initials = [agent.first_name?.[0], agent.last_name?.[0]].filter(Boolean).join('') || '??';
      
      return (
        <div className="text-left">
          <div className="font-medium">{fullName}</div>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "brokerage",
    header: "Brokerage",
    sortable: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="flex items-center text-sm">
        <Mail className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{row.original.email || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="flex items-center text-sm">
        <Phone className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
        <span>{row.original.phone || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: "agent_rank",
    header: "Rank",
    cell: ({ row }) => {
      const rank = row.original.agent_rank;
      if (!rank) return <span className="text-muted-foreground">—</span>;
      
      const rankColors = {
        'A': 'bg-success text-success-foreground',
        'B': 'bg-info text-info-foreground',
        'C': 'bg-warning text-warning-foreground',
        'D': 'bg-destructive/70 text-destructive-foreground',
        'F': 'bg-destructive text-destructive-foreground'
      };
      
      return (
        <Badge className={cn("font-bold", rankColors[rank as keyof typeof rankColors])}>
          {rank}
        </Badge>
      );
    },
    sortable: true,
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
  {
    accessorKey: "face_to_face_meeting",
    header: "F2F Meeting",
    cell: ({ row }) => {
      const date = row.original.face_to_face_meeting;
      if (!date) return <span className="text-muted-foreground text-sm">—</span>;
      
      const meetingDate = new Date(date);
      const isUpcoming = meetingDate > new Date();
      
      return (
        <span className={cn(
          "text-sm",
          isUpcoming && "text-success font-medium",
          !isUpcoming && "text-muted-foreground"
        )}>
          {meetingDate.toLocaleDateString()}
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

  if (isLoading) {
    return <div className="p-4">Loading Real Estate Agents...</div>;
  }

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Real Estate Agents</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {agents.length} agents in directory
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
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
                <p className="text-2xl font-bold">{agents.filter(a => a.email).length}</p>
                <p className="text-sm text-muted-foreground">With Email</p>
              </div>
              <Mail className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{agents.filter(a => a.phone).length}</p>
                <p className="text-sm text-muted-foreground">With Phone</p>
              </div>
              <Phone className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{agents.filter(a => a.license_number).length}</p>
                <p className="text-sm text-muted-foreground">Licensed</p>
              </div>
              <BadgeIcon className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {agents.filter(a => a.agent_rank === 'A' || a.agent_rank === 'B').length}
                </p>
                <p className="text-sm text-muted-foreground">A/B Ranked</p>
              </div>
              <Star className="h-8 w-8 text-warning" />
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
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={agents}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
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
    </div>
  );
}