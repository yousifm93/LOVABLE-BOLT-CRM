import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Building, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Lender {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  licenseNumber: string;
  rating: number;
  programs: string[];
  status: "Active" | "Inactive";
  lastContact: string;
  volume: string;
}

const lendersData: Lender[] = [
  {
    id: 1,
    name: "Michael Johnson",
    company: "First National Bank",
    email: "michael.j@firstnational.com",
    phone: "(555) 123-4567",
    licenseNumber: "LIC123456",
    rating: 4.8,
    programs: ["Conventional", "FHA", "VA"],
    status: "Active",
    lastContact: "2024-01-15",
    volume: "$25.2M"
  },
  {
    id: 2,
    name: "Sarah Williams",
    company: "Community Credit Union",
    email: "sarah.w@communitycu.com",
    phone: "(555) 234-5678",
    licenseNumber: "LIC789012",
    rating: 4.6,
    programs: ["Conventional", "USDA", "Jumbo"],
    status: "Active",
    lastContact: "2024-01-18",
    volume: "$18.7M"
  },
  {
    id: 3,
    name: "David Chen",
    company: "Metro Mortgage Solutions",
    email: "david.c@metromortgage.com",
    phone: "(555) 345-6789",
    licenseNumber: "LIC345678",
    rating: 4.9,
    programs: ["FHA", "VA", "Conventional"],
    status: "Active",
    lastContact: "2024-01-20",
    volume: "$31.4M"
  }
];

const columns: ColumnDef<Lender>[] = [
  {
    accessorKey: "name",
    header: "Lender Name",
    sortable: true,
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => (
      <div className="flex items-center">
        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
        {row.original.company}
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
          <Mail className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{row.original.email}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{row.original.phone}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "licenseNumber",
    header: "License #",
    sortable: true,
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="flex items-center">
        <Star className="h-4 w-4 mr-1 text-warning fill-current" />
        <span className="font-medium">{row.original.rating}</span>
      </div>
    ),
    sortable: true,
  },
  {
    accessorKey: "programs",
    header: "Programs",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.programs.map((program) => (
          <span key={program} className="px-2 py-1 text-xs bg-muted rounded-md">
            {program}
          </span>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "volume",
    header: "Volume",
    cell: ({ row }) => (
      <span className="font-semibold text-success">{row.original.volume}</span>
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
];

export default function ApprovedLenders() {
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
      const lenderContacts = allContacts.filter(contact => contact.type === 'Other');
      setContacts(lenderContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive"
      });
      setContacts(lendersData); // Fallback to mock data
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (newContact: any) => {
    setContacts(prev => [...prev, newContact]);
  };

  const handleRowClick = (lender: any) => {
    console.log("Selected lender:", lender);
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approved Lenders</h1>
        <p className="text-xs italic text-muted-foreground/70">Manage your approved lending partners</p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Lender Directory</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search lenders..."
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
            data={contacts.length > 0 ? contacts : lendersData}
            searchTerm={searchTerm}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
      
      <CreateContactModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onContactCreated={handleContactCreated}
        defaultType="lender"
      />
    </div>
  );
}