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

// Mock data for charts
const monthlyVolumeData = [
  { month: 'Jan', volume: 2400000, units: 12 },
  { month: 'Feb', volume: 2100000, units: 10 },
  { month: 'Mar', volume: 2800000, units: 14 },
  { month: 'Apr', volume: 3200000, units: 16 },
  { month: 'May', volume: 2900000, units: 15 },
  { month: 'Jun', volume: 3500000, units: 18 },
  { month: 'Jul', volume: 3800000, units: 19 },
  { month: 'Aug', volume: 4200000, units: 21 },
  { month: 'Sep', volume: 3900000, units: 20 },
  { month: 'Oct', volume: 4100000, units: 22 },
  { month: 'Nov', volume: 3700000, units: 19 },
  { month: 'Dec', volume: 4500000, units: 24 },
];

// Sort ranking data by rank (best performance first)
const rankingData = [
  { month: 'Aug', rank: 1 },
  { month: 'Oct', rank: 1 },
  { month: 'Dec', rank: 1 },
  { month: 'Jul', rank: 2 },
  { month: 'Sep', rank: 2 },
  { month: 'Jun', rank: 3 },
  { month: 'Nov', rank: 3 },
  { month: 'Apr', rank: 4 },
  { month: 'Mar', rank: 6 },
  { month: 'May', rank: 7 },
  { month: 'Jan', rank: 8 },
  { month: 'Feb', rank: 12 },
];

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
    recentStageChanges,
    pipelineStageCounts,
    isLoading,
  } = useDashboardData();

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
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="sales" className="text-sm">Sales</TabsTrigger>
          <TabsTrigger value="active" className="text-sm">Active</TabsTrigger>
          <TabsTrigger value="closed" className="text-sm">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats Row - All 6 boxes in one line */}
              <div className="space-y-4">
                {/* Section Headers */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Leads</h3>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Apps</h3>
                  </div>
                </div>
                
                {/* Stat Boxes - 6 in one row */}
                <div className="grid grid-cols-6 gap-4">
                  {/* Left 3: Leads */}
                  <ModernStatsCard
                    title="This Month's Leads"
                    value={thisMonthLeads.length}
                    icon={<Target />}
                    size="large"
                    progress={Math.min(Math.round((thisMonthLeads.length / leadsGoal) * 100), 100)}
                  />
                  <ModernStatsCard
                    title="Yesterday's Leads"
                    value={yesterdayLeads.length}
                    icon={<TrendingUp />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Today's Leads"
                    value={todayLeads.length}
                    icon={<TrendingUp />}
                    size="large"
                  />
                  
                  {/* Right 3: Apps */}
                  <ModernStatsCard
                    title="This Month's Apps"
                    value={thisMonthApps.length}
                    icon={<FileText />}
                    size="large"
                    progress={Math.min(Math.round((thisMonthApps.length / appsGoal) * 100), 100)}
                  />
                  <ModernStatsCard
                    title="Yesterday's Apps"
                    value={yesterdayApps.length}
                    icon={<Activity />}
                    size="large"
                  />
                  <ModernStatsCard
                    title="Today's Apps"
                    value={todayApps.length}
                    icon={<Activity />}
                    size="large"
                  />
                </div>
              </div>

              {/* Collapsible Sections - Side by Side */}
              <div className="grid grid-cols-2 gap-6 mt-6">
                {/* All Leads */}
                <CollapsibleSection 
                  title="All Leads" 
                  count={allLeads.length}
                  data={allLeads}
                  renderItem={(lead, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <p className="font-medium text-foreground hover:text-warning transition-colors">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone || '-'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatLocalDate(lead.lead_on_date)}
                      </div>
                    </div>
                  )}
                />
                
                {/* All Applications */}
                <CollapsibleSection 
                  title="All Applications" 
                  count={allApplications.length}
                  data={allApplications}
                  renderItem={(app, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <p className="font-medium text-foreground hover:text-warning transition-colors">
                          {app.first_name} {app.last_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Applied: {app.pending_app_at ? new Date(app.pending_app_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </div>
                    </div>
                  )}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {/* Top Row */}
          <div className="grid grid-cols-2 gap-6">
            <ModernStatsCard
              title="Total Active Volume"
              value="$5,345,260"
              icon={<DollarSign />}
              size="large"
              centered={true}
            />
            <ModernStatsCard
              title="Total Active Units"
              value="16"
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
                  value="$0"
                  icon={<CalendarDays />}
                  centered={true}
                />
                <ModernStatsCard
                  title="Next Month Pending Volume"
                  value="$3,615,510"
                  icon={<CalendarDays />}
                  centered={true}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ModernStatsCard
                  title="Current Month Pending Units"
                  value="0"
                  icon={<Users />}
                  centered={true}
                />
                <ModernStatsCard
                  title="Next Month Pending Units"
                  value="12"
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
              value="$0"
              icon={<TrendingUp />}
              size="large"
              centered={true}
            />
            <ModernStatsCard
              title="Closing This Week (Units)"
              value="0"
              icon={<TrendingUp />}
              size="large"
              centered={true}
            />
          </div>

          {/* Extra Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <ModernStatsCard
              title="Average Processing Time"
              value="23 days"
              icon={<Clock />}
              size="compact"
              centered={true}
            />
            <ModernStatsCard
              title="Average Time to Submission"
              value="5 days"
              icon={<Activity />}
              size="compact"
              centered={true}
            />
            <ModernStatsCard
              title="Average Clear-to-Close Time"
              value="18 days"
              icon={<FileText />}
              size="compact"
              centered={true}
            />
          </div>

          {/* Activity Monitoring & Conversion Analytics */}
          <div className="space-y-6 mt-6">
            <ActivityMonitor />
            <ConversionAnalytics />
          </div>
        </TabsContent>

        <TabsContent value="closed" className="space-y-6">
          {/* Top Row */}
          <div className="grid grid-cols-2 gap-6">
            <ModernStatsCard
              title="2025 YTD Volume"
              value="$19,323,335"
              icon={<DollarSign />}
              size="large"
              centered={true}
            />
            <ModernStatsCard
              title="2025 YTD Units"
              value="39"
              icon={<Users />}
              size="large"
              centered={true}
            />
          </div>

          {/* Second Row - Charts */}
          <div className="grid grid-cols-2 gap-6">
            <ModernChartCard
              title="2025 Volume by Month"
              data={monthlyVolumeData}
              type="bar"
              dataKey="volume"
              height={240}
              color="hsl(var(--primary))"
              showValueLabels={true}
              formatValue={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <ModernChartCard
              title="2025 Units by Month"
              data={monthlyVolumeData}
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
              value="$495,470.128"
              icon={<BarChart3 />}
              size="large"
              className="w-full"
              centered={true}
            />
          </div>

          {/* Bottom Row - Ranking Charts */}
          <div className="grid grid-cols-2 gap-6">
            <ModernChartCard
              title="2025 Volume Rank"
              data={rankingData}
              type="bar"
              dataKey="rank"
              height={200}
              color="hsl(var(--accent))"
              showValueLabels={true}
              formatValue={(value) => `#${value}`}
            />
            <ModernChartCard
              title="2025 Units Rank"
              data={rankingData}
              type="bar"
              dataKey="rank"
              height={200}
              color="hsl(var(--accent))"
              showValueLabels={true}
              formatValue={(value) => `#${value}`}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity Section */}
      <div className="grid gap-2 md:grid-cols-2 mb-3">
        <CollapsibleSection
          title="Recent Activity"
          count={recentStageChanges.length}
          data={recentStageChanges}
          defaultOpen={true}
          renderItem={(change: any, index) => {
            // Determine if this is a lead creation event
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
                      // Just created as a new lead
                      <span className="text-primary font-medium">Created</span>
                    ) : isLeadCreation ? (
                      // Created and assigned to a different stage
                      <>
                        <span>New</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-primary font-medium">{change.to_stage?.name}</span>
                      </>
                    ) : (
                      // Normal stage transition
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
      </div>
    </div>
  );
}