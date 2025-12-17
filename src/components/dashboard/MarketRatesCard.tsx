import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketData {
  rate_30yr_fixed: number | null;
  rate_15yr_fixed: number | null;
  rate_30yr_fha: number | null;
  rate_bank_statement: number | null;
  rate_dscr: number | null;
  points_30yr_fixed: number | null;
  points_15yr_fixed: number | null;
  points_30yr_fha: number | null;
  points_bank_statement: number | null;
  points_dscr: number | null;
  updated_at: string | null;
}

interface RateCardProps {
  label: string;
  rate: number | null;
  points: number | null;
}

function RateCard({ label, rate, points }: RateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg min-w-[140px]">
      <span className="text-xs font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className="text-xl font-bold text-amber-900 dark:text-amber-100">
        {rate ? `${rate.toFixed(3)}%` : '—'}
      </span>
      <span className="text-xs text-amber-700 dark:text-amber-300">
        {points !== null && points !== undefined ? `${(100 - points).toFixed(2)} pts` : '— pts'}
      </span>
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
        // Poll for results every 5 seconds for up to 2 minutes
        let attempts = 0;
        const maxAttempts = 24;
        const pollInterval = setInterval(async () => {
          attempts++;
          await fetchMarketData();
          
          // Check if we have all rates populated
          if (marketData?.rate_30yr_fixed && marketData?.rate_bank_statement && marketData?.rate_dscr) {
            clearInterval(pollInterval);
            setIsRefreshing(false);
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsRefreshing(false);
          }
        }, 5000);
      }
    } catch (err) {
      console.error('Error:', err);
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
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 px-2 border-b border-border/50">
      {/* Rate Cards */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <RateCard 
          label="30-Year Fixed" 
          rate={marketData?.rate_30yr_fixed ?? null} 
          points={marketData?.points_30yr_fixed ?? null}
        />
        <RateCard 
          label="15-Year Fixed" 
          rate={marketData?.rate_15yr_fixed ?? null} 
          points={marketData?.points_15yr_fixed ?? null}
        />
        <RateCard 
          label="FHA 30-Year" 
          rate={marketData?.rate_30yr_fha ?? null} 
          points={marketData?.points_30yr_fha ?? null}
        />
        <RateCard 
          label="Bank Statement" 
          rate={marketData?.rate_bank_statement ?? null} 
          points={marketData?.points_bank_statement ?? null}
        />
        <RateCard 
          label="DSCR" 
          rate={marketData?.rate_dscr ?? null} 
          points={marketData?.points_dscr ?? null}
        />
      </div>

      {/* Refresh + timestamp */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs text-muted-foreground">
          Last updated: {formatUpdateTime(marketData?.updated_at ?? null)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 px-3"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Fetching rates...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Rates
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
