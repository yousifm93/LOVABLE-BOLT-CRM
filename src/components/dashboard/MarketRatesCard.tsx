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
  // 80% LTV fields
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
  // 60% LTV fields (DSCR only)
  rate_dscr_60ltv: number | null;
  points_dscr_60ltv: number | null;
  // 70% LTV fields
  rate_30yr_fixed_70ltv: number | null;
  rate_15yr_fixed_70ltv: number | null;
  rate_30yr_fha_70ltv: number | null;
  rate_bank_statement_70ltv: number | null;
  rate_dscr_70ltv: number | null;
  points_30yr_fixed_70ltv: number | null;
  points_15yr_fixed_70ltv: number | null;
  points_30yr_fha_70ltv: number | null;
  points_bank_statement_70ltv: number | null;
  points_dscr_70ltv: number | null;
  // 75% LTV fields (DSCR and Bank Statement)
  rate_dscr_75ltv: number | null;
  points_dscr_75ltv: number | null;
  rate_bank_statement_75ltv: number | null;
  points_bank_statement_75ltv: number | null;
  // 85% LTV fields (DSCR and Bank Statement)
  rate_dscr_85ltv: number | null;
  points_dscr_85ltv: number | null;
  rate_bank_statement_85ltv: number | null;
  points_bank_statement_85ltv: number | null;
  // 90% LTV fields (no DSCR)
  rate_30yr_fixed_90ltv: number | null;
  rate_15yr_fixed_90ltv: number | null;
  rate_30yr_fha_90ltv: number | null;
  rate_bank_statement_90ltv: number | null;
  points_30yr_fixed_90ltv: number | null;
  points_15yr_fixed_90ltv: number | null;
  points_30yr_fha_90ltv: number | null;
  points_bank_statement_90ltv: number | null;
  // 95% LTV fields (no Bank Statement or DSCR)
  rate_30yr_fixed_95ltv: number | null;
  rate_15yr_fixed_95ltv: number | null;
  rate_30yr_fha_95ltv: number | null;
  points_30yr_fixed_95ltv: number | null;
  points_15yr_fixed_95ltv: number | null;
  points_30yr_fha_95ltv: number | null;
  // 96.5% LTV fields (FHA only)
  rate_30yr_fha_965ltv: number | null;
  points_30yr_fha_965ltv: number | null;
  // 97% LTV fields (30yr and 15yr fixed)
  rate_30yr_fixed_97ltv: number | null;
  points_30yr_fixed_97ltv: number | null;
  rate_15yr_fixed_97ltv: number | null;
  points_15yr_fixed_97ltv: number | null;
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
        className={`flex flex-col items-center justify-center px-2 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded min-w-[85px] ${onClick ? 'cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors' : ''}`}
        onClick={onClick}
      >
        <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-0.5 text-center">
          {label}
        </span>
        <span className="text-sm font-bold text-amber-900 dark:text-amber-100">
          {showTBD ? 'TBD' : (rate ? `${rate.toFixed(3)}%` : '—')}
        </span>
        <span className="text-[10px] text-amber-700 dark:text-amber-300">
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
          className="mt-1 flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <RefreshCw className="h-2.5 w-2.5" />
          )}
          <span>{isRefreshing ? 'Fetching...' : 'Refresh'}</span>
        </button>
      )}
    </div>
  );
}

// All rate types including all LTV variations
type RateType = 
  | '30yr_fixed' | '15yr_fixed' | 'fha_30yr' | 'bank_statement' | 'dscr'
  | 'dscr_60ltv'
  | '30yr_fixed_70ltv' | '15yr_fixed_70ltv' | 'fha_30yr_70ltv' | 'bank_statement_70ltv' | 'dscr_70ltv'
  | 'dscr_75ltv' | 'bank_statement_75ltv'
  | 'dscr_85ltv' | 'bank_statement_85ltv'
  | '30yr_fixed_90ltv' | '15yr_fixed_90ltv' | 'fha_30yr_90ltv' | 'bank_statement_90ltv'
  | '30yr_fixed_95ltv' | '15yr_fixed_95ltv' | 'fha_30yr_95ltv'
  | 'fha_30yr_965ltv'
  | '30yr_fixed_97ltv' | '15yr_fixed_97ltv';

