import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Home, RefreshCw } from 'lucide-react';

interface LoanPurposeModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoanPurposeModal: React.FC<LoanPurposeModalProps> = ({ open, onClose }) => {
  const { dispatch } = useApplication();

  const handlePurposeSelect = (purpose: 'purchase' | 'refinance') => {
    dispatch({ type: 'SET_LOAN_PURPOSE', payload: purpose });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Select Loan Purpose</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Button
            onClick={() => handlePurposeSelect('purchase')}
            variant="outline"
            className="flex flex-col items-center justify-center p-8 h-auto border-2 hover:border-primary hover:bg-accent transition-all"
          >
            <Home className="h-12 w-12 mb-4 text-primary" />
            <span className="text-lg font-semibold">Purchase</span>
          </Button>

          <Button
            onClick={() => handlePurposeSelect('refinance')}
            variant="outline"
            className="flex flex-col items-center justify-center p-8 h-auto border-2 hover:border-primary hover:bg-accent transition-all"
          >
            <RefreshCw className="h-12 w-12 mb-4 text-primary" />
            <span className="text-lg font-semibold">Refinance</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
