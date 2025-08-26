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

const agentData: Agent[] = [
  {
    id: 1,
    name: "Jennifer Martinez",
    email: "jennifer.m@realty.com",
    phone: "(555) 123-4567",
    company: "Premier Realty Group",
    licenseNumber: "DRE#01234567",
    specializations: ["Luxury Homes", "First-Time Buyers"],
    activeDeals: 8,
    totalVolume: "$3.2M",
    status: "Active",
    lastContact: "2024-01-15",
    notes: "Excellent referral partner, specializes in luxury market"
  },
  {
    id: 2,
    name: "Robert Chen",
    email: "robert.c@homefinders.com",
    phone: "(555) 234-5678",
    company: "HomeFinders Real Estate",
    licenseNumber: "DRE#01345678",
    specializations: ["Investment Properties", "Commercial"],
    activeDeals: 12,
    totalVolume: "$5.8M",
    status: "Active",
    lastContact: "2024-01-12",
    notes: "Top producer in commercial lending space"
  },
  {
    id: 3,
    name: "Sarah Thompson",
    email: "sarah.t@coastal.com", 
    phone: "(555) 345-6789",
    company: "Coastal Properties",
    specializations: ["Waterfront", "Vacation Homes"],
    activeDeals: 3,
    totalVolume: "$1.4M",
    status: "Inactive",
    lastContact: "2023-12-20",
    notes: "Seasonal agent, works primarily in summer months"
  }
];

const columns: ColumnDef<Agent>[] = [
  {
    accessorKey: "name",
    header: "Agent",
    cell: ({ row }) => {
      const agent = row.original;
      const initials = agent.name.split(' ').map(n => n[0]).join('');
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{agent.name}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {agent.company}
            </div>
          </div>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="flex items-center text-sm">
          <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
          {row.original.email}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="h-3 w-3 mr-2" />
          {row.original.phone}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "specializations",
    header: "Specializations",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.specializations?.slice(0, 2).map((spec, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
          >
            {spec}
          </span>
        ))}
        {(row.original.specializations?.length || 0) > 2 && (
          <span className="text-xs text-muted-foreground">
            +{(row.original.specializations?.length || 0) - 2} more
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "activeDeals",
    header: "Active Deals",
    cell: ({ row }) => (
      <div className="text-center">
        <span className="font-medium">{row.original.activeDeals}</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "totalVolume",
    header: "Total Volume",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.totalVolume}</span>
    ),
    sortable: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} />
    ),
    sortable: true,
  },
  {
    accessorKey: "licenseNumber",
    header: "License",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <BadgeIcon className="h-3 w-3 text-muted-foreground" />
        <span>{row.original.licenseNumber}</span>
      </div>
    ),
  },
  {
    accessorKey: "lastContact",
    header: "Last Contact",
    sortable: true,
  },
];

export default function AgentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const allContacts = await databaseService.getContacts();
      const agentContacts = allContacts.filter(contact => contact.type === 'Agent');
      setContacts(agentContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive"
      });
      setContacts(agentData); // Fallback to mock data
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (newContact: any) => {
    setContacts(prev => [...prev, newContact]);
  };

  const handleRowClick = (agent: any) => {
    console.log("View agent details:", agent);
  };

  const displayData = contacts.length > 0 ? contacts : agentData;
  const activeAgents = displayData.filter((agent: any) => agent.status === "Active").length;
  const totalVolume = displayData.reduce((sum: number, agent: any) => {
    if (agent.totalVolume) {
      const volume = parseFloat(agent.totalVolume.replace(/[$M]/g, ''));
      return sum + volume;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">Master Agent List</h1>
          <p className="text-muted-foreground">
            {activeAgents} active agents • ${totalVolume.toFixed(1)}M total volume
          </p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{displayData.length}</p>
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
                <p className="text-2xl font-bold text-success">{activeAgents}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <BadgeIcon className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{displayData.reduce((sum: number, agent: any) => sum + (agent.activeDeals || 0), 0)}</p>
                <p className="text-sm text-muted-foreground">Active Deals</p>
              </div>
              <BadgeIcon className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">${totalVolume.toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">Total Volume</p>
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
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
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
            data={displayData}
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