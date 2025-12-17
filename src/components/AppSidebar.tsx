import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  FileText,
  CheckSquare,
  Settings,
  PieChart,
  Calendar,
  Phone,
  UserCheck,
  ClipboardList,
  Building,
  Bot,
  Search,
  Calculator,
  Mail,
  Zap,
  DollarSign,
  LogOut,
  LayoutDashboard,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { CollapsibleSidebarGroup } from "@/components/CollapsibleSidebarGroup";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { EmailFieldSuggestionsModal } from "@/components/modals/EmailFieldSuggestionsModal";
import { EmailAutomationQueueModal } from "@/components/modals/EmailAutomationQueueModal";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  id: string;
  type: 'lead' | 'agent' | 'lender';
  name: string;
  subtext?: string;
}

const dashboardItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Email", url: "/email", icon: Mail },
];

const pipelineItems = [
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pending App", url: "/pending-app", icon: FileText },
  { title: "Screening", url: "/screening", icon: ClipboardList },
  { title: "Pre-Qualified", url: "/pre-qualified", icon: UserCheck },
  { title: "Pre-Approved", url: "/pre-approved", icon: CheckSquare },
  { title: "Active", url: "/active", icon: Calendar },
  { title: "Past Clients", url: "/past-clients", icon: PieChart },
];

const contactItems = [
  { title: "Real Estate Agents", url: "/contacts/agents", icon: Phone },
  { title: "Master Contact List", url: "/contacts/borrowers", icon: Users },
  { title: "Approved Lenders", url: "/contacts/lenders", icon: Building },
];

const calculatorItems = [
  { title: "Loan Pricer", url: "/resources/loan-pricer", icon: DollarSign },
  { title: "Property Value", url: "/resources/property-value", icon: Home },
  { title: "Income Calculator", url: "/resources/income-calculator", icon: Calculator },
  { title: "Loan Estimate", url: "/resources/estimate", icon: Calculator },
];

const resourceItems = [
  { title: "Bolt Bot", url: "/resources/chatbot", icon: Bot },
  { title: "Email Marketing", url: "/resources/email-marketing", icon: Mail },
  { title: "Condo List", url: "/resources/condolist", icon: Search },
  { title: "Preapproval Letter", url: "/resources/preapproval", icon: FileText },
];

