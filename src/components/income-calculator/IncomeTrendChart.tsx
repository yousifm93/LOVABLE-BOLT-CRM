import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface IncomeTrendData {
  year: number;
  amount: number;
  source?: string;
}

interface IncomeTrendChartProps {
  title: string;
  data: IncomeTrendData[];
  trendDirection?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  calculationMethod?: string;
}

export function IncomeTrendChart({ 
  title, 
  data, 
  trendDirection = 'stable',
  trendPercentage = 0,
  calculationMethod
}: IncomeTrendChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxAmount = Math.max(...data.map(d => d.amount));
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = () => {
    const absPercentage = Math.abs(trendPercentage);
    
    if (trendDirection === 'up') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          +{absPercentage.toFixed(1)}% YoY
        </Badge>
      );
    }
    if (trendDirection === 'down') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          -{absPercentage.toFixed(1)}% YoY
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground">
        Stable
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            {getTrendBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Simple Bar Chart */}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.year} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.year}</span>
                <span className="text-muted-foreground">{formatCurrency(item.amount)}</span>
              </div>
              <div className="h-6 bg-muted rounded overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded transition-all duration-500",
                    index === data.length - 1 ? "bg-primary" : "bg-primary/60"
                  )}
                  style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                />
              </div>
              {item.source && (
                <p className="text-xs text-muted-foreground">{item.source}</p>
              )}
            </div>
          ))}
        </div>

        {/* Calculation Method */}
        {calculationMethod && (
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
            <strong>Method:</strong> {calculationMethod}
          </div>
        )}

        {/* Fannie Mae Rule Explanation */}
        {trendDirection === 'down' && trendPercentage > 20 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <strong>Note:</strong> Income declining &gt;20% YoY. Per Fannie Mae guidelines, 
            using the lower year's income for qualification.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
