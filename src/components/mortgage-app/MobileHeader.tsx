import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const sections = [
  { id: 1, name: 'Mortgage Info' },
  { id: 2, name: 'Personal Info' },
  { id: 3, name: 'Co-Borrowers' },
  { id: 4, name: 'Income' },
  { id: 5, name: 'Assets' },
  { id: 6, name: 'Real Estate' },
  { id: 7, name: 'Declarations' },
  { id: 8, name: 'Demographics' },
  { id: 9, name: 'Credit' },
  { id: 10, name: 'Additional Questions' },
  { id: 11, name: 'Review & Submit' },
];

interface MobileHeaderProps {
  onMenuToggle: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle, onPrevious, onNext }) => {
  const { data, progressPercentage } = useApplication();
  const currentSectionName = sections.find(s => s.id === data.currentSection)?.name || '';
  const canGoPrevious = data.currentSection > 1;
  const canGoNext = data.currentSection < sections.length;

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 text-center">
            <h1 className="text-sm font-semibold text-foreground">Mortgage Application</h1>
            <p className="text-xs text-muted-foreground capitalize">{data.loanPurpose || 'Getting Started'}</p>
          </div>

          <div className="w-8" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{currentSectionName}</span>
            <span className="font-semibold text-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between mt-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onNext}
            disabled={!canGoNext}
            className="flex-1"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
