import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown, Target, Activity, Clock, FileText, Phone, Mail, Calendar, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { ModernStatsCard } from "@/components/ui/modern-stats-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ModernChartCard } from "@/components/ui/modern-chart-card";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { ActivityMonitor } from "@/components/dashboard/ActivityMonitor";
import { ConversionAnalytics } from "@/components/dashboard/ConversionAnalytics";
import { PipelineSummarySection } from "@/components/dashboard/PipelineSummarySection";
import { useDashboardData } from "@/hooks/useDashboardData";

// Format date and time for activity display
const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Format date-only strings as local dates (avoid timezone issues)
const formatLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function DashboardTabs() {
  const {
    thisMonthLeads,
    yesterdayLeads,
    todayLeads,
    allLeads,
    thisMonthApps,
    yesterdayApps,
    todayApps,
    allApplications,
    thisMonthMeetings,
    yesterdayMeetings,
    todayMeetings,
    allMeetings,
    thisMonthCalls,
    yesterdayCalls,
    todayCalls,
    allCalls,
    recentStageChanges,
    pipelineStageCounts,
    activeMetrics,
    currentMonthPending,
    nextMonthPending,
    thisWeekClosing,
    closedYtdMetrics,
    closedMonthlyVolume,
    closedMonthlyUnits,
    isLoading,
  } = useDashboardData();

  // Combine monthly volume and units into a single array for charts
  const monthlyData = useMemo(() => {
    if (!closedMonthlyVolume || !closedMonthlyUnits || !Array.isArray(closedMonthlyVolume) || !Array.isArray(closedMonthlyUnits)) return [];
    
    // Create a map of all months (Jan-Dec)
    const monthMap = new Map<number, { month: string; volume: number; units: number }>();
    
    // Initialize all 12 months with 0 values
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    monthNames.forEach((name, idx) => {
      monthMap.set(idx + 1, { month: name, volume: 0, units: 0 });
    });
    
    // Fill in volume data
    if (Array.isArray(closedMonthlyVolume)) {
      closedMonthlyVolume.forEach((row: any) => {
        const existing = monthMap.get(row.month_num);
        if (existing) {
          existing.volume = Number(row.volume) || 0;
        }
      });
    }
    
    // Fill in units data
    if (Array.isArray(closedMonthlyUnits)) {
      closedMonthlyUnits.forEach((row: any) => {
        const existing = monthMap.get(row.month_num);
        if (existing) {
          existing.units = Number(row.units) || 0;
        }
      });
    }
    
    return Array.from(monthMap.values());
  }, [closedMonthlyVolume, closedMonthlyUnits]);

  const leadsGoal = 100;
  const appsGoal = 30;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive mortgage business analytics</p>
        </div>
        <Input 
          placeholder="Search..." 
          className="max-w-md h-9" 
        />
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="sales" className="text-sm">Sales</TabsTrigger>
          <TabsTrigger value="active" className="text-sm">Active</TabsTrigger>
          <TabsTrigger value="closed" className="text-sm">Closed</TabsTrigger>
          <TabsTrigger value="miscellaneous" className="text-sm">Miscellaneous</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {/* COLUMN 1 - LEADS */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthLeads.length}
                    icon={<Target />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayLeads.length}
                    icon={<TrendingUp />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayLeads.length}
                    icon={<TrendingUp />}
                    size="large"
                  />
                  
                  <CollapsibleSection 
                    title="All Leads" 
                    count={allLeads.length}
                    data={allLeads}
                    renderItem={(lead, index) => (
                      <div key={index} className="flex flex-col gap-1 p-2 rounded border border-border hover:bg-muted/50 transition-colors">
                        <p className="font-medium text-sm">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatLocalDate(lead.lead_on_date)}
                        </p>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 2 - APPLICATIONS */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Applications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthApps.length}
                    icon={<FileText />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayApps.length}
                    icon={<Activity />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayApps.length}
                    icon={<Activity />}
                    size="large"
                  />
                  
                  <CollapsibleSection 
                    title="All Applications" 
                    count={allApplications.length}
                    data={allApplications}
                    renderItem={(app, index) => (
                      <div key={index} className="flex flex-col gap-1 p-2 rounded border border-border hover:bg-muted/50 transition-colors">
                        <p className="font-medium text-sm">
                          {app.first_name} {app.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.pending_app_at ? new Date(app.pending_app_at).toLocaleDateString() : '-'}
                        </p>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 3 - FACE-TO-FACE MEETINGS */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    Face-to-Face Meetings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthMeetings.length}
                    icon={<Users />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayMeetings.length}
                    icon={<Users />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayMeetings.length}
                    icon={<Users />}
                    size="large"
                  />
                  
                  <CollapsibleSection 
                    title="All Meetings" 
                    count={allMeetings.length}
                    data={allMeetings}
                    renderItem={(meeting, index) => (
                      <div key={index} className="flex flex-col gap-1 p-2 rounded border border-border hover:bg-muted/50 transition-colors">
                        <p className="font-medium text-sm">
                          {meeting.first_name} {meeting.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(meeting.face_to_face_meeting).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* COLUMN 4 - CALLS */}
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-600" />
                    Calls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ModernStatsCard
                    title="This Month"
                    value={thisMonthCalls.length}
                    icon={<Phone />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Yesterday"
                    value={yesterdayCalls.length}
                    icon={<Phone />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Today"
                    value={todayCalls.length}
                    icon={<Phone />}
                    size="large"
                  />
                  
                  <CollapsibleSection 
                    title="All Calls" 
                    count={allCalls.length}
                    data={allCalls}
                    renderItem={(call, index) => (
                      <div key={index} className="flex flex-col gap-1 p-2 rounded border border-border hover:bg-muted/50 transition-colors">
                        <p className="font-medium text-sm">
                          {call.first_name} {call.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(call.last_agent_call).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Top Row */}
              <div className="grid grid-cols-2 gap-6">
                <ModernStatsCard
                  title="Total Active Volume"
                  value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(activeMetrics.total_volume)}
                  icon={<DollarSign />}
                  size="large"
                  centered={true}
                />
                <ModernStatsCard
                  title="Total Active Units"
                  value={activeMetrics.total_units.toString()}
                  icon={<Users />}
                  size="large"
                  centered={true}
                />
              </div>

              {/* Second & Third Rows */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ModernStatsCard
                      title="Current Month Pending Volume"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(currentMonthPending.current_month_volume)}
                      icon={<CalendarDays />}
                      centered={true}
                    />
                    <ModernStatsCard
                      title="Next Month Pending Volume"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(nextMonthPending.next_month_volume)}
                      icon={<CalendarDays />}
                      centered={true}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ModernStatsCard
                      title="Current Month Pending Units"
                      value={currentMonthPending.current_month_units.toString()}
                      icon={<Users />}
                      centered={true}
                    />
                    <ModernStatsCard
                      title="Next Month Pending Units"
                      value={nextMonthPending.next_month_units.toString()}
                      icon={<Users />}
                      centered={true}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-2 gap-6">
                <ModernStatsCard
                  title="Closing This Week (Volume)"
                  value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(thisWeekClosing.this_week_volume)}
                  icon={<TrendingUp />}
                  size="large"
                  centered={true}
                />
                <ModernStatsCard
                  title="Closing This Week (Units)"
                  value={thisWeekClosing.this_week_units.toString()}
                  icon={<TrendingUp />}
                  size="large"
                  centered={true}
                />
              </div>

              {/* Extra Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <ModernStatsCard
                  title="Average Interest Rate"
                  value={`${activeMetrics.avg_interest_rate.toFixed(3)}%`}
                  icon={<BarChart3 />}
                  size="compact"
                  centered={true}
                />
                <ModernStatsCard
                  title="Average Loan Amount"
                  value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(activeMetrics.avg_loan_amount)}
                  icon={<DollarSign />}
                  size="compact"
                  centered={true}
                />
                <ModernStatsCard
                  title="Average Clear-to-Close Time"
                  value={activeMetrics.avg_ctc_days !== null ? `${Math.round(activeMetrics.avg_ctc_days)} days` : "—"}
                  icon={<FileText />}
                  size="compact"
                  centered={true}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-6">
          {!closedYtdMetrics || !closedMonthlyVolume || !closedMonthlyUnits ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Top Row */}
              <div className="grid grid-cols-2 gap-6">
                <ModernStatsCard
                  title="2025 YTD Volume"
                  value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(closedYtdMetrics.ytd_volume)}
                  icon={<DollarSign />}
                  size="large"
                  centered={true}
                />
                <ModernStatsCard
                  title="2025 YTD Units"
                  value={closedYtdMetrics.ytd_units.toString()}
                  icon={<Users />}
                  size="large"
                  centered={true}
                />
              </div>

              {/* Second Row - Charts */}
              <div className="grid grid-cols-2 gap-6">
                <ModernChartCard
                  title="2025 Volume by Month"
                  data={monthlyData}
                  type="bar"
                  dataKey="volume"
                  height={240}
                  color="hsl(var(--primary))"
                  showValueLabels={true}
                  formatValue={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <ModernChartCard
                  title="2025 Units by Month"
                  data={monthlyData}
                  type="bar"
                  dataKey="units"
                  height={240}
                  color="hsl(var(--primary))"
                  showValueLabels={true}
                />
              </div>

              {/* Third Row - Full Width */}
              <div className="w-full">
                <ModernStatsCard
                  title="Average Loan Amount"
                  value={new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(closedYtdMetrics.avg_loan_amount)}
                  icon={<BarChart3 />}
                  size="large"
                  className="w-full"
                  centered={true}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="miscellaneous" className="space-y-6">
          {/* Recent Activity Section */}
          <CollapsibleSection
            title="Recent Activity"
            count={recentStageChanges.length}
            data={recentStageChanges}
            defaultOpen={true}
            renderItem={(change: any, index) => {
              const isLeadCreation = !change.from_stage;
              const isGoingToLeads = change.to_stage?.name === 'Leads';
              
              return (
                <div key={change.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">
                      {change.lead?.first_name} {change.lead?.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isLeadCreation && isGoingToLeads ? (
                        <span className="text-primary font-medium">Created</span>
                      ) : isLeadCreation ? (
                        <>
                          <span>New</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-primary font-medium">{change.to_stage?.name}</span>
                        </>
                      ) : (
                        <>
                          <span>{change.from_stage?.name}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-primary font-medium">{change.to_stage?.name || 'Unknown'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {formatDateTime(change.changed_at)}
                  </Badge>
                </div>
              );
            }}
          />

          <PipelineSummarySection pipelineStageCounts={pipelineStageCounts} />

          <ActivityMonitor />
          
          <ConversionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}