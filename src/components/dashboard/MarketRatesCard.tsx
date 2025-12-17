import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

interface RateCardProps {
  label: string;
  rate: number | null;
  change?: number | null;
  showChange?: boolean;
}

function RateCard({ label, rate, change, showChange = true }: RateCardProps) {
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
    <div className="bg-muted/50 rounded-lg p-3 text-center min-w-[100px]">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold text-foreground">
        {rate ? `${rate.toFixed(3)}%` : '—'}
      </p>
      {showChange && (
        <div className={`flex items-center justify-center gap-1 text-xs ${getChangeColor()}`}>
          {getChangeIcon()}
          <span>{change ? Math.abs(change).toFixed(3) : '0.000'}</span>
        </div>
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
      // Trigger the daily rate fetch
      const { data, error } = await supabase.functions.invoke('fetch-daily-rates');
      
      if (error) {
        console.error('Error refreshing rates:', error);
      } else {
        console.log('Rate fetch triggered:', data);
        // Poll for results after a delay (Axiom takes time)
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
      <Card className="mb-6">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Rates Section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Today's Rates
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 text-xs"
              >
                {isRefreshing ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Refresh
              </Button>
            </div>
            
            {/* Main rates row */}
            <div className="flex gap-2 mb-2 flex-wrap">
              <RateCard 
                label="30Y Fixed" 
                rate={marketData?.rate_30yr_fixed ?? null} 
                change={marketData?.change_30yr_fixed ?? null}
              />
              <RateCard 
                label="15Y Fixed" 
                rate={marketData?.rate_15yr_fixed ?? null} 
                change={marketData?.change_15yr_fixed ?? null}
              />
              <RateCard 
                label="30Y FHA" 
                rate={marketData?.rate_30yr_fha ?? null} 
                change={marketData?.change_30yr_fha ?? null}
              />
            </div>
            
            {/* Secondary rates row */}
            <div className="flex gap-2">
              <RateCard 
                label="Bank Stmt" 
                rate={marketData?.rate_bank_statement ?? null} 
                showChange={false}
              />
              <RateCard 
                label="DSCR" 
                rate={marketData?.rate_dscr ?? null} 
                showChange={false}
              />
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="flex-1 lg:max-w-sm">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Daily Market Update
            </h3>
            <div className="bg-muted/30 rounded-lg p-4 min-h-[120px]">
              {marketData?.ai_market_summary ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {marketData.ai_market_summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No market update available. Click "Refresh" to fetch today's rates and generate an AI summary.
                </p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              Last updated: {formatUpdateTime(marketData?.updated_at ?? null)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
