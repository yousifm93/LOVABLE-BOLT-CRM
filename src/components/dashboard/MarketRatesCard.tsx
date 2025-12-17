import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketData {
  rate_30yr_fixed: number | null;
  rate_15yr_fixed: number | null;
  rate_30yr_fha: number | null;
  rate_bank_statement: number | null;
  rate_dscr: number | null;
  change_30yr_fixed: number | null;
  change_15yr_fixed: number | null;
  change_30yr_fha: number | null;
  ai_market_summary: string | null;
  updated_at: string | null;
}

interface RateItemProps {
  label: string;
  rate: number | null;
  change?: number | null;
  showChange?: boolean;
}

function RateItem({ label, rate, change, showChange = true }: RateItemProps) {
  const getChangeIcon = () => {
    if (!change || change === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <TrendingUp className="h-3 w-3 text-red-500" />;
  };

  const getChangeColor = () => {
    if (!change || change === 0) return "text-muted-foreground";
    if (change < 0) return "text-green-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">
        {rate ? `${rate.toFixed(3)}%` : '—'}
      </span>
      {showChange && (
        <span className={`flex items-center gap-0.5 text-[10px] ${getChangeColor()}`}>
          {getChangeIcon()}
          {change ? Math.abs(change).toFixed(3) : '0.000'}
        </span>
      )}
    </div>
  );
}

export function MarketRatesCard() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMarketData = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_market_updates')
      .select('*')
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching market data:', error);
    }

    setMarketData(data || null);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-daily-rates');
      
      if (error) {
        console.error('Error refreshing rates:', error);
      } else {
        console.log('Rate fetch triggered:', data);
        setTimeout(fetchMarketData, 5000);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatUpdateTime = (timestamp: string | null) => {
    if (!timestamp) return 'Not yet updated';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-2 px-1 border-b border-border/50">
      {/* Rates - all in single row */}
      <div className="flex items-center gap-2 flex-wrap">
        <RateItem 
          label="30Y" 
          rate={marketData?.rate_30yr_fixed ?? null} 
          change={marketData?.change_30yr_fixed ?? null}
        />
        <RateItem 
          label="15Y" 
          rate={marketData?.rate_15yr_fixed ?? null} 
          change={marketData?.change_15yr_fixed ?? null}
        />
        <RateItem 
          label="FHA" 
          rate={marketData?.rate_30yr_fha ?? null} 
          change={marketData?.change_30yr_fha ?? null}
        />
        <RateItem 
          label="Bank Stmt" 
          rate={marketData?.rate_bank_statement ?? null} 
          showChange={false}
        />
        <RateItem 
          label="DSCR" 
          rate={marketData?.rate_dscr ?? null} 
          showChange={false}
        />
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border/50" />

      {/* AI Summary - single line */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">
          {marketData?.ai_market_summary || 'Click refresh to fetch today\'s rates and market update.'}
        </p>
      </div>

      {/* Refresh + timestamp */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {formatUpdateTime(marketData?.updated_at ?? null)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-6 w-6 p-0"
        >
          {isRefreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
