import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  onClick?: () => void; // Click handler
  clickable?: boolean; // Whether the card is clickable
  showProgress?: boolean; // Show progress bar at bottom
  progressValue?: number; // Current progress value
  progressMax?: number; // Maximum progress value
  showExpectedProgress?: boolean; // Show expected progress indicator
  expectedProgressValue?: number; // Expected progress value
}

export function ModernStatsCard({ 
  title, 
  value, 
  icon, 
  progress,
  sparklineData,
  className,
  size = "default",
  centered = false,
  onClick,
  clickable = false,
  showProgress = false,
  progressValue = 0,
  progressMax = 100,
  showExpectedProgress = false,
  expectedProgressValue = 0,
}: ModernStatsCardProps) {
  const cardHeight = size === "compact" ? "h-20" : size === "large" ? "h-32" : "h-24";
  const titleSize = size === "compact" ? "text-xs" : size === "large" ? "text-base" : "text-sm";
  const valueSize = size === "compact" ? "text-lg" : size === "large" ? "text-4xl" : "text-2xl";
  const iconSize = size === "compact" ? "h-4 w-4" : size === "large" ? "h-8 w-8" : "h-5 w-5";

  return (
    <Card 
      className={cn(
        "bg-gradient-card shadow-soft border-0 hover:shadow-medium transition-all duration-200",
        cardHeight,
        clickable && "cursor-pointer hover:scale-105 hover:shadow-lg transition-transform",
        className
      )}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div className={cn("flex items-start", centered ? "justify-center" : "justify-between")}>
          <div className={cn("flex-1 min-w-0", centered && "text-center")}>
            <p className={cn("font-medium text-muted-foreground mb-1", titleSize)}>
              {title}
            </p>
            <div className={cn("font-bold text-foreground", valueSize)}>
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

        {/* Progress Bar at Bottom */}
        {showProgress && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressValue} / {progressMax}</span>
              <span>{Math.round((progressValue / progressMax) * 100)}%</span>
            </div>
            <div className="relative">
              <Progress value={(progressValue / progressMax) * 100} className="h-2" />
              {showExpectedProgress && expectedProgressValue !== undefined && (
                <div 
                  className="absolute top-0 h-2 w-0.5 bg-foreground/60"
                  style={{ left: `${(expectedProgressValue / progressMax) * 100}%` }}
                  title={`Expected: ${Math.round(expectedProgressValue)} (${Math.round((expectedProgressValue / progressMax) * 100)}%)`}
                />
              )}
            </div>
            {showExpectedProgress && expectedProgressValue !== undefined && (
              <div className="text-xs text-muted-foreground text-center">
                Expected: {Math.round(expectedProgressValue)} 
                {progressValue >= expectedProgressValue ? ' ✓ On Pace' : ' ⚠ Behind'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}