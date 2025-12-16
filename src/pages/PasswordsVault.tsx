import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Copy, Search, Shield, Lock, Globe, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ServiceCredential {
  id: string;
  service_name: string;
  url: string | null;
  username: string;
  password: string;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  last_accessed_by: string | null;
}

export default function PasswordsVault() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<ServiceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [isAddPasswordOpen, setIsAddPasswordOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newPassword, setNewPassword] = useState({
    service_name: "",
    url: "",
    username: "",
    password: "",
    description: "",
    tags: ""
  });

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_credentials')
      .select('*')
      .order('service_name');

    if (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to load credentials');
    } else {
      setCredentials(data || []);
    }
    setLoading(false);
  };

  // Get all unique tags
  const allTags = Array.from(new Set(credentials.flatMap(p => p.tags || [])));

  // Filter credentials based on search and tag
  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = cred.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cred.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cred.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTag === "all" || (cred.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const togglePasswordVisibility = async (id: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
      // Log access
      await supabase.from('service_credentials')
        .update({ 
          last_accessed_at: new Date().toISOString(),
          last_accessed_by: user?.id 
        })
        .eq('id', id);
    }
    setVisiblePasswords(newVisible);
  };

  const copyPassword = async (password: string, id: string, serviceName: string) => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(`Password copied for ${serviceName}`);
      
      // Log access
      await supabase.from('service_credentials')
        .update({ 
          last_accessed_at: new Date().toISOString(),
          last_accessed_by: user?.id 
        })
        .eq('id', id);
    } catch (err) {
      console.error("Failed to copy password:", err);
      toast.error("Failed to copy password");
    }
  };

  const handleAddPassword = async () => {
    if (!newPassword.service_name || !newPassword.username || !newPassword.password) {
      toast.error("Please fill in required fields");
      return;
    }

    const credentialData = {
      service_name: newPassword.service_name,
      url: newPassword.url || null,
      username: newPassword.username,
      password: newPassword.password,
      description: newPassword.description || null,
      tags: newPassword.tags.split(",").map(tag => tag.trim()).filter(Boolean)
    };

    if (editingId) {
      const { error } = await supabase
        .from('service_credentials')
        .update(credentialData)
        .eq('id', editingId);

      if (error) {
        toast.error("Failed to update credential");
        return;
      }
      toast.success("Credential updated");
    } else {
      const { error } = await supabase
        .from('service_credentials')
        .insert([credentialData]);

      if (error) {
        toast.error("Failed to add credential");
        return;
      }
      toast.success("Credential added");
    }

    setNewPassword({
      service_name: "",
      url: "",
      username: "",
      password: "",
      description: "",
      tags: ""
    });
    setEditingId(null);
    setIsAddPasswordOpen(false);
    fetchCredentials();
  };

  const handleEdit = (cred: ServiceCredential) => {
    setNewPassword({
      service_name: cred.service_name,
      url: cred.url || "",
      username: cred.username,
      password: cred.password,
      description: cred.description || "",
      tags: (cred.tags || []).join(", ")
    });
    setEditingId(cred.id);
    setIsAddPasswordOpen(true);
  };

  const handleDelete = async (id: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete credentials for "${serviceName}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('service_credentials')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete credential");
      return;
    }

    toast.success("Credential deleted");
    fetchCredentials();
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "production": return "bg-orange-100 text-orange-800 border-orange-200";
      case "infrastructure": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <Dialog open={isAddPasswordOpen} onOpenChange={(open) => {
          setIsAddPasswordOpen(open);
          if (!open) {
            setEditingId(null);
            setNewPassword({
              service_name: "",
              url: "",
              username: "",
              password: "",
              description: "",
              tags: ""
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Credential" : "Add New Credential"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="serviceName">Service Name *</Label>
                <Input
                  id="serviceName"
                  value={newPassword.service_name}
                  onChange={(e) => setNewPassword(prev => ({ ...prev, service_name: e.target.value }))}
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
                  {editingId ? "Update" : "Add"} Credential
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

      {/* Credentials Table */}
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Lock className="h-5 w-5 mr-2 text-primary" />
              Stored Credentials ({filteredCredentials.length})
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
              {filteredCredentials.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{entry.service_name}</div>
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
                        {(() => {
                          try {
                            return new URL(entry.url).hostname;
                          } catch {
                            return entry.url;
                          }
                        })()}
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
                        onClick={() => copyPassword(entry.password, entry.id, entry.service_name)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(entry.tags || []).map((tag) => (
                        <Badge key={tag} className={getTagColor(tag)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.last_accessed_at ? (
                      <div>
                        <div>{new Date(entry.last_accessed_at).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id, entry.service_name)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCredentials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No credentials found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
