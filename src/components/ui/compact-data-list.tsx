import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompactDataListProps {
  title: string;
  data: Array<{
    name: string;
    amount?: string;
    stage?: string;
    status?: string;
    source?: string;
    date?: string;
  }>;
  type?: 'leads' | 'apps' | 'clients';
  className?: string;
  maxRows?: number;
}

export function CompactDataList({ 
  title, 
  data, 
  type = 'leads',
  className,
  maxRows = 10
}: CompactDataListProps) {
  const displayData = data.slice(0, maxRows);

  const getStatusColor = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "secondary";
    switch (status.toLowerCase()) {
      case 'approved': return "default";
      case 'processing': return "secondary";
      case 'submitted': return "outline";
      case 'pending': return "secondary";
      default: return "secondary";
    }
  };

  return (
    <Card className={cn("bg-gradient-card shadow-soft border-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayData.map((item, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-2 rounded-md bg-background/60 hover:bg-background/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">
                  {item.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.source && (
                    <span className="text-xs text-muted-foreground">
                      {item.source}
                    </span>
                  )}
                  {item.status && (
                    <Badge variant={getStatusColor(item.status)} className="text-xs h-4 px-1.5">
                      {item.status}
                    </Badge>
                  )}
                  {item.stage && (
                    <Badge variant="outline" className="text-xs h-4 px-1.5">
                      {item.stage}
                    </Badge>
                  )}
                  {item.date && (
                    <span className="text-xs text-muted-foreground">
                      {item.date}
                    </span>
                  )}
                </div>
              </div>
              {item.amount && (
                <div className="font-semibold text-sm text-primary ml-2">
                  {item.amount}
                </div>
              )}
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}