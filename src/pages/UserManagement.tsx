import { useState } from "react";
import { Plus, Edit, Trash2, Shield, Mail, Eye, EyeOff, Key, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "Admin" | "Loan Officer" | "Loan Officer Assistant";
  status: "Active" | "Inactive";
  teams: string[];
  lastLogin: string;
  createdOn: string;
  require2FA: boolean;
}

const initialUsers: User[] = [
  {
    id: 1,
    firstName: "Yousif",
    lastName: "Mohamed",
    email: "yousef@mortgagebolt.com",
    role: "Admin",
    status: "Active",
    teams: ["All Teams"],
    lastLogin: "2024-01-18T09:30:00Z",
    createdOn: "2024-01-01T00:00:00Z",
    require2FA: true
  },
  {
    id: 2,
    firstName: "Salma",
    lastName: "Mohamed",
    email: "yousef@mortgagebolt.com",
    role: "Loan Officer",
    status: "Active",
    teams: ["Sales", "Underwriting"],
    lastLogin: "2024-01-18T10:15:00Z",
    createdOn: "2024-01-01T00:00:00Z",
    require2FA: false
  },
  {
    id: 3,
    firstName: "Herman",
    lastName: "Daza",
    email: "yousef@mortgagebolt.com",
    role: "Loan Officer Assistant",
    status: "Active",
    teams: ["Processing", "Support"],
    lastLogin: "2024-01-18T08:45:00Z",
    createdOn: "2024-01-01T00:00:00Z",
    require2FA: false
  }
];

const availableTeams = ["Sales", "Processing", "Underwriting", "Support", "Admin"];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Loan Officer" as const,
    teams: [] as string[],
    require2FA: false
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-red-100 text-red-800 border-red-200";
      case "Loan Officer": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Loan Officer Assistant": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleAddUser = () => {
    const user: User = {
      id: users.length + 1,
      ...newUser,
      status: "Active",
      lastLogin: new Date().toISOString(),
      createdOn: new Date().toISOString()
    };
    setUsers([...users, user]);
    setNewUser({
      firstName: "",
      lastName: "",
      email: "",
      role: "Loan Officer",
      teams: [],
      require2FA: false
    });
    setIsAddUserOpen(false);
  };

  const handleTeamToggle = (team: string, checked: boolean) => {
    if (checked) {
      setNewUser(prev => ({ ...prev, teams: [...prev.teams, team] }));
    } else {
      setNewUser(prev => ({ ...prev, teams: prev.teams.filter(t => t !== team) }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-xs italic text-muted-foreground/70">Manage user accounts, roles, and permissions</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@mortgagebolt.com"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value: any) => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Loan Officer">Loan Officer</SelectItem>
                    <SelectItem value="Loan Officer Assistant">Loan Officer Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Teams</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableTeams.map((team) => (
                    <div key={team} className="flex items-center space-x-2">
                      <Checkbox
                        id={team}
                        checked={newUser.teams.includes(team)}
                        onCheckedChange={(checked) => handleTeamToggle(team, checked as boolean)}
                      />
                      <Label htmlFor={team} className="text-sm">{team}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="require2FA"
                  checked={newUser.require2FA}
                  onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, require2FA: checked }))}
                />
                <Label htmlFor="require2FA">Require 2FA</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddUser} className="flex-1">
                  Add User & Send Invite
                </Button>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Active Users ({users.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.teams.slice(0, 2).map((team) => (
                        <Badge key={team} variant="outline" className="text-xs">
                          {team}
                        </Badge>
                      ))}
                      {user.teams.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.teams.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatDateTime(user.lastLogin)}</TableCell>
                  <TableCell className="text-sm">{formatDate(user.createdOn)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Key className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}