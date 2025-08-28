import { useState, useEffect } from "react";
import { Search, Plus, Filter, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, StatusBadge, ColumnDef } from "@/components/ui/data-table";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { CRMClient, PipelineStage } from "@/types/crm";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { databaseService, type Lead as DatabaseLead } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Lead {
  id: string;
  name: string;
  creationDate: string;
  email: string;
  phone: string;
  referredVia: string;
  referralSource: string;
  converted: string;
  leadStrength: string;
  dueDate?: string;
}

// Transform database lead to display format
const transformLeadToDisplay = (dbLead: DatabaseLead & { task_due_date?: string }): Lead => ({
  id: dbLead.id,
  name: `${dbLead.first_name} ${dbLead.last_name}`,
  creationDate: new Date(dbLead.created_at).toLocaleDateString(),
  email: dbLead.email || '',
  phone: dbLead.phone || '',
  referredVia: dbLead.referred_via || 'Email',
  referralSource: dbLead.referral_source || 'Agent',
  converted: dbLead.converted || 'Working on it',
  leadStrength: dbLead.lead_strength || 'Warm',
  dueDate: dbLead.task_due_date ? new Date(dbLead.task_due_date).toLocaleDateString() : ''
});

// Option arrays for dropdowns
const referredViaOptions = [
  { value: "Email", label: "Email" },
  { value: "Text", label: "Text" },
  { value: "Call", label: "Call" },
  { value: "Web", label: "Web" },
  { value: "In Person", label: "In Person" },
];

const referralSourceOptions = [
  { value: "Agent", label: "Agent" },
  { value: "New Agent", label: "New Agent" },
  { value: "Past Client", label: "Past Client" },
  { value: "Personal", label: "Personal" },
  { value: "Social", label: "Social" },
  { value: "Miscellaneous", label: "Miscellaneous" },
];

const convertedOptions = [
  { value: "Working on it", label: "Working on it" },
  { value: "Pending App", label: "Pending App" },
  { value: "Nurture", label: "Nurture" },
  { value: "Dead", label: "Dead" },
  { value: "Needs Attention", label: "Needs Attention" },
];

const leadStrengthOptions = [
  { value: "Hot", label: "Hot" },
  { value: "Warm", label: "Warm" },
  { value: "Cold", label: "Cold" },
  { value: "Qualified", label: "Qualified" },
];

export default function Leads() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Field update handler
  const handleFieldUpdate = async (leadId: string, field: string, value: string | Date | undefined) => {
    try {
      setIsUpdating(leadId);
      
      // Find the original lead in the database
      const originalLead = leads.find(l => l.id === leadId);
      if (!originalLead) return;

      let updateData: Partial<DatabaseLead> = {};
      
      // Map field names to database columns
      switch (field) {
        case 'referredVia':
          updateData.referred_via = value as any;
          break;
        case 'referralSource':
          updateData.referral_source = value as any;
          break;
        case 'converted':
          updateData.converted = value as any;
          break;
        case 'leadStrength':
          updateData.lead_strength = value as any;
          break;
        case 'dueDate':
          // For due date, we need to update the task, not the lead
          // This is a simplified approach - in a real app you'd need more complex logic
          break;
        default:
          return;
      }

      if (Object.keys(updateData).length > 0) {
        await databaseService.updateLead(leadId, updateData);
        
        // Update local state
        setLeads(prev => prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, [field]: value }
            : lead
        ));

        toast({
          title: "Success",
          description: "Lead updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Delete handler
  const handleDelete = async (lead: Lead) => {
    setDeleteLeadId(lead.id);
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;
    
    try {
      await databaseService.deleteLead(deleteLeadId);
      setLeads(prev => prev.filter(lead => lead.id !== deleteLeadId));
      toast({
        title: "Success",
        description: "Lead deleted.",
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setDeleteLeadId(null);
    }
  };

  // Columns definition with inline editing
  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "name",
      header: "Lead Name",
      sortable: true,
      cell: ({ row }) => (
        <span 
          className="cursor-pointer hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(row.original);
          }}
        >
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "creationDate",
      header: "Creation Date",
      sortable: true,
    },
    {
      accessorKey: "referredVia",
      header: "Referred Via",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referredVia}
            options={referredViaOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'referredVia', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "referralSource",
      header: "Referral Source",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.referralSource}
            options={referralSourceOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'referralSource', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "converted",
      header: "Converted",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.converted}
            options={convertedOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'converted', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "leadStrength",
      header: "Lead Strength",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={row.original.leadStrength}
            options={leadStrengthOptions}
            onValueChange={(value) => handleFieldUpdate(row.original.id, 'leadStrength', value)}
            showAsStatusBadge={true}
            disabled={isUpdating === row.original.id}
          />
        </div>
      ),
      sortable: true,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditDate
            value={row.original.dueDate ? new Date(row.original.dueDate) : undefined}
            onValueChange={(date) => handleFieldUpdate(row.original.id, 'dueDate', date)}
            placeholder="Set due date"
            disabled={isUpdating === row.original.id}
          />
        </div>
      ),
      sortable: true,
    },
  ];

  // Load leads on component mount with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await loadLeads();
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsDrawerOpen(false);
      setSelectedClient(null);
      setIsCreateModalOpen(false);
    };
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const dbLeads = await databaseService.getLeadsWithTaskDueDates();
      const transformedLeads = dbLeads.map(transformLeadToDisplay);
      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeadCreated = async () => {
    console.log('Lead created, refreshing data...');
    await loadLeads();
    toast({
      title: "Success",
      description: "Lead created and data refreshed",
    });
  };

  const handleRowClick = (lead: Lead) => {
    // Convert Lead to CRMClient for the drawer
    const crmClient: CRMClient = {
      person: {
        id: Number(lead.id) || Date.now(),
        firstName: lead.name.split(' ')[0],
        lastName: lead.name.split(' ').slice(1).join(' '),
        email: lead.email,
        phoneMobile: lead.phone
      },
      loan: {
        loanAmount: "$0",
        loanType: "Purchase",
        prType: "Primary Residence"
      },
      ops: {
        stage: "leads",
        status: lead.converted,
        priority: "Medium",
        referralSource: lead.referralSource
      },
      dates: {
        createdOn: new Date().toISOString()
      },
      meta: {},
      name: lead.name,
      creditScore: 750
    };
    setSelectedClient(crmClient);
    setIsDrawerOpen(true);
  };

  const handleStageChange = async (clientId: number, newStage: PipelineStage) => {
    console.log(`Moving client ${clientId} to stage ${newStage}`);
    setIsDrawerOpen(false);
    setSelectedClient(null);
    // Refresh data after stage change
    await loadLeads();
  };

  const handleDrawerClose = () => {
    console.log('Closing drawer and cleaning up state');
    setIsDrawerOpen(false);
    setSelectedClient(null);
  };

  return (
    <ErrorBoundary>
      <div className="pl-4 pr-0 pt-2 pb-0">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-xs italic text-muted-foreground/70">Prospective clients and new business opportunities</p>
          </div>
        </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <Button 
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search leads..."
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
            data={leads}
            searchTerm={searchTerm}
            onRowClick={() => {}} // Disable generic row click
            onViewDetails={handleRowClick}
            onEdit={handleRowClick}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <CreateLeadModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onLeadCreated={handleLeadCreated}
      />

      {selectedClient && (
        <ClientDetailDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onStageChange={handleStageChange}
        />
      )}

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}