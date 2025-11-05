import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, X } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { format } from "date-fns";

interface PricingRun {
  id: string;
  lead_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  scenario_json: any;
  results_json: any;
  error_message: string | null;
  leads?: {
    first_name: string;
    last_name: string;
  };
}

interface ResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: PricingRun | null;
  onRunAgain?: (scenarioData: any) => void;
}

export function ResultsModal({ open, onOpenChange, run, onRunAgain }: ResultsModalProps) {
  if (!run) return null;

  const { scenario_json: scenario, results_json: results } = run;

  const handleRunAgain = () => {
    if (onRunAgain && scenario) {
      onRunAgain(scenario);
    }
    onOpenChange(false);
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download functionality
    console.log("Download PDF - Coming soon");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pricing Results</span>
            <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>
              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Pricing Summary Hero */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Interest Rate</p>
              <p className="text-4xl font-bold text-primary">
                {results?.rate ? `${results.rate}%` : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Monthly Payment</p>
              <p className="text-4xl font-bold text-foreground">
                {results?.monthly_payment ? formatCurrency(results.monthly_payment) : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Discount Points</p>
              <p className="text-4xl font-bold text-foreground">
                {results?.discount_points || 'N/A'}
              </p>
            </div>
          </div>

          {/* Additional Pricing Info */}
          {results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/20">
              {results.apr && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">APR</p>
                  <p className="text-lg font-semibold">{results.apr}%</p>
                </div>
              )}
              {results.program_name && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Program</p>
                  <p className="text-lg font-semibold">{results.program_name}</p>
                </div>
              )}
              {run.completed_at && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Priced At</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(run.completed_at), 'h:mm a')}
                  </p>
                </div>
              )}
              {run.started_at && run.completed_at && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-semibold">
                    {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Scenario Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Loan Program Card */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Loan Program</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Program Type:</span>
                <span className="text-sm font-medium">{scenario?.program_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Loan Type:</span>
                <span className="text-sm font-medium">{scenario?.loan_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Purpose:</span>
                <span className="text-sm font-medium">{scenario?.loan_purpose || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Amortization:</span>
                <span className="text-sm font-medium">{scenario?.amortization_type || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Property Details Card */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Property Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Property Type:</span>
                <span className="text-sm font-medium">{scenario?.property_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Units:</span>
                <span className="text-sm font-medium">{scenario?.num_units || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Occupancy:</span>
                <span className="text-sm font-medium">{scenario?.occupancy || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">State:</span>
                <span className="text-sm font-medium">{scenario?.state || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Borrower Info Card */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Borrower Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">FICO Score:</span>
                <span className="text-sm font-medium">{scenario?.fico_score || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Citizenship:</span>
                <span className="text-sm font-medium">{scenario?.citizenship || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">DTI:</span>
                <span className="text-sm font-medium">{scenario?.dti || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">LTV:</span>
                <span className="text-sm font-medium">{scenario?.ltv ? `${scenario.ltv}%` : 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Loan Details Card */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Loan Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Loan Amount:</span>
                <span className="text-sm font-medium">
                  {scenario?.loan_amount ? formatCurrency(scenario.loan_amount) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Lock Period:</span>
                <span className="text-sm font-medium">{scenario?.lock_period ? `${scenario.lock_period} days` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Broker Comp:</span>
                <span className="text-sm font-medium">{scenario?.broker_compensation || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Non-QM Details Card */}
          {scenario?.program_type === "Non-QM" && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-3 text-sm text-blue-900 dark:text-blue-100">Non-QM Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income Type:</span>
                  <Badge variant="secondary">{scenario.income_type || 'N/A'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mortgage History:</span>
                  <Badge variant="secondary">{scenario.mortgage_history || 'N/A'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Events:</span>
                  <Badge variant="secondary">{scenario.credit_events || 'N/A'}</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Additional Options Card */}
        {scenario && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Additional Options</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${scenario.admin_fee_buyout ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                  {scenario.admin_fee_buyout && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <span className="text-sm">Admin Fee Buyout</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${scenario.escrow_waiver ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                  {scenario.escrow_waiver && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <span className="text-sm">Escrow Waiver</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${scenario.high_balance ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                  {scenario.high_balance && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <span className="text-sm">High Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${scenario.sub_financing ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                  {scenario.sub_financing && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <span className="text-sm">Sub Financing</span>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button onClick={handleRunAgain} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Run Again
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="ghost" className="gap-2 ml-auto">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
