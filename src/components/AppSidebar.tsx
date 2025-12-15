import { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { CollapsibleSidebarGroup } from "@/components/CollapsibleSidebarGroup";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { EmailFieldSuggestionsModal } from "@/components/modals/EmailFieldSuggestionsModal";
import { EmailAutomationQueueModal } from "@/components/modals/EmailAutomationQueueModal";
import { useAuth } from "@/hooks/useAuth";

const dashboardItems = [
  { title: "Overview", url: "/", icon: Home },
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
  { title: "Settings 2", url: "/admin/settings2", icon: Settings },
  { title: "Deleted Items", url: "/admin/deleted-tasks", icon: CheckSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, signOut } = useAuth();
  
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0);
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
  const [pendingEmailQueueCount, setPendingEmailQueueCount] = useState(0);
  const [emailQueueModalOpen, setEmailQueueModalOpen] = useState(false);

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
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded bg-primary flex items-center justify-center transition-all",
                collapsed ? "h-8 w-8" : "h-10 w-10"
              )}>
                <Zap className={cn(
                  "text-primary-foreground transition-all",
                  collapsed ? "h-4 w-4" : "h-6 w-6"
                )} />
              </div>
              {!collapsed && (
                <div className="flex items-baseline">
                  <span className="text-xl font-light tracking-tight text-sidebar-foreground">BOLT</span>
                  <span className="text-xl font-bold text-sidebar-foreground">CRM</span>
                </div>
              )}
            </div>
            {!collapsed && <SidebarTrigger className="h-8 w-8" />}
          </div>
          
          {/* Search Bar */}
          {!collapsed && (
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 text-sm bg-sidebar-accent/30 border-sidebar-border"
                />
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
                    {item.title === "Overview" ? (
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
          <CollapsibleSidebarGroup title="Pipeline" className="mb-4">
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
          <CollapsibleSidebarGroup title="Contacts" className="mb-4">
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
          <CollapsibleSidebarGroup title="Resources" className="mb-4">
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
          <CollapsibleSidebarGroup title="Calculators" className="mb-4">
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
          <CollapsibleSidebarGroup title="Admin">
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
