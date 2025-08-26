import { 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  Target,
  Calendar,
  PieChart,
  BarChart3
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function Dashboard() {
  return (
    <div className="pl-4 pr-0 pt-2 pb-0">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back! Here's your mortgage business overview.</p>
      </div>

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
      <div className="grid gap-2 md:grid-cols-2">
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
    </div>
  );
}