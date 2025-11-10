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

// Utility function to format relative time
const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function DashboardTabs() {
  const {
    thisMonthLeads,
    yesterdayLeads,
    allLeads,
    thisMonthApps,
    yesterdayApps,
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
              {/* Top 4 Large Stats Cards with Progress */}
              <div className="grid grid-cols-4 gap-4">
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
              </div>

              {/* Collapsible Lists Section */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Side - All Leads */}
                <div className="space-y-4">
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
                          {new Date(lead.lead_on_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Right Side - All Applications */}
                <div className="space-y-4">
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
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentStageChanges.length > 0 ? (
                recentStageChanges.map((change: any) => (
                  <div key={change.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-foreground">
                        {change.lead?.first_name} {change.lead?.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{change.from_stage?.name || 'New'}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-primary font-medium">{change.to_stage?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatRelativeTime(change.changed_at)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Pipeline Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineStageCounts.length > 0 ? (
                pipelineStageCounts.map((stage: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                    <span className="text-sm font-medium">{stage.stage_name}</span>
                    <span className="text-sm text-muted-foreground">{stage.count} {stage.count === 1 ? 'client' : 'clients'}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No pipeline data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Components */}
      <div className="space-y-6 mt-8">
        <ActivityMonitor />
        <ConversionAnalytics />
      </div>
    </div>
  );
}