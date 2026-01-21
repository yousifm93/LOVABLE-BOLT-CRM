import { useState, useEffect } from "react";
import { Search, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { databaseService } from "@/services/database";
import { useToast } from "@/components/ui/use-toast";
import { formatDateModern } from "@/utils/dateUtils";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface DeletedTask {
  id: string;
  title: string;
  description?: string;
  deleted_at: string;
  status: string;
  priority: string;
  assignee?: { first_name: string; last_name: string; email: string };
  borrower?: { first_name: string; last_name: string };
  deleted_by_user?: { first_name: string; last_name: string; email: string };
}

interface DeletedLead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  deleted_at: string;
  status?: string;
  deleted_by_user?: { first_name: string; last_name: string; email: string };
  pipeline_stage?: { id: string; name: string };
}

interface DeletedAgent {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  brokerage?: string;
  deleted_at: string;
  deleted_by_user?: { first_name: string; last_name: string; email: string };
}

interface DeletedLender {
  id: string;
  lender_name: string;
  deleted_at: string;
  deleted_by_user?: { first_name: string; last_name: string; email: string };
}

export default function DeletedItemsAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState<DeletedTask[]>([]);
  const [leads, setLeads] = useState<DeletedLead[]>([]);
  const [agents, setAgents] = useState<DeletedAgent[]>([]);
  const [lenders, setLenders] = useState<DeletedLender[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);
  const { toast } = useToast();

  const loadDeletedItems = async () => {
    setLoading(true);
    try {
      const [fetchedTasks, fetchedLeads, fetchedAgents, fetchedLenders] = await Promise.all([
        databaseService.getDeletedTasks(),
        databaseService.getDeletedLeads().catch(() => []),
        databaseService.getDeletedBuyerAgents().catch(() => []),
        databaseService.getDeletedLenders().catch(() => []),
      ]);
      setTasks(fetchedTasks as any || []);
      setLeads(fetchedLeads as any || []);
      setAgents(fetchedAgents as any || []);
      setLenders(fetchedLenders as any || []);
    } catch (error) {
      console.error("Error loading deleted items:", error);
      toast({
        title: "Error",
        description: "Failed to load deleted items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedItems();
  }, []);

  // Task handlers
  const handleRestoreTask = async (task: DeletedTask) => {
    try {
      await databaseService.restoreTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      toast({ title: "Task restored successfully", duration: 2000 });
    } catch (error) {
      toast({ title: "Error restoring task", variant: "destructive" });
    }
  };

  const handlePermanentDeleteTask = async (task: DeletedTask) => {
    setItemToDelete({ type: 'task', id: task.id, name: task.title });
    setDeleteDialogOpen(true);
  };

  // Lead handlers
  const handleRestoreLead = async (lead: DeletedLead) => {
    try {
      await databaseService.restoreLead(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast({ title: "Borrower restored successfully", duration: 2000 });
    } catch (error) {
      toast({ title: "Error restoring borrower", variant: "destructive" });
    }
  };

  const handlePermanentDeleteLead = async (lead: DeletedLead) => {
    setItemToDelete({ type: 'lead', id: lead.id, name: `${lead.first_name} ${lead.last_name}` });
    setDeleteDialogOpen(true);
  };

  // Agent handlers
  const handleRestoreAgent = async (agent: DeletedAgent) => {
    try {
      await databaseService.restoreBuyerAgent(agent.id);
      setAgents(prev => prev.filter(a => a.id !== agent.id));
      toast({ title: "Agent restored successfully", duration: 2000 });
    } catch (error) {
      toast({ title: "Error restoring agent", variant: "destructive" });
    }
  };

  const handlePermanentDeleteAgent = async (agent: DeletedAgent) => {
    setItemToDelete({ type: 'agent', id: agent.id, name: `${agent.first_name} ${agent.last_name}` });
    setDeleteDialogOpen(true);
  };

  // Lender handlers
  const handleRestoreLender = async (lender: DeletedLender) => {
    try {
      await databaseService.restoreLender(lender.id);
      setLenders(prev => prev.filter(l => l.id !== lender.id));
      toast({ title: "Lender restored successfully", duration: 2000 });
    } catch (error) {
      toast({ title: "Error restoring lender", variant: "destructive" });
    }
  };

  const handlePermanentDeleteLender = async (lender: DeletedLender) => {
    setItemToDelete({ type: 'lender', id: lender.id, name: lender.lender_name });
    setDeleteDialogOpen(true);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      switch (itemToDelete.type) {
        case 'task':
          await databaseService.permanentlyDeleteTask(itemToDelete.id);
          setTasks(prev => prev.filter(t => t.id !== itemToDelete.id));
          break;
        case 'lead':
          await databaseService.permanentlyDeleteLead(itemToDelete.id);
          setLeads(prev => prev.filter(l => l.id !== itemToDelete.id));
          break;
        case 'agent':
          await databaseService.permanentlyDeleteBuyerAgent(itemToDelete.id);
          setAgents(prev => prev.filter(a => a.id !== itemToDelete.id));
          break;
        case 'lender':
          await databaseService.permanentlyDeleteLender(itemToDelete.id);
          setLenders(prev => prev.filter(l => l.id !== itemToDelete.id));
          break;
      }
      toast({ title: "Item permanently deleted", duration: 2000 });
    } catch (error) {
      toast({ title: "Error deleting item", variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Column definitions
  const taskColumns: ColumnDef<DeletedTask>[] = [
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <div className="font-medium text-sm">{row.original.title}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground truncate">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "borrower",
      header: "Borrower",
      cell: ({ row }) => row.original.borrower ? `${row.original.borrower.first_name} ${row.original.borrower.last_name}` : '-',
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    {
      accessorKey: "deleted_at",
      header: "Deleted At",
      cell: ({ row }) => formatDateModern(new Date(row.original.deleted_at)),
    },
    {
      accessorKey: "deleted_by_user",
      header: "Deleted By",
      cell: ({ row }) => row.original.deleted_by_user ? `${row.original.deleted_by_user.first_name} ${row.original.deleted_by_user.last_name}` : '-',
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleRestoreTask(row.original)} className="text-green-600 hover:text-green-700">
            <RotateCcw className="h-4 w-4 mr-1" /> Restore
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePermanentDeleteTask(row.original)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-1" /> Delete Forever
          </Button>
        </div>
      ),
    },
  ];

  const leadColumns: ColumnDef<DeletedLead>[] = [
    {
      accessorKey: "name",
      header: "Borrower",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.first_name} {row.original.last_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: "pipeline_stage",
      header: "Last Known Stage",
      cell: ({ row }) => row.original.pipeline_stage?.name ? (
        <StatusBadge status={row.original.pipeline_stage.name} />
      ) : '-',
    },
    {
      accessorKey: "deleted_at",
      header: "Deleted At",
      cell: ({ row }) => formatDateModern(new Date(row.original.deleted_at)),
    },
    {
      accessorKey: "deleted_by_user",
      header: "Deleted By",
      cell: ({ row }) => row.original.deleted_by_user ? `${row.original.deleted_by_user.first_name} ${row.original.deleted_by_user.last_name}` : '-',
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleRestoreLead(row.original)} className="text-green-600 hover:text-green-700">
            <RotateCcw className="h-4 w-4 mr-1" /> Restore
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePermanentDeleteLead(row.original)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-1" /> Delete Forever
          </Button>
        </div>
      ),
    },
  ];

  const agentColumns: ColumnDef<DeletedAgent>[] = [
    {
      accessorKey: "name",
      header: "Agent",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.first_name} {row.original.last_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.brokerage}</div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || '-',
    },
    {
      accessorKey: "deleted_at",
      header: "Deleted At",
      cell: ({ row }) => formatDateModern(new Date(row.original.deleted_at)),
    },
    {
      accessorKey: "deleted_by_user",
      header: "Deleted By",
      cell: ({ row }) => row.original.deleted_by_user ? `${row.original.deleted_by_user.first_name} ${row.original.deleted_by_user.last_name}` : '-',
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleRestoreAgent(row.original)} className="text-green-600 hover:text-green-700">
            <RotateCcw className="h-4 w-4 mr-1" /> Restore
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePermanentDeleteAgent(row.original)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-1" /> Delete Forever
          </Button>
        </div>
      ),
    },
  ];

  const lenderColumns: ColumnDef<DeletedLender>[] = [
    {
      accessorKey: "lender_name",
      header: "Lender",
      cell: ({ row }) => <div className="font-medium">{row.original.lender_name}</div>,
    },
    {
      accessorKey: "deleted_at",
      header: "Deleted At",
      cell: ({ row }) => formatDateModern(new Date(row.original.deleted_at)),
    },
    {
      accessorKey: "deleted_by_user",
      header: "Deleted By",
      cell: ({ row }) => row.original.deleted_by_user ? `${row.original.deleted_by_user.first_name} ${row.original.deleted_by_user.last_name}` : '-',
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleRestoreLender(row.original)} className="text-green-600 hover:text-green-700">
            <RotateCcw className="h-4 w-4 mr-1" /> Restore
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePermanentDeleteLender(row.original)} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-1" /> Delete Forever
          </Button>
        </div>
      ),
    },
  ];

  // Filter functions
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = leads.filter(lead => 
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAgents = agents.filter(agent => 
    `${agent.first_name} ${agent.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.brokerage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLenders = lenders.filter(lender => 
    lender.lender_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCount = tasks.length + leads.length + agents.length + lenders.length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deleted Items</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {totalCount} deleted item{totalCount !== 1 ? 's' : ''} • Admin access only
        </p>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search deleted items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="borrowers">Borrowers ({leads.length})</TabsTrigger>
              <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
              <TabsTrigger value="lenders">Lenders ({lenders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredTasks.length > 0 ? (
                <DataTable columns={taskColumns} data={filteredTasks} searchTerm={searchTerm} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No deleted tasks</div>
              )}
            </TabsContent>

            <TabsContent value="borrowers">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredLeads.length > 0 ? (
                <DataTable columns={leadColumns} data={filteredLeads} searchTerm={searchTerm} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No deleted borrowers</div>
              )}
            </TabsContent>

            <TabsContent value="agents">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredAgents.length > 0 ? (
                <DataTable columns={agentColumns} data={filteredAgents} searchTerm={searchTerm} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No deleted agents</div>
              )}
            </TabsContent>

            <TabsContent value="lenders">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredLenders.length > 0 ? (
                <DataTable columns={lenderColumns} data={filteredLenders} searchTerm={searchTerm} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No deleted lenders</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmPermanentDelete}
        title="Permanently Delete"
        description={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}