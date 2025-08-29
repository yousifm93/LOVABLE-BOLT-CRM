import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  count: number;
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ 
  title, 
  count,
  data, 
  renderItem,
  defaultOpen = false,
  className 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("bg-gradient-card shadow-soft border-0", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {count} total
          </span>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-0 space-y-2">
          {data.length > 0 ? (
            data.map((item, index) => renderItem(item, index))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}