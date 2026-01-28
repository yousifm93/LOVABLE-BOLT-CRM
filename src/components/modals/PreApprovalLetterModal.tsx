import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send } from 'lucide-react';
import { generatePreApprovalPDF, PreApprovalData } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CRMClient } from '@/types/crm';

interface PreApprovalLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: CRMClient;
}

type ModalMode = 'initial' | 'email';

const LOAN_TYPE_OPTIONS = [
  'Conventional',
  'FHA',
  'VA',
  'DSCR',
  'Jumbo',
  'USDA',
  'Bank Statement'
];

export function PreApprovalLetterModal({ isOpen, onClose, client }: PreApprovalLetterModalProps) {
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
    propertyAddress: '',
    loanType: 'Conventional',
    salesPrice: '',
    loanAmount: ''
  });

  // Initialize form data from client when modal opens
  useEffect(() => {
    if (isOpen && client) {
      let propertyAddress = "No Address Yet";
      // Check for snake_case fields (from transformLeadToClient) or camelCase fields
      const address1 = (client as any).subject_address_1 || client.subjectAddress1;
      const city = (client as any).subject_city || client.subjectCity;
      const state = (client as any).subject_state || client.subjectState;
      const zip = (client as any).subject_zip || client.subjectZip;
      
      if (address1) {
        const parts = [
          address1,
          city,
          state,
          zip
        ].filter(Boolean);
        propertyAddress = parts.join(", ");
      }

      const loanType = client.loanProgram || client.loan?.loanProgram || "Conventional";
      const salesPrice = client.loan?.salesPrice?.toString() || '';
      const loanAmount = client.loan?.loanAmount?.toString() || '';

      setFormData({
        propertyAddress,
        loanType,
        salesPrice,
        loanAmount
      });
    }
  }, [isOpen, client]);

  const formatCurrency = (value: string | number | undefined): string => {
    if (!value) return "$0";
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue)) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const extractPreApprovalData = (): PreApprovalData => {
    const fullName = `${client.person.firstName || ''} ${client.person.lastName || ''}`.trim();
    
    return {
      fullName,
      propertyAddress: formData.propertyAddress,
      loanType: formData.loanType,
      salesPrice: formatCurrency(formData.salesPrice),
      loanAmount: formatCurrency(formData.loanAmount)
    };
  };

  const handleDownloadLetter = async () => {
    setIsProcessing(true);
    try {
      const preApprovalData = extractPreApprovalData();
      
      await generatePreApprovalPDF(preApprovalData, true);
      
      toast({
        title: "Success!",
        description: "Pre-approval letter downloaded successfully."
      });
      
      handleClose();
    } catch (error) {
      console.error('Error downloading letter:', error);
      toast({
        title: "Error",
        description: "Failed to download pre-approval letter.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailLetter = async () => {
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
      const preApprovalData = extractPreApprovalData();
      
      const pdfBytes = await generatePreApprovalPDF(preApprovalData, false);
      
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
      
      const firstInitial = client.person.firstName?.charAt(0)?.toUpperCase() || '';
      const lastInitial = client.person.lastName?.charAt(0)?.toUpperCase() || '';
      const today = new Date();
      const formattedDate = `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear().toString().slice(-2)}`;
      const fileName = `Pre-Approval Letter - ${firstInitial}${lastInitial} ${formattedDate}.pdf`;
      
      // Send to primary email, CC others
      const primaryEmail = recipients[0];
      const secondaryEmails = recipients.slice(1);

      const { error } = await supabase.functions.invoke('send-preapproval-email', {
        body: {
          primaryEmail,
          secondaryEmail: secondaryEmails.length > 0 ? secondaryEmails.join(',') : undefined,
          customerName: preApprovalData.fullName,
          pdfAttachment: base64PDF,
          fileName
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success!",
        description: `Pre-approval letter sent to ${recipients.length} recipient(s).`
      });
      
      handleClose();
    } catch (error) {
      console.error('Error emailing letter:', error);
      toast({
        title: "Error",
        description: "Failed to send pre-approval letter.",
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

  const handleCurrencyChange = (field: 'salesPrice' | 'loanAmount', value: string) => {
    // Remove non-numeric characters except decimal
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, [field]: numericValue }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Pre-Approval Letter</DialogTitle>
          <DialogDescription>
            For: {client.person.firstName} {client.person.lastName}
          </DialogDescription>
        </DialogHeader>

        {/* Editable Fields Section */}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="propertyAddress">Property Address</Label>
            <Input
              id="propertyAddress"
              value={formData.propertyAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, propertyAddress: e.target.value }))}
              placeholder="Enter property address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loanType">Loan Type</Label>
            <Select 
              value={formData.loanType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, loanType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loan type" />
              </SelectTrigger>
              <SelectContent>
                {LOAN_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Sales Price</Label>
              <Input
                id="salesPrice"
                value={formData.salesPrice ? formatCurrency(formData.salesPrice) : ''}
                onChange={(e) => handleCurrencyChange('salesPrice', e.target.value)}
                placeholder="$0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Loan Amount</Label>
              <Input
                id="loanAmount"
                value={formData.loanAmount ? formatCurrency(formData.loanAmount) : ''}
                onChange={(e) => handleCurrencyChange('loanAmount', e.target.value)}
                placeholder="$0"
              />
            </div>
          </div>
        </div>

        {mode === 'initial' ? (
          <>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col gap-2"
                onClick={handleDownloadLetter}
                disabled={isProcessing}
              >
                <Download className="h-6 w-6" />
                <span>Download Letter</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col gap-2"
                onClick={() => setMode('email')}
                disabled={isProcessing || !client.person.email}
              >
                <Send className="h-6 w-6" />
                <span>Email Letter</span>
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
              <Button onClick={handleEmailLetter} disabled={isProcessing}>
                {isProcessing ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}