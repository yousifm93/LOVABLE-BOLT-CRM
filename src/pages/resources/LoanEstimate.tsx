import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Calculator, Search, User, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateLoanEstimatePDF, calculateTotals, LoanEstimateData, DEFAULT_FIELD_POSITIONS, FieldPosition } from "@/lib/loanEstimatePdfGenerator";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  lender_loan_number: string | null;
  subject_zip: string | null;
  subject_state: string | null;
  sales_price: number | null;
  loan_amount: number | null;
  interest_rate: number | null;
  term: number | null;
  discount_points: number | null;
  underwriting_fee: number | null;
  appraisal_fee: number | null;
  credit_report_fee: number | null;
  processing_fee: number | null;
  lenders_title_insurance: number | null;
  title_closing_fee: number | null;
  intangible_tax: number | null;
  transfer_tax: number | null;
  recording_fees: number | null;
  prepaid_hoi: number | null;
  prepaid_interest: number | null;
  escrow_hoi: number | null;
  escrow_taxes: number | null;
  principal_interest: number | null;
  property_taxes: number | null;
  homeowners_insurance: number | null;
  mortgage_insurance: number | null;
  hoa_dues: number | null;
  adjustments_credits: number | null;
  program: string | null;
  property_type: string | null;
}

// String fields that should NOT be parsed as numbers
const STRING_FIELDS = ['firstName', 'lastName', 'lenderLoanNumber', 'subjectZip', 'subjectState', 'loanProgram', 'propertyType'];

