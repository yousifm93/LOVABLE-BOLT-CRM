import { 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your mortgage business overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 md:grid-cols-2">
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