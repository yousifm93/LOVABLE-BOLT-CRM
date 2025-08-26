import { useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Copy, Search, Shield, Lock, Globe, User, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PasswordEntry {
  id: number;
  serviceName: string;
  url?: string;
  username: string;
  password: string;
  description?: string;
  tags: string[];
  createdOn: string;
  lastAccessed?: string;
  accessedBy?: string;
}

interface AuditLog {
  id: number;
  action: "viewed" | "copied" | "added" | "updated" | "deleted";
  entryId: number;
  serviceName: string;
  user: string;
  timestamp: string;
}

const initialPasswords: PasswordEntry[] = [
  {
    id: 1,
    serviceName: "Encompass LOS",
    url: "https://mortgagebolt.encompass360.com",
    username: "admin@mortgagebolt.com",
    password: "SecurePass123!",
    description: "Main loan origination system",
    tags: ["production", "los", "critical"],
    createdOn: "2024-01-01T00:00:00Z",
    lastAccessed: "2024-01-18T10:30:00Z",
    accessedBy: "Yousif Mohamed"
  },
  {
    id: 2,
    serviceName: "Freddie Mac",
    url: "https://lpapirmal.freddiemac.com",
    username: "mortgagebolt_user",
    password: "FreddieMac2024!",
    description: "Automated underwriting system access",
    tags: ["production", "underwriting", "gse"],
    createdOn: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    serviceName: "AWS Console",
    url: "https://console.aws.amazon.com",
    username: "admin@mortgagebolt.com",
    password: "AWSAdmin2024!",
    description: "Cloud infrastructure management",
    tags: ["infrastructure", "aws", "critical"],
    createdOn: "2024-01-01T00:00:00Z"
  }
];

const mockAuditLog: AuditLog[] = [
  {
    id: 1,
    action: "copied",
    entryId: 1,
    serviceName: "Encompass LOS",
    user: "Yousif Mohamed",
    timestamp: "2024-01-18T10:30:00Z"
  },
  {
    id: 2,
    action: "viewed",
    entryId: 2,
    serviceName: "Freddie Mac",
    user: "Yousif Mohamed",
    timestamp: "2024-01-18T09:15:00Z"
  }
];

export default function PasswordsVault() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>(initialPasswords);
  const [auditLog] = useState<AuditLog[]>(mockAuditLog);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [isAddPasswordOpen, setIsAddPasswordOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  
  const [newPassword, setNewPassword] = useState({
    serviceName: "",
    url: "",
    username: "",
    password: "",
    description: "",
    tags: ""
  });

  // Get all unique tags
  const allTags = Array.from(new Set(passwords.flatMap(p => p.tags)));

  // Filter passwords based on search and tag
  const filteredPasswords = passwords.filter(password => {
    const matchesSearch = password.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === "all" || password.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const togglePasswordVisibility = (id: number) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
      // Log access
      logAction("viewed", id, passwords.find(p => p.id === id)?.serviceName || "");
    }
    setVisiblePasswords(newVisible);
  };

  const copyPassword = async (password: string, id: number, serviceName: string) => {
    try {
      await navigator.clipboard.writeText(password);
      logAction("copied", id, serviceName);
      // Could add toast notification here
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  const logAction = (action: AuditLog["action"], entryId: number, serviceName: string) => {
    // In real app, this would call an API
    console.log(`Audit: ${action} ${serviceName} by Yousif Mohamed`);
  };

  const handleAddPassword = () => {
    const password: PasswordEntry = {
      id: passwords.length + 1,
      ...newPassword,
      tags: newPassword.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      createdOn: new Date().toISOString()
    };
    setPasswords([...passwords, password]);
    setNewPassword({
      serviceName: "",
      url: "",
      username: "",
      password: "",
      description: "",
      tags: ""
    });
    setIsAddPasswordOpen(false);
    logAction("added", password.id, password.serviceName);
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "production": return "bg-orange-100 text-orange-800 border-orange-200";
      case "infrastructure": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary" />
            Passwords Vault
          </h1>
          <p className="text-xs italic text-muted-foreground/70">Secure credential management - Admin access only</p>
        </div>
        <Dialog open={isAddPasswordOpen} onOpenChange={setIsAddPasswordOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Credential</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="serviceName">Service Name *</Label>
                <Input
                  id="serviceName"
                  value={newPassword.serviceName}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, serviceName: e.target.value }))}
                  placeholder="e.g., Encompass LOS"
                />
              </div>
              
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={newPassword.url}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={newPassword.username}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Username or email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword.password}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newPassword.description}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description or notes"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={newPassword.tags}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., production, critical, los"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAddPassword} className="flex-1">
                  Add Credential
                </Button>
                <Button variant="outline" onClick={() => setIsAddPasswordOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Passwords Table */}
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Lock className="h-5 w-5 mr-2 text-primary" />
              Stored Credentials ({filteredPasswords.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Accessed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPasswords.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{entry.serviceName}</div>
                      {entry.description && (
                        <div className="text-xs text-muted-foreground">{entry.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.url && (
                      <a 
                        href={entry.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center text-sm"
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        {new URL(entry.url).hostname}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{entry.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {visiblePasswords.has(entry.id) ? entry.password : "••••••••••"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePasswordVisibility(entry.id)}
                      >
                        {visiblePasswords.has(entry.id) ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPassword(entry.password, entry.id, entry.serviceName)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <Badge key={tag} className={getTagColor(tag)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.lastAccessed ? (
                      <div>
                        <div>{new Date(entry.lastAccessed).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">by {entry.accessedBy}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
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

      {/* Audit Log */}
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLog.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.action === "copied" ? "bg-blue-500" : 
                    log.action === "viewed" ? "bg-green-500" :
                    log.action === "added" ? "bg-purple-500" : "bg-gray-500"
                  }`} />
                  <span className="text-sm">
                    <span className="font-medium">{log.user}</span> {log.action} 
                    <span className="font-medium"> {log.serviceName}</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}