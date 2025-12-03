import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail, Building, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { LenderDetailDrawer } from "@/components/LenderDetailDrawer";
import { InlineEditLenderType } from "@/components/ui/inline-edit-lender-type";
import { InlineEditLink } from "@/components/ui/inline-edit-link";
import { Checkbox } from "@/components/ui/checkbox";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface Lender {
  id: string;
  lender_name: string;
  lender_type: "Conventional" | "Non-QM" | "Private" | "HELOC";
  account_executive?: string;
  account_executive_email?: string;
  account_executive_phone?: string;
  broker_portal_url?: string;
  broker_portal_username?: string;
  broker_portal_password?: string;
  min_loan_amount?: number;
  max_loan_amount?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function ApprovedLenders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
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

  const handleContactCreated = () => {
    loadLenders();
  };

  const handleRowClick = (lender: Lender) => {
    setSelectedLender(lender);
    setIsDrawerOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === lenders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lenders.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const togglePasswordVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newShowPasswords = new Set(showPasswords);
    if (newShowPasswords.has(id)) {
      newShowPasswords.delete(id);
    } else {
      newShowPasswords.add(id);
    }
    setShowPasswords(newShowPasswords);
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Add row numbers to data
  const lendersWithIndex = lenders.map((lender, index) => ({
    ...lender,
    rowNumber: index + 1
  }));

  const columns: ColumnDef<Lender & { rowNumber?: number }>[] = [
    {
      accessorKey: "rowNumber",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.rowNumber}</span>
      ),
    },
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
          onValueChange={(value) => handleUpdateLender(row.original.id, { lender_type: value as "Conventional" | "Non-QM" | "Private" | "HELOC" })}
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
      header: "AE Contact",
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
        <div className="flex items-center gap-1">
          <InlineEditLink
            value={row.original.broker_portal_url}
            onValueChange={(value) => handleUpdateLender(row.original.id, { broker_portal_url: value })}
            placeholder="Portal URL"
          />
        </div>
      ),
    },
    {
      accessorKey: "broker_portal_username",
      header: "Username",
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.broker_portal_username || "—"}</span>
      ),
    },
    {
      accessorKey: "broker_portal_password",
      header: "Password",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono">
            {showPasswords.has(row.original.id) 
              ? row.original.broker_portal_password || "—"
              : row.original.broker_portal_password ? "••••••••" : "—"
            }
          </span>
          {row.original.broker_portal_password && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => togglePasswordVisibility(row.original.id, e)}
            >
              {showPasswords.has(row.original.id) ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      ),
    },
    {
      accessorKey: "min_loan_amount",
      header: "Min Loan",
      cell: ({ row }) => (
        <span className="text-sm">{formatCurrency(row.original.min_loan_amount)}</span>
      ),
      sortable: true,
    },
    {
      accessorKey: "max_loan_amount",
      header: "Max Loan",
      cell: ({ row }) => (
        <span className="text-sm">{formatCurrency(row.original.max_loan_amount)}</span>
      ),
      sortable: true,
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
            {selectedIds.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={lendersWithIndex}
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

      <LenderDetailDrawer
        lender={selectedLender}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLender(null);
        }}
        onLenderUpdated={loadLenders}
      />
    </div>
  );
}