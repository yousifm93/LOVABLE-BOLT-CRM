import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  Building2, 
  Calendar, 
  FileText, 
  Phone, 
  DollarSign, 
  Bot,
  Search,
  ArrowRight,
  Calculator,
  User,
  Users,
  Landmark
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientDetailDrawer } from "@/components/ClientDetailDrawer";
import { AgentDetailDrawer } from "@/components/AgentDetailDrawer";
import { LenderDetailDrawer } from "@/components/LenderDetailDrawer";
import { MarketRatesCard } from "@/components/dashboard/MarketRatesCard";

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
  description?: string;
  color: string;
}

interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'agent' | 'lender';
  name: string;
  subtitle: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { crmUser } = useAuth();
  const [leadsThisMonth, setLeadsThisMonth] = useState(0);
  const [applicationsThisMonth, setApplicationsThisMonth] = useState(0);
  const [closedThisMonth, setClosedThisMonth] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [unreadEmailCount, setUnreadEmailCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Drawer states
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [selectedLender, setSelectedLender] = useState<any | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthISO = startOfMonth.toISOString();

      // Fetch leads created this month
      const { count: leads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonthISO);
      setLeadsThisMonth(leads || 0);

      // Fetch applications this month (Pending App stage)
      const { count: apps } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_stage_id', '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945')
        .gte('pending_app_at', startOfMonthISO);
      setApplicationsThisMonth(apps || 0);

      // Fetch closed this month (Past Clients with close_date this month)
      const { count: closed } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_stage_id', 'e9fc7eb8-6519-4768-b49e-3ebdd3738ac0')
        .gte('close_date', startOfMonthISO.split('T')[0]);
      setClosedThisMonth(closed || 0);

      // Fetch active files count for quick access card
      const { count: active } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('pipeline_stage_id', '76eb2e82-e1d9-4f2d-a57d-2120a25696db');
      setActiveCount(active || 0);

      // Fetch total agents count for quick access card
      const { count: agents } = await supabase
        .from('buyer_agents')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      setAgentCount(agents || 0);

      // Fetch unread emails count for quick access card
      const { count: unread } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'In')
        .is('opened_at', null);
      setUnreadEmailCount(unread || 0);
    };

    fetchCounts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const searchPattern = `%${query}%`;
      const results: SearchResult[] = [];

      // Search leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, pipeline_stage_id')
        .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
        .limit(5);

      if (leads) {
        leads.forEach(lead => {
          results.push({
            id: lead.id,
            type: 'lead',
            name: `${lead.first_name} ${lead.last_name}`,
            subtitle: lead.email || 'Lead'
          });
        });
      }

      // Search agents
      const { data: agents } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email')
        .is('deleted_at', null)
        .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},brokerage.ilike.${searchPattern}`)
        .limit(5);

      if (agents) {
        agents.forEach(agent => {
          results.push({
            id: agent.id,
            type: 'agent',
            name: `${agent.first_name} ${agent.last_name}`,
            subtitle: agent.brokerage || 'Real Estate Agent'
          });
        });
      }

      // Search lenders
      const { data: lenders } = await supabase
        .from('lenders')
        .select('id, lender_name, account_executive')
        .or(`lender_name.ilike.${searchPattern},account_executive.ilike.${searchPattern}`)
        .limit(5);

      if (lenders) {
        lenders.forEach(lender => {
          results.push({
            id: lender.id,
            type: 'lender',
            name: lender.lender_name,
            subtitle: lender.account_executive || 'Lender'
          });
        });
      }

      // Search contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, type')
        .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
        .limit(5);

      if (contacts) {
        contacts.forEach(contact => {
          results.push({
            id: contact.id,
            type: 'contact',
            name: `${contact.first_name} ${contact.last_name}`,
            subtitle: contact.type || 'Contact'
          });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleResultClick = async (result: SearchResult) => {
    setShowDropdown(false);
    setSearchQuery("");

    switch (result.type) {
      case 'lead':
        // Fetch full lead data
        const { data: lead } = await supabase.from('leads').select('*').eq('id', result.id).single();
        if (lead) setSelectedLead(lead);
        break;
      case 'agent':
        // Fetch full agent data
        const { data: agent } = await supabase.from('buyer_agents').select('*').eq('id', result.id).single();
        if (agent) setSelectedAgent(agent);
        break;
      case 'lender':
        // Fetch full lender data
        const { data: lender } = await supabase.from('lenders').select('*').eq('id', result.id).single();
        if (lender) setSelectedLender(lender);
        break;
      case 'contact':
        navigate(`/contacts/borrowers?id=${result.id}`);
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <User className="h-4 w-4 text-muted-foreground" />;
      case 'agent':
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case 'lender':
        return <Landmark className="h-4 w-4 text-muted-foreground" />;
      case 'contact':
        return <User className="h-4 w-4 text-muted-foreground" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResultLabel = (type: string) => {
    switch (type) {
      case 'lead':
        return 'Lead';
      case 'agent':
        return 'Agent';
      case 'lender':
        return 'Lender';
      case 'contact':
        return 'Contact';
      default:
        return '';
    }
  };

  const quickAccessCards: QuickAccessCard[] = [
    { title: "Inbox", icon: Mail, url: "/email", count: unreadEmailCount, color: "bg-blue-500/10 text-blue-600" },
    { title: "Real Estate Agents", icon: Phone, url: "/contacts/agents", count: agentCount, color: "bg-teal-500/10 text-teal-600" },
    { title: "Approved Lenders", icon: Building2, url: "/contacts/lenders", count: 34, color: "bg-purple-500/10 text-purple-600" },
    { title: "Active Files", icon: Calendar, url: "/active", count: activeCount, color: "bg-orange-500/10 text-orange-600" },
    { title: "Loan Estimate", icon: FileText, url: "/resources/loan-estimate", description: "Generate a loan estimate in seconds", color: "bg-pink-500/10 text-pink-600" },
    { title: "Income Calculator", icon: Calculator, url: "/resources/income-calculator", description: "Calculate income in seconds", color: "bg-teal-500/10 text-teal-600" },
    { title: "Loan Pricer", icon: DollarSign, url: "/resources/loan-pricer", description: "Price out any loan quickly", color: "bg-amber-500/10 text-amber-600" },
    { title: "Bolt Bot", icon: Bot, url: "/resources/chatbot", description: "Search all guides and scenarios", color: "bg-indigo-500/10 text-indigo-600" },
  ];

  const firstName = crmUser?.first_name || "there";

  // Group results by type
  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

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

        {/* Market Rates Section */}
        <MarketRatesCard />

        {/* Search Bar with Dropdown */}
        <div ref={searchRef} className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder="Search leads, contacts, agents, or lenders..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
            className="pl-12 h-12 text-base bg-card border-border"
          />

          {/* Search Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No results found
                </div>
              ) : (
                <div className="py-2">
                  {Object.entries(groupedResults).map(([type, results]) => (
                    <div key={type}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                        {type === 'lead' ? 'Leads' : type === 'agent' ? 'Real Estate Agents' : type === 'lender' ? 'Lenders' : 'Contacts'}
                      </div>
                      {results.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          {getResultIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{result.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {getResultLabel(result.type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
                  {card.description && (
                    <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
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
              <p className="text-sm text-muted-foreground">Leads This Month</p>
              <p className="text-2xl font-semibold text-foreground">{leadsThisMonth}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Applications This Month</p>
              <p className="text-2xl font-semibold text-foreground">{applicationsThisMonth}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Closed This Month</p>
              <p className="text-2xl font-semibold text-foreground">{closedThisMonth}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Drawers */}
      {selectedLead && (
        <ClientDetailDrawer
          client={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onStageChange={() => {}}
          pipelineType="leads"
          onLeadUpdated={() => {}}
        />
      )}

      <AgentDetailDrawer
        agent={selectedAgent}
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onAgentUpdated={() => {}}
      />

      <LenderDetailDrawer
        lender={selectedLender}
        isOpen={!!selectedLender}
        onClose={() => setSelectedLender(null)}
        onLenderUpdated={() => {}}
      />
    </div>
  );
}