export function MarketRatesCard() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingType, setRefreshingType] = useState<RateType | null>(null);
  const [selectedRateType, setSelectedRateType] = useState<RateType | null>(null);
  const [historicalRates, setHistoricalRates] = useState<HistoricalRate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchMarketData = async () => {
    // Fetch the last 10 days of data to find the most recent values for each field
    const { data: allData, error } = await supabase
      .from('daily_market_updates')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (error || !allData || allData.length === 0) {
      setIsLoading(false);
      return;
    }

    // Start with the most recent day as base
    const mergedData: any = { ...allData[0] };

    // List of all rate fields to check and potentially merge
    const rateFields = [
      'rate_30yr_fixed', 'points_30yr_fixed',
      'rate_15yr_fixed', 'points_15yr_fixed',
      'rate_30yr_fha', 'points_30yr_fha',
      'rate_bank_statement', 'points_bank_statement',
      'rate_dscr', 'points_dscr',
      'rate_dscr_60ltv', 'points_dscr_60ltv',
      'rate_30yr_fixed_70ltv', 'points_30yr_fixed_70ltv',
      'rate_15yr_fixed_70ltv', 'points_15yr_fixed_70ltv',
      'rate_30yr_fha_70ltv', 'points_30yr_fha_70ltv',
      'rate_bank_statement_70ltv', 'points_bank_statement_70ltv',
      'rate_dscr_70ltv', 'points_dscr_70ltv',
      'rate_dscr_75ltv', 'points_dscr_75ltv',
      'rate_bank_statement_75ltv', 'points_bank_statement_75ltv',
      'rate_dscr_85ltv', 'points_dscr_85ltv',
      'rate_bank_statement_85ltv', 'points_bank_statement_85ltv',
      'rate_30yr_fixed_90ltv', 'points_30yr_fixed_90ltv',
      'rate_15yr_fixed_90ltv', 'points_15yr_fixed_90ltv',
      'rate_30yr_fha_90ltv', 'points_30yr_fha_90ltv',
      'rate_bank_statement_90ltv', 'points_bank_statement_90ltv',
      'rate_30yr_fixed_95ltv', 'points_30yr_fixed_95ltv',
      'rate_15yr_fixed_95ltv', 'points_15yr_fixed_95ltv',
      'rate_30yr_fha_95ltv', 'points_30yr_fha_95ltv',
      'rate_30yr_fha_965ltv', 'points_30yr_fha_965ltv',
      'rate_30yr_fixed_97ltv', 'points_30yr_fixed_97ltv',
      'rate_15yr_fixed_97ltv', 'points_15yr_fixed_97ltv',
    ];

    // For each field that's null in the most recent data, look for the most recent non-null value
    for (const field of rateFields) {
      if (mergedData[field] === null || mergedData[field] === undefined) {
        // Search through all historical data for a non-null value
        for (const row of allData) {
          if (row[field] !== null && row[field] !== undefined) {
            mergedData[field] = row[field];
            break;
          }
        }
      }
    }

    setMarketData(mergedData);
    setIsLoading(false);
  };

const fetchHistoricalRates = async (rateType: RateType) => {
    setIsLoadingHistory(true);
    console.log('Fetching historical rates for:', rateType);
    
    // Query pricing_runs table filtered by scenario_type to show all completed runs
    const { data, error } = await supabase
      .from('pricing_runs')
      .select('started_at, results_json, scenario_type')
      .eq('scenario_type', rateType)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(30);
    
    console.log('Historical rates query result:', { data, error, rateType });
    
    if (error) {
      console.error('Error fetching historical rates:', error);
      setHistoricalRates([]);
    } else {
      const mapped = data?.map(row => {
        const results = row.results_json as { rate?: string | number; discount_points?: number } | null;
        console.log('Processing row:', { started_at: row.started_at, results });
        
        // Parse rate - handle both number and string with % symbol
        let rateValue: number | null = null;
        if (results?.rate !== undefined && results?.rate !== null) {
          rateValue = typeof results.rate === 'number' 
            ? results.rate 
            : parseFloat(String(results.rate).replace(/[^0-9.]/g, ''));
        }
        
        // Convert discount_points from Axiom format (99.934 = 0.066 points) to display format
        let pointsValue: number | null = null;
        if (results?.discount_points !== undefined && results?.discount_points !== null) {
          // Axiom returns price (e.g., 99.934), convert to points (100 - 99.934 = 0.066)
          pointsValue = Math.round((100 - results.discount_points) * 1000) / 1000;
        }
        
        return { 
          date: row.started_at, 
          rate: rateValue, 
          points: pointsValue 
        };
      }).filter(row => row.rate !== null) || [];
      
      console.log('Mapped historical rates:', mapped);
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
      // 80% LTV labels
      case '30yr_fixed': return '30-Year Fixed (80% LTV)';
      case '15yr_fixed': return '15-Year Fixed (80% LTV)';
      case 'fha_30yr': return 'FHA 30-Year (80% LTV)';
      case 'bank_statement': return 'Bank Statement (80% LTV)';
      case 'dscr': return 'DSCR (80% LTV)';
      // 60% LTV labels (DSCR only)
      case 'dscr_60ltv': return 'DSCR (60% LTV)';
      // 70% LTV labels
      case '30yr_fixed_70ltv': return '30-Year Fixed (70% LTV)';
      case '15yr_fixed_70ltv': return '15-Year Fixed (70% LTV)';
      case 'fha_30yr_70ltv': return 'FHA 30-Year (70% LTV)';
      case 'bank_statement_70ltv': return 'Bank Statement (70% LTV)';
      case 'dscr_70ltv': return 'DSCR (70% LTV)';
      // 75% LTV labels
      case 'dscr_75ltv': return 'DSCR (75% LTV)';
      case 'bank_statement_75ltv': return 'Bank Statement (75% LTV)';
      // 85% LTV labels
      case 'dscr_85ltv': return 'DSCR (85% LTV)';
      case 'bank_statement_85ltv': return 'Bank Statement (85% LTV)';
      // 90% LTV labels
      case '30yr_fixed_90ltv': return '30-Year Fixed (90% LTV)';
      case '15yr_fixed_90ltv': return '15-Year Fixed (90% LTV)';
      case 'fha_30yr_90ltv': return 'FHA 30-Year (90% LTV)';
      case 'bank_statement_90ltv': return 'Bank Statement (90% LTV)';
      // 95% LTV labels
      case '30yr_fixed_95ltv': return '30-Year Fixed (95% LTV)';
      case '15yr_fixed_95ltv': return '15-Year Fixed (95% LTV)';
      case 'fha_30yr_95ltv': return 'FHA 30-Year (95% LTV)';
      // 96.5% LTV labels (FHA only)
      case 'fha_30yr_965ltv': return 'FHA 30-Year (96.5% LTV)';
      // 97% LTV labels
      case '30yr_fixed_97ltv': return '30-Year Fixed (97% LTV)';
      case '15yr_fixed_97ltv': return '15-Year Fixed (97% LTV)';
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
        // Poll for results every 5 seconds for up to 4 minutes
        let attempts = 0;
        const maxAttempts = 48;
        const pollInterval = setInterval(async () => {
          attempts++;
          await fetchMarketData();
          
          // Check if we have all rates populated
          if (marketData?.rate_30yr_fixed && marketData?.rate_bank_statement && marketData?.rate_dscr &&
              marketData?.rate_30yr_fixed_70ltv && marketData?.rate_bank_statement_70ltv && marketData?.rate_dscr_70ltv) {
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
      <div className="flex flex-col gap-3 py-3 px-2 border-b border-border/50">
        {/* Product Columns Container */}
        <div className="flex gap-2 justify-center flex-wrap">
          
          {/* 30-Year Fixed Column */}
          <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            <h4 className="text-[10px] font-semibold text-center text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              30-Year Fixed
            </h4>
            <RateCard 
              label="70% LTV" 
              rate={marketData?.rate_30yr_fixed_70ltv ?? null} 
              points={marketData?.points_30yr_fixed_70ltv ?? null}
              onClick={() => handleRateCardClick('30yr_fixed_70ltv')}
              onRefresh={() => handleRefreshSingle('30yr_fixed_70ltv')}
              isRefreshing={refreshingType === '30yr_fixed_70ltv'}
            />
            <RateCard 
              label="80% LTV" 
              rate={marketData?.rate_30yr_fixed ?? null} 
              points={marketData?.points_30yr_fixed ?? null}
              onClick={() => handleRateCardClick('30yr_fixed')}
              onRefresh={() => handleRefreshSingle('30yr_fixed')}
              isRefreshing={refreshingType === '30yr_fixed'}
            />
            <RateCard 
              label="90% LTV" 
              rate={marketData?.rate_30yr_fixed_90ltv ?? null} 
              points={marketData?.points_30yr_fixed_90ltv ?? null}
              onClick={() => handleRateCardClick('30yr_fixed_90ltv')}
              onRefresh={() => handleRefreshSingle('30yr_fixed_90ltv')}
              isRefreshing={refreshingType === '30yr_fixed_90ltv'}
            />
            <RateCard 
              label="95% LTV" 
              rate={marketData?.rate_30yr_fixed_95ltv ?? null} 
              points={marketData?.points_30yr_fixed_95ltv ?? null}
              onClick={() => handleRateCardClick('30yr_fixed_95ltv')}
              onRefresh={() => handleRefreshSingle('30yr_fixed_95ltv')}
              isRefreshing={refreshingType === '30yr_fixed_95ltv'}
            />
            <RateCard 
              label="97% LTV" 
              rate={marketData?.rate_30yr_fixed_97ltv ?? null} 
              points={marketData?.points_30yr_fixed_97ltv ?? null}
              onClick={() => handleRateCardClick('30yr_fixed_97ltv')}
              onRefresh={() => handleRefreshSingle('30yr_fixed_97ltv')}
              isRefreshing={refreshingType === '30yr_fixed_97ltv'}
            />
          </div>

          {/* 15-Year Fixed Column */}
          <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            <h4 className="text-[10px] font-semibold text-center text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              15-Year Fixed
            </h4>
            <RateCard 
              label="70% LTV" 
              rate={marketData?.rate_15yr_fixed_70ltv ?? null} 
              points={marketData?.points_15yr_fixed_70ltv ?? null}
              onClick={() => handleRateCardClick('15yr_fixed_70ltv')}
              onRefresh={() => handleRefreshSingle('15yr_fixed_70ltv')}
              isRefreshing={refreshingType === '15yr_fixed_70ltv'}
            />
            <RateCard 
              label="80% LTV" 
              rate={marketData?.rate_15yr_fixed ?? null} 
              points={marketData?.points_15yr_fixed ?? null}
              onClick={() => handleRateCardClick('15yr_fixed')}
              onRefresh={() => handleRefreshSingle('15yr_fixed')}
              isRefreshing={refreshingType === '15yr_fixed'}
            />
            <RateCard 
              label="90% LTV" 
              rate={marketData?.rate_15yr_fixed_90ltv ?? null} 
              points={marketData?.points_15yr_fixed_90ltv ?? null}
              onClick={() => handleRateCardClick('15yr_fixed_90ltv')}
              onRefresh={() => handleRefreshSingle('15yr_fixed_90ltv')}
              isRefreshing={refreshingType === '15yr_fixed_90ltv'}
            />
            <RateCard 
              label="95% LTV" 
              rate={marketData?.rate_15yr_fixed_95ltv ?? null} 
              points={marketData?.points_15yr_fixed_95ltv ?? null}
              onClick={() => handleRateCardClick('15yr_fixed_95ltv')}
              onRefresh={() => handleRefreshSingle('15yr_fixed_95ltv')}
              isRefreshing={refreshingType === '15yr_fixed_95ltv'}
            />
            <RateCard 
              label="97% LTV" 
              rate={marketData?.rate_15yr_fixed_97ltv ?? null} 
              points={marketData?.points_15yr_fixed_97ltv ?? null}
              onClick={() => handleRateCardClick('15yr_fixed_97ltv')}
              onRefresh={() => handleRefreshSingle('15yr_fixed_97ltv')}
              isRefreshing={refreshingType === '15yr_fixed_97ltv'}
            />
          </div>

          {/* FHA 30-Year Column - Only 90%, 95%, and 96.5% LTV */}
          <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            <h4 className="text-[10px] font-semibold text-center text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              FHA 30-Year
            </h4>
            <RateCard 
              label="90% LTV" 
              rate={marketData?.rate_30yr_fha_90ltv ?? null} 
              points={marketData?.points_30yr_fha_90ltv ?? null}
              onClick={() => handleRateCardClick('fha_30yr_90ltv')}
              onRefresh={() => handleRefreshSingle('fha_30yr_90ltv')}
              isRefreshing={refreshingType === 'fha_30yr_90ltv'}
            />
            <RateCard 
              label="95% LTV" 
              rate={marketData?.rate_30yr_fha_95ltv ?? null} 
              points={marketData?.points_30yr_fha_95ltv ?? null}
              onClick={() => handleRateCardClick('fha_30yr_95ltv')}
              onRefresh={() => handleRefreshSingle('fha_30yr_95ltv')}
              isRefreshing={refreshingType === 'fha_30yr_95ltv'}
            />
            <RateCard 
              label="96.5% LTV" 
              rate={marketData?.rate_30yr_fha_965ltv ?? null} 
              points={marketData?.points_30yr_fha_965ltv ?? null}
              onClick={() => handleRateCardClick('fha_30yr_965ltv')}
              onRefresh={() => handleRefreshSingle('fha_30yr_965ltv')}
              isRefreshing={refreshingType === 'fha_30yr_965ltv'}
            />
          </div>

          {/* Bank Statement Column - 70%, 80%, 85%, 90% LTV */}
          <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            <h4 className="text-[10px] font-semibold text-center text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Bank Statement
            </h4>
            <RateCard 
              label="70% LTV" 
              rate={marketData?.rate_bank_statement_70ltv ?? null} 
              points={marketData?.points_bank_statement_70ltv ?? null}
              onClick={() => handleRateCardClick('bank_statement_70ltv')}
              onRefresh={() => handleRefreshSingle('bank_statement_70ltv')}
              isRefreshing={refreshingType === 'bank_statement_70ltv'}
            />
            <RateCard 
              label="75% LTV" 
              rate={marketData?.rate_bank_statement_75ltv ?? null} 
              points={marketData?.points_bank_statement_75ltv ?? null}
              onClick={() => handleRateCardClick('bank_statement_75ltv')}
              onRefresh={() => handleRefreshSingle('bank_statement_75ltv')}
              isRefreshing={refreshingType === 'bank_statement_75ltv'}
            />
            <RateCard 
              label="80% LTV" 
              rate={marketData?.rate_bank_statement ?? null} 
              points={marketData?.points_bank_statement ?? null}
              onClick={() => handleRateCardClick('bank_statement')}
              onRefresh={() => handleRefreshSingle('bank_statement')}
              isRefreshing={refreshingType === 'bank_statement'}
            />
            <RateCard 
              label="85% LTV" 
              rate={marketData?.rate_bank_statement_85ltv ?? null} 
              points={marketData?.points_bank_statement_85ltv ?? null}
              onClick={() => handleRateCardClick('bank_statement_85ltv')}
              onRefresh={() => handleRefreshSingle('bank_statement_85ltv')}
              isRefreshing={refreshingType === 'bank_statement_85ltv'}
            />
            <RateCard 
              label="90% LTV" 
              rate={marketData?.rate_bank_statement_90ltv ?? null} 
              points={marketData?.points_bank_statement_90ltv ?? null}
              onClick={() => handleRateCardClick('bank_statement_90ltv')}
              onRefresh={() => handleRefreshSingle('bank_statement_90ltv')}
              isRefreshing={refreshingType === 'bank_statement_90ltv'}
            />
          </div>

          {/* DSCR Column - 70%, 75%, 80%, 85% LTV */}
          <div className="flex flex-col gap-1 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
            <h4 className="text-[10px] font-semibold text-center text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              DSCR
            </h4>
            <RateCard 
              label="60% LTV" 
              rate={marketData?.rate_dscr_60ltv ?? null} 
              points={marketData?.points_dscr_60ltv ?? null}
              onClick={() => handleRateCardClick('dscr_60ltv')}
              onRefresh={() => handleRefreshSingle('dscr_60ltv')}
              isRefreshing={refreshingType === 'dscr_60ltv'}
            />
            <RateCard 
              label="70% LTV" 
              rate={marketData?.rate_dscr_70ltv ?? null} 
              points={marketData?.points_dscr_70ltv ?? null}
              onClick={() => handleRateCardClick('dscr_70ltv')}
              onRefresh={() => handleRefreshSingle('dscr_70ltv')}
              isRefreshing={refreshingType === 'dscr_70ltv'}
            />
            <RateCard 
              label="75% LTV" 
              rate={marketData?.rate_dscr_75ltv ?? null} 
              points={marketData?.points_dscr_75ltv ?? null}
              onClick={() => handleRateCardClick('dscr_75ltv')}
              onRefresh={() => handleRefreshSingle('dscr_75ltv')}
              isRefreshing={refreshingType === 'dscr_75ltv'}
            />
            <RateCard 
              label="80% LTV" 
              rate={marketData?.rate_dscr ?? null} 
              points={marketData?.points_dscr ?? null}
              onClick={() => handleRateCardClick('dscr')}
              onRefresh={() => handleRefreshSingle('dscr')}
              isRefreshing={refreshingType === 'dscr'}
            />
            <RateCard 
              label="85% LTV" 
              rate={marketData?.rate_dscr_85ltv ?? null} 
              points={marketData?.points_dscr_85ltv ?? null}
              onClick={() => handleRateCardClick('dscr_85ltv')}
              onRefresh={() => handleRefreshSingle('dscr_85ltv')}
              isRefreshing={refreshingType === 'dscr_85ltv'}
            />
          </div>
          
        </div>

        {/* Refresh + timestamp */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-[10px] text-muted-foreground">
            Last updated: {formatUpdateTime(marketData?.updated_at ?? null)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 px-2 text-[10px]"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                Refresh All
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
                          {row.points !== null ? `${row.points.toFixed(2)}` : '—'}
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
