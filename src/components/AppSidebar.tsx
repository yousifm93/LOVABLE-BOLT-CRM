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
  Lock,
  MessageSquare,
  Archive,
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
import { usePermissions, UserPermissions } from "@/hooks/usePermissions";

interface SearchResult {
  id: string;
  type: 'lead' | 'agent' | 'lender';
  name: string;
  subtext?: string;
  pipelineStageId?: string;
}

// Map pipeline_stage_id to route path
const getPipelineRoute = (pipelineStageId: string | undefined): string => {
  const routeMap: Record<string, string> = {
    '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': '/pending-app',
    'a4e162e0-5421-4d17-8ad5-4b1195bbc995': '/screening',
    '09162eec-d2b2-48e5-86d0-9e66ee8b2af7': '/pre-qualified',
    '3cbf38ff-752e-4163-a9a3-1757499b4945': '/pre-approved',
    '76eb2e82-e1d9-4f2d-a57d-2120a25696db': '/active',
    'e9fc7eb8-6519-4768-b49e-3ebdd3738ac0': '/past-clients',
    '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a': '/idle',
  };
  return routeMap[pipelineStageId || ''] || '/leads';
};

// Dashboard items with permission keys
const dashboardItems = [
  { title: "Home", url: "/", icon: Home, permKey: 'home' as keyof UserPermissions },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permKey: 'dashboard' as keyof UserPermissions },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, permKey: 'tasks' as keyof UserPermissions },
  { title: "Email", url: "/email", icon: Mail, permKey: 'email' as keyof UserPermissions },
];

const pipelineItems = [
  { title: "Leads", url: "/leads", icon: Users, permKey: 'pipeline_leads' as keyof UserPermissions },
  { title: "Pending App", url: "/pending-app", icon: FileText, permKey: 'pipeline_pending_app' as keyof UserPermissions },
  { title: "Screening", url: "/screening", icon: ClipboardList, permKey: 'pipeline_screening' as keyof UserPermissions },
  { title: "Pre-Qualified", url: "/pre-qualified", icon: UserCheck, permKey: 'pipeline_pre_qualified' as keyof UserPermissions },
  { title: "Pre-Approved", url: "/pre-approved", icon: CheckSquare, permKey: 'pipeline_pre_approved' as keyof UserPermissions },
  { title: "Active", url: "/active", icon: Calendar, permKey: 'pipeline_active' as keyof UserPermissions },
  { title: "Past Clients", url: "/past-clients", icon: PieChart, permKey: 'pipeline_past_clients' as keyof UserPermissions },
  { title: "Idle", url: "/idle", icon: Archive, permKey: 'pipeline_idle' as keyof UserPermissions },
];

const contactItems = [
  { title: "Real Estate Agents", url: "/contacts/agents", icon: Phone, permKey: 'contacts_agents' as keyof UserPermissions },
  { title: "Master Contact List", url: "/contacts/borrowers", icon: Users, permKey: 'contacts_borrowers' as keyof UserPermissions },
  { title: "Approved Lenders", url: "/contacts/lenders", icon: Building, permKey: 'contacts_lenders' as keyof UserPermissions },
];

const calculatorItems = [
  { title: "Loan Pricer", url: "/resources/loan-pricer", icon: DollarSign, permKey: 'calculators_loan_pricer' as keyof UserPermissions },
  { title: "Property Value", url: "/resources/property-value", icon: Home, permKey: 'calculators_property_value' as keyof UserPermissions },
  { title: "Income Calculator", url: "/resources/income-calculator", icon: Calculator, permKey: 'calculators_income' as keyof UserPermissions },
  { title: "Loan Estimate", url: "/resources/estimate", icon: Calculator, permKey: 'calculators_estimate' as keyof UserPermissions },
];

const resourceItems = [
  { title: "Bolt Bot", url: "/resources/chatbot", icon: Bot, permKey: 'resources_bolt_bot' as keyof UserPermissions },
  { title: "Email Marketing", url: "/resources/email-marketing", icon: Mail, permKey: 'resources_email_marketing' as keyof UserPermissions },
  { title: "Condo List", url: "/resources/condolist", icon: Search, permKey: 'resources_condolist' as keyof UserPermissions },
  { title: "Preapproval Letter", url: "/resources/preapproval", icon: FileText, permKey: 'resources_preapproval' as keyof UserPermissions },
];