export default function LoanEstimate() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<Record<string, FieldPosition>>({});
  const { toast } = useToast();

  // Form state with fixed fee defaults
  const [formData, setFormData] = useState<Partial<LoanEstimateData>>({
    firstName: "",
    lastName: "",
    lenderLoanNumber: "",
    subjectZip: "",
    subjectState: "",
    purchasePrice: 0,
    loanAmount: 0,
    ltv: 0,
    interestRate: 0,
    apr: 0,
    loanTerm: 360,
    loanProgram: "",
    propertyType: "",
    discountPoints: 0,
    credits: 0,
    // Fixed fee defaults
    underwritingFee: 995,
    appraisalFee: 550,
    creditReportFee: 95,
    processingFee: 995,
    titleClosingFee: 600,
    lendersTitleInsurance: 0,
    intangibleTax: 0,
    transferTax: 0,
    recordingFees: 350,
    prepaidHoi: 0,
    prepaidInterest: 0,
    escrowHoi: 0,
    escrowTaxes: 0,
    principalInterest: 0,
    propertyTaxes: 0,
    homeownersInsurance: 0,
    mortgageInsurance: 0,
    hoaDues: 0,
    downPayment: 0,
    adjustmentsCredits: 0,
  });

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, lender_loan_number, subject_zip, subject_state, sales_price, loan_amount, interest_rate, term, discount_points, underwriting_fee, appraisal_fee, credit_report_fee, processing_fee, lenders_title_insurance, title_closing_fee, intangible_tax, transfer_tax, recording_fees, prepaid_hoi, prepaid_interest, escrow_hoi, escrow_taxes, principal_interest, property_taxes, homeowners_insurance, mortgage_insurance, hoa_dues, adjustments_credits, program, property_type')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLeads(data as Lead[]);
      }
    };

    fetchLeads();
  }, []);

  // Filter leads based on search
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return leads.filter(lead => 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(term) ||
      lead.lender_loan_number?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [leads, searchTerm]);

  // Calculate P&I based on loan amount, rate, and term
  const calculatePI = useCallback((loanAmount: number, rate: number, term: number): number => {
    if (!loanAmount || !rate || !term) return 0;
    const monthlyRate = (rate / 100) / 12;
    const numPayments = term;
    if (monthlyRate <= 0) return loanAmount / numPayments;
    return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  }, []);

  // Auto-calculate P&I when loan amount, rate, or term changes
  useEffect(() => {
    if (formData.loanAmount && formData.interestRate && formData.loanTerm) {
      const pi = calculatePI(formData.loanAmount, formData.interestRate, formData.loanTerm);
      if (pi !== formData.principalInterest) {
        setFormData(prev => ({ ...prev, principalInterest: Math.round(pi * 100) / 100 }));
      }
    }
  }, [formData.loanAmount, formData.interestRate, formData.loanTerm, calculatePI]);

  // Auto-calculate down payment when purchase price or loan amount changes
  useEffect(() => {
    const downPayment = (formData.purchasePrice || 0) - (formData.loanAmount || 0);
    if (downPayment >= 0 && downPayment !== formData.downPayment) {
      setFormData(prev => ({ ...prev, downPayment }));
    }
  }, [formData.purchasePrice, formData.loanAmount]);

  // When a lead is selected, populate the form
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSearchOpen(false);
    
    const purchasePrice = lead.sales_price || 0;
    const loanAmount = lead.loan_amount || 0;
    const ltv = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;
    
    setFormData({
      firstName: lead.first_name,
      lastName: lead.last_name,
      lenderLoanNumber: lead.lender_loan_number || "",
      subjectZip: lead.subject_zip || "",
      subjectState: lead.subject_state || "",
      purchasePrice,
      loanAmount,
      ltv: Math.round(ltv * 100) / 100,
      interestRate: lead.interest_rate || 0,
      apr: lead.interest_rate ? lead.interest_rate + 0.125 : 0,
      loanTerm: lead.term || 360,
      loanProgram: lead.program || "",
      propertyType: lead.property_type || "",
      discountPoints: lead.discount_points || 0,
      credits: 0,
      // Fixed fee defaults (always use these)
      underwritingFee: 995,
      appraisalFee: 550,
      creditReportFee: 95,
      processingFee: 995,
      titleClosingFee: 600,
      lendersTitleInsurance: lead.lenders_title_insurance || 0,
      intangibleTax: lead.intangible_tax || 0,
      transferTax: lead.transfer_tax || 0,
      recordingFees: lead.recording_fees || 350,
      prepaidHoi: lead.prepaid_hoi || 0,
      prepaidInterest: lead.prepaid_interest || 0,
      escrowHoi: lead.escrow_hoi || 0,
      escrowTaxes: lead.escrow_taxes || 0,
      principalInterest: lead.principal_interest || 0,
      propertyTaxes: lead.property_taxes || 0,
      homeownersInsurance: lead.homeowners_insurance || 0,
      mortgageInsurance: lead.mortgage_insurance || 0,
      hoaDues: lead.hoa_dues || 0,
      downPayment: purchasePrice - loanAmount,
      adjustmentsCredits: lead.adjustments_credits || 0,
    });
  };

  // Handle string fields vs number fields separately
  const handleInputChange = (field: keyof LoanEstimateData, value: string | number) => {
    if (STRING_FIELDS.includes(field)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      setFormData(prev => ({ ...prev, [field]: numValue }));
    }
  };

  // Handle loan amount change → update LTV
  const handleLoanAmountChange = (value: string) => {
    const loanAmount = parseFloat(value) || 0;
    const ltv = formData.purchasePrice && formData.purchasePrice > 0 
      ? (loanAmount / formData.purchasePrice) * 100 
      : 0;
    setFormData(prev => ({ 
      ...prev, 
      loanAmount, 
      ltv: Math.round(ltv * 100) / 100 
    }));
  };

  // Handle LTV change → update loan amount
  const handleLTVChange = (value: string) => {
    const ltv = parseFloat(value) || 0;
    const loanAmount = formData.purchasePrice 
      ? (ltv / 100) * formData.purchasePrice 
      : 0;
    setFormData(prev => ({ 
      ...prev, 
      ltv, 
      loanAmount: Math.round(loanAmount) 
    }));
  };

  // Handle purchase price change → recalculate LTV
  const handlePurchasePriceChange = (value: string) => {
    const purchasePrice = parseFloat(value) || 0;
    const ltv = purchasePrice > 0 && formData.loanAmount 
      ? (formData.loanAmount / purchasePrice) * 100 
      : 0;
    setFormData(prev => ({ 
      ...prev, 
      purchasePrice, 
      ltv: Math.round(ltv * 100) / 100 
    }));
  };

  // Handle position changes for calibration
  const handlePositionChange = (fieldName: string, axis: 'x' | 'y', value: number) => {
    setPositionOverrides(prev => ({
      ...prev,
      [fieldName]: {
        ...DEFAULT_FIELD_POSITIONS[fieldName],
        ...prev[fieldName],
        [axis]: value
      }
    }));
  };

  // Get current position for a field (override or default)
  const getCurrentPosition = (fieldName: string): FieldPosition => {
    return positionOverrides[fieldName] || DEFAULT_FIELD_POSITIONS[fieldName];
  };

  const handleGeneratePDF = async () => {
    if (!formData.firstName && !formData.lastName) {
      toast({
        title: "Missing Information",
        description: "Please select a borrower or enter borrower name.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateLoanEstimatePDF(formData as LoanEstimateData, true, positionOverrides);
      toast({
        title: "Success",
        description: "Bolt Estimate PDF generated and downloaded.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate totals for display
  const totals = useMemo(() => calculateTotals(formData as LoanEstimateData), [formData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  // Group fields for calibration panel
  const fieldGroups = {
    "Top Left (Borrower Info)": ['borrowerName', 'lenderLoanNumber', 'zipState', 'date'],
    "Top Right (Loan Info)": ['purchasePrice', 'loanAmount', 'rateApr', 'loanTerm'],
    "Section A: Lender Fees": ['sectionATotal', 'discountPoints', 'underwritingFee'],
    "Section B: Third Party": ['sectionBTotal', 'appraisalFee', 'creditReportFee', 'processingFee', 'lendersTitleInsurance', 'titleClosingFee'],
    "Section C: Taxes": ['sectionCTotal', 'intangibleTax', 'transferTax', 'recordingFees'],
    "Section D: Prepaids": ['sectionDTotal', 'prepaidHoi', 'prepaidInterest', 'escrowHoi', 'escrowTaxes'],
    "Monthly Payment": ['principalInterest', 'propertyTaxes', 'homeownersInsurance', 'mortgageInsurance', 'hoaDues', 'totalMonthlyPayment'],
    "Cash to Close": ['downPayment', 'closingCosts', 'prepaidsEscrow', 'adjustmentsCredits', 'totalCashToClose'],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bolt Estimate Generator</h1>
          <p className="text-muted-foreground">Generate professional loan estimates for borrowers</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setCalibrationOpen(!calibrationOpen)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Calibrate Positions
          </Button>
          <Button 
            onClick={handleGeneratePDF} 
            disabled={isGenerating}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {isGenerating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </div>

      {/* Calibration Panel */}
      <Collapsible open={calibrationOpen} onOpenChange={setCalibrationOpen}>
        <CollapsibleContent>
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg text-amber-700">
                <Settings className="h-5 w-5 mr-2" />
                PDF Position Calibration
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Adjust X/Y coordinates to align fields on the PDF template
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {Object.entries(fieldGroups).map(([groupName, fields]) => (
                  <div key={groupName} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground border-b pb-1">{groupName}</p>
                    {fields.map(fieldName => {
                      const pos = getCurrentPosition(fieldName);
                      return (
                        <div key={fieldName} className="grid grid-cols-3 gap-1 items-center">
                          <span className="text-xs truncate" title={fieldName}>{fieldName}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">X:</span>
                            <Input
                              type="number"
                              value={pos.x}
                              onChange={(e) => handlePositionChange(fieldName, 'x', parseInt(e.target.value) || 0)}
                              className="h-6 text-xs w-14 px-1"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Y:</span>
                            <Input
                              type="number"
                              value={pos.y}
                              onChange={(e) => handlePositionChange(fieldName, 'y', parseInt(e.target.value) || 0)}
                              className="h-6 text-xs w-14 px-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPositionOverrides({})}
                >
                  Reset to Defaults
                </Button>
                <Button 
                  size="sm"
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                >
                  Test Generate PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Borrower Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <User className="h-5 w-5 mr-2 text-primary" />
            Select Borrower
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                {selectedLead 
                  ? `${selectedLead.first_name} ${selectedLead.last_name}${selectedLead.lender_loan_number ? ` - ${selectedLead.lender_loan_number}` : ''}`
                  : "Search for a borrower..."
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search by name or loan number..." 
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No borrowers found.</CommandEmpty>
                  <CommandGroup>
                    {filteredLeads.map(lead => (
                      <CommandItem
                        key={lead.id}
                        value={`${lead.first_name} ${lead.last_name} ${lead.lender_loan_number || ''}`}
                        onSelect={() => handleSelectLead(lead)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {lead.lender_loan_number || 'No loan number'} • {formatCurrency(lead.loan_amount || 0)}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Loan Info Section - Restructured */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Loan Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Name, Loan Number, Zip, State */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input 
                value={formData.firstName || ''} 
                onChange={(e) => handleInputChange('firstName', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input 
                value={formData.lastName || ''} 
                onChange={(e) => handleInputChange('lastName', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Loan Number</Label>
              <Input 
                value={formData.lenderLoanNumber || ''} 
                onChange={(e) => handleInputChange('lenderLoanNumber', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Zip</Label>
              <Input 
                value={formData.subjectZip || ''} 
                onChange={(e) => handleInputChange('subjectZip', e.target.value)}
                placeholder="33131"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              <Input 
                value={formData.subjectState || ''} 
                onChange={(e) => handleInputChange('subjectState', e.target.value.toUpperCase())}
                placeholder="FL"
                maxLength={2}
              />
            </div>
          </div>

          {/* Row 2: Loan Program, Property Type, Purchase Price, Loan Amount, LTV */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Loan Program</Label>
              <Select 
                value={formData.loanProgram || ''} 
                onValueChange={(value) => handleInputChange('loanProgram', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conventional">Conventional</SelectItem>
                  <SelectItem value="FHA">FHA</SelectItem>
                  <SelectItem value="VA">VA</SelectItem>
                  <SelectItem value="DSCR">DSCR</SelectItem>
                  <SelectItem value="Jumbo">Jumbo</SelectItem>
                  <SelectItem value="USDA">USDA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Property Type</Label>
              <Select 
                value={formData.propertyType || ''} 
                onValueChange={(value) => handleInputChange('propertyType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Manufactured">Manufactured</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Purchase Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7"
                  value={formData.purchasePrice || ''} 
                  onChange={(e) => handlePurchasePriceChange(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Loan Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7"
                  value={formData.loanAmount || ''} 
                  onChange={(e) => handleLoanAmountChange(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">LTV</Label>
              <div className="relative">
                <Input 
                  type="number"
                  step="0.01"
                  className="pr-7"
                  value={formData.ltv || ''} 
                  onChange={(e) => handleLTVChange(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Row 3: Rate, APR, Loan Term, Discount Points, Credits */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Rate</Label>
              <div className="relative">
                <Input 
                  type="number"
                  step="0.001"
                  className="pr-7"
                  value={formData.interestRate || ''} 
                  onChange={(e) => handleInputChange('interestRate', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">APR</Label>
              <div className="relative">
                <Input 
                  type="number"
                  step="0.001"
                  className="pr-7"
                  value={formData.apr || ''} 
                  onChange={(e) => handleInputChange('apr', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Loan Term (months)</Label>
              <Input 
                type="number"
                value={formData.loanTerm || 360} 
                onChange={(e) => handleInputChange('loanTerm', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Discount Points</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7"
                  value={formData.discountPoints || ''} 
                  onChange={(e) => handleInputChange('discountPoints', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Credits</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7"
                  value={formData.credits || ''} 
                  onChange={(e) => handleInputChange('credits', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Sections Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Section A: Lender Fees */}
        <Card>
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="flex items-center justify-between text-base">
              <span>A. Lender Fees</span>
              <span className="text-primary font-bold">{formatCurrency(totals.sectionA)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Discount Points</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right"
                  value={formData.discountPoints || ''} 
                  onChange={(e) => handleInputChange('discountPoints', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Underwriting Fee</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                  disabled
                  value={formData.underwritingFee || ''} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section C: Taxes & Government Fees */}
        <Card>
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="flex items-center justify-between text-base">
              <span>C. Taxes & Government Fees</span>
              <span className="text-primary font-bold">{formatCurrency(totals.sectionC)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Intangible Tax</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                  disabled
                  value={formData.intangibleTax || ''} 
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Transfer Tax</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                  disabled
                  value={formData.transferTax || ''} 
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Recording Fees</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                  disabled
                  value={formData.recordingFees || ''} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section B: Third Party Fees */}
        <Card>
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="flex items-center justify-between text-base">
              <span>B. Third Party Fees</span>
              <span className="text-primary font-bold">{formatCurrency(totals.sectionB)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Services You Cannot Shop For</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Appraisal</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.appraisalFee || ''} 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Credit Report</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.creditReportFee || ''} 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Processing Fee</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.processingFee || ''} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Services You Can Shop For</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Lender's Title Insurance</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.lendersTitleInsurance || ''} 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Title Closing Fee</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.titleClosingFee || ''} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section D: Prepaids & Escrow */}
        <Card>
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="flex items-center justify-between text-base">
              <span>D. Prepaids & Escrow</span>
              <span className="text-primary font-bold">{formatCurrency(totals.sectionD)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Prepaids</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Homeowners Insurance</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.prepaidHoi || ''} 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Prepaid Interest</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.prepaidInterest || ''} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Initial Escrow at Closing</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Homeowners Insurance</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.escrowHoi || ''} 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Property Taxes</Label>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input 
                      type="number"
                      className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                      disabled
                      value={formData.escrowTaxes || ''} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Sections */}
      <div className="grid grid-cols-2 gap-6">
        {/* Estimated Monthly Payment */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Calculator className="h-5 w-5 mr-2 text-primary" />
              Estimated Monthly Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mortgage (P&I)</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right bg-muted/50"
                  value={formData.principalInterest?.toFixed(2) || ''} 
                  onChange={(e) => handleInputChange('principalInterest', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Property Taxes</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right"
                  value={formData.propertyTaxes || ''} 
                  onChange={(e) => handleInputChange('propertyTaxes', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Homeowner's Insurance</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right"
                  value={formData.homeownersInsurance || ''} 
                  onChange={(e) => handleInputChange('homeownersInsurance', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mortgage Insurance</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right"
                  value={formData.mortgageInsurance || ''} 
                  onChange={(e) => handleInputChange('mortgageInsurance', e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">HOA Dues</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right"
                  value={formData.hoaDues || ''} 
                  onChange={(e) => handleInputChange('hoaDues', e.target.value)}
                />
              </div>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <Label className="text-base font-semibold">Total Monthly Payment</Label>
              <span className="text-xl font-bold text-primary">{formatCurrency(totals.totalMonthlyPayment)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Estimated Cash to Close */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Calculator className="h-5 w-5 mr-2 text-primary" />
              Estimated Cash to Close
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Down Payment</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right bg-muted/50 cursor-not-allowed"
                  disabled
                  value={formData.downPayment || ''} 
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Closing Costs (A+B+C)</Label>
              <span className="text-sm font-medium w-32 text-right">{formatCurrency(totals.closingCosts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Prepaids & Escrow (D)</Label>
              <span className="text-sm font-medium w-32 text-right">{formatCurrency(totals.prepaidsEscrow)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Adjustments & Credits</Label>
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input 
                  type="number"
                  className="pl-7 text-right"
                  value={formData.adjustmentsCredits || ''} 
                  onChange={(e) => handleInputChange('adjustmentsCredits', e.target.value)}
                />
              </div>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <Label className="text-base font-semibold">Total Cash to Close</Label>
              <span className="text-xl font-bold text-primary">{formatCurrency(totals.totalCashToClose)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
