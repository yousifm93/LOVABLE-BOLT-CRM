import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Building, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { InlineEditLenderType } from "@/components/ui/inline-edit-lender-type";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: "Conventional" | "Non-QM" | "Private";
  account_executive?: string;
  account_executive_email?: string;
  account_executive_phone?: string;
  broker_portal_url?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const fallbackLendersData: Lender[] = [
  {
    id: "1",
    lender_name: "Angel Oak Mortgage",
    lender_type: "Non-QM",
    account_executive: "Michael Johnson",
    account_executive_email: "michael.j@angeloak.com",
    account_executive_phone: "(555) 123-4567",
    broker_portal_url: "https://portal.angeloak.com",
    status: "Active",
    created_at: "2024-01-15",
    updated_at: "2024-01-15"
  },
  {
    id: "2",
    lender_name: "Champions Mortgage",
    lender_type: "Conventional",
    account_executive: "Sarah Williams",
    account_executive_email: "sarah.w@champions.com",
    account_executive_phone: "(555) 234-5678",
    broker_portal_url: "https://broker.champions.com",
    status: "Active",
    created_at: "2024-01-18",
    updated_at: "2024-01-18"
  },
  {
    id: "3",
    lender_name: "Fund Loans",
    lender_type: "Private",
    account_executive: "David Chin",
    account_executive_email: "david.c@fundloans.com",
    account_executive_phone: "(555) 345-6789",
    broker_portal_url: "https://portal.fundloans.com",
    status: "Active",
    created_at: "2024-01-20",
    updated_at: "2024-01-20"
  }
];

export default function ApprovedLenders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLenders();
  }, []);

  const loadLenders = async () => {
    try {
      const lenderData = await databaseService.getLenders();
      setLenders(lenderData);
    } catch (error) {
      console.error('Error loading lenders:', error);
      toast({
        title: "Error",
        description: "Failed to load lenders.",
        variant: "destructive"
      });
      setLenders(fallbackLendersData); // Fallback to mock data
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLender = async (id: string, updates: Partial<Lender>) => {
    try {
      await databaseService.updateLender(id, updates);
      setLenders(prev => prev.map(lender => 
        lender.id === id ? { ...lender, ...updates } : lender
      ));
      toast({
        title: "Success",
        description: "Lender updated successfully.",
      });
    } catch (error) {
      console.error('Error updating lender:', error);
      toast({
        title: "Error",
        description: "Failed to update lender.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = (lender: Lender) => {
    if (lender.account_executive_email) {
      const subject = `Inquiry from ${lender.lender_name}`;
      const body = `Hello ${lender.account_executive},\n\nI wanted to reach out regarding potential loan opportunities.\n\nBest regards`;
      const mailto = `mailto:${lender.account_executive_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto);
    }
  };

  const handleContactCreated = (newContact: any) => {
    loadLenders(); // Reload lenders after creation
  };

  const handleRowClick = (lender: Lender) => {
    console.log("Selected lender:", lender);
  };

  const columns: ColumnDef<Lender>[] = [
    {
      accessorKey: "lender_name",
      header: "Lender Name",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Building className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="font-medium">{row.original.lender_name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "lender_type",
      header: "Lender Type",
      cell: ({ row }) => (
        <InlineEditLenderType
          value={row.original.lender_type}
          onValueChange={(value) => handleUpdateLender(row.original.id, { lender_type: value as "Conventional" | "Non-QM" | "Private" })}
        />
      ),
      sortable: true,
    },
    {
      accessorKey: "account_executive",
      header: "Account Executive",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.account_executive || "—"}</span>
      ),
      sortable: true,
    },
    {
      accessorKey: "contact",
      header: "Account Executive Contact",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Mail className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{row.original.account_executive_email || "—"}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{row.original.account_executive_phone || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "broker_portal_url",
      header: "Broker Portal",
      cell: ({ row }) => (
        <InlineEditLink
          value={row.original.broker_portal_url}
          onValueChange={(value) => handleUpdateLender(row.original.id, { broker_portal_url: value })}
          placeholder="Portal URL"
        />
      ),
    },
    {
      accessorKey: "send_email",
      header: "Send Email",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleSendEmail(row.original);
          }}
          disabled={!row.original.account_executive_email}
        >
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Button>
      ),
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

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lenders</h1>
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
            data={lenders}
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