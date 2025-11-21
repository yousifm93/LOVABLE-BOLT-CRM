import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
type RecipientType = 'borrower' | 'borrower_ba' | 'third_party';

export function PreApprovalLetterModal({ isOpen, onClose, client }: PreApprovalLetterModalProps) {
  const [mode, setMode] = useState<ModalMode>('initial');
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientType>('borrower');
  const [thirdPartyEmail, setThirdPartyEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: string | number | undefined): string => {
    if (!value) return "$0";
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const extractPreApprovalData = (): PreApprovalData => {
    const fullName = `${client.person.firstName || ''} ${client.person.lastName || ''}`.trim();
    
    let propertyAddress = "No Address Yet";
    if (client.subjectAddress1) {
      const parts = [
        client.subjectAddress1,
        client.subjectCity,
        client.subjectState,
        client.subjectZip
      ].filter(Boolean);
      propertyAddress = parts.join(", ");
    }
    
    const loanType = client.loanProgram || client.loan?.loanProgram || "Conventional";
    const salesPrice = formatCurrency(client.loan?.salesPrice);
    const loanAmount = formatCurrency(client.loan?.loanAmount);
    
    return {
      fullName,
      propertyAddress,
      loanType,
      salesPrice,
      loanAmount
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
      
      onClose();
      setMode('initial');
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
    if (selectedRecipients === 'third_party' && !thirdPartyEmail) {
      toast({
        title: "Error",
        description: "Please enter a third party email address.",
        variant: "destructive"
      });
      return;
    }

    if (selectedRecipients === 'third_party' && !thirdPartyEmail.includes('@')) {
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
      
      let primaryEmail = client.person.email;
      let secondaryEmail = undefined;
      
      if (selectedRecipients === 'borrower_ba') {
        secondaryEmail = client.buyer_agent?.email;
      } else if (selectedRecipients === 'third_party') {
        primaryEmail = thirdPartyEmail;
      }
      
      const firstInitial = client.person.firstName?.charAt(0)?.toUpperCase() || '';
      const lastInitial = client.person.lastName?.charAt(0)?.toUpperCase() || '';
      const today = new Date();
      const formattedDate = `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear().toString().slice(-2)}`;
      const fileName = `Pre-Approval Letter - ${firstInitial}${lastInitial} ${formattedDate}.pdf`;
      
      const { error } = await supabase.functions.invoke('send-preapproval-email', {
        body: {
          primaryEmail,
          secondaryEmail,
          customerName: preApprovalData.fullName,
          pdfAttachment: base64PDF,
          fileName
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success!",
        description: "Pre-approval letter sent successfully."
      });
      
      onClose();
      setMode('initial');
      setThirdPartyEmail('');
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
    setSelectedRecipients('borrower');
    setThirdPartyEmail('');
    onClose();
  };

  if (!client.person.email && mode === 'email') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Send Email</DialogTitle>
            <DialogDescription>
              This borrower does not have an email address on file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        {mode === 'initial' ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate Pre-Approval Letter</DialogTitle>
              <DialogDescription>
                For: {client.person.firstName} {client.person.lastName}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-6">
              <Button
                variant="outline"
                size="lg"
                className="h-32 flex flex-col gap-2"
                onClick={handleDownloadLetter}
                disabled={isProcessing}
              >
                <Download className="h-8 w-8" />
                <span>Download Letter</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-32 flex flex-col gap-2"
                onClick={() => setMode('email')}
                disabled={isProcessing || !client.person.email}
              >
                <Send className="h-8 w-8" />
                <span>Email Letter</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Pre-Approval Letter</DialogTitle>
              <DialogDescription>Select recipients</DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <RadioGroup value={selectedRecipients} onValueChange={(value) => setSelectedRecipients(value as RecipientType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="borrower" id="borrower" />
                  <Label htmlFor="borrower" className="flex-1 cursor-pointer">
                    Borrower ({client.person.email})
                  </Label>
                </div>
                
                {client.buyer_agent?.email && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="borrower_ba" id="borrower_ba" />
                    <Label htmlFor="borrower_ba" className="flex-1 cursor-pointer">
                      Borrower + Agent ({client.person.email}, {client.buyer_agent.email})
                    </Label>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="third_party" id="third_party" />
                  <Label htmlFor="third_party" className="flex-1 cursor-pointer">
                    Third Party
                  </Label>
                </div>
                
                {selectedRecipients === 'third_party' && (
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={thirdPartyEmail}
                    onChange={(e) => setThirdPartyEmail(e.target.value)}
                    className="mt-2"
                  />
                )}
              </RadioGroup>
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
