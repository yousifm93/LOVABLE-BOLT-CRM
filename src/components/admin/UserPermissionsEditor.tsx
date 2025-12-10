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
  overview: string;
  tasks: string;
  pipeline: string;
  contacts: string;
  resources: string;
  calculators: string;
  admin: string;
  pipeline_leads: string;
  pipeline_pending_app: string;
  pipeline_screening: string;
  pipeline_pre_qualified: string;
  pipeline_pre_approved: string;
  pipeline_active: string;
  pipeline_past_clients: string;
}

const PERMISSION_OPTIONS = [
  { value: 'visible', label: 'Visible', icon: Eye, color: 'text-green-600' },
  { value: 'hidden', label: 'Hidden', icon: EyeOff, color: 'text-muted-foreground' },
  { value: 'locked', label: 'Locked', icon: Lock, color: 'text-orange-600' },
];

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
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
        user_id: userId,
        overview: 'visible',
        tasks: 'visible',
        pipeline: 'visible',
        contacts: 'visible',
        resources: 'visible',
        calculators: 'visible',
        admin: 'hidden',
        pipeline_leads: 'visible',
        pipeline_pending_app: 'visible',
        pipeline_screening: 'visible',
        pipeline_pre_qualified: 'visible',
        pipeline_pre_approved: 'visible',
        pipeline_active: 'visible',
        pipeline_past_clients: 'visible',
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
            overview: perm.overview,
            tasks: perm.tasks,
            pipeline: perm.pipeline,
            contacts: perm.contacts,
            resources: perm.resources,
            calculators: perm.calculators,
            admin: perm.admin,
            pipeline_leads: perm.pipeline_leads,
            pipeline_pending_app: perm.pipeline_pending_app,
            pipeline_screening: perm.pipeline_screening,
            pipeline_pre_qualified: perm.pipeline_pre_qualified,
            pipeline_pre_approved: perm.pipeline_pre_approved,
            pipeline_active: perm.pipeline_active,
            pipeline_past_clients: perm.pipeline_past_clients,
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

  const getPermissionBadge = (value: string) => {
    const option = PERMISSION_OPTIONS.find(o => o.value === value);
    if (!option) return null;
    const Icon = option.icon;
    return (
      <Badge variant="outline" className={`${option.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {option.label}
      </Badge>
    );
  };

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
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Team Member</TableHead>
                  {SECTIONS.map(section => (
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
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    {SECTIONS.map(section => (
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

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stage Permissions</CardTitle>
          <CardDescription>
            Fine-grained control over which pipeline stages each team member can access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Team Member</TableHead>
                  {PIPELINE_SECTIONS.map(section => (
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
                    {PIPELINE_SECTIONS.map(section => (
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
