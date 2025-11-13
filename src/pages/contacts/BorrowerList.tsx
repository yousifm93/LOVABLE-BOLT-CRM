import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, User, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Contact } from "@/types/crm";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

const columns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Contact Name",
    cell: ({ row }) => {
      const contact = row.original;
      const fullName = contact.person ? 
        `${contact.person.firstName} ${contact.person.lastName}` : 
        `${contact.first_name} ${contact.last_name}`;
      const initials = contact.person ? 
        `${contact.person.firstName[0]}${contact.person.lastName[0]}` :
        `${contact.first_name[0]}${contact.last_name[0]}`;
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={contact.person?.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-muted-foreground">{contact.type}</div>
          </div>
        </div>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => {
      const contact = row.original;
      const email = contact.person?.email || contact.email;
      const phone = contact.person?.phoneMobile || contact.phone;
      
      return (
        <div className="space-y-1">
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Mail className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{email || "—"}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
            <span className="truncate">{phone || "—"}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags?.slice(0, 2).map((tag: string, index: number) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent-foreground"
          >
            {tag}
          </span>
        ))}
        {(row.original.tags?.length || 0) > 2 && (
          <span className="text-xs text-muted-foreground">
            +{(row.original.tags?.length || 0) - 2} more
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "lead_created_date",
    header: "Lead Created Date",
    cell: ({ row }) => {
      const date = row.original.lead_created_date;
      return (
        <span className="text-sm">
          {date ? new Date(date).toLocaleDateString() : "—"}
        </span>
      );
    },
    sortable: true,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.source}</span>
    ),
    sortable: true,
  },
  {
    accessorKey: "deals",
    header: "Deals",
    cell: ({ row }) => (
      <div className="text-center">
        <span className="font-medium">{row.original.deals}</span>
      </div>
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
    accessorKey: "lastContact",
    header: "Last Contact",
    sortable: true,
  },
];

export default function BorrowerList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const allContacts = await databaseService.getAllUnifiedContacts();
      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive"
      });
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (newContact: any) => {
    loadContacts(); // Reload all contacts to include the new one
  };

  const handleRowClick = (contact: any) => {
    console.log("View contact details:", contact);
  };

  const filteredContacts = activeFilter === 'All' 
    ? contacts 
    : contacts.filter(c => c.type === activeFilter);

  const displayData = filteredContacts;
  const borrowerCount = contacts.filter((c: any) => c.type === 'Borrower').length;
  const agentCount = contacts.filter((c: any) => c.type === 'Agent').length;
  const lenderCount = contacts.filter((c: any) => c.type === 'Lender').length;
  const otherCount = contacts.filter((c: any) => !['Borrower', 'Agent', 'Lender'].includes(c.type)).length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Contact List</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {contacts.length} total contacts • {borrowerCount} borrowers • {agentCount} agents • {lenderCount} lenders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-success">{borrowerCount}</p>
                <p className="text-sm text-muted-foreground">Borrowers</p>
              </div>
              <User className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-info">{agentCount}</p>
                <p className="text-sm text-muted-foreground">Agents</p>
              </div>
              <Phone className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-warning">{lenderCount}</p>
                <p className="text-sm text-muted-foreground">Lenders</p>
              </div>
              <MapPin className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <div className="flex gap-2 mb-4">
            {['All', 'Borrower', 'Agent', 'Lender', 'Other'].map(filter => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
                {filter === 'All' && ` (${contacts.length})`}
                {filter === 'Borrower' && ` (${borrowerCount})`}
                {filter === 'Agent' && ` (${agentCount})`}
                {filter === 'Lender' && ` (${lenderCount})`}
                {filter === 'Other' && ` (${otherCount})`}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contacts
            </Button>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search contacts..."
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
      />
    </div>
  );
}