const adminItems = [
  { title: "Assistant", url: "/admin/assistant", icon: Bot, permKey: 'admin_assistant' as keyof UserPermissions },
  { title: "Mortgage App", url: "/admin/mortgage-app", icon: FileText, permKey: 'admin_mortgage_app' as keyof UserPermissions },
  { title: "Settings", url: "/admin", icon: Settings, permKey: 'admin_settings' as keyof UserPermissions },
  { title: "Deleted Items", url: "/admin/deleted-tasks", icon: CheckSquare, permKey: 'admin_deleted_items' as keyof UserPermissions },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, signOut } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
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
      
      // Search leads (borrowers) - include pipeline_stage_id for routing
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, pipeline_stage_id')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);
      
      if (leads) {
        results.push(...leads.map(l => ({
          id: l.id,
          type: 'lead' as const,
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
          subtext: l.email || undefined,
          pipelineStageId: l.pipeline_stage_id,
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
        // Navigate to the correct pipeline page based on pipeline_stage_id
        const route = getPipelineRoute(result.pipelineStageId);
        navigate(`${route}?openLead=${result.id}`);
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

  const getLockedNavClassName = () =>
    "opacity-50 cursor-not-allowed hover:bg-transparent";

  // Helper to filter items based on permissions
  const filterItemsByPermission = <T extends { permKey: keyof UserPermissions }>(items: T[]): T[] => {
    return items.filter(item => hasPermission(item.permKey) !== 'hidden');
  };

  // Helper to check if an item is locked
  const isItemLocked = (permKey: keyof UserPermissions): boolean => {
    return hasPermission(permKey) === 'locked';
  };

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
          {/* Dashboard Items */}
          <SidebarGroup className="mb-4">
            <SidebarMenu>
              {filterItemsByPermission(dashboardItems).map((item) => {
                const isLocked = isItemLocked(item.permKey);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild={!isLocked} disabled={isLocked}>
                      {isLocked ? (
                        <div className={cn("flex items-center", getLockedNavClassName())}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && (
                            <span className="flex items-center gap-2">
                              {item.title}
                              <Lock className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      ) : item.title === "Dashboard" ? (
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
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* Pipeline */}
          {hasPermission('pipeline') !== 'hidden' && (
            <CollapsibleSidebarGroup 
              title="Pipeline" 
              className="mb-4" 
              defaultOpen={false}
              locked={hasPermission('pipeline') === 'locked'}
            >
              <SidebarMenu>
                {filterItemsByPermission(pipelineItems).map((item) => {
                  const isLocked = isItemLocked(item.permKey);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild={!isLocked} disabled={isLocked}>
                        {isLocked ? (
                          <div className={cn("flex items-center", getLockedNavClassName())}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <span className="flex items-center gap-2">
                                {item.title}
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        ) : item.title === "Active" ? (
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
                  );
                })}
              </SidebarMenu>
            </CollapsibleSidebarGroup>
          )}

          {/* Contacts */}
          {hasPermission('contacts') !== 'hidden' && (
            <CollapsibleSidebarGroup 
              title="Contacts" 
              className="mb-4" 
              defaultOpen={false}
              locked={hasPermission('contacts') === 'locked'}
            >
              <SidebarMenu>
                {filterItemsByPermission(contactItems).map((item) => {
                  const isLocked = isItemLocked(item.permKey);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild={!isLocked} disabled={isLocked}>
                        {isLocked ? (
                          <div className={cn("flex items-center", getLockedNavClassName())}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <span className="flex items-center gap-2">
                                {item.title}
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <NavLink to={item.url} className={getNavClassName}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleSidebarGroup>
          )}

          {/* Resources */}
          {hasPermission('resources') !== 'hidden' && (
            <CollapsibleSidebarGroup 
              title="Resources" 
              className="mb-4" 
              defaultOpen={false}
              locked={hasPermission('resources') === 'locked'}
            >
              <SidebarMenu>
                {filterItemsByPermission(resourceItems).map((item) => {
                  const isLocked = isItemLocked(item.permKey);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild={!isLocked} disabled={isLocked}>
                        {isLocked ? (
                          <div className={cn("flex items-center", getLockedNavClassName())}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <span className="flex items-center gap-2">
                                {item.title}
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <NavLink to={item.url} className={getNavClassName}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleSidebarGroup>
          )}

          {/* Calculators */}
          {hasPermission('calculators') !== 'hidden' && (
            <CollapsibleSidebarGroup 
              title="Calculators" 
              className="mb-4" 
              defaultOpen={false}
              locked={hasPermission('calculators') === 'locked'}
            >
              <SidebarMenu>
                {filterItemsByPermission(calculatorItems).map((item) => {
                  const isLocked = isItemLocked(item.permKey);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild={!isLocked} disabled={isLocked}>
                        {isLocked ? (
                          <div className={cn("flex items-center", getLockedNavClassName())}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <span className="flex items-center gap-2">
                                {item.title}
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <NavLink to={item.url} className={getNavClassName}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleSidebarGroup>
          )}

          {/* Admin */}
          {hasPermission('admin') !== 'hidden' && (
            <CollapsibleSidebarGroup 
              title="Admin" 
              defaultOpen={false}
              locked={hasPermission('admin') === 'locked'}
            >
              <SidebarMenu>
                {filterItemsByPermission(adminItems).map((item) => {
                  const isLocked = isItemLocked(item.permKey);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild={!isLocked} disabled={isLocked}>
                        {isLocked ? (
                          <div className={cn("flex items-center", getLockedNavClassName())}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && (
                              <span className="flex items-center gap-2">
                                {item.title}
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <NavLink to={item.url} className={getNavClassName}>
                            <item.icon className="mr-2 h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleSidebarGroup>
          )}

          {/* Feedback */}
          <CollapsibleSidebarGroup 
            title="Feedback" 
            defaultOpen={false}
          >
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/feedback" className={getNavClassName}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Submit Feedback</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasPermission('admin') !== 'hidden' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/feedback-review" className={getNavClassName}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Review Feedback</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
