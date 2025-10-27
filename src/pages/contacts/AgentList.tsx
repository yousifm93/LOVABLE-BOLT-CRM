import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Building2, Badge as BadgeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Agent } from "@/types/crm";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";


const columns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => {
      const agent = row.original;
      const fullName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || 'Unknown';
      const initials = [agent.first_name?.[0], agent.last_name?.[0]].filter(Boolean).join('') || '??';
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {agent.brokerage || 'No brokerage'}
            </div>
          </div>
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
    accessorKey: "license_number",
    header: "License",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <BadgeIcon className="h-3 w-3 text-muted-foreground" />
        <span>{row.original.license_number || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: "years_experience",
    header: "Experience",
    cell: ({ row }) => (
      <span>{row.original.years_experience ? `${row.original.years_experience} yrs` : 'N/A'}</span>
    ),
    sortable: true,
  },
];

export default function AgentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

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
    console.log("View agent details:", agent);
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agent Directory</span>
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
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
    </div>
  );
}