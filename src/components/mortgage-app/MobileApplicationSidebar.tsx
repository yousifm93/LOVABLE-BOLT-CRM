import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { useApplication } from '@/contexts/MortgageApplicationContext';
import { CheckCircle2, Circle, Lock } from 'lucide-react';

const sections = [
  { id: 1, name: 'Mortgage Info' },
  { id: 2, name: 'Personal Info' },
  { id: 3, name: 'Co-Borrowers' },
  { id: 4, name: 'Income' },
  { id: 5, name: 'Assets' },
  { id: 6, name: 'Real Estate' },
  { id: 7, name: 'Declarations' },
  { id: 8, name: 'Review & Submit' },
];

interface MobileApplicationSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSectionChange: (sectionId: number) => void;
  isReadOnly?: boolean;
}

export const MobileApplicationSidebar: React.FC<MobileApplicationSidebarProps> = ({ 
  open, 
  onOpenChange, 
  onSectionChange,
  isReadOnly = false
}) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const handleSectionClick = (sectionId: number) => {
    // In read-only mode, allow navigation to all sections
    if (isReadOnly) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: sectionId });
      onSectionChange(sectionId);
      onOpenChange(false);
      return;
    }

    const visitedSectionsArray = Array.from(data.visitedSections);
    const isAccessible = data.visitedSections.has(sectionId) || sectionId === Math.max(...visitedSectionsArray) + 1;
    
    if (isAccessible) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: sectionId });
      onSectionChange(sectionId);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-xl font-bold">Mortgage Application</SheetTitle>
          <div className="space-y-2 pt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{isReadOnly ? 100 : progressPercentage}%</span>
            </div>
            <Progress value={isReadOnly ? 100 : progressPercentage} className="h-2" />
          </div>
        </SheetHeader>

        <nav className="pt-6">
          <div className="space-y-1">
            {sections.map((section) => {
              const isActive = data.currentSection === section.id;
              const isVisited = isReadOnly || data.visitedSections.has(section.id);
              const visitedSectionsArray = Array.from(data.visitedSections);
              const isAccessible = isReadOnly || isVisited || section.id === Math.max(...visitedSectionsArray) + 1;

              return (
                <Button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  disabled={!isAccessible}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-2 ${isActive ? '' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {isVisited ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : isAccessible ? (
                    <Circle className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span className="text-sm">{section.name}</span>
                </Button>
              );
            })}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
