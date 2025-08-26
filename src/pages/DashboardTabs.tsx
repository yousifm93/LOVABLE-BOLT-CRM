import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown, Target, Activity, Clock, FileText } from "lucide-react";
import { ModernStatsCard } from "@/components/ui/modern-stats-card";
import { CompactDataList } from "@/components/ui/compact-data-list";
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
  { name: "Sarah Johnson", amount: "$450,000", source: "Website", date: "Today" },
  { name: "Mike Chen", amount: "$380,000", source: "Referral", date: "Today" },
  { name: "Lisa Rodriguez", amount: "$520,000", source: "Social Media", date: "Today" },
];

const yesterdayApps = [
  { name: "Robert Kim", amount: "$320,000", status: "Submitted", date: "Today" },
  { name: "Jennifer Martinez", amount: "$425,000", status: "Processing", date: "Today" },
];

const thisMonthLeads = [
  { name: "Amanda Wilson", amount: "$475,000", source: "Website", stage: "Qualified" },
  { name: "David Park", amount: "$395,000", source: "Referral", stage: "Follow-up" },
  { name: "Maria Garcia", amount: "$510,000", source: "Email", stage: "Interested" },
  { name: "James Thompson", amount: "$445,000", source: "Social Media", stage: "Qualified" },
  { name: "Emily Davis", amount: "$385,000", source: "Website", stage: "New" },
  { name: "Chris Rodriguez", amount: "$525,000", source: "Referral", stage: "Hot Lead" },
  { name: "Sophie Chen", amount: "$415,000", source: "Website", stage: "Qualified" },
  { name: "Michael Torres", amount: "$465,000", source: "Social Media", stage: "Follow-up" },
  { name: "Rachel Kim", amount: "$395,000", source: "Email", stage: "Interested" },
  { name: "Daniel Lopez", amount: "$485,000", source: "Referral", stage: "Hot Lead" },
];

const thisMonthApps = [
  { name: "John Anderson", amount: "$415,000", status: "Approved", stage: "Closing" },
  { name: "Susan Miller", amount: "$365,000", status: "Processing", stage: "Underwriting" },
  { name: "Tom Wilson", amount: "$485,000", status: "Submitted", stage: "Review" },
  { name: "Lisa Park", amount: "$445,000", status: "Approved", stage: "Closing" },
  { name: "Mark Thompson", amount: "$385,000", status: "Processing", stage: "Underwriting" },
  { name: "Jennifer Davis", amount: "$525,000", status: "Submitted", stage: "Review" },
  { name: "Alex Rodriguez", amount: "$415,000", status: "Approved", stage: "Docs" },
  { name: "Sarah Wilson", amount: "$465,000", status: "Processing", stage: "Underwriting" },
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

        <TabsContent value="sales" className="space-y-4">
          {/* Top 4 Compact Widgets */}
          <div className="grid grid-cols-4 gap-4">
            <ModernStatsCard
              title="This Month's Leads"
              value="47"
              icon={<Target />}
              progress={47} // 47 of 100 goal
              size="compact"
            />
            <ModernStatsCard
              title="Yesterday's Leads"
              value="3"
              icon={<TrendingUp />}
              sparklineData={leadSparklineData}
              size="compact"
            />
            <ModernStatsCard
              title="This Month's Apps"
              value="23"
              icon={<FileText />}
              progress={77} // 23 of 30 goal
              size="compact"
            />
            <ModernStatsCard
              title="Yesterday's Apps"
              value="2"
              icon={<Activity />}
              sparklineData={appSparklineData}
              size="compact"
            />
          </div>

          {/* Lists Section */}
          <div className="grid grid-cols-2 gap-4">
            <CompactDataList 
              title="Yesterday's Leads" 
              data={yesterdayLeads} 
              type="leads"
              maxRows={5}
            />
            <CompactDataList 
              title="Yesterday's Apps" 
              data={yesterdayApps} 
              type="apps"
              maxRows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CompactDataList 
              title="This Month's Leads" 
              data={thisMonthLeads} 
              type="leads"
              maxRows={10}
            />
            <CompactDataList 
              title="This Month's Apps" 
              data={thisMonthApps} 
              type="apps"
              maxRows={10}
            />
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {/* Even Grid of Cards - Monday.com Style */}
          <div className="grid grid-cols-3 gap-4">
            <ModernStatsCard
              title="Total Active Loans"
              value="$28.5M"
              icon={<DollarSign />}
            />
            <ModernStatsCard
              title="Active Units"
              value="142"
              icon={<Users />}
            />
            <ModernStatsCard
              title="Current Month Pending"
              value="$12.3M / 65"
              icon={<CalendarDays />}
            />
            <ModernStatsCard
              title="Next Month Pending"
              value="$8.7M / 48"
              icon={<Clock />}
            />
            <ModernStatsCard
              title="Closing This Week"
              value="$4.2M / 18"
              icon={<TrendingUp />}
            />
            <ModernStatsCard
              title="Avg Processing Time"
              value="23 days"
              icon={<Activity />}
            />
          </div>
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          {/* YTD Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <ModernStatsCard
              title="2025 YTD Volume"
              value="$42.8M"
              icon={<DollarSign />}
            />
            <ModernStatsCard
              title="2025 YTD Units"
              value="218"
              icon={<Users />}
            />
            <ModernStatsCard
              title="Average Loan Amount"
              value="$385,000"
              icon={<BarChart3 />}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-2 gap-4">
            <ModernChartCard
              title="2025 Volume by Month"
              data={monthlyVolumeData}
              type="bar"
              dataKey="volume"
              height={200}
              color="hsl(var(--primary))"
            />
            <ModernChartCard
              title="2025 Units by Month"
              data={monthlyVolumeData}
              type="bar"
              dataKey="units"
              height={200}
              color="hsl(var(--primary))"
            />
          </div>

          {/* Prior Year Comparisons */}
          <div className="grid grid-cols-2 gap-4">
            <ModernChartCard
              title="2024 Volume Rank"
              data={rankingData}
              type="bar"
              dataKey="rank"
              height={180}
              color="hsl(var(--accent))"
            />
            <ModernChartCard
              title="2023 Units Rank"
              data={rankingData}
              type="line"
              dataKey="rank"
              height={180}
              color="hsl(var(--success))"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}