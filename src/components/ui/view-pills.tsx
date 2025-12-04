import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface View {
  name: string;
  columns: Record<string, boolean>;
  isShared?: boolean;
  id?: string;
}

interface ViewPillsProps {
  views: View[];
  activeView: string | null;
  onLoadView: (viewName: string) => void;
  onDeleteView: (viewName: string) => void;
}

export function ViewPills({ views, activeView, onLoadView, onDeleteView }: ViewPillsProps) {
  // Filter out Main View - it has its own dedicated button
  // Only show user-created views here
  const userViews = views.filter(v => v.name !== 'Main View');
  
  if (userViews.length === 0) return null;

  return (
    <div className="flex gap-1">
      {userViews.map((view) => (
        <div key={view.id || view.name} className="relative group">
          <Button
            variant={activeView === view.name ? "default" : "outline"}
            size="sm"
            onClick={() => onLoadView(view.name)}
            className={cn(
              "h-8 text-xs whitespace-nowrap pr-8",
              activeView === view.name && "bg-primary text-primary-foreground"
            )}
          >
            {view.name}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteView(view.name);
            }}
            className="absolute right-0 top-0 h-8 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}