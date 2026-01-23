import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Shield, Eye, EyeOff, Lock } from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  // Top-level sections
  home: string;
  dashboard: string;
  overview: string;
  tasks: string;
  email: string;
  pipeline: string;
  contacts: string;
  resources: string;
  calculators: string;
  admin: string;
  // Dashboard tabs
  dashboard_sales: string;
  dashboard_calls: string;
  dashboard_active: string;
  dashboard_closed: string;
  dashboard_miscellaneous: string;
  dashboard_all: string;
  // Pipeline sub-items
  pipeline_leads: string;
  pipeline_pending_app: string;
  pipeline_screening: string;
  pipeline_pre_qualified: string;
  pipeline_pre_approved: string;
  pipeline_active: string;
  pipeline_past_clients: string;
  pipeline_idle: string;
  // Contacts sub-items
  contacts_agents: string;
  contacts_borrowers: string;
  contacts_lenders: string;
  // Calculators sub-items
  calculators_loan_pricer: string;
  calculators_property_value: string;
  calculators_income: string;
  calculators_estimate: string;
  // Resources sub-items
  resources_bolt_bot: string;
  resources_email_marketing: string;
  resources_condolist: string;
  resources_preapproval: string;
  // Admin sub-items
  admin_assistant: string;
  admin_mortgage_app: string;
  admin_settings: string;
  admin_deleted_items: string;
  // Homepage card permissions
  home_inbox: string;
  home_calendar: string;
  home_agents: string;
  home_lenders: string;
  home_active_files: string;
  home_loan_estimate: string;
  home_income_calculator: string;
  home_loan_pricer: string;
  home_bolt_bot: string;
  // Lead details permissions
  lead_details_all_fields: string;
  lead_details_send_email: string;
}

const PERMISSION_OPTIONS = [
  { value: 'visible', label: 'Visible', icon: Eye, color: 'text-green-600' },
  { value: 'hidden', label: 'Hidden', icon: EyeOff, color: 'text-muted-foreground' },
  { value: 'locked', label: 'Locked', icon: Lock, color: 'text-orange-600' },
];

// Top-level sidebar sections
const DASHBOARD_SECTIONS = [
  { key: 'home', label: 'Home' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'email', label: 'Email' },
];

// Dashboard tab permissions
const DASHBOARD_TAB_SECTIONS = [
  { key: 'dashboard_sales', label: 'Sales Tab' },
  { key: 'dashboard_calls', label: 'Calls Tab' },
  { key: 'dashboard_active', label: 'Active Tab' },
  { key: 'dashboard_closed', label: 'Closed Tab' },
  { key: 'dashboard_miscellaneous', label: 'Miscellaneous Tab' },
  { key: 'dashboard_all', label: 'All Tab' },
];

const MAIN_SECTIONS = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'resources', label: 'Resources' },
  { key: 'calculators', label: 'Calculators' },
  { key: 'admin', label: 'Admin' },
];

const PIPELINE_SECTIONS = [
  { key: 'pipeline_leads', label: 'Leads' },
  { key: 'pipeline_pending_app', label: 'Pending App' },
  { key: 'pipeline_screening', label: 'Screening' },
  { key: 'pipeline_pre_qualified', label: 'Pre-Qualified' },
  { key: 'pipeline_pre_approved', label: 'Pre-Approved' },
  { key: 'pipeline_active', label: 'Active' },
  { key: 'pipeline_past_clients', label: 'Past Clients' },
];

const CONTACTS_SECTIONS = [
  { key: 'contacts_agents', label: 'Real Estate Agents' },
  { key: 'contacts_borrowers', label: 'Master Contact List' },
  { key: 'contacts_lenders', label: 'Approved Lenders' },
];

const CALCULATORS_SECTIONS = [
  { key: 'calculators_loan_pricer', label: 'Loan Pricer' },
  { key: 'calculators_property_value', label: 'Property Value' },
  { key: 'calculators_income', label: 'Income Calculator' },
  { key: 'calculators_estimate', label: 'Loan Estimate' },
];

const RESOURCES_SECTIONS = [
  { key: 'resources_bolt_bot', label: 'Bolt Bot' },
  { key: 'resources_email_marketing', label: 'Email Marketing' },
  { key: 'resources_condolist', label: 'Condo List' },
  { key: 'resources_preapproval', label: 'Preapproval Letter' },
];

const ADMIN_SECTIONS = [
  { key: 'admin_assistant', label: 'Assistant' },
  { key: 'admin_mortgage_app', label: 'Mortgage App' },
  { key: 'admin_settings', label: 'Settings' },
  { key: 'admin_deleted_items', label: 'Deleted Items' },
];

const LEAD_DETAILS_SECTIONS = [
  { key: 'lead_details_all_fields', label: 'All Fields Tab' },
  { key: 'lead_details_send_email', label: 'Send Email Templates' },
];

