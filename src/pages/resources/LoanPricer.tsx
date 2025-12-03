import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, CheckCircle, XCircle, Eye, AlertCircle, RefreshCw, Loader2, FileText, DollarSign, Pencil } from "lucide-react";
import { NewRunModal } from "./loan-pricer/NewRunModal";
import { ResultsModal } from "./loan-pricer/ResultsModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/formatters";

interface PricingRun {
  id: string;
  lead_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  scenario_json: any;
  results_json: any;
  error_message: string | null;
  retry_count: number;
  leads?: {
    first_name: string;
    last_name: string;
  };
}

export function LoanPricer() {
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PricingRun | null>(null);
  const [pricingRuns, setPricingRuns] = useState<PricingRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prefilledScenario, setPrefilledScenario] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPricingRuns();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('pricing_runs_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pricing_runs'
        },
        (payload) => {
          console.log('Pricing run updated:', payload);
          fetchPricingRuns();

          // Show toast notification on completion
          if (payload.new.status === 'completed') {
            const rate = payload.new.results_json?.rate;
            toast({
              title: "✓ Pricing Run Completed",
              description: rate ? `Rate: ${rate}%` : "Results are ready to view",
            });
          } else if (payload.new.status === 'failed') {
            toast({
              title: "Pricing Run Failed",
              description: payload.new.error_message || "An error occurred during pricing",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

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

  const handleViewResults = async (run: PricingRun) => {
    try {
      const { data } = await supabase
        .from('pricing_runs')
        .select(`
          *,
          leads (
            first_name,
            last_name
          )
        `)
        .eq('id', run.id)
        .maybeSingle();
      setSelectedRun((data as any) || run);
    } catch (e) {
      setSelectedRun(run);
    }
    setIsResultsModalOpen(true);
  };

  const handleRunAgain = (scenarioData: any) => {
    setPrefilledScenario(scenarioData);
    setIsNewRunModalOpen(true);
  };

  const handleRetry = async (run: PricingRun) => {
    try {
      const { error } = await supabase.functions.invoke('loan-pricer-scraper', {
        body: { run_id: run.id }
      });

      if (error) throw error;

      toast({
        title: "Retry started",
        description: "The pricing run is being retried.",
      });
    } catch (error: any) {
      toast({
        title: "Error retrying run",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-warning animate-spin" />;
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
                  <TableHead>Program</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Monthly Payment</TableHead>
                  <TableHead>Disc. Points</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        {run.status === 'failed' && run.error_message ? (
                          <HoverCard>
                            <HoverCardTrigger>
                              <div className="flex items-center gap-2 cursor-help">
                                {getStatusBadge(run.status)}
                                {run.retry_count > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({run.retry_count}/3)
                                  </span>
                                )}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-96 max-h-96 overflow-auto">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                  <p className="text-sm font-medium">Error Details</p>
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                    {run.error_message}
                                  </p>
                                  {run.results_json?.debug_text && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium mb-1">Debug Output:</p>
                                      <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-40">
                                        {run.results_json.debug_text}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          getStatusBadge(run.status)
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.leads ? 
                        `${run.leads.first_name} ${run.leads.last_name}` : 
                        'Direct Run'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">
                          {run.scenario_json?.program_type || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {run.scenario_json?.loan_type || ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.scenario_json?.loan_amount ? 
                        formatCurrency(run.scenario_json.loan_amount) : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {run.results_json?.rate ? (
                        <span className="font-medium text-primary">{String(run.results_json.rate).replace(/\s*%/g, '')}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {run.results_json?.monthly_payment ? (
                        <span className="font-medium">{formatCurrency(run.results_json.monthly_payment)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {run.results_json?.discount_points ? (
                        <span className="font-medium">{run.results_json.discount_points}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm">
                          {format(new Date(run.started_at), 'MMM d')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(run.started_at), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.completed_at ? 
                        `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s` :
                        run.status === 'running' ? (
                          <span className="text-muted-foreground animate-pulse">
                            {Math.round((new Date().getTime() - new Date(run.started_at).getTime()) / 1000)}s...
                          </span>
                        ) : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={run.status === 'running' || run.status === 'pending'}
                          onClick={() => handleViewResults(run)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {run.status === 'failed' && run.retry_count < 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRetry(run)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Rate Sheet Screenshot Button */}
                        {run.results_json?.screenshot_1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(run.results_json.screenshot_1, '_blank')}
                            title="View Rate Sheet"
                          >
                            <div className="relative">
                              <FileText className="h-4 w-4" />
                              <DollarSign className="h-2.5 w-2.5 absolute -bottom-0.5 -right-1 bg-background rounded-full" />
                            </div>
                          </Button>
                        )}
                        {/* Input Fields Screenshot Button */}
                        {run.results_json?.screenshot_2 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(run.results_json.screenshot_2, '_blank')}
                            title="View Input Fields"
                          >
                            <div className="relative">
                              <FileText className="h-4 w-4" />
                              <Pencil className="h-2.5 w-2.5 absolute -bottom-0.5 -right-1 bg-background rounded-full" />
                            </div>
                          </Button>
                        )}
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
        onOpenChange={(open) => {
          setIsNewRunModalOpen(open);
          if (!open) {
            setPrefilledScenario(null);
          }
        }}
        onRunCreated={fetchPricingRuns}
        prefilledScenario={prefilledScenario}
      />

      <ResultsModal
        open={isResultsModalOpen}
        onOpenChange={setIsResultsModalOpen}
        run={selectedRun}
        onRunAgain={handleRunAgain}
      />
    </div>
  );
}