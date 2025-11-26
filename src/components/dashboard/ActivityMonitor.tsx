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
import { ActivityDetailModal } from "./ActivityDetailModal";

type TimeRange = 'today' | 'yesterday' | 'last7' | 'custom';
type Category = 'pipeline' | 'contacts' | 'tasks';
type ActionFilter = 'all' | 'insert' | 'update' | 'delete';

interface ActivityData {
  category: string;
  action: string;
  cnt: number;
}

interface ActivityDetail {
  item_id: string;
  action: string;
  table_name: string;
  changed_at: string;
  changed_by: string | null;
  before_data: any;
  after_data: any;
  display_name: string;
  fields_changed: string[];
  user_first_name: string | null;
  user_last_name: string | null;
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
  const [detailedActivities, setDetailedActivities] = useState<Record<Category, ActivityDetail[]>>({
    pipeline: [],
    contacts: [],
    tasks: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Category[]>(['pipeline']);
  const [actionFilters, setActionFilters] = useState<Record<Category, ActionFilter>>({
    pipeline: 'all',
    contacts: 'all',
    tasks: 'all'
  });
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

      // Fetch detailed activities for each selected category
      const detailedData: Record<Category, ActivityDetail[]> = {
        pipeline: [],
        contacts: [],
        tasks: []
      };

      for (const category of selectedCategories) {
        const { data: details } = await supabase.rpc('dashboard_activity_details', {
          _from: range.from.toISOString(),
          _to: range.to.toISOString(),
          _category: category,
          _action: null
        });
        
        if (details) {
          detailedData[category] = details;
        }
      }

      setDetailedActivities(detailedData);
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

  const setActionFilter = (category: Category, action: ActionFilter) => {
    setActionFilters(prev => ({ ...prev, [category]: action }));
  };

  const getCategoryStats = (category: Category) => {
    const categoryData = activityData.filter(item => item.category === category);
    return {
      added: categoryData.find(item => item.action === 'insert')?.cnt || 0,
      modified: categoryData.find(item => item.action === 'update')?.cnt || 0,
      deleted: categoryData.find(item => item.action === 'delete')?.cnt || 0
    };
  };

  const getFilteredActivities = (category: Category): ActivityDetail[] => {
    const filter = actionFilters[category];
    const activities = detailedActivities[category] || [];
    
    if (filter === 'all') return activities;
    return activities.filter(activity => activity.action === filter);
  };

  const formatFieldName = (field: string): string => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActivityDescription = (activity: ActivityDetail): string => {
    if (activity.action === 'insert') {
      return `${activity.display_name}: Added`;
    }
    if (activity.action === 'delete') {
      return `${activity.display_name}: Deleted`;
    }
    if (activity.action === 'update') {
      const fieldCount = activity.fields_changed?.length || 0;
      
      // For single-field changes, show before/after values
      if (fieldCount === 1 && activity.before_data && activity.after_data) {
        const field = activity.fields_changed[0];
        const beforeValue = activity.before_data[field];
        const afterValue = activity.after_data[field];
        
        // Format date fields nicely
        if (field.includes('date') || field === 'due_date' || field.includes('_at')) {
          try {
            const formattedBefore = beforeValue ? format(new Date(beforeValue), 'MMM d') : 'none';
            const formattedAfter = afterValue ? format(new Date(afterValue), 'MMM d') : 'none';
            return `${activity.display_name}: ${formatFieldName(field)} changed from ${formattedBefore} to ${formattedAfter}`;
          } catch {
            // If date parsing fails, fall through to default formatting
          }
        }
        
        // Show before → after for other fields
        const displayBefore = beforeValue ?? 'none';
        const displayAfter = afterValue ?? 'none';
        return `${activity.display_name}: ${formatFieldName(field)} changed from "${displayBefore}" to "${displayAfter}"`;
      }
      
      if (fieldCount === 0) return `${activity.display_name}: Updated`;
      return `${activity.display_name}: ${fieldCount} field${fieldCount !== 1 ? 's' : ''} changed`;
    }
    return activity.display_name;
  };

  const handleActivityClick = (activity: ActivityDetail) => {
    setSelectedActivity(activity);
    setShowDetailModal(true);
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
              const filteredActivities = getFilteredActivities(category);
              const currentFilter = actionFilters[category];
              
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium capitalize text-foreground">{category} Activity</h4>
                  
                  {/* Clickable KPI Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setActionFilter(category, currentFilter === 'insert' ? 'all' : 'insert')}
                      className={cn(
                        "text-center p-3 rounded-lg transition-all",
                        currentFilter === 'insert' 
                          ? "bg-success/20 ring-2 ring-success" 
                          : "bg-background/50 hover:bg-background/70"
                      )}
                    >
                      <div className="text-lg font-bold text-success">{stats.added}</div>
                      <div className="text-xs text-muted-foreground">Added</div>
                    </button>
                    <button
                      onClick={() => setActionFilter(category, currentFilter === 'update' ? 'all' : 'update')}
                      className={cn(
                        "text-center p-3 rounded-lg transition-all",
                        currentFilter === 'update' 
                          ? "bg-info/20 ring-2 ring-info" 
                          : "bg-background/50 hover:bg-background/70"
                      )}
                    >
                      <div className="text-lg font-bold text-info">{stats.modified}</div>
                      <div className="text-xs text-muted-foreground">Modified</div>
                    </button>
                    <button
                      onClick={() => setActionFilter(category, currentFilter === 'delete' ? 'all' : 'delete')}
                      className={cn(
                        "text-center p-3 rounded-lg transition-all",
                        currentFilter === 'delete' 
                          ? "bg-destructive/20 ring-2 ring-destructive" 
                          : "bg-background/50 hover:bg-background/70"
                      )}
                    >
                      <div className="text-lg font-bold text-destructive">{stats.deleted}</div>
                      <div className="text-xs text-muted-foreground">Deleted</div>
                    </button>
                  </div>

                  {/* Filtered Activity List */}
                  {filteredActivities.length > 0 && (
                    <Collapsible 
                      open={expandedCategories.includes(category)}
                      onOpenChange={() => toggleExpanded(category)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                          <span>
                            {currentFilter === 'all' 
                              ? `All Changes (${filteredActivities.length})` 
                              : `${currentFilter === 'insert' ? 'Added' : currentFilter === 'update' ? 'Modified' : 'Deleted'} (${filteredActivities.length})`
                            }
                          </span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", 
                            expandedCategories.includes(category) && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 mt-2">
                        {filteredActivities.slice(0, 15).map((activity, index) => {
                          const ActionIcon = actionIcons[activity.action as keyof typeof actionIcons];
                          return (
                            <div 
                              key={index} 
                              onClick={() => handleActivityClick(activity)}
                              className="flex items-center justify-between p-2 rounded bg-background/30 hover:bg-background/50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge className={cn("text-xs flex-shrink-0", actionColors[activity.action as keyof typeof actionColors])}>
                                  <ActionIcon className="h-3 w-3 mr-1" />
                                  {activity.action}
                                </Badge>
                                <span className="text-xs text-foreground truncate">
                                  {getActivityDescription(activity)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                <Clock className="h-3 w-3" />
                                {formatActivityTime(activity.changed_at)}
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* No activities message */}
                  {filteredActivities.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No {currentFilter !== 'all' ? currentFilter : ''} activities found
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        activity={selectedActivity}
      />
    </Card>
  );
}