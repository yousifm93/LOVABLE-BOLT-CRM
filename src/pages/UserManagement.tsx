import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateUserModal } from "@/components/modals/CreateUserModal";
import { Mail, UserPlus, Power, Pencil, UserCheck, Shield } from "lucide-react";
import { EditUserModal } from "@/components/modals/EditUserModal";
import { UserPermissionsEditor } from "@/components/admin/UserPermissionsEditor";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_assignable: boolean;
  created_at: string;
  display_password?: string | null;
  email_signature?: string | null;
  auth_user_id?: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading users", description: error.message, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
  };

  const adminUsers = users.filter(user => user.role === 'Admin' && user.is_active);
  const teamMembers = users.filter(user => user.role !== 'Admin' && user.is_active);
  const inactiveUsers = users.filter(user => !user.is_active);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("users")
      .update({ is_active: !currentStatus })
      .eq("id", userId);

    if (error) {
      toast({ title: "Error updating user", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Success", 
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully` 
      });
      fetchUsers();
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://mortgage-bolt-crm.lovable.app/update-password',
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Password reset email sent to ${email}` });
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleCreateAuthAccount = async (user: User) => {
    if (!user.email) {
      toast({ 
        title: "Error", 
        description: "Cannot create auth account: user has no email", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: user.email,
          password: user.display_password || 'Yousmo93!!',
          firstName: user.first_name,
          lastName: user.last_name
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ 
          title: "Success", 
          description: `Auth account created for ${user.email}` 
        });
      } else {
        throw new Error(data?.error || 'Failed to create auth account');
      }
    } catch (error: any) {
      console.error('Error creating auth account:', error);
      toast({ 
        title: "Error", 
        description: error.message || 'Failed to create auth account', 
        variant: "destructive" 
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage team members, authentication, and permissions</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create New User
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admins</CardTitle>
              <CardDescription>
                System administrators with full access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || "No email"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.display_password ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRevealedPasswords(prev => {
                                const next = new Set(prev);
                                if (next.has(user.id)) {
                                  next.delete(user.id);
                                } else {
                                  next.add(user.id);
                                }
                                return next;
                              });
                            }}
                            className="font-mono text-xs"
                          >
                            {revealedPasswords.has(user.id) ? user.display_password : '••••••••'}
                          </Button>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!user.auth_user_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateAuthAccount(user)}
                            disabled={!user.email}
                            title="Create login credentials"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Create Login
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendPasswordReset(user.email!)}
                          disabled={!user.email}
                          title="Send password reset email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          title={user.is_active ? "Deactivate user" : "Activate user"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                All users have shared access to CRM data. Activity tracking shows who performed each action.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Passwords are securely managed by Supabase. Use "Send Password Reset" to allow users to set new passwords.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Assignable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || "No email"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.display_password ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRevealedPasswords(prev => {
                                const next = new Set(prev);
                                if (next.has(user.id)) {
                                  next.delete(user.id);
                                } else {
                                  next.add(user.id);
                                }
                                return next;
                              });
                            }}
                            className="font-mono text-xs"
                          >
                            {revealedPasswords.has(user.id) ? user.display_password : '••••••••'}
                          </Button>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_assignable !== false ? "default" : "outline"}>
                          {user.is_assignable !== false ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!user.auth_user_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateAuthAccount(user)}
                            disabled={!user.email}
                            title="Create login credentials"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Create Login
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendPasswordReset(user.email!)}
                          disabled={!user.email}
                          title="Send password reset email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          title={user.is_active ? "Deactivate user" : "Activate user"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {inactiveUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Inactive</CardTitle>
                <CardDescription>
                  Deactivated users who no longer have access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveUsers.map((user) => (
                      <TableRow key={user.id} className="opacity-60">
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "No email"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            title="Reactivate user"
                          >
                            <Power className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="permissions">
          <UserPermissionsEditor />
        </TabsContent>
      </Tabs>

      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onUserCreated={fetchUsers}
      />

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
}
