import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown, Target, Activity, Clock, FileText, Phone, Mail, Calendar, CheckCircle } from "lucide-react";
import { ModernStatsCard } from "@/components/ui/modern-stats-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ModernChartCard } from "@/components/ui/modern-chart-card";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { ActivityMonitor } from "@/components/dashboard/ActivityMonitor";
import { ConversionAnalytics } from "@/components/dashboard/ConversionAnalytics";

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

// Mock all leads and applications
const allLeads = [
  { name: "Sarah Johnson", phone: "(555) 123-4567", email: "sarah@email.com", date: "2025-01-15" },
  { name: "Mike Chen", phone: "(555) 234-5678", email: "mike@email.com", date: "2025-01-15" },
  { name: "Lisa Rodriguez", phone: "(555) 345-6789", email: "lisa@email.com", date: "2025-01-15" },
  { name: "Amanda Wilson", phone: "(555) 111-2222", email: "amanda@email.com", date: "2025-01-10" },
  { name: "David Park", phone: "(555) 222-3333", email: "david@email.com", date: "2025-01-12" },
  { name: "Maria Garcia", phone: "(555) 333-4444", email: "maria@email.com", date: "2025-01-08" },
  { name: "James Thompson", phone: "(555) 444-5555", email: "james@email.com", date: "2025-01-14" },
  { name: "Emily Davis", phone: "(555) 555-6666", email: "emily@email.com", date: "2025-01-11" },
  { name: "Chris Rodriguez", phone: "(555) 666-7777", email: "chris@email.com", date: "2025-01-09" },
  { name: "Sophie Chen", phone: "(555) 777-8888", email: "sophie@email.com", date: "2025-01-13" },
  { name: "Michael Torres", phone: "(555) 888-9999", email: "michael@email.com", date: "2025-01-07" },
  { name: "Jennifer Wang", phone: "(555) 999-0000", email: "jennifer@email.com", date: "2025-01-05" },
  { name: "Robert Brown", phone: "(555) 000-1111", email: "robert@email.com", date: "2025-01-03" },
  { name: "Ashley Martinez", phone: "(555) 111-2222", email: "ashley@email.com", date: "2025-01-01" },
  { name: "Kevin Lee", phone: "(555) 222-3333", email: "kevin@email.com", date: "2024-12-28" },
  { name: "Nicole Taylor", phone: "(555) 333-4444", email: "nicole@email.com", date: "2024-12-25" },
];

const allApplications = [
  { name: "Robert Kim", appliedOn: "2025-01-15" },
  { name: "Jennifer Martinez", appliedOn: "2025-01-15" },
  { name: "John Anderson", appliedOn: "2025-01-10" },
  { name: "Susan Miller", appliedOn: "2025-01-12" },
  { name: "Tom Wilson", appliedOn: "2025-01-08" },
  { name: "Lisa Park", appliedOn: "2025-01-14" },
  { name: "Mark Thompson", appliedOn: "2025-01-11" },
  { name: "Jennifer Davis", appliedOn: "2025-01-09" },
  { name: "Carlos Rodriguez", appliedOn: "2025-01-06" },
  { name: "Diana Chen", appliedOn: "2025-01-04" },
  { name: "Frank Johnson", appliedOn: "2025-01-02" },
  { name: "Grace Wilson", appliedOn: "2024-12-30" },
  { name: "Henry Kim", appliedOn: "2024-12-27" },
  { name: "Isabella Garcia", appliedOn: "2024-12-24" },
];

// Sparkline data for mini charts
const leadSparklineData = [12, 15, 18, 14, 20, 17, 25];
const appSparklineData = [8, 12, 10, 15, 18, 16, 22];

// Recent clients data and status colors for dashboard section
const recentClients = [
  { name: "Sarah Johnson", status: "Pre-approval", amount: "$450,000", date: "2 hours ago" },
  { name: "Mike Thompson", status: "Underwriting", amount: "$320,000", date: "5 hours ago" },
  { name: "Emily Chen", status: "Closing", amount: "$580,000", date: "1 day ago" },
  { name: "David Wilson", status: "Application", amount: "$275,000", date: "2 days ago" },
];

