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

const borrowerData: Contact[] = [
  {
    id: 1,
    type: "borrower",
    person: {
      id: 1,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@email.com",
      phoneMobile: "(555) 123-4567",
      phoneAlt: "(555) 987-6543",
      company: "Tech Solutions Inc"
    },
    relationship: "Primary Borrower",
    source: "Referral",
    status: "Active",
    tags: ["First-Time Buyer", "High-Income"],
    notes: "Looking for luxury home in downtown area",
    lastContact: "2024-01-15",
    deals: 2
  },
  {
    id: 2,
    type: "borrower",
    person: {
      id: 2,
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.g@email.com",
      phoneMobile: "(555) 234-5678",
      company: "Healthcare Solutions"
    },
    relationship: "Co-Borrower",
    source: "Website",
    status: "Prospect",
    tags: ["Investment Property"],
    notes: "Interested in rental property opportunities",
    lastContact: "2024-01-12",
    deals: 0
  },
  {
    id: 3,
    type: "borrower",
    person: {
      id: 3,
      firstName: "David",
      lastName: "Wilson",
      email: "david.w@email.com",
      phoneMobile: "(555) 345-6789",
      company: "Wilson Consulting"
    },
    relationship: "Primary Borrower",
    source: "Agent Referral",
    status: "Inactive",
    tags: ["Past Client", "Repeat Customer"],
    notes: "Previous client, excellent experience",
    lastContact: "2023-12-20",
    deals: 3
  }
];

const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: "name",
    header: "Borrower",
    cell: ({ row }) => {
      const contact = row.original;
      const fullName = `${contact.person.firstName} ${contact.person.lastName}`;
      const initials = `${contact.person.firstName[0]}${contact.person.lastName[0]}`;
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={contact.person.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-muted-foreground">{contact.relationship}</div>
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
        <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
          <Mail className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{row.original.person.email}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
          <span className="truncate">{row.original.person.phoneMobile}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <User className="h-3 w-3 text-muted-foreground" />
        <span>{row.original.person.company || "—"}</span>
      </div>
    ),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags?.slice(0, 2).map((tag, index) => (
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
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const allContacts = await databaseService.getContacts();
      const borrowerContacts = allContacts.filter(contact => contact.type === 'Borrower');
      setContacts(borrowerContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive"
      });
      setContacts(borrowerData); // Fallback to mock data
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (newContact: any) => {
    setContacts(prev => [...prev, newContact]);
  };

  const handleRowClick = (contact: any) => {
    console.log("View borrower details:", contact);
  };

  const displayData = contacts.length > 0 ? contacts : borrowerData;
  const activeBorrowers = displayData.filter((contact: any) => contact.status === "Active").length;
  const totalDeals = displayData.reduce((sum: number, contact: any) => sum + (contact.deals || 0), 0);
  const prospects = displayData.filter((contact: any) => contact.status === "Prospect").length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Contacts</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {activeBorrowers} active borrowers • {totalDeals} total deals • {prospects} prospects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{displayData.length}</p>
                <p className="text-sm text-muted-foreground">Total Borrowers</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-success">{activeBorrowers}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <Star className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-warning">{prospects}</p>
                <p className="text-sm text-muted-foreground">Prospects</p>
              </div>
              <MapPin className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalDeals}</p>
                <p className="text-sm text-muted-foreground">Total Deals</p>
              </div>
              <Star className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Borrower Directory</span>
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
                placeholder="Search borrowers..."
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
        defaultType="borrower"
      />
    </div>
  );
}