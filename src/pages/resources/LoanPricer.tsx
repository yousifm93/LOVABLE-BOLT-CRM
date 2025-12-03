import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, CheckCircle, XCircle, Eye, AlertCircle, RefreshCw, Loader2, FileText, DollarSign, Pencil, ExternalLink } from "lucide-react";
import { NewRunModal } from "./loan-pricer/NewRunModal";
import { ResultsModal } from "./loan-pricer/ResultsModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatCurrency, calculateMonthlyPayment } from "@/utils/formatters";

const getIncomeTypeLabel = (incomeType: string | undefined): string => {
  if (!incomeType) return 'N/A';
  const labels: Record<string, string> = {
    "Full Doc - 24M": "Full Doc",
    "DSCR": "DSCR",
    "24Mo Business Bank Statements": "24MO Bank STM",
    "12Mo Business Bank Statements": "12MO Bank STM",
    "Community - No income/No employment/No DTI": "No Ratio Primary"
  };
  return labels[incomeType] || incomeType;
};

// Convert Google Drive URLs to viewable format
const formatGoogleDriveUrl = (url: string): string => {
  if (!url) return '';
  // If already a direct view URL
  if (url.includes('drive.google.com/uc')) return url;
  // If it's a thumbnail link format
  if (url.includes('drive.google.com/thumbnail')) return url;
  // If it's a file link format: drive.google.com/file/d/FILE_ID/...
  const fileMatch = url.match(/\/d\/([^\/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }
  // If it's just an ID (no http)
  if (!url.includes('http')) {
    return `https://drive.google.com/uc?export=view&id=${url}`;
  }
  return url;
};

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
  const [screenshotPreview, setScreenshotPreview] = useState<{
    open: boolean;
    url: string;
    title: string;
  } | null>(null);
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

  const handleCancel = async (run: PricingRun) => {
    try {
      const { error } = await supabase
        .from('pricing_runs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Cancelled by user'
        })
        .eq('id', run.id);

      if (error) throw error;

      toast({
        title: "Run cancelled",
        description: "The pricing run has been cancelled.",
      });
      
      fetchPricingRuns();
    } catch (error: any) {
      toast({
        title: "Error cancelling run",
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
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
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
      cancelled: "outline",
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
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Monthly Payment</TableHead>
                  <TableHead>Disc. Points</TableHead>
                  <TableHead>Disc. Points 2</TableHead>
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
                      <div className="text-sm font-medium">
                        {getIncomeTypeLabel(run.scenario_json?.income_type)}
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
                      {(() => {
                        const loanAmount = run.scenario_json?.loan_amount;
                        const rateStr = run.results_json?.rate;
                        if (!loanAmount || !rateStr) return <span className="text-muted-foreground">-</span>;
                        
                        const rate = parseFloat(String(rateStr).replace(/\s*%/g, ''));
                        if (isNaN(rate)) return <span className="text-muted-foreground">-</span>;
                        
                        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, 360);
                        if (!monthlyPayment) return <span className="text-muted-foreground">-</span>;
                        
                        return <span className="font-medium">{formatCurrency(monthlyPayment)}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {run.results_json?.discount_points ? (
                        <span className="font-medium">{run.results_json.discount_points}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {run.results_json?.discount_points ? (
                        <span className="font-medium">
                          {(100 - parseFloat(run.results_json.discount_points)).toFixed(3)}
                        </span>
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
                        {(run.status === 'running' || run.status === 'pending') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCancel(run)}
                            title="Cancel Run"
                          >
                            <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                        {/* Rate Sheet Screenshot Button */}
                        {run.results_json?.screenshot_1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setScreenshotPreview({
                              open: true,
                              url: run.results_json.screenshot_1,
                              title: "Rate Sheet Screenshot"
                            })}
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
                            onClick={() => setScreenshotPreview({
                              open: true,
                              url: run.results_json.screenshot_2,
                              title: "Input Fields Screenshot"
                            })}
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

      {/* Screenshot Preview Modal */}
      <Dialog 
        open={screenshotPreview?.open ?? false} 
        onOpenChange={(open) => !open && setScreenshotPreview(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{screenshotPreview?.title}</DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center overflow-auto">
            <img 
              src={formatGoogleDriveUrl(screenshotPreview?.url || '')}
              alt={screenshotPreview?.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg border"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => window.open(formatGoogleDriveUrl(screenshotPreview?.url || ''), '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
            <Button onClick={() => setScreenshotPreview(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

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
