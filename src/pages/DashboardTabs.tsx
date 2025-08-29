import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown, Target, Activity, Clock, FileText, Phone, Mail, Calendar } from "lucide-react";
import { ModernStatsCard } from "@/components/ui/modern-stats-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ModernChartCard } from "@/components/ui/modern-chart-card";

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

const rankingData = [
  { month: 'Jan', rank: 8 },
  { month: 'Feb', rank: 12 },
  { month: 'Mar', rank: 6 },
  { month: 'Apr', rank: 4 },
  { month: 'May', rank: 7 },
  { month: 'Jun', rank: 3 },
  { month: 'Jul', rank: 2 },
  { month: 'Aug', rank: 1 },
  { month: 'Sep', rank: 2 },
  { month: 'Oct', rank: 1 },
  { month: 'Nov', rank: 3 },
  { month: 'Dec', rank: 1 },
];

// Mock recent leads and apps with enhanced data
const yesterdayLeads = [
  { name: "Sarah Johnson", phone: "(555) 123-4567", email: "sarah@email.com", date: "2025-01-15" },
  { name: "Mike Chen", phone: "(555) 234-5678", email: "mike@email.com", date: "2025-01-15" },
  { name: "Lisa Rodriguez", phone: "(555) 345-6789", email: "lisa@email.com", date: "2025-01-15" },
];

const yesterdayApps = [
  { name: "Robert Kim", appliedOn: "2025-01-15" },
  { name: "Jennifer Martinez", appliedOn: "2025-01-15" },
];

const thisMonthLeads = [
  { name: "Amanda Wilson", phone: "(555) 111-2222", email: "amanda@email.com", date: "2025-01-10" },
  { name: "David Park", phone: "(555) 222-3333", email: "david@email.com", date: "2025-01-12" },
  { name: "Maria Garcia", phone: "(555) 333-4444", email: "maria@email.com", date: "2025-01-08" },
  { name: "James Thompson", phone: "(555) 444-5555", email: "james@email.com", date: "2025-01-14" },
  { name: "Emily Davis", phone: "(555) 555-6666", email: "emily@email.com", date: "2025-01-11" },
  { name: "Chris Rodriguez", phone: "(555) 666-7777", email: "chris@email.com", date: "2025-01-09" },
  { name: "Sophie Chen", phone: "(555) 777-8888", email: "sophie@email.com", date: "2025-01-13" },
  { name: "Michael Torres", phone: "(555) 888-9999", email: "michael@email.com", date: "2025-01-07" },
];

const thisMonthApps = [
  { name: "John Anderson", appliedOn: "2025-01-10" },
  { name: "Susan Miller", appliedOn: "2025-01-12" },
  { name: "Tom Wilson", appliedOn: "2025-01-08" },
  { name: "Lisa Park", appliedOn: "2025-01-14" },
  { name: "Mark Thompson", appliedOn: "2025-01-11" },
  { name: "Jennifer Davis", appliedOn: "2025-01-09" },
];

// Sparkline data for mini charts
const leadSparklineData = [12, 15, 18, 14, 20, 17, 25];
const appSparklineData = [8, 12, 10, 15, 18, 16, 22];


export default function DashboardTabs() {
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive mortgage business analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Search..." 
            className="w-64 h-8" 
          />
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="sales" className="text-sm">Sales</TabsTrigger>
          <TabsTrigger value="active" className="text-sm">Active</TabsTrigger>
          <TabsTrigger value="closed" className="text-sm">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {/* Top 4 Large Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <ModernStatsCard
              title="This Month's Leads"
              value="67"
              icon={<Target />}
              size="large"
            />
            <ModernStatsCard
              title="Yesterday's Leads"
              value="3"
              icon={<TrendingUp />}
              size="large"
            />
            <ModernStatsCard
              title="This Month's Apps"
              value="22"
              icon={<FileText />}
              size="large"
            />
            <ModernStatsCard
              title="Yesterday's Apps"
              value="1"
              icon={<Activity />}
              size="large"
            />
          </div>

          {/* Collapsible Lists Section */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Side - Leads */}
            <div className="space-y-4">
              <CollapsibleSection 
                title="This Month's Leads" 
                count={thisMonthLeads.length}
                data={thisMonthLeads}
                renderItem={(lead, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {lead.date}
                    </div>
                  </div>
                )}
              />
              <CollapsibleSection 
                title="Yesterday's Leads" 
                count={yesterdayLeads.length}
                data={yesterdayLeads}
                renderItem={(lead, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {lead.date}
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Right Side - Applications */}
            <div className="space-y-4">
              <CollapsibleSection 
                title="This Month's Apps" 
                count={thisMonthApps.length}
                data={thisMonthApps}
                renderItem={(app, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{app.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Applied: {app.appliedOn}
                    </div>
                  </div>
                )}
              />
              <CollapsibleSection 
                title="Yesterday's Apps" 
                count={yesterdayApps.length}
                data={yesterdayApps}
                renderItem={(app, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{app.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Applied: {app.appliedOn}
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {/* Top Row */}
          <div className="grid grid-cols-2 gap-6">
            <ModernStatsCard
              title="Total Active Volume"
              value="$5,345,260"
              icon={<DollarSign />}
              size="large"
            />
            <ModernStatsCard
              title="Total Active Units"
              value="16"
              icon={<Users />}
              size="large"
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
                />
                <ModernStatsCard
                  title="Next Month Pending Volume"
                  value="$3,615,510"
                  icon={<CalendarDays />}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ModernStatsCard
                  title="Current Month Pending Units"
                  value="0"
                  icon={<Users />}
                />
                <ModernStatsCard
                  title="Next Month Pending Units"
                  value="12"
                  icon={<Users />}
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
            />
            <ModernStatsCard
              title="Closing This Week (Units)"
              value="0"
              icon={<TrendingUp />}
              size="large"
            />
          </div>

          {/* Extra Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <ModernStatsCard
              title="Average Processing Time"
              value="23 days"
              icon={<Clock />}
              size="compact"
            />
            <ModernStatsCard
              title="Average Time to Submission"
              value="5 days"
              icon={<Activity />}
              size="compact"
            />
            <ModernStatsCard
              title="Average Clear-to-Close Time"
              value="18 days"
              icon={<FileText />}
              size="compact"
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
            />
            <ModernStatsCard
              title="2025 YTD Units"
              value="39"
              icon={<Users />}
              size="large"
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
            />
            <ModernChartCard
              title="2025 Units Rank"
              data={rankingData}
              type="bar"
              dataKey="rank"
              height={200}
              color="hsl(var(--accent))"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}