const HOME_CARD_SECTIONS = [
  { key: 'home_inbox', label: 'Inbox' },
  { key: 'home_calendar', label: 'Calendar' },
  { key: 'home_agents', label: 'Real Estate Agents' },
  { key: 'home_lenders', label: 'Approved Lenders' },
  { key: 'home_active_files', label: 'Active Files' },
  { key: 'home_loan_estimate', label: 'Loan Estimate' },
  { key: 'home_income_calculator', label: 'Income Calculator' },
  { key: 'home_loan_pricer', label: 'Loan Pricer' },
  { key: 'home_bolt_bot', label: 'Bolt Bot' },
];

const getDefaultPermissions = (): Omit<UserPermission, 'id'> => ({
  user_id: '',
  // Top-level sections
  home: 'visible',
  dashboard: 'visible',
  overview: 'visible',
  tasks: 'visible',
  email: 'visible',
  pipeline: 'visible',
  contacts: 'visible',
  resources: 'visible',
  calculators: 'visible',
  admin: 'hidden',
  // Dashboard tabs
  dashboard_sales: 'visible',
  dashboard_calls: 'visible',
  dashboard_active: 'visible',
  dashboard_closed: 'visible',
  dashboard_miscellaneous: 'visible',
  dashboard_all: 'visible',
  // Pipeline sub-items
  pipeline_leads: 'visible',
  pipeline_pending_app: 'visible',
  pipeline_screening: 'visible',
  pipeline_pre_qualified: 'visible',
  pipeline_pre_approved: 'visible',
  pipeline_active: 'visible',
  pipeline_past_clients: 'visible',
  pipeline_idle: 'visible',
  // Contacts sub-items
  contacts_agents: 'visible',
  contacts_borrowers: 'visible',
  contacts_lenders: 'visible',
  // Calculators sub-items
  calculators_loan_pricer: 'visible',
  calculators_property_value: 'visible',
  calculators_income: 'visible',
  calculators_estimate: 'visible',
  // Resources sub-items
  resources_bolt_bot: 'visible',
  resources_email_marketing: 'visible',
  resources_condolist: 'visible',
  resources_preapproval: 'visible',
  // Admin sub-items
  admin_assistant: 'visible',
  admin_mortgage_app: 'visible',
  admin_settings: 'visible',
  admin_deleted_items: 'visible',
  // Homepage card permissions
  home_inbox: 'visible',
  home_calendar: 'visible',
  home_agents: 'visible',
  home_lenders: 'visible',
  home_active_files: 'visible',
  home_loan_estimate: 'visible',
  home_income_calculator: 'visible',
  home_loan_pricer: 'visible',
  home_bolt_bot: 'visible',
  // Lead details permissions
  lead_details_all_fields: 'visible',
  lead_details_send_email: 'visible',
});

