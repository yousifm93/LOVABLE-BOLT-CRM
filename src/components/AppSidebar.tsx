import { useState } from "react";
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
  Megaphone,
  BookOpen,
  Mail,
  Zap,
  DollarSign,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { CollapsibleSidebarGroup } from "@/components/CollapsibleSidebarGroup";

const dashboardItems = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
];

const pipelineItems = [
  { title: "New", url: "/leads", icon: Users },
  { title: "Pending App", url: "/pending-app", icon: FileText },
  { title: "Screening", url: "/screening", icon: ClipboardList },
  { title: "Pre-Qualified", url: "/pre-qualified", icon: UserCheck },
  { title: "Pre-Approved", url: "/pre-approved", icon: CheckSquare },
  { title: "Active", url: "/active", icon: Calendar },
  { title: "Past Clients", url: "/past-clients", icon: PieChart },
];

// Removed individual task items - consolidated into single "Tasks" item in dashboard

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
  { title: "Settings", url: "/admin", icon: Settings },
  { title: "Deleted Items", url: "/admin/deleted-tasks", icon: CheckSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

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
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 p-3">
          <div className="h-12 w-12 rounded bg-primary flex items-center justify-center">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex items-baseline">
              <span className="text-2xl font-light tracking-tight text-sidebar-foreground">BOLT</span>
              <span className="text-2xl font-bold text-sidebar-foreground">CRM</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Dashboard */}
        <SidebarGroup className="mb-4">
          <SidebarMenu>
            {dashboardItems.map((item) => (
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
        </SidebarGroup>

        {/* Removed Tasks collapsible group - Tasks is now in dashboard items */}

        {/* Pipeline */}
        <CollapsibleSidebarGroup title="Pipeline" className="mb-4">
          <SidebarMenu>
            {pipelineItems.map((item) => (
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
    </Sidebar>
  );
}