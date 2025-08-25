import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, CalendarDays, BarChart3, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

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

// Mock recent leads and apps
const yesterdayLeads = [
  { name: "Sarah Johnson", amount: "$450,000", source: "Website" },
  { name: "Mike Chen", amount: "$380,000", source: "Referral" },
  { name: "Lisa Rodriguez", amount: "$520,000", source: "Social Media" },
];

const yesterdayApps = [
  { name: "Robert Kim", amount: "$320,000", status: "Submitted" },
  { name: "Jennifer Martinez", amount: "$425,000", status: "Processing" },
];

const thisMonthLeads = [
  { name: "Amanda Wilson", amount: "$475,000", source: "Website" },
  { name: "David Park", amount: "$395,000", source: "Referral" },
  { name: "Maria Garcia", amount: "$510,000", source: "Email" },
  { name: "James Thompson", amount: "$445,000", source: "Social Media" },
  { name: "Emily Davis", amount: "$385,000", source: "Website" },
];

const thisMonthApps = [
  { name: "John Anderson", amount: "$415,000", status: "Approved" },
  { name: "Susan Miller", amount: "$365,000", status: "Processing" },
  { name: "Tom Wilson", amount: "$485,000", status: "Submitted" },
];

const StatCard = ({ title, value, icon: Icon, trend, trendValue }: {
  title: string;
  value: string;
  icon: any;
  trend?: 'up' | 'down';
  trendValue?: string;
}) => (
  <Card className="bg-gradient-card shadow-soft">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {trend && trendValue && (
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-success mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive mr-1" />
              )}
              {trendValue} from last month
            </p>
          )}
        </div>
        <Icon className="h-8 w-8 text-primary" />
      </div>
    </CardContent>
  </Card>
);

const DataList = ({ title, data, type }: {
  title: string;
  data: any[];
  type: 'leads' | 'apps';
}) => (
  <Card className="bg-gradient-card shadow-soft">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <div>
              <div className="font-medium text-foreground">{item.name}</div>
              <div className="text-sm text-muted-foreground">
                {type === 'leads' ? item.source : item.status}
              </div>
            </div>
            <div className="font-semibold text-primary">{item.amount}</div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default function DashboardTabs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive mortgage business analytics</p>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales Dashboard</TabsTrigger>
          <TabsTrigger value="active">Active Dashboard</TabsTrigger>
          <TabsTrigger value="closed">Closed Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="This Month's Leads"
              value="47"
              icon={Users}
              trend="up"
              trendValue="+12%"
            />
            <StatCard
              title="Yesterday's Leads"
              value="3"
              icon={TrendingUp}
            />
            <StatCard
              title="This Month's Apps"
              value="23"
              icon={BarChart3}
              trend="up"
              trendValue="+8%"
            />
            <StatCard
              title="Yesterday's Apps"
              value="2"
              icon={CalendarDays}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <DataList title="Yesterday's Leads" data={yesterdayLeads} type="leads" />
            <DataList title="Yesterday's Apps" data={yesterdayApps} type="apps" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <DataList title="This Month's Leads" data={thisMonthLeads} type="leads" />
            <DataList title="This Month's Apps" data={thisMonthApps} type="apps" />
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Active Loans"
              value="$28.5M"
              icon={DollarSign}
            />
            <StatCard
              title="Active Units"
              value="142"
              icon={Users}
            />
            <StatCard
              title="Current Month Pending"
              value="$12.3M"
              icon={TrendingUp}
            />
            <StatCard
              title="Next Month Pending"
              value="$8.7M"
              icon={CalendarDays}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <StatCard
              title="Current Month Units"
              value="65"
              icon={BarChart3}
            />
            <StatCard
              title="Next Month Units"
              value="48"
              icon={Users}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <StatCard
              title="Closing This Week ($)"
              value="$4.2M"
              icon={DollarSign}
            />
            <StatCard
              title="Closing This Week (Units)"
              value="18"
              icon={TrendingUp}
            />
          </div>
        </TabsContent>

        <TabsContent value="closed" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <StatCard
              title="2025 YTD Volume"
              value="$42.8M"
              icon={DollarSign}
              trend="up"
              trendValue="+23%"
            />
            <StatCard
              title="2025 YTD Units"
              value="218"
              icon={Users}
              trend="up"
              trendValue="+18%"
            />
            <StatCard
              title="Average Loan Amount"
              value="$385,000"
              icon={BarChart3}
              trend="up"
              trendValue="+5%"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-gradient-card shadow-soft">
              <CardHeader>
                <CardTitle>2025 Dollar Volume by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-soft">
              <CardHeader>
                <CardTitle>2025 Units by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="units" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Monthly Volume Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rankingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis 
                    domain={[1, 15]} 
                    reversed 
                    className="text-muted-foreground"
                    label={{ value: 'Rank (Lower is Better)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rank" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--success))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}