export function UserPermissionsEditor() {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Record<string, UserPermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch users (non-admins for editing, admins have full access by default)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('is_active', true)
        .order('first_name');
      
      if (usersError) throw usersError;
      setUsers(usersData || []);
      
      // Fetch existing permissions
      const { data: permsData, error: permsError } = await supabase
        .from('user_permissions')
        .select('*');
      
      if (permsError) throw permsError;
      
      // Create a map of user_id to permissions
      const permsMap: Record<string, UserPermission> = {};
      (permsData || []).forEach((p: any) => {
        permsMap[p.user_id] = p;
      });
      
      setPermissions(permsMap);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (userId: string, section: string, value: string) => {
    setPermissions(prev => {
      const existing = prev[userId] || {
        id: '',
        ...getDefaultPermissions(),
        user_id: userId,
      };
      
      return {
        ...prev,
        [userId]: {
          ...existing,
          [section]: value,
        }
      };
    });
    setHasChanges(true);
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      
      // Upsert all permissions
      for (const userId of Object.keys(permissions)) {
        const perm = permissions[userId];
        const { error } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: userId,
            // Top-level sections
            home: perm.home,
            dashboard: perm.dashboard,
            overview: perm.overview,
            tasks: perm.tasks,
            email: perm.email,
            pipeline: perm.pipeline,
            contacts: perm.contacts,
            resources: perm.resources,
            calculators: perm.calculators,
            admin: perm.admin,
            // Dashboard tabs
            dashboard_sales: perm.dashboard_sales,
            dashboard_calls: perm.dashboard_calls,
            dashboard_active: perm.dashboard_active,
            dashboard_closed: perm.dashboard_closed,
            dashboard_miscellaneous: perm.dashboard_miscellaneous,
            dashboard_all: perm.dashboard_all,
            // Pipeline sub-items
            pipeline_leads: perm.pipeline_leads,
            pipeline_pending_app: perm.pipeline_pending_app,
            pipeline_screening: perm.pipeline_screening,
            pipeline_pre_qualified: perm.pipeline_pre_qualified,
            pipeline_pre_approved: perm.pipeline_pre_approved,
            pipeline_active: perm.pipeline_active,
            pipeline_past_clients: perm.pipeline_past_clients,
            // Contacts sub-items
            contacts_agents: perm.contacts_agents,
            contacts_borrowers: perm.contacts_borrowers,
            contacts_lenders: perm.contacts_lenders,
            // Calculators sub-items
            calculators_loan_pricer: perm.calculators_loan_pricer,
            calculators_property_value: perm.calculators_property_value,
            calculators_income: perm.calculators_income,
            calculators_estimate: perm.calculators_estimate,
            // Resources sub-items
            resources_bolt_bot: perm.resources_bolt_bot,
            resources_email_marketing: perm.resources_email_marketing,
            resources_condolist: perm.resources_condolist,
            resources_preapproval: perm.resources_preapproval,
            // Admin sub-items
            admin_assistant: perm.admin_assistant,
            admin_mortgage_app: perm.admin_mortgage_app,
            admin_settings: perm.admin_settings,
            admin_deleted_items: perm.admin_deleted_items,
            // Homepage card permissions
            home_inbox: perm.home_inbox,
            home_calendar: (perm as any).home_calendar,
            home_agents: perm.home_agents,
            home_lenders: perm.home_lenders,
            home_active_files: perm.home_active_files,
            home_loan_estimate: perm.home_loan_estimate,
            home_income_calculator: perm.home_income_calculator,
            home_loan_pricer: perm.home_loan_pricer,
            home_bolt_bot: perm.home_bolt_bot,
            // Pipeline idle
            pipeline_idle: perm.pipeline_idle,
            // Lead details permissions
            lead_details_all_fields: perm.lead_details_all_fields,
            lead_details_send_email: perm.lead_details_send_email,
          }, { onConflict: 'user_id' });
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "User permissions saved successfully",
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionValue = (userId: string, section: string): string => {
    return permissions[userId]?.[section as keyof UserPermission] as string || 'visible';
  };

  const renderPermissionTable = (
    title: string,
    description: string,
    sections: { key: string; label: string }[],
    teamMembers: User[]
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Team Member</TableHead>
                {sections.map(section => (
                  <TableHead key={section.key} className="text-center min-w-[100px]">
                    {section.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  {sections.map(section => (
                    <TableCell key={section.key} className="text-center">
                      <Select
                        value={getPermissionValue(user.id, section.key)}
                        onValueChange={(value) => handlePermissionChange(user.id, section.key, value)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMISSION_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className={`h-3 w-3 ${option.color}`} />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading permissions...</div>
        </CardContent>
      </Card>
    );
  }

  const teamMembers = users.filter(u => u.role !== 'Admin');

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Access Permissions
            </CardTitle>
            <CardDescription>
              Control which sections each team member can access. Admins have full access by default.
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={savePermissions} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Homepage Card Permissions */}
      {renderPermissionTable(
        "Homepage Card Permissions",
        "Control which quick access cards users can see and click on the homepage.",
        HOME_CARD_SECTIONS,
        teamMembers
      )}

      {/* Dashboard Section Permissions */}
      {renderPermissionTable(
        "Dashboard Section Permissions",
        "Control access to main dashboard items (Home, Dashboard, Tasks, Email).",
        DASHBOARD_SECTIONS,
        teamMembers
      )}

      {/* Dashboard Tab Permissions */}
      {renderPermissionTable(
        "Dashboard Tab Permissions",
        "Control which tabs users can see within the Dashboard page (Sales, Calls, Active, Closed, Miscellaneous, All).",
        DASHBOARD_TAB_SECTIONS,
        teamMembers
      )}

      {/* Main Category Permissions */}
      {renderPermissionTable(
        "Main Category Permissions",
        "Control access to main collapsible sidebar categories.",
        MAIN_SECTIONS,
        teamMembers
      )}

      {/* Pipeline Stage Permissions */}
      {renderPermissionTable(
        "Pipeline Stage Permissions",
        "Fine-grained control over which pipeline stages each team member can access.",
        PIPELINE_SECTIONS,
        teamMembers
      )}

      {/* Contacts Sub-Item Permissions */}
      {renderPermissionTable(
        "Contacts Sub-Item Permissions",
        "Control access to items within the Contacts section.",
        CONTACTS_SECTIONS,
        teamMembers
      )}

      {/* Calculators Sub-Item Permissions */}
      {renderPermissionTable(
        "Calculators Sub-Item Permissions",
        "Control access to items within the Calculators section.",
        CALCULATORS_SECTIONS,
        teamMembers
      )}

      {/* Resources Sub-Item Permissions */}
      {renderPermissionTable(
        "Resources Sub-Item Permissions",
        "Control access to items within the Resources section.",
        RESOURCES_SECTIONS,
        teamMembers
      )}

      {/* Admin Sub-Item Permissions */}
      {renderPermissionTable(
        "Admin Sub-Item Permissions",
        "Control access to items within the Admin section.",
        ADMIN_SECTIONS,
        teamMembers
      )}

      {/* Lead Details Permissions */}
      {renderPermissionTable(
        "Lead Details Permissions",
        "Control access to specific features within the lead details drawer.",
        LEAD_DETAILS_SECTIONS,
        teamMembers
      )}

      {/* Permission Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {PERMISSION_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center gap-2">
                <option.icon className={`h-4 w-4 ${option.color}`} />
                <span className="font-medium">{option.label}</span>
                <span className="text-sm text-muted-foreground">
                  {option.value === 'visible' && '- Full access to this section'}
                  {option.value === 'hidden' && '- Section not shown in sidebar'}
                  {option.value === 'locked' && '- Shown but disabled (coming soon)'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
