import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, CalendarIcon, PieChart } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type TimeRange = 'today' | 'yesterday' | 'last7' | 'custom';

interface ConversionData {
  stage: string;
  total: number;
  converted: number;
  nurtured: number;
  dead: number;
  conversion_pct: number | null;
}

const stageLabels = {
  lead: 'Leads',
  pending_app: 'Pending App',
  screening: 'Screening', 
  pre_qualified: 'Pre-Qualified',
  pre_approved: 'Pre-Approved',
  active: 'Active'
};

const rangeFor = (preset: TimeRange, custom?: { from: Date; to: Date }) => {
  const now = new Date();
  if (preset === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === 'yesterday') {
    const y = subDays(now, 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (preset === 'last7') return { from: subDays(startOfDay(now), 6), to: endOfDay(now) };
  return custom!;
};

export function ConversionAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('last7');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversionData = async () => {
    setIsLoading(true);
    try {
      const range = rangeFor(timeRange, customRange);
      
      const { data: conversions } = await supabase.rpc('dashboard_conversions', {
        _from: range.from.toISOString(),
        _to: range.to.toISOString()
      });

      if (conversions) {
        setConversionData(conversions);
      }
    } catch (error) {
      console.error('Error fetching conversion data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversionData();
  }, [timeRange, customRange]);

  const selectedStageData = selectedStage 
    ? conversionData.find(item => item.stage === selectedStage)
    : null;

  return (
    <Card className="bg-gradient-card shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Conversion Analytics
        </CardTitle>
        
        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex gap-1">
            {(['today', 'yesterday', 'last7', 'custom'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
              >
                {range === 'today' && 'Today'}
                {range === 'yesterday' && 'Yesterday'}
                {range === 'last7' && 'Last 7 Days'}
                {range === 'custom' && 'Custom'}
              </Button>
            ))}
          </div>

          {/* Custom Date Picker */}
          {timeRange === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {customRange ? `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}` : 'Pick dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading conversion data...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Stage Cards */}
            <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {conversionData.map((stage) => {
                const label = stageLabels[stage.stage as keyof typeof stageLabels] || stage.stage;
                const conversionPct = stage.conversion_pct || 0;
                const isSelected = selectedStage === stage.stage;
                
                return (
                  <Card 
                    key={stage.stage}
                    className={`cursor-pointer transition-all hover:shadow-medium ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'bg-background/50'
                    }`}
                    onClick={() => setSelectedStage(isSelected ? null : stage.stage)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">{label}</h4>
                        
                        {/* Main Conversion Stat */}
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {stage.converted}/{stage.total}
                          </div>
                          <div className="text-lg font-semibold text-warning">
                            {conversionPct > 0 ? `${conversionPct}%` : '—'}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <Progress 
                            value={conversionPct} 
                            className="h-2"
                            style={{
                              background: 'hsl(var(--muted))'
                            }}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Converted: {stage.converted}</span>
                            <span>Total: {stage.total}</span>
                          </div>
                        </div>

                        {/* Mini Breakdown */}
                        <div className="flex justify-between text-xs">
                          <span className="text-info">Nurture: {stage.nurtured}</span>
                          <span className="text-destructive">Dead: {stage.dead}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Optional Donut Chart for Selected Stage */}
            {selectedStageData && (
              <Card className="bg-background/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <PieChart className="h-4 w-4 text-primary" />
                    {stageLabels[selectedStageData.stage as keyof typeof stageLabels]} Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-foreground">
                        {selectedStageData.total}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Items</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-success"></div>
                          <span className="text-xs">Converted</span>
                        </div>
                        <span className="text-sm font-medium">{selectedStageData.converted}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-info"></div>
                          <span className="text-xs">Nurture</span>
                        </div>
                        <span className="text-sm font-medium">{selectedStageData.nurtured}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-destructive"></div>
                          <span className="text-xs">Dead</span>
                        </div>
                        <span className="text-sm font-medium">{selectedStageData.dead}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-warning">
                          {selectedStageData.conversion_pct || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Conversion Rate</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}