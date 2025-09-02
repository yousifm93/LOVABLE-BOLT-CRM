import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Activity, Plus, Edit, Trash2, CalendarIcon, ChevronDown, Clock } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type TimeRange = 'today' | 'yesterday' | 'last7' | 'custom';
type Category = 'pipeline' | 'contacts' | 'tasks';

interface ActivityData {
  category: string;
  action: string;
  cnt: number;
}

interface LatestActivity {
  item_id: string;
  action: string;
  table_name: string;
  changed_at: string;
}

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

const actionColors = {
  insert: "bg-success text-success-foreground",
  update: "bg-info text-info-foreground", 
  delete: "bg-destructive text-destructive-foreground"
};

const actionIcons = {
  insert: Plus,
  update: Edit,
  delete: Trash2
};

export function ActivityMonitor() {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['pipeline', 'contacts', 'tasks']);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [latestActivities, setLatestActivities] = useState<Record<Category, LatestActivity[]>>({
    pipeline: [],
    contacts: [],
    tasks: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Category[]>(['pipeline']);

  const fetchActivityData = async () => {
    setIsLoading(true);
    try {
      const range = rangeFor(timeRange, customRange);
      
      // Fetch activity counts
      const { data: activities } = await supabase.rpc('dashboard_activity', {
        _from: range.from.toISOString(),
        _to: range.to.toISOString()
      });

      if (activities) {
        setActivityData(activities);
      }

      // Fetch latest activities for each selected category
      const latestData: Record<Category, LatestActivity[]> = {
        pipeline: [],
        contacts: [],
        tasks: []
      };

      for (const category of selectedCategories) {
        const { data: latest } = await supabase.rpc('dashboard_activity_latest', {
          _from: range.from.toISOString(),
          _to: range.to.toISOString(),
          _category: category
        });
        
        if (latest) {
          latestData[category] = latest;
        }
      }

      setLatestActivities(latestData);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [timeRange, customRange, selectedCategories]);

  const toggleCategory = (category: Category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleExpanded = (category: Category) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getCategoryStats = (category: Category) => {
    const categoryData = activityData.filter(item => item.category === category);
    return {
      added: categoryData.find(item => item.action === 'insert')?.cnt || 0,
      modified: categoryData.find(item => item.action === 'update')?.cnt || 0,
      deleted: categoryData.find(item => item.action === 'delete')?.cnt || 0
    };
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <Card className="bg-gradient-card shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Activity Monitor
        </CardTitle>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Time Range Selector */}
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

          {/* Category Filters */}
          <div className="flex gap-1">
            {(['pipeline', 'contacts', 'tasks'] as Category[]).map((category) => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category)}
                className="text-xs capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading activity data...</div>
        ) : (
          <>
            {/* KPI Cards for each selected category */}
            {selectedCategories.map((category) => {
              const stats = getCategoryStats(category);
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium capitalize text-foreground">{category} Activity</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <div className="text-lg font-bold text-success">{stats.added}</div>
                      <div className="text-xs text-muted-foreground">Added</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <div className="text-lg font-bold text-info">{stats.modified}</div>
                      <div className="text-xs text-muted-foreground">Modified</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background/50">
                      <div className="text-lg font-bold text-destructive">{stats.deleted}</div>
                      <div className="text-xs text-muted-foreground">Deleted</div>
                    </div>
                  </div>

                  {/* Latest Changes */}
                  {latestActivities[category]?.length > 0 && (
                    <Collapsible 
                      open={expandedCategories.includes(category)}
                      onOpenChange={() => toggleExpanded(category)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                          <span>Latest 15 Changes</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", 
                            expandedCategories.includes(category) && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 mt-2">
                        {latestActivities[category].map((activity, index) => {
                          const ActionIcon = actionIcons[activity.action as keyof typeof actionIcons];
                          return (
                            <div key={index} className="flex items-center justify-between p-2 rounded bg-background/30 hover:bg-background/50 transition-colors cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Badge className={cn("text-xs", actionColors[activity.action as keyof typeof actionColors])}>
                                  <ActionIcon className="h-3 w-3 mr-1" />
                                  {activity.action}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{activity.table_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatActivityTime(activity.changed_at)}
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}