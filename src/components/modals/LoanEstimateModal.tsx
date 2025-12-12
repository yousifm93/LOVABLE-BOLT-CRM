import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Send } from 'lucide-react';
import { generateLoanEstimatePDF, LoanEstimateData } from '@/lib/loanEstimatePdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CRMClient } from '@/types/crm';

interface LoanEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: CRMClient;
}

type ModalMode = 'initial' | 'email';

export function LoanEstimateModal({ isOpen, onClose, client }: LoanEstimateModalProps) {
  const [mode, setMode] = useState<ModalMode>('initial');
  const [thirdPartyEmail, setThirdPartyEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Multi-select recipients
  const [sendToBorrower, setSendToBorrower] = useState(true);
  const [sendToBuyerAgent, setSendToBuyerAgent] = useState(false);
  const [sendToThirdParty, setSendToThirdParty] = useState(false);

  // Editable form fields
  const [formData, setFormData] = useState({
    salesPrice: 0,
    loanAmount: 0,
    interestRate: 7.0,
    discountPoints: 0,
    credits: 0,
    principalInterest: 0,
    propertyTaxes: 0,
    homeownersInsurance: 0,
    mortgageInsurance: 0,
    hoaDues: 0
  });

  // Initialize form data from client when modal opens
  useEffect(() => {
    if (isOpen && client) {
      const salesPrice = Number(client.loan?.salesPrice) || 0;
      const loanAmount = Number(client.loan?.loanAmount) || 0;
      const interestRate = Number((client as any).loan?.interestRate || (client as any).interestRate) || 7.0;
      const discountPoints = Number((client as any).discount_points_percentage) || 0;
      const credits = Number((client as any).adjustments_credits) || 0;
      const principalInterest = Number((client as any).principal_interest) || calculatePI(loanAmount, interestRate, 360);
      const propertyTaxes = Number((client as any).property_taxes) || Math.round((salesPrice * 0.015) / 12);
      const homeownersInsurance = Number((client as any).homeowners_insurance) || 150;
      const mortgageInsurance = Number((client as any).mortgage_insurance) || 0;
      const hoaDues = Number((client as any).hoa_dues) || 0;

      setFormData({
        salesPrice,
        loanAmount,
        interestRate,
        discountPoints,
        credits,
        principalInterest,
        propertyTaxes,
        homeownersInsurance,
        mortgageInsurance,
        hoaDues
      });
    }
  }, [isOpen, client]);

  // Auto-recalculate P&I when rate or loan amount changes
  useEffect(() => {
    if (formData.loanAmount > 0 && formData.interestRate > 0) {
      const newPI = calculatePI(formData.loanAmount, formData.interestRate, 360);
      if (Math.abs(newPI - formData.principalInterest) > 1) {
        setFormData(prev => ({ ...prev, principalInterest: newPI }));
      }
    }
  }, [formData.loanAmount, formData.interestRate]);

  const calculatePI = (loanAmount: number, rate: number, term: number): number => {
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate <= 0) return Math.round(loanAmount / term);
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, term);
    const denominator = Math.pow(1 + monthlyRate, term) - 1;
    return Math.round(loanAmount * (numerator / denominator));
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const extractLoanEstimateData = (): LoanEstimateData => {
    const firstName = client.person.firstName || '';
    const lastName = client.person.lastName || '';
    const lenderLoanNumber = (client as any).lender_loan_number || (client as any).mb_loan_number || '';
    const loanProgram = client.loanProgram || client.loan?.loanProgram || 'Conventional';
    const propertyType = (client as any).property?.propertyType || (client as any).propertyType || 'Single Family';
    const subjectZip = client.subjectZip || '';
    const subjectState = client.subjectState || '';

    // Calculate LTV
    const ltv = formData.salesPrice > 0 ? (formData.loanAmount / formData.salesPrice) * 100 : 0;
    
    // Calculate APR (simplified - just add 0.25% to rate for estimate)
    const apr = formData.interestRate + 0.25;

    // Calculate discount points amount
    const discountPointsAmount = (formData.discountPoints / 100) * formData.loanAmount;
    
    const downPayment = formData.salesPrice - formData.loanAmount;

    return {
      firstName,
      lastName,
      lenderLoanNumber,
      subjectZip,
      subjectState,
      purchasePrice: formData.salesPrice,
      loanAmount: formData.loanAmount,
      ltv: Math.round(ltv * 10) / 10,
      interestRate: formData.interestRate,
      apr: Math.round(apr * 1000) / 1000,
      loanTerm: 360,
      loanProgram,
      propertyType,
      discountPoints: discountPointsAmount,
      underwritingFee: Number((client as any).underwriting_fee) || 1195,
      credits: formData.credits,
      appraisalFee: Number((client as any).appraisal_fee) || 650,
      creditReportFee: Number((client as any).credit_report_fee) || 75,
      processingFee: Number((client as any).processing_fee) || 450,
      lendersTitleInsurance: Number((client as any).lenders_title_insurance) || 500,
      titleClosingFee: Number((client as any).title_closing_fee) || 350,
      intangibleTax: Number((client as any).intangible_tax) || Math.round(formData.loanAmount * 0.002),
      transferTax: Number((client as any).transfer_tax) || 0,
      recordingFees: Number((client as any).recording_fees) || 250,
      prepaidHoi: Number((client as any).prepaid_hoi) || formData.homeownersInsurance * 12,
      prepaidInterest: Number((client as any).prepaid_interest) || Math.round((formData.loanAmount * (formData.interestRate / 100) / 365) * 15),
      escrowHoi: formData.homeownersInsurance * 2,
      escrowTaxes: formData.propertyTaxes * 3,
      principalInterest: formData.principalInterest,
      propertyTaxes: formData.propertyTaxes,
      homeownersInsurance: formData.homeownersInsurance,
      mortgageInsurance: formData.mortgageInsurance,
      hoaDues: formData.hoaDues,
      downPayment,
      adjustmentsCredits: formData.credits
    };
  };

  const handleDownloadEstimate = async () => {
    setIsProcessing(true);
    try {
      const estimateData = extractLoanEstimateData();
      
      await generateLoanEstimatePDF(estimateData, true);
      
      toast({
        title: "Success!",
        description: "Loan estimate downloaded successfully."
      });
      
      handleClose();
    } catch (error) {
      console.error('Error downloading estimate:', error);
      toast({
        title: "Error",
        description: "Failed to download loan estimate.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailEstimate = async () => {
    // Validate recipients
    if (!sendToBorrower && !sendToBuyerAgent && !sendToThirdParty) {
      toast({
        title: "Error",
        description: "Please select at least one recipient.",
        variant: "destructive"
      });
      return;
    }

    if (sendToThirdParty && !thirdPartyEmail) {
      toast({
        title: "Error",
        description: "Please enter a third party email address.",
        variant: "destructive"
      });
      return;
    }

    if (sendToThirdParty && !thirdPartyEmail.includes('@')) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const estimateData = extractLoanEstimateData();
      
      const pdfBytes = await generateLoanEstimatePDF(estimateData, false);
      
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const base64PDF = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
      
      // Build recipient list
      const recipients: string[] = [];
      if (sendToBorrower && client.person.email) {
        recipients.push(client.person.email);
      }
      if (sendToBuyerAgent && client.buyer_agent?.email) {
        recipients.push(client.buyer_agent.email);
      }
      if (sendToThirdParty && thirdPartyEmail) {
        recipients.push(thirdPartyEmail);
      }

      if (recipients.length === 0) {
        toast({
          title: "Error",
          description: "No valid email addresses found for selected recipients.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      const fullName = `${estimateData.firstName} ${estimateData.lastName}`.trim();
      const firstInitial = client.person.firstName?.charAt(0)?.toUpperCase() || '';
      const lastInitial = client.person.lastName?.charAt(0)?.toUpperCase() || '';
      const today = new Date();
      const formattedDate = `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear().toString().slice(-2)}`;
      const fileName = `Loan Estimate - ${firstInitial}${lastInitial} ${formattedDate}.pdf`;
      
      // Send to primary email, CC others
      const primaryEmail = recipients[0];
      const secondaryEmails = recipients.slice(1);

      const { error } = await supabase.functions.invoke('send-loanestimate-email', {
        body: {
          primaryEmail,
          secondaryEmail: secondaryEmails.length > 0 ? secondaryEmails.join(',') : undefined,
          customerName: fullName,
          pdfAttachment: base64PDF,
          fileName
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success!",
        description: `Loan estimate sent to ${recipients.length} recipient(s).`
      });
      
      handleClose();
    } catch (error) {
      console.error('Error emailing estimate:', error);
      toast({
        title: "Error",
        description: "Failed to send loan estimate.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setMode('initial');
    setSendToBorrower(true);
    setSendToBuyerAgent(false);
    setSendToThirdParty(false);
    setThirdPartyEmail('');
    onClose();
  };

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(numericValue) || 0;
    setFormData(prev => ({ ...prev, [field]: parsed }));
  };

  const totalMonthly = formData.principalInterest + formData.propertyTaxes + 
    formData.homeownersInsurance + formData.mortgageInsurance + formData.hoaDues;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Loan Estimate</DialogTitle>
          <DialogDescription>
            For: {client.person.firstName} {client.person.lastName}
          </DialogDescription>
        </DialogHeader>

        {/* Editable Fields Section */}
        <div className="space-y-4 py-2">
          {/* Loan Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Sales Price</Label>
              <Input
                id="salesPrice"
                value={formData.salesPrice ? formatCurrency(formData.salesPrice) : ''}
                onChange={(e) => handleNumberChange('salesPrice', e.target.value)}
                placeholder="$0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Loan Amount</Label>
              <Input
                id="loanAmount"
                value={formData.loanAmount ? formatCurrency(formData.loanAmount) : ''}
                onChange={(e) => handleNumberChange('loanAmount', e.target.value)}
                placeholder="$0"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.125"
                value={formData.interestRate}
                onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPoints">Discount Points (%)</Label>
              <Input
                id="discountPoints"
                type="number"
                step="0.125"
                value={formData.discountPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, discountPoints: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                value={formData.credits ? formatCurrency(formData.credits) : ''}
                onChange={(e) => handleNumberChange('credits', e.target.value)}
                placeholder="$0"
              />
            </div>
          </div>

          {/* Monthly Payment Components */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-2 block">Monthly Payment Components</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="principalInterest" className="text-xs text-muted-foreground">P&I</Label>
                <Input
                  id="principalInterest"
                  value={formData.principalInterest ? formatCurrency(formData.principalInterest) : ''}
                  onChange={(e) => handleNumberChange('principalInterest', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="propertyTaxes" className="text-xs text-muted-foreground">Taxes</Label>
                <Input
                  id="propertyTaxes"
                  value={formData.propertyTaxes ? formatCurrency(formData.propertyTaxes) : ''}
                  onChange={(e) => handleNumberChange('propertyTaxes', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="homeownersInsurance" className="text-xs text-muted-foreground">Insurance</Label>
                <Input
                  id="homeownersInsurance"
                  value={formData.homeownersInsurance ? formatCurrency(formData.homeownersInsurance) : ''}
                  onChange={(e) => handleNumberChange('homeownersInsurance', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mortgageInsurance" className="text-xs text-muted-foreground">MI</Label>
                <Input
                  id="mortgageInsurance"
                  value={formData.mortgageInsurance ? formatCurrency(formData.mortgageInsurance) : ''}
                  onChange={(e) => handleNumberChange('mortgageInsurance', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hoaDues" className="text-xs text-muted-foreground">HOA</Label>
                <Input
                  id="hoaDues"
                  value={formData.hoaDues ? formatCurrency(formData.hoaDues) : ''}
                  onChange={(e) => handleNumberChange('hoaDues', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Total Monthly</Label>
                <div className="h-8 px-3 flex items-center bg-muted rounded-md text-sm font-medium">
                  {formatCurrency(totalMonthly)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {mode === 'initial' ? (
          <>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex flex-col gap-2"
                onClick={handleDownloadEstimate}
                disabled={isProcessing}
              >
                <Download className="h-5 w-5" />
                <span className="text-sm">Download Estimate</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-20 flex flex-col gap-2"
                onClick={() => setMode('email')}
                disabled={isProcessing || !client.person.email}
              >
                <Send className="h-5 w-5" />
                <span className="text-sm">Email Estimate</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <Label className="text-sm font-medium">Select Recipients</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="borrower" 
                    checked={sendToBorrower}
                    onCheckedChange={(checked) => setSendToBorrower(checked === true)}
                  />
                  <Label htmlFor="borrower" className="flex-1 cursor-pointer text-sm">
                    Borrower ({client.person.email || 'No email'})
                  </Label>
                </div>
                
                {client.buyer_agent?.email && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="buyerAgent" 
                      checked={sendToBuyerAgent}
                      onCheckedChange={(checked) => setSendToBuyerAgent(checked === true)}
                    />
                    <Label htmlFor="buyerAgent" className="flex-1 cursor-pointer text-sm">
                      Buyer's Agent ({client.buyer_agent.email})
                    </Label>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="thirdParty" 
                    checked={sendToThirdParty}
                    onCheckedChange={(checked) => setSendToThirdParty(checked === true)}
                  />
                  <Label htmlFor="thirdParty" className="flex-1 cursor-pointer text-sm">
                    Third Party
                  </Label>
                </div>
                
                {sendToThirdParty && (
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={thirdPartyEmail}
                    onChange={(e) => setThirdPartyEmail(e.target.value)}
                    className="ml-6"
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setMode('initial');
                  setThirdPartyEmail('');
                }} 
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button onClick={handleEmailEstimate} disabled={isProcessing}>
                {isProcessing ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}