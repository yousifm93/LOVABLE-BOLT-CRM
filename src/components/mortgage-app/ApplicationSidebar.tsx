import { Button } from '@/components/ui/button';
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

interface ApplicationSidebarProps {
  onSectionChange: (sectionId: number) => void;
  isReadOnly?: boolean;
}

export const ApplicationSidebar: React.FC<ApplicationSidebarProps> = ({ onSectionChange, isReadOnly = false }) => {
  const { data, dispatch, progressPercentage } = useApplication();

  const handleSectionClick = (sectionId: number) => {
    // In read-only mode, allow navigation to all sections
    if (isReadOnly) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: sectionId });
      onSectionChange(sectionId);
      return;
    }

    const visitedSectionsArray = Array.from(data.visitedSections);
    const isAccessible = data.visitedSections.has(sectionId) || sectionId === Math.max(...visitedSectionsArray) + 1;
    
    if (isAccessible) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: sectionId });
      onSectionChange(sectionId);
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-2">Mortgage Application</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span className="font-semibold text-foreground">{isReadOnly ? 100 : progressPercentage}%</span>
          </div>
          <Progress value={isReadOnly ? 100 : progressPercentage} className="h-2" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
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

      {/* Sign In / Save Progress CTA - hide in read-only mode */}
      {!isReadOnly && (
        <div className="mt-auto pt-6 pb-6 border-t border-border space-y-3 p-4">
          <div className="text-sm">
            <p className="font-medium text-foreground">Save your progress</p>
            <p className="text-muted-foreground text-xs mt-1">Create an account to save and continue later</p>
          </div>
          <button className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Sign In
          </button>
        </div>
      )}
    </div>
  );
};
