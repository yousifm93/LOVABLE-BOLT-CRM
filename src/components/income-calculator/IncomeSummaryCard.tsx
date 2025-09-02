import React, { useState, useEffect } from "react";
import { Calculator, Download, Save, AlertTriangle, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
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
  borrower: Borrower;
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
    const labels = {
      base_hourly: "Base Hourly",
      base_salary: "Base Salary", 
      overtime: "Overtime",
      bonus: "Bonus",
      commission: "Commission",
      self_employed: "Self-Employed",
      rental: "Rental Income",
      other: "Other Income"
    };
    return labels[type as keyof typeof labels] || type.replace('_', ' ');
  };

  const getComponentColor = (type: string) => {
    const colors = {
      base_hourly: "text-blue-600",
      base_salary: "text-green-600",
      overtime: "text-purple-600", 
      bonus: "text-orange-600",
      commission: "text-pink-600",
      self_employed: "text-indigo-600",
      rental: "text-teal-600",
      other: "text-gray-600"
    };
    return colors[type as keyof typeof colors] || "text-gray-600";
  };

  const confidencePercentage = calculation?.confidence ? Math.round(calculation.confidence * 100) : 0;
  const hasWarnings = calculation?.warnings && calculation.warnings.length > 0;

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
            Calculate qualifying monthly income for {borrower.first_name} {borrower.last_name}
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
              <span>{borrower.first_name} {borrower.last_name}</span>
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
        <CardDescription>
          Monthly qualifying income for {borrower.first_name} {borrower.last_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Result */}
        <div className="text-center p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Monthly Qualifying Income</span>
          </div>
          <div className="text-3xl font-bold text-primary">
            {calculation.result_monthly_income ? 
              formatCurrency(calculation.result_monthly_income) : 
              'Calculating...'
            }
          </div>
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