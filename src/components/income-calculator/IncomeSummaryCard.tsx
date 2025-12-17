import React, { useState, useEffect } from "react";
import { Calculator, Download, Save, AlertTriangle, CheckCircle, DollarSign, TrendingUp, ChevronDown, ChevronUp, FileWarning, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
}

interface CalculationTraceItem {
  year: number;
  form: string;
  line_or_box: string;
  description: string;
  amount: number;
  sign: string;
  allocated_to: string;
  allocation_pct?: number;
}

interface IncomeCalculation {
  id: string;
  borrower_id: string;
  agency: string;
  result_monthly_income?: number;
  confidence?: number;
  warnings?: any[];
  overrides?: any;
  created_at: string;
  calculation_trace?: CalculationTraceItem[];
  missing_inputs?: string[];
  calculation_version?: string;
}

interface IncomeComponent {
  id: string;
  component_type: string;
  monthly_amount: number;
  calculation_method?: string;
  months_considered?: number;
  notes?: string;
}

interface IncomeSummaryCardProps {
  calculation?: IncomeCalculation;
  borrower: Borrower | null;
  agency: string;
  onCalculate: () => void;
  onExport: () => void;
  isCalculating: boolean;
}

export function IncomeSummaryCard({ 
  calculation, 
  borrower, 
  agency, 
  onCalculate, 
  onExport, 
  isCalculating 
}: IncomeSummaryCardProps) {
  const [components, setComponents] = useState<IncomeComponent[]>([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [showMissingInputs, setShowMissingInputs] = useState(true);

  useEffect(() => {
    if (calculation?.id) {
      loadIncomeComponents();
    }
  }, [calculation?.id]);

  const loadIncomeComponents = async () => {
    if (!calculation?.id) return;

    setIsLoadingComponents(true);
    try {
      const { data, error } = await supabase
        .from('income_components')
        .select('*')
        .eq('calculation_id', calculation.id)
        .order('monthly_amount', { ascending: false });

      if (error) throw error;
      setComponents(data || []);
    } catch (error) {
      console.error('Error loading income components:', error);
    } finally {
      setIsLoadingComponents(false);
    }
  };

  const getComponentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      base_hourly: "Base Hourly",
      base_salary: "Base Salary", 
      overtime: "Overtime",
      bonus: "Bonus",
      commission: "Commission",
      self_employed: "Self-Employed",
      self_employment: "Self-Employment",
      rental: "Rental Income",
      rental_income: "Rental Income",
      w2_income: "W-2 Income",
      variable_income_ytd: "Variable (YTD)",
      voe_verified: "VOE Verified",
      k1_income: "K-1 Income",
      k1_1120s_income: "S-Corp (K-1/1120S)",
      partnership_k1_income: "Partnership (K-1/1065)",
      ccorp_income: "C-Corp (1120)",
      farm_income: "Farm (Schedule F)",
      other: "Other Income"
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getComponentColor = (type: string) => {
    const colors = {
      base_hourly: "text-blue-600",
      base_salary: "text-green-600",
      overtime: "text-purple-600", 
      bonus: "text-orange-600",
      commission: "text-pink-600",
      self_employed: "text-indigo-600",
      self_employment: "text-indigo-600",
      rental: "text-teal-600",
      rental_income: "text-teal-600",
      k1_income: "text-red-600",
      k1_1120s_income: "text-red-600",
      partnership_k1_income: "text-cyan-600",
      ccorp_income: "text-amber-600",
      farm_income: "text-lime-600",
      other: "text-gray-600"
    };
    return colors[type as keyof typeof colors] || "text-gray-600";
  };

  const confidencePercentage = calculation?.confidence ? Math.round(calculation.confidence * 100) : 0;
  const hasWarnings = calculation?.warnings && calculation.warnings.length > 0;
  const hasMissingInputs = calculation?.missing_inputs && calculation.missing_inputs.length > 0;
  const hasTrace = calculation?.calculation_trace && calculation.calculation_trace.length > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!calculation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Income Summary
          </CardTitle>
        <CardDescription>
          Calculate qualifying monthly income for {borrower?.first_name || 'Borrower'} {borrower?.last_name || ''}
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No Calculation Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload documents and run income calculation to see results
            </p>
            <Button onClick={onCalculate} disabled={isCalculating}>
              {isCalculating ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calculating...
                </div>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Income
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Agency:</span>
              <Badge variant="secondary">{agency.toUpperCase()}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Borrower:</span>
              <span>{borrower?.first_name || 'Borrower'} {borrower?.last_name || ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Income Summary
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Monthly qualifying income for {borrower?.first_name || 'Borrower'} {borrower?.last_name || ''}</span>
          {calculation.calculation_version && (
            <Badge variant="outline" className="text-xs">
              {calculation.calculation_version}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Missing Inputs Warning */}
        {hasMissingInputs && (
          <Collapsible open={showMissingInputs} onOpenChange={setShowMissingInputs}>
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
              <FileWarning className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <span className="font-medium">
                    {calculation.missing_inputs?.length} Missing Document{calculation.missing_inputs?.length !== 1 ? 's' : ''} Detected
                  </span>
                  {showMissingInputs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <ul className="list-disc pl-4 text-sm space-y-1">
                    {calculation.missing_inputs?.map((input, idx) => (
                      <li key={idx}>{input}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2 text-amber-700">
                    Upload the missing documents for a more accurate calculation.
                  </p>
                </CollapsibleContent>
              </AlertDescription>
            </Alert>
          </Collapsible>
        )}

        {/* Main Result - Large and prominent */}
        <div className="text-center p-6 bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            <span className="text-lg font-semibold text-green-700 dark:text-green-400">MONTHLY QUALIFYING INCOME</span>
          </div>
          <div className="text-5xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(calculation.result_monthly_income || 0)}
          </div>
          {calculation.result_monthly_income === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              No qualifying income found. Check document types or upload additional documents.
            </p>
          )}
          {(calculation.result_monthly_income ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Per Fannie Mae guidelines
            </p>
          )}
        </div>

        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className="font-medium">{confidencePercentage}%</span>
          </div>
          <Progress value={confidencePercentage} className="h-2" />
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {calculation.warnings?.length} warning{calculation.warnings?.length !== 1 ? 's' : ''} found. 
              Review calculation details.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Income Components */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Income Components</h4>
            {isLoadingComponents && (
              <div className="h-4 w-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {components.length > 0 ? (
            <div className="space-y-2">
              {components.map((component) => (
                <div key={component.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getComponentColor(component.component_type)} bg-current opacity-20`} />
                    <div>
                      <span className="text-sm font-medium">
                        {getComponentTypeLabel(component.component_type)}
                      </span>
                      {component.calculation_method && (
                        <p className="text-xs text-muted-foreground">
                          {component.calculation_method}
                          {component.months_considered && ` (${component.months_considered} months)`}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(component.monthly_amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <span className="text-sm">No components calculated</span>
            </div>
          )}
        </div>

        {/* Calculation Trace (Collapsible) */}
        {hasTrace && (
          <>
            <Separator />
            <Collapsible open={showTrace} onOpenChange={setShowTrace}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded px-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Calculation Trace</span>
                  <Badge variant="secondary" className="text-xs">
                    {calculation.calculation_trace?.length} items
                  </Badge>
                </div>
                {showTrace ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Year</th>
                        <th className="text-left p-2">Form</th>
                        <th className="text-left p-2">Line/Box</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.calculation_trace?.map((item, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/30">
                          <td className="p-2">{item.year}</td>
                          <td className="p-2">{item.form}</td>
                          <td className="p-2">{item.line_or_box}</td>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right font-mono">
                            <span className={item.sign === '-' ? 'text-red-600' : 'text-green-600'}>
                              {item.sign}{formatCurrency(Math.abs(item.amount))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        <Separator />

        {/* Calculation Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agency:</span>
            <Badge variant="secondary">{agency.toUpperCase()}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Calculated:</span>
            <span>{new Date(calculation.created_at).toLocaleDateString()}</span>
          </div>
          {calculation.overrides && Object.keys(calculation.overrides).length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manual Overrides:</span>
              <Badge variant="outline">{Object.keys(calculation.overrides).length}</Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={onCalculate} 
            disabled={isCalculating}
            variant="outline"
          >
            {isCalculating ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Recalculating...
              </div>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-1" />
                Recalculate
              </>
            )}
          </Button>
          
          <Button onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>

        <Button onClick={() => {}} variant="outline" className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save to Lead Record
        </Button>
      </CardContent>
    </Card>
  );
}