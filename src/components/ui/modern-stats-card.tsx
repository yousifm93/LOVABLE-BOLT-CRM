import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModernStatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  progress?: number; // 0-100 for progress arc
  sparklineData?: number[]; // Array of numbers for sparkline
  className?: string;
  size?: "default" | "compact" | "large";
}

export function ModernStatsCard({ 
  title, 
  value, 
  icon, 
  progress,
  sparklineData,
  className,
  size = "default"
}: ModernStatsCardProps) {
  const cardHeight = size === "compact" ? "h-20" : size === "large" ? "h-32" : "h-24";
  const titleSize = size === "compact" ? "text-xs" : size === "large" ? "text-base" : "text-sm";
  const valueSize = size === "compact" ? "text-lg" : size === "large" ? "text-4xl" : "text-2xl";
  const iconSize = size === "compact" ? "h-4 w-4" : size === "large" ? "h-8 w-8" : "h-5 w-5";

  return (
    <Card className={cn(
      "bg-gradient-card shadow-soft border-0 hover:shadow-medium transition-all duration-200",
      cardHeight,
      className
    )}>
      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-muted-foreground mb-1", titleSize)}>
              {title}
            </p>
            <div className={cn("font-bold text-foreground", valueSize)}>
              {value}
            </div>
          </div>
          <div className={cn("text-primary flex-shrink-0", iconSize)}>
            {icon}
          </div>
        </div>
        
        {/* Progress Arc */}
        {progress !== undefined && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {progress}%
              </span>
            </div>
          </div>
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-2 h-6">
            <svg width="100%" height="24" className="overflow-visible">
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklineData.map((value, index) => {
                  const x = (index / (sparklineData.length - 1)) * 100;
                  const max = Math.max(...sparklineData);
                  const min = Math.min(...sparklineData);
                  const y = 20 - ((value - min) / (max - min)) * 16;
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}