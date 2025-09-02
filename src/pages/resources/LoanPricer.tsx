import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, CheckCircle, XCircle, Download, Eye } from "lucide-react";
import { NewRunModal } from "./loan-pricer/NewRunModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PricingRun {
  id: string;
  lead_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  scenario_json: any;
  leads?: {
    first_name: string;
    last_name: string;
  };
}

export function LoanPricer() {
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [pricingRuns, setPricingRuns] = useState<PricingRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPricingRuns();
  }, []);

  const fetchPricingRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_runs')
        .select(`
          *,
          leads (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPricingRuns(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching pricing runs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      pending: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan Pricer</h1>
          <p className="text-muted-foreground">
            Get competitive loan pricing from multiple lenders instantly
          </p>
        </div>
        <Button onClick={() => setIsNewRunModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Pricing Run
        </Button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Total Runs</p>
              <p className="text-2xl font-bold">{pricingRuns.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Completed</p>
              <p className="text-2xl font-bold text-success">
                {pricingRuns.filter(run => run.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Running</p>
              <p className="text-2xl font-bold text-warning">
                {pricingRuns.filter(run => run.status === 'running').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Failed</p>
              <p className="text-2xl font-bold text-destructive">
                {pricingRuns.filter(run => run.status === 'failed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Runs Table */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Pricing Runs</h2>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : pricingRuns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pricing runs yet. Create your first run to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        {getStatusBadge(run.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.leads ? 
                        `${run.leads.first_name} ${run.leads.last_name}` : 
                        'Direct Run'
                      }
                    </TableCell>
                    <TableCell>
                      {run.scenario_json?.loan_type || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {run.scenario_json?.loan_amount ? 
                        `$${Number(run.scenario_json.loan_amount).toLocaleString()}` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(run.started_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      {run.completed_at ? 
                        `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s` :
                        run.status === 'running' ? 'In progress...' : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" disabled={run.status !== 'completed'}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={run.status !== 'completed'}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <NewRunModal
        open={isNewRunModalOpen}
        onOpenChange={setIsNewRunModalOpen}
        onRunCreated={fetchPricingRuns}
      />
    </div>
  );
}