const statusColors = {
  "Pre-approval": "bg-info text-info-foreground",
  "Underwriting": "bg-warning text-warning-foreground", 
  "Closing": "bg-success text-success-foreground",
  "Application": "bg-muted text-muted-foreground"
};


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
          {/* Top 4 Large Stats Cards with Progress */}
          <div className="grid grid-cols-4 gap-4">
            <ModernStatsCard
              title="This Month's Leads"
              value="67"
              icon={<Target />}
              size="large"
              progress={67}
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
              progress={73}
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
            {/* Left Side - All Leads */}
            <div className="space-y-4">
              <CollapsibleSection 
                title="All Leads" 
                count={allLeads.length}
                data={allLeads}
                renderItem={(lead, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-foreground hover:text-warning transition-colors">{lead.name}</p>
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

            {/* Right Side - All Applications */}
            <div className="space-y-4">
              <CollapsibleSection 
                title="All Applications" 
                count={allApplications.length}
                data={allApplications}
                renderItem={(app, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <p className="font-medium text-foreground hover:text-warning transition-colors">{app.name}</p>
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

      {/* Dashboard Overview Section */}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 mb-3">
        <StatsCard
          title="Total Clients"
          value="247"
          icon={<Users className="h-5 w-5" />}
          change="+12% from last month"
          changeType="positive"
        />
        <StatsCard
          title="Active Applications"
          value="43"
          icon={<FileText className="h-5 w-5" />}
          change="+5 this week"
          changeType="positive"
        />
        <StatsCard
          title="Monthly Volume"
          value="$12.4M"
          icon={<DollarSign className="h-5 w-5" />}
          change="+23% from last month"
          changeType="positive"
        />
        <StatsCard
          title="Conversion Rate"
          value="68%"
          icon={<TrendingUp className="h-5 w-5" />}
          change="+3% improvement"
          changeType="positive"
        />
      </div>

      {/* Three Dashboard Sections */}
      <div className="grid gap-2 lg:grid-cols-3 mb-3">
        {/* Closed/Pipeline Volume Dashboard */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Closed & Pipeline Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold text-success">$24.8M</div>
                  <div className="text-xs text-muted-foreground">Closed YTD</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-2xl font-bold text-info">$18.2M</div>
                  <div className="text-xs text-muted-foreground">Active Pipeline</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Units Closed: 42</span>
                  <span className="text-success">+15%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Loan Size: $590K</span>
                  <span className="text-info">+8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly Goal: $3.2M</span>
                  <span className="text-warning">78%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Pipeline Activity Dashboard */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Current Pipeline Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: "Leads", count: 18, volume: "$9.2M", color: "text-muted-foreground" },
                { stage: "Pending App", count: 12, volume: "$6.8M", color: "text-info" },
                { stage: "Screening", count: 8, volume: "$4.5M", color: "text-warning" },
                { stage: "Pre-Qualified", count: 6, volume: "$3.2M", color: "text-success" },
                { stage: "Pre-Approved", count: 4, volume: "$2.1M", color: "text-primary" },
                { stage: "Active", count: 3, volume: "$1.8M", color: "text-destructive" }
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-background/50">
                  <div>
                    <span className="text-sm font-medium">{item.stage}</span>
                    <div className={`text-xs ${item.color}`}>{item.volume}</div>
                  </div>
                  <div className={`text-sm font-bold ${item.color}`}>
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead/App Data Dashboard */}
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Lead & Application Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xl font-bold text-primary">47</div>
                  <div className="text-xs text-muted-foreground">New Leads</div>
                  <div className="text-xs text-success">+12 this week</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50">
                  <div className="text-xl font-bold text-info">23</div>
                  <div className="text-xs text-muted-foreground">Applications</div>
                  <div className="text-xs text-success">+5 this week</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Conversion Rate</span>
                  <span className="text-success font-medium">68%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Response Time</span>
                  <span className="text-info font-medium">1.2 hrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Lead Sources</span>
                  <span className="text-muted-foreground">8 active</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Follow-up Rate</span>
                  <span className="text-warning font-medium">92%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <div className="space-y-4">
              {recentClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.amount}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={statusColors[client.status as keyof typeof statusColors]}>
                      {client.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{client.date}</p>
                  </div>
                </div>
              ))}
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
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-sm font-medium">Lead</span>
                <span className="text-sm text-muted-foreground">18 clients</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-sm font-medium">Application</span>
                <span className="text-sm text-muted-foreground">12 clients</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-sm font-medium">Underwriting</span>
                <span className="text-sm text-muted-foreground">8 clients</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-sm font-medium">Closing</span>
                <span className="text-sm text-muted-foreground">5 clients</span>
              </div>
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