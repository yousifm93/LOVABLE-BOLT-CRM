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
  centered?: boolean; // For centered text alignment
}

export function ModernStatsCard({ 
  title, 
  value, 
  icon, 
  progress,
  sparklineData,
  className,
  size = "default",
  centered = false
}: ModernStatsCardProps) {
  const cardHeight = size === "compact" ? "h-20" : size === "large" ? "h-36" : "h-28";
  const titleSize = size === "compact" ? "text-xs" : size === "large" ? "text-base" : "text-sm";
  const valueSize = size === "compact" ? "text-xl font-extrabold" : size === "large" ? "text-5xl font-black" : "text-3xl font-black";
  const iconSize = size === "compact" ? "h-4 w-4" : size === "large" ? "h-8 w-8" : "h-6 w-6";

  return (
    <Card className={cn(
      "bg-card border-0 rounded-2xl shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-[1.02]",
      cardHeight,
      className
    )}>
      <CardContent className="p-6 h-full flex flex-col justify-between">
        <div className={cn("flex items-start", centered ? "justify-center" : "justify-between")}>
          <div className={cn("flex-1 min-w-0", centered && "text-center")}>
            <p className={cn("font-semibold text-muted-foreground mb-2", titleSize)}>
              {title}
            </p>
            <div className={cn("text-foreground tracking-tight", valueSize)}>
              {value}
            </div>
          </div>
          {!centered && (
            <div className={cn("text-primary flex-shrink-0", iconSize)}>
              {icon}
            </div>
          )}
        </div>
        
        {/* Progress Arc */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-sm text-primary font-bold min-w-[42px]">
                {progress}%
              </span>
            </div>
          </div>
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 h-8">
            <svg width="100%" height="32" className="overflow-visible">
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklineData.map((value, index) => {
                  const x = (index / (sparklineData.length - 1)) * 100;
                  const max = Math.max(...sparklineData);
                  const min = Math.min(...sparklineData);
                  const y = 26 - ((value - min) / (max - min)) * 20;
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