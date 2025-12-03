import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, RefreshCw, X, Eye } from "lucide-react";
import { formatCurrency, calculateMonthlyPayment } from "@/utils/formatters";
import { format } from "date-fns";
import { DebugViewerModal } from "@/components/loan-pricer/DebugViewerModal";

// Calculate default PITI values based on property type and purchase price
const getDefaultPITI = (scenario: any) => {
  const purchasePrice = scenario?.purchase_price || 0;
  const propertyType = scenario?.property_type || 'Single Family';
  
  // Taxes: 1.5% of purchase price / 12 (ALL property types)
  const defaultTaxes = Math.round((purchasePrice * 0.015) / 12);
  
  // Insurance: 
  // - Condo: flat $75/month
  // - Single Family & 2-4 Units: $75/month per $100K purchase price
  const defaultInsurance = propertyType === 'Condo' 
    ? 75 
    : Math.round((purchasePrice / 100000) * 75);
  
  // MI: Always blank (user enters)
  const defaultMI = 0;
  
  // HOA:
  // - Condo: $150/month per $100K purchase price
  // - Single Family & 2-4 Units: $0
  const defaultHOA = propertyType === 'Condo'
    ? Math.round((purchasePrice / 100000) * 150)
    : 0;
  
  return { taxes: defaultTaxes, insurance: defaultInsurance, mi: defaultMI, hoa: defaultHOA };
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
  debug_mode?: boolean;
  debug_screenshots?: any[];
  debug_html_snapshots?: any[];
  debug_logs?: string[];
  button_scan_results?: any[];
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

// Get income type display label
const getIncomeTypeLabel = (incomeType: string | undefined): string => {
  if (!incomeType) return 'N/A';
  const labels: Record<string, string> = {
    "Full Doc - 24M": "Full Doc",
    "DSCR": "DSCR",
    "24Mo Business Bank Statements": "24 Mo Bank Stm",
    "12Mo Business Bank Statements": "12 Mo Bank Stm",
    "Community - No income/No employment/No DTI": "No Ratio Primary"
  };
  return labels[incomeType] || incomeType;
};

// Derive state from ZIP code
const getStateFromZip = (zip: string | undefined): string => {
  if (!zip) return 'N/A';
  const zipNum = parseInt(zip);
  if (isNaN(zipNum)) return 'N/A';
  
  // Florida ZIP codes: 32000-34999
  if (zipNum >= 32000 && zipNum <= 34999) return 'Florida';
  // Add other common states as needed
  // Georgia: 30000-31999, 39800-39999
  if ((zipNum >= 30000 && zipNum <= 31999) || (zipNum >= 39800 && zipNum <= 39999)) return 'Georgia';
  // Texas: 75000-79999, 88500-88599
  if ((zipNum >= 75000 && zipNum <= 79999) || (zipNum >= 88500 && zipNum <= 88599)) return 'Texas';
  // California: 90000-96199
  if (zipNum >= 90000 && zipNum <= 96199) return 'California';
  // New York: 10000-14999
  if (zipNum >= 10000 && zipNum <= 14999) return 'New York';
  
  return 'FL'; // Default to FL
};

export function ResultsModal({ open, onOpenChange, run, onRunAgain }: ResultsModalProps) {
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [pitiInputs, setPitiInputs] = useState({ taxes: 0, insurance: 0, mi: 0, hoa: 0 });
  
  const scenario = run?.scenario_json;
  const results = run?.results_json;
  
  // Calculate default PITI when scenario changes
  useEffect(() => {
    if (scenario) {
      setPitiInputs(getDefaultPITI(scenario));
    }
  }, [scenario?.purchase_price, scenario?.property_type]);
  
  if (!run) return null;

  const hasDebugData = (run.debug_screenshots && run.debug_screenshots.length > 0) || 
                       (run.button_scan_results && run.button_scan_results.length > 0) ||
                       (run.debug_logs && run.debug_logs.length > 0);
  const showDebugButton = run.status === 'failed' || hasDebugData;

  // Calculate monthly P&I payment dynamically
  const calculatedMonthlyPayment = (() => {
    const loanAmount = scenario?.loan_amount;
    const rateStr = results?.rate;
    if (!loanAmount || !rateStr) return null;
    const rate = parseFloat(String(rateStr).replace(/\s*%/g, ''));
    if (isNaN(rate)) return null;
    return calculateMonthlyPayment(loanAmount, rate, 360);
  })();
  
  // Calculate total PITI
  const totalPITI = (calculatedMonthlyPayment || 0) + pitiInputs.taxes + pitiInputs.insurance + pitiInputs.mi + pitiInputs.hoa;

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
          <DialogTitle>Pricing Results</DialogTitle>
        </DialogHeader>

        {/* Pricing Summary Hero - Program, FICO, LTV, Rate, Points */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Loan Program</p>
              <p className="text-xl font-bold text-foreground">
                {getIncomeTypeLabel(scenario?.income_type)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">FICO</p>
              <p className="text-2xl font-bold text-foreground">
                {scenario?.fico_score || 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">LTV</p>
              <p className="text-2xl font-bold text-foreground">
                {scenario?.loan_amount && scenario?.purchase_price 
                  ? `${((scenario.loan_amount / scenario.purchase_price) * 100).toFixed(1)}%` 
                  : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Interest Rate</p>
              <p className="text-2xl font-bold text-primary">
                {results?.rate ? `${String(results.rate).replace(/\s*%/g, '')}%` : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Points</p>
              <p className="text-2xl font-bold text-foreground">
                {results?.discount_points ? (100 - parseFloat(results.discount_points)).toFixed(3) : 'N/A'}
              </p>
            </div>
          </div>
          {run.completed_at && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Priced at {format(new Date(run.completed_at), "MMMM d, h:mm a")}
            </p>
          )}
        </Card>

        {/* Main Content: 2-column layout - PITI on left, Details on right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* LEFT SIDE: Monthly Payment Breakdown (1/3 width) */}
          <div className="md:col-span-1">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Monthly Payment Breakdown</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-1.5 bg-muted/30 text-sm">P&I</td>
                      <td className="px-3 py-1.5 text-right text-sm font-medium">
                        {calculatedMonthlyPayment ? formatCurrency(calculatedMonthlyPayment) : '—'}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="pl-6 pr-3 py-1.5 bg-muted/30 text-sm text-muted-foreground">Taxes</td>
                      <td className="px-3 py-1.5 text-right">
                        <Input 
                          type="number" 
                          value={pitiInputs.taxes || ''} 
                          onChange={(e) => setPitiInputs(prev => ({ ...prev, taxes: Number(e.target.value) || 0 }))}
                          className="w-20 text-right ml-auto h-6 text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="pl-6 pr-3 py-1.5 bg-muted/30 text-sm text-muted-foreground">Insurance</td>
                      <td className="px-3 py-1.5 text-right">
                        <Input 
                          type="number" 
                          value={pitiInputs.insurance || ''} 
                          onChange={(e) => setPitiInputs(prev => ({ ...prev, insurance: Number(e.target.value) || 0 }))}
                          className="w-20 text-right ml-auto h-6 text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="pl-6 pr-3 py-1.5 bg-muted/30 text-sm text-muted-foreground">MI</td>
                      <td className="px-3 py-1.5 text-right">
                        <Input 
                          type="number" 
                          value={pitiInputs.mi || ''} 
                          onChange={(e) => setPitiInputs(prev => ({ ...prev, mi: Number(e.target.value) || 0 }))}
                          className="w-20 text-right ml-auto h-6 text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="pl-6 pr-3 py-1.5 bg-muted/30 text-sm text-muted-foreground">HOA</td>
                      <td className="px-3 py-1.5 text-right">
                        <Input 
                          type="number" 
                          value={pitiInputs.hoa || ''} 
                          onChange={(e) => setPitiInputs(prev => ({ ...prev, hoa: Number(e.target.value) || 0 }))}
                          className="w-20 text-right ml-auto h-6 text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                    <tr className="bg-primary/10">
                      <td className="px-3 py-1.5 font-semibold text-sm">Total PITI</td>
                      <td className="px-3 py-1.5 text-right font-bold text-primary text-base">
                        {formatCurrency(totalPITI)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* RIGHT SIDE: All detail cards stacked vertically (2/3 width) */}
          <div className="md:col-span-2 space-y-3">
            {/* Borrower Card */}
            <Card className="p-3">
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Borrower</h3>
              <div className="flex justify-between">
                <span className="text-sm">Name:</span>
                <span className="text-sm font-medium">
                  {run.leads ? `${run.leads.first_name} ${run.leads.last_name}` : 'Direct Run'}
                </span>
              </div>
            </Card>

            {/* Property Details Card */}
            <Card className="p-3">
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Property Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Property Type:</span>
                  <span className="text-sm font-medium">{scenario?.property_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Occupancy:</span>
                  <span className="text-sm font-medium">{scenario?.occupancy || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Units:</span>
                  <span className="text-sm font-medium">{scenario?.num_units || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ZIP / State:</span>
                  <span className="text-sm font-medium">{scenario?.zip_code || 'N/A'} / {getStateFromZip(scenario?.zip_code)}</span>
                </div>
              </div>
            </Card>

            {/* Loan Details Card */}
            <Card className="p-3">
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Loan Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Purchase Price:</span>
                  <span className="text-sm font-medium">
                    {scenario?.purchase_price ? formatCurrency(scenario.purchase_price) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Loan Amount:</span>
                  <span className="text-sm font-medium">
                    {scenario?.loan_amount ? formatCurrency(scenario.loan_amount) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Lock Period:</span>
                  <span className="text-sm font-medium">30 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Broker Comp:</span>
                  <span className="text-sm font-medium">2.75%</span>
                </div>
              </div>
            </Card>

            {/* Loan Program Card */}
            <Card className="p-3">
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Loan Program</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Amortization:</span>
                  <span className="text-sm font-medium">30 Years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Purpose:</span>
                  <span className="text-sm font-medium">Purchase</span>
                </div>
                {scenario?.dscr_ratio && (
                  <div className="flex justify-between">
                    <span className="text-sm">DSCR Ratio:</span>
                    <span className="text-sm font-medium">{scenario.dscr_ratio}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Non-QM Details Card */}
            {scenario?.program_type === "Non-QM" && (
              <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2 text-sm text-blue-900 dark:text-blue-100">Non-QM Details</h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Income Type:</span>
                    <Badge variant="secondary" className="text-xs">{scenario.income_type || 'N/A'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mortgage History:</span>
                    <Badge variant="secondary" className="text-xs">{scenario.mortgage_history || 'N/A'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credit Events:</span>
                    <Badge variant="secondary" className="text-xs">{scenario.credit_events || 'N/A'}</Badge>
                  </div>
                </div>
              </Card>
            )}

            {/* Additional Options Card */}
            {scenario && (
              <Card className="p-3">
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Additional Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded border flex items-center justify-center ${scenario.admin_fee_buyout ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {scenario.admin_fee_buyout && (
                        <svg className="w-2 h-2 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs">Admin Fee Buyout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded border flex items-center justify-center ${scenario.escrow_waiver ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {scenario.escrow_waiver && (
                        <svg className="w-2 h-2 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs">Escrow Waiver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded border flex items-center justify-center ${scenario.high_balance ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {scenario.high_balance && (
                        <svg className="w-2 h-2 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs">High Balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded border flex items-center justify-center ${scenario.sub_financing ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {scenario.sub_financing && (
                        <svg className="w-2 h-2 text-primary-foreground" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs">Sub Financing</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {showDebugButton && (
            <Button 
              onClick={() => setShowDebugModal(true)} 
              variant="outline" 
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Debug Data
              <Badge variant="secondary" className="ml-1">
                {(run.debug_screenshots?.length || 0) + 
                 (run.debug_html_snapshots?.length || 0) + 
                 (run.button_scan_results ? 1 : 0)}
              </Badge>
            </Button>
          )}
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
      
      {/* Debug Viewer Modal */}
      <DebugViewerModal
        open={showDebugModal}
        onOpenChange={setShowDebugModal}
        screenshots={run.debug_screenshots}
        htmlSnapshots={run.debug_html_snapshots}
        buttonScanResults={run.button_scan_results}
        debugLogs={run.debug_logs}
        errorMessage={run.error_message}
      />
    </Dialog>
  );
}
