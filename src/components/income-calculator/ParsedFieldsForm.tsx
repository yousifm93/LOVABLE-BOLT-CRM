import React, { useState, useEffect } from "react";
import { Save, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IncomeDocument {
  id: string;
  borrower_id: string;
  doc_type: string;
  file_name: string;
  storage_path: string;
  ocr_status: 'pending' | 'processing' | 'success' | 'failed';
  parsed_json?: any;
  parse_confidence?: number;
  doc_period_start?: string;
  doc_period_end?: string;
  ytd_flag?: boolean;
  created_at: string;
}

interface ParsedFieldsFormProps {
  document: IncomeDocument;
  onUpdate: (document: IncomeDocument) => void;
}

export function ParsedFieldsForm({ document, onUpdate }: ParsedFieldsFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (document.parsed_json) {
      setFormData(document.parsed_json);
    } else {
      setFormData({});
    }
    setHasChanges(false);
  }, [document]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('income_documents')
        .update({
          parsed_json: formData,
          doc_type: formData.document_type || document.doc_type,
          doc_period_start: formData.pay_period_start || formData.period_start,
          doc_period_end: formData.pay_period_end || formData.period_end,
          ytd_flag: formData.ytd_flag || false
        })
        .eq('id', document.id);

      if (error) throw error;

      const updatedDoc = {
        ...document,
        parsed_json: formData,
        doc_type: formData.document_type || document.doc_type,
        doc_period_start: formData.pay_period_start || formData.period_start,
        doc_period_end: formData.pay_period_end || formData.period_end,
        ytd_flag: formData.ytd_flag || false
      };

      onUpdate(updatedDoc);
      setHasChanges(false);

      toast({
        title: "Changes Saved",
        description: "Document fields have been updated successfully"
      });

    } catch (error) {
      console.error('Error saving fields:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReprocess = async () => {
    try {
      await supabase.functions.invoke('income-ocr', {
        body: { document_id: document.id, force_reprocess: true }
      });

      toast({
        title: "Reprocessing Started",
        description: "Document is being reprocessed"
      });

    } catch (error) {
      console.error('Error reprocessing:', error);
      toast({
        title: "Reprocess Failed",
        description: "Failed to start reprocessing",
        variant: "destructive"
      });
    }
  };

  // Calculate monthly income from pay stub data
  const calculateMonthlyFromPayStub = () => {
    const grossCurrent = parseFloat(formData.gross_current) || 0;
    const frequency = formData.pay_frequency || 'monthly';
    
    if (!grossCurrent) return null;
    
    let multiplier = 12; // monthly default
    switch (frequency?.toLowerCase()) {
      case 'weekly': multiplier = 52; break;
      case 'biweekly': multiplier = 26; break;
      case 'semimonthly': multiplier = 24; break;
      case 'monthly': multiplier = 12; break;
    }
    
    const monthly = (grossCurrent * multiplier) / 12;
    return { monthly, annual: grossCurrent * multiplier, frequency, grossCurrent, multiplier };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderPayStubFields = () => {
    const incomeCalc = calculateMonthlyFromPayStub();
    
    return (
    <div className="space-y-4">
      {/* Monthly Income Calculation Box */}
      {incomeCalc && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
              MONTHLY QUALIFYING INCOME
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(incomeCalc.monthly)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {formatCurrency(incomeCalc.grossCurrent)} {incomeCalc.frequency} × {incomeCalc.multiplier} periods ÷ 12 months
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Employee Name</Label>
          <Input
            value={formData.employee_name || ""}
            onChange={(e) => handleFieldChange('employee_name', e.target.value)}
          />
        </div>
        <div>
          <Label>Employer Name</Label>
          <Input
            value={formData.employer_name || ""}
            onChange={(e) => handleFieldChange('employer_name', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pay Period Start</Label>
          <Input
            type="date"
            value={formData.pay_period_start || ""}
            onChange={(e) => handleFieldChange('pay_period_start', e.target.value)}
          />
        </div>
        <div>
          <Label>Pay Period End</Label>
          <Input
            type="date"
            value={formData.pay_period_end || ""}
            onChange={(e) => handleFieldChange('pay_period_end', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pay Frequency</Label>
          <Select
            value={formData.pay_frequency || ""}
            onValueChange={(value) => handleFieldChange('pay_frequency', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="semimonthly">Semi-monthly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Hourly Rate</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.hourly_rate || ""}
            onChange={(e) => handleFieldChange('hourly_rate', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-medium">Current Period</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Regular Hours</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.hours_current || ""}
              onChange={(e) => handleFieldChange('hours_current', e.target.value)}
            />
          </div>
          <div>
            <Label>Gross Pay</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.gross_current || ""}
              onChange={(e) => handleFieldChange('gross_current', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Overtime Hours</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.ot_current || ""}
              onChange={(e) => handleFieldChange('ot_current', e.target.value)}
            />
          </div>
          <div>
            <Label>Bonus/Commission</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.bonus_current || ""}
              onChange={(e) => handleFieldChange('bonus_current', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-medium">Year-to-Date</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>YTD Hours</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.hours_ytd || ""}
              onChange={(e) => handleFieldChange('hours_ytd', e.target.value)}
            />
          </div>
          <div>
            <Label>YTD Gross</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.gross_ytd || ""}
              onChange={(e) => handleFieldChange('gross_ytd', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )};


  const renderW2Fields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Employee Name</Label>
          <Input
            value={formData.employee_name || ""}
            onChange={(e) => handleFieldChange('employee_name', e.target.value)}
          />
        </div>
        <div>
          <Label>Employer Name</Label>
          <Input
            value={formData.employer_name || ""}
            onChange={(e) => handleFieldChange('employer_name', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tax Year</Label>
          <Input
            type="number"
            value={formData.tax_year || ""}
            onChange={(e) => handleFieldChange('tax_year', e.target.value)}
          />
        </div>
        <div>
          <Label>Box 1 - Wages</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.wages || ""}
            onChange={(e) => handleFieldChange('wages', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Box 2 - Federal Tax Withheld</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.fed_tax_withheld || ""}
            onChange={(e) => handleFieldChange('fed_tax_withheld', e.target.value)}
          />
        </div>
        <div>
          <Label>Box 3 - Social Security Wages</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.ss_wages || ""}
            onChange={(e) => handleFieldChange('ss_wages', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderScheduleCFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Business Name</Label>
          <Input
            value={formData.business_name || ""}
            onChange={(e) => handleFieldChange('business_name', e.target.value)}
          />
        </div>
        <div>
          <Label>Tax Year</Label>
          <Input
            type="number"
            value={formData.tax_year || ""}
            onChange={(e) => handleFieldChange('tax_year', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Gross Receipts</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.gross_receipts || ""}
            onChange={(e) => handleFieldChange('gross_receipts', e.target.value)}
          />
        </div>
        <div>
          <Label>Net Profit</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.net_profit || ""}
            onChange={(e) => handleFieldChange('net_profit', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Depreciation</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.depreciation || ""}
            onChange={(e) => handleFieldChange('depreciation', e.target.value)}
          />
        </div>
        <div>
          <Label>Home Office Deduction</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.home_office_deduction || ""}
            onChange={(e) => handleFieldChange('home_office_deduction', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderGenericFields = () => (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This document type is not yet fully supported. Please review the raw extracted data and update key fields manually.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Raw Extracted Text</Label>
        <textarea
          className="w-full min-h-32 p-3 border rounded-md text-sm"
          value={JSON.stringify(formData, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setFormData(parsed);
              setHasChanges(true);
            } catch (error) {
              // Invalid JSON, ignore
            }
          }}
        />
      </div>
    </div>
  );

  const renderFieldsForDocType = () => {
    switch (document.doc_type) {
      case 'pay_stub':
        return renderPayStubFields();
      case 'w2':
        return renderW2Fields();
      case 'schedule_c':
        return renderScheduleCFields();
      default:
        return renderGenericFields();
    }
  };

  if (document.ocr_status === 'pending' || document.ocr_status === 'processing') {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
        <h3 className="font-medium mb-2">Processing Document</h3>
        <p className="text-sm text-muted-foreground mb-4">
          OCR and field extraction in progress...
        </p>
        <Badge variant="secondary">
          {document.ocr_status === 'pending' ? 'Queued' : 'Processing'}
        </Badge>
      </div>
    );
  }

  if (document.ocr_status === 'failed') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h3 className="font-medium mb-2">Processing Failed</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Unable to extract data from this document
        </p>
        <Button onClick={handleReprocess} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Processing
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with confidence */}
      {document.parse_confidence && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Parse Confidence: {Math.round(document.parse_confidence * 100)}%
            </span>
          </div>
          <Button onClick={handleReprocess} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Reprocess
          </Button>
        </div>
      )}

      {/* Document Type Selector */}
      <div>
        <Label>Document Type</Label>
        <Select
          value={formData.document_type || document.doc_type}
          onValueChange={(value) => handleFieldChange('document_type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pay_stub">Pay Stub</SelectItem>
            <SelectItem value="w2">W-2</SelectItem>
            <SelectItem value="form_1099">1099</SelectItem>
            <SelectItem value="form_1040">1040</SelectItem>
            <SelectItem value="schedule_c">Schedule C</SelectItem>
            <SelectItem value="schedule_e">Schedule E</SelectItem>
            <SelectItem value="k1">K-1</SelectItem>
            <SelectItem value="voe">VOE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document-specific fields */}
      <Accordion type="single" collapsible defaultValue="fields">
        <AccordionItem value="fields">
          <AccordionTrigger>Extracted Fields</AccordionTrigger>
          <AccordionContent>
            {renderFieldsForDocType()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Save button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}