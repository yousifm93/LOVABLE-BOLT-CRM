import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  CheckSquare, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Phone, 
  DollarSign, 
  Bot,
  Search,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

interface QuickAccessCard {
  title: string;
  icon: React.ElementType;
  url: string;
  count?: number;
  color: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { crmUser } = useAuth();
  const [taskCount, setTaskCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [unreadEmailCount, setUnreadEmailCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCounts = async () => {
      // Fetch open tasks count
      const { count: tasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Done')
        .is('deleted_at', null);
      setTaskCount(tasks || 0);

      // Fetch active files count
      const { count: active } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_stage_id', '76eb2e82-e1d9-4f2d-a57d-2120a25696db');
      setActiveCount(active || 0);

      // Fetch leads count (in Leads stage)
      const { count: leads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_stage_id', '9a5c4b51-9be3-4e5c-b6b4-ade0e2f2e4d0');
      setLeadsCount(leads || 0);

      // Fetch total agents count
      const { count: agents } = await supabase
        .from('buyer_agents')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      setAgentCount(agents || 0);

      // Fetch unread emails count (inbound emails not opened)
      const { count: unread } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'In')
        .is('opened_at', null);
      setUnreadEmailCount(unread || 0);

      // Fetch applications this month (leads in Pending App stage created this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: apps } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_stage_id', 'f47d9e82-6dc8-4b3a-8f1a-9c2b4e6d8a1c') // Pending App stage
        .gte('created_at', startOfMonth.toISOString());
      setApplicationsCount(apps || 0);
    };

    fetchCounts();
  }, []);

  const quickAccessCards: QuickAccessCard[] = [
    { title: "Inbox", icon: Mail, url: "/email", count: unreadEmailCount, color: "bg-blue-500/10 text-blue-600" },
    { title: "Tasks", icon: CheckSquare, url: "/tasks", count: taskCount, color: "bg-green-500/10 text-green-600" },
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard", color: "bg-purple-500/10 text-purple-600" },
    { title: "Active Files", icon: Calendar, url: "/active", count: activeCount, color: "bg-orange-500/10 text-orange-600" },
    { title: "Leads", icon: Users, url: "/leads", count: leadsCount, color: "bg-pink-500/10 text-pink-600" },
    { title: "Real Estate Agents", icon: Phone, url: "/contacts/agents", count: agentCount, color: "bg-teal-500/10 text-teal-600" },
    { title: "Loan Pricer", icon: DollarSign, url: "/resources/loan-pricer", color: "bg-amber-500/10 text-amber-600" },
    { title: "Bolt Bot", icon: Bot, url: "/resources/chatbot", color: "bg-indigo-500/10 text-indigo-600" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to leads with search query
      navigate(`/leads?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const firstName = crmUser?.first_name || "there";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-light text-foreground">
            {getGreeting()}, <span className="font-semibold">{firstName}</span>
          </h1>
          <p className="text-muted-foreground">
            Quickly access your recent boards, inbox, and workspaces.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search leads, contacts, or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base bg-card border-border"
          />
        </form>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickAccessCards.map((card) => (
            <Card 
              key={card.title}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
              onClick={() => navigate(card.url)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4">
                  <h3 className="font-medium text-foreground">{card.title}</h3>
                  {card.count !== undefined && (
                    <p className="text-2xl font-semibold text-foreground mt-1">{card.count}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Tasks Due Today</p>
              <p className="text-2xl font-semibold text-foreground">{taskCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Applications This Month</p>
              <p className="text-2xl font-semibold text-foreground">{applicationsCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">New Leads This Week</p>
              <p className="text-2xl font-semibold text-foreground">{leadsCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