const adminItems = [
  { title: "Assistant", url: "/admin/assistant", icon: Bot },
  { title: "Mortgage App", url: "/admin/mortgage-app", icon: FileText },
  { title: "Settings", url: "/admin", icon: Settings },
  { title: "Deleted Items", url: "/admin/deleted-tasks", icon: CheckSquare },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, signOut } = useAuth();
  
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0);
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
  const [pendingEmailQueueCount, setPendingEmailQueueCount] = useState(0);
  const [emailQueueModalOpen, setEmailQueueModalOpen] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle search with debounce
  const handleSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const results: SearchResult[] = [];
      
      // Search leads (borrowers)
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);
      
      if (leads) {
        results.push(...leads.map(l => ({
          id: l.id,
          type: 'lead' as const,
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
          subtext: l.email || undefined,
        })));
      }
      
      // Search agents
      const { data: agents } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,brokerage.ilike.%${term}%`)
        .is('deleted_at', null)
        .limit(5);
      
      if (agents) {
        results.push(...agents.map(a => ({
          id: a.id,
          type: 'agent' as const,
          name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown',
          subtext: a.brokerage || undefined,
        })));
      }
      
      // Search lenders
      const { data: lenders } = await supabase
        .from('lenders')
        .select('id, lender_name, account_executive')
        .or(`lender_name.ilike.%${term}%,account_executive.ilike.%${term}%`)
        .limit(5);
      
      if (lenders) {
        results.push(...lenders.map(l => ({
          id: l.id,
          type: 'lender' as const,
          name: l.lender_name || 'Unknown',
          subtext: l.account_executive || undefined,
        })));
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, handleSearch]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search result click
  const handleResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchTerm("");
    
    switch (result.type) {
      case 'lead':
        // Navigate to pipeline and open lead - for now just go to dashboard with a query param
        navigate(`/dashboard?openLead=${result.id}`);
        break;
      case 'agent':
        navigate(`/contacts/agents?openAgent=${result.id}`);
        break;
      case 'lender':
        navigate(`/contacts/lenders?openLender=${result.id}`);
        break;
    }
  };

  // Fetch pending suggestion count
  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('email_field_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingSuggestionCount(count || 0);
    };

    fetchPendingCount();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('email_field_suggestions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_field_suggestions' },
        () => fetchPendingCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch pending email queue count
  useEffect(() => {
    const fetchEmailQueueCount = async () => {
      const { count } = await supabase
        .from('email_automation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingEmailQueueCount(count || 0);
    };

    fetchEmailQueueCount();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('email_automation_queue_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_automation_queue' },
        () => fetchEmailQueueCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = ({ isActive: isActiveLink }: { isActive: boolean }) =>
    isActiveLink 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  return (
    <>
      <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className={cn(
            "flex items-center",
            collapsed ? "justify-center py-3" : "justify-start gap-3 p-3"
          )}>
            <button
              onClick={toggleSidebar}
              className={cn(
                "rounded bg-primary flex items-center justify-center transition-all cursor-pointer hover:bg-primary/90",
                collapsed ? "h-6 w-6" : "h-10 w-10"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Zap className={cn(
                "text-primary-foreground transition-all",
                collapsed ? "h-4 w-4" : "h-6 w-6"
              )} />
            </button>
            {!collapsed && (
              <div className="flex items-baseline">
                <span className="text-xl font-light tracking-tight text-sidebar-foreground">BOLT</span>
                <span className="text-xl font-bold text-sidebar-foreground">CRM</span>
              </div>
            )}
          </div>
          
          {/* Search Bar with Results Dropdown */}
          {!collapsed && (
            <div className="px-3 pb-3" ref={searchContainerRef}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                <Input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.length >= 2 && setShowSearchResults(true)}
                  className="pl-8 h-8 text-sm bg-sidebar-accent/30 border-sidebar-border"
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[300px] overflow-hidden">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-3 px-3 text-sm text-muted-foreground text-center">
                        No results found
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[280px]">
                        <div className="py-1">
                          {searchResults.map((result) => (
                            <button
                              key={`${result.type}-${result.id}`}
                              onClick={() => handleResultClick(result)}
                              className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 transition-colors"
                            >
                              <div className="flex-shrink-0">
                                {result.type === 'lead' && <User className="h-4 w-4 text-blue-500" />}
                                {result.type === 'agent' && <Phone className="h-4 w-4 text-green-500" />}
                                {result.type === 'lender' && <Building className="h-4 w-4 text-purple-500" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{result.name}</p>
                                {result.subtext && (
                                  <p className="text-xs text-muted-foreground truncate">{result.subtext}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {result.type}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="gap-0">
          {/* Dashboard */}
          <SidebarGroup className="mb-4">
            <SidebarMenu>
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.title === "Dashboard" ? (
                      <NavLink to={item.url} className={getNavClassName}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {pendingEmailQueueCount > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="h-5 min-w-5 px-1.5 text-xs cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEmailQueueModalOpen(true);
                                }}
                              >
                                {pendingEmailQueueCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    ) : (
                      <NavLink to={item.url} className={getNavClassName}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* Pipeline */}
          <CollapsibleSidebarGroup title="Pipeline" className="mb-4" defaultOpen={false}>
            <SidebarMenu>
              {pipelineItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.title === "Active" ? (
                      <NavLink to={item.url} className={getNavClassName}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {pendingSuggestionCount > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="h-5 min-w-5 px-1.5 text-xs cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSuggestionsModalOpen(true);
                                }}
                              >
                                {pendingSuggestionCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    ) : (
                      <NavLink to={item.url} className={getNavClassName}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSidebarGroup>

          {/* Contacts */}
          <CollapsibleSidebarGroup title="Contacts" className="mb-4" defaultOpen={false}>
            <SidebarMenu>
              {contactItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSidebarGroup>

          {/* Resources */}
          <CollapsibleSidebarGroup title="Resources" className="mb-4" defaultOpen={false}>
            <SidebarMenu>
              {resourceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSidebarGroup>

          {/* Calculators */}
          <CollapsibleSidebarGroup title="Calculators" className="mb-4" defaultOpen={false}>
            <SidebarMenu>
              {calculatorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSidebarGroup>

          {/* Admin */}
          <CollapsibleSidebarGroup title="Admin" defaultOpen={false}>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleSidebarGroup>
        </SidebarContent>

        {/* User Footer */}
        <SidebarFooter className="border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-muted-foreground">Signed in as</span>
                <span className="text-sm text-sidebar-foreground truncate">{user?.email}</span>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signOut}
              className="p-1.5 rounded hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground mx-auto"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </SidebarFooter>

      </Sidebar>

      <EmailFieldSuggestionsModal
        open={suggestionsModalOpen}
        onOpenChange={setSuggestionsModalOpen}
      />

      <EmailAutomationQueueModal
        open={emailQueueModalOpen}
        onOpenChange={setEmailQueueModalOpen}
      />
    </>
  );
}
