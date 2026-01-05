import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface HistoricalRate {
  date: string;
  rate: number | null;
  points: number | null;
}

interface RateCardProps {
  label: string;
  rate: number | null;
  points: number | null;
  showTBD?: boolean;
  onClick?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function RateCard({ label, rate, points, showTBD, onClick, onRefresh, isRefreshing }: RateCardProps) {
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`flex flex-col items-center justify-center px-4 py-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg min-w-[140px] ${onClick ? 'cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors' : ''}`}
        onClick={onClick}
      >
        <span className="text-xs font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-1">
          {label}
        </span>
        <span className="text-xl font-bold text-amber-900 dark:text-amber-100">
          {showTBD ? 'TBD' : (rate ? `${rate.toFixed(3)}%` : '—')}
        </span>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {showTBD ? '— pts' : (points !== null && points !== undefined ? `${(100 - points).toFixed(2)} pts` : '— pts')}
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={isRefreshing}
          className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          <span>{isRefreshing ? 'Fetching...' : 'Refresh'}</span>
        </button>
      )}
    </div>
  );
}

type RateType = '30yr_fixed' | '15yr_fixed' | 'fha_30yr' | 'bank_statement' | 'dscr';

export function MarketRatesCard() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingType, setRefreshingType] = useState<RateType | null>(null);
  const [selectedRateType, setSelectedRateType] = useState<RateType | null>(null);
  const [historicalRates, setHistoricalRates] = useState<HistoricalRate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

const fetchHistoricalRates = async (rateType: RateType) => {
    setIsLoadingHistory(true);
    
    // Query pricing_runs table filtered by scenario_type to show all completed runs
    const { data, error } = await supabase
      .from('pricing_runs')
      .select('started_at, results_json, scenario_type')
      .eq('scenario_type', rateType)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(30);
    
    if (error) {
      console.error('Error fetching historical rates:', error);
      setHistoricalRates([]);
    } else {
      const mapped = data?.map(row => {
        const results = row.results_json as { rate?: number; discount_points?: number } | null;
        return { 
          date: row.started_at, 
          rate: results?.rate ?? null, 
          points: results?.discount_points ?? null 
        };
      }).filter(row => row.rate !== null) || [];
      
      setHistoricalRates(mapped);
    }
    
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const handleRateCardClick = (rateType: RateType) => {
    setSelectedRateType(rateType);
    fetchHistoricalRates(rateType);
  };

  const getRateTypeLabel = (rateType: RateType | null) => {
    switch (rateType) {
      case '30yr_fixed': return '30-Year Fixed';
      case '15yr_fixed': return '15-Year Fixed';
      case 'fha_30yr': return 'FHA 30-Year';
      case 'bank_statement': return 'Bank Statement';
      case 'dscr': return 'DSCR';
      default: return '';
    }
  };

  const handleRefreshSingle = async (scenarioType: RateType) => {
    setRefreshingType(scenarioType);
    try {
      console.log(`Triggering single rate refresh for: ${scenarioType}`);
      const { data, error } = await supabase.functions.invoke('fetch-single-rate', {
        body: { scenario_type: scenarioType }
      });
      
      if (error) {
        console.error(`Error refreshing ${scenarioType} rate:`, error);
        setRefreshingType(null);
        return;
      }
      
      console.log(`Single rate fetch triggered for ${scenarioType}:`, data);
      
      // Poll for results every 5 seconds for up to 2 minutes
      let attempts = 0;
      const maxAttempts = 24;
      const pollInterval = setInterval(async () => {
        attempts++;
        await fetchMarketData();
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setRefreshingType(null);
        }
      }, 5000);
      
      // Clear refreshing state after 2 minutes max
      setTimeout(() => {
        setRefreshingType(null);
      }, 120000);
      
    } catch (err) {
      console.error('Error:', err);
      setRefreshingType(null);
    }
  };

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRateChange = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    return current - previous;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-4 px-2 border-b border-border/50">
        {/* Rate Cards */}
        <div className="flex items-start gap-3 flex-wrap justify-center">
          <RateCard 
            label="30-Year Fixed" 
            rate={marketData?.rate_30yr_fixed ?? null} 
            points={marketData?.points_30yr_fixed ?? null}
            onClick={() => handleRateCardClick('30yr_fixed')}
            onRefresh={() => handleRefreshSingle('30yr_fixed')}
            isRefreshing={refreshingType === '30yr_fixed'}
          />
          <RateCard 
            label="15-Year Fixed" 
            rate={null} 
            points={null}
            showTBD
            onRefresh={() => handleRefreshSingle('15yr_fixed')}
            isRefreshing={refreshingType === '15yr_fixed'}
          />
          <RateCard 
            label="FHA 30-Year" 
            rate={null} 
            points={null}
            showTBD
            onRefresh={() => handleRefreshSingle('fha_30yr')}
            isRefreshing={refreshingType === 'fha_30yr'}
          />
          <RateCard 
            label="Bank Statement" 
            rate={marketData?.rate_bank_statement ?? null} 
            points={marketData?.points_bank_statement ?? null}
            onClick={() => handleRateCardClick('bank_statement')}
            onRefresh={() => handleRefreshSingle('bank_statement')}
            isRefreshing={refreshingType === 'bank_statement'}
          />
          <RateCard 
            label="DSCR" 
            rate={marketData?.rate_dscr ?? null} 
            points={marketData?.points_dscr ?? null}
            onClick={() => handleRateCardClick('dscr')}
            onRefresh={() => handleRefreshSingle('dscr')}
            isRefreshing={refreshingType === 'dscr'}
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

      {/* Historical Rate Dialog */}
      <Dialog open={selectedRateType !== null} onOpenChange={(open) => !open && setSelectedRateType(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{getRateTypeLabel(selectedRateType)} Rate History</DialogTitle>
          </DialogHeader>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historicalRates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No historical rate data available
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalRates.map((row, index) => {
                    const previousRow = historicalRates[index + 1];
                    const rateChange = getRateChange(row.rate, previousRow?.rate ?? null);
                    
                    return (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                        <TableCell className="text-right">
                          {row.rate ? `${row.rate.toFixed(3)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.points !== null ? `${(100 - row.points).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {rateChange !== null ? (
                            <span className={`inline-flex items-center gap-1 ${
                              rateChange > 0 ? 'text-red-600' : 
                              rateChange < 0 ? 'text-green-600' : 
                              'text-muted-foreground'
                            }`}>
                              {rateChange > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : rateChange < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {rateChange !== 0 ? `${Math.abs(rateChange).toFixed(3)}` : '—'}
                            </span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
