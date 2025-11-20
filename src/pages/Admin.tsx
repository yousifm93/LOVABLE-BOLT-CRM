import { useState, useEffect } from "react";
import { Settings, Database, Users, FileText, Activity, Plus, Edit, Trash2, Check, X, Search, Filter, Zap, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "@/pages/UserManagement";
import EmailTemplates from "@/pages/admin/EmailTemplates";
import { TaskAutomationsTable } from "@/components/admin/TaskAutomationsTable";
import { AddFieldModal } from "@/components/admin/AddFieldModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFieldManagement } from "@/hooks/useFieldManagement";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Admin() {
  const [addFieldModalOpen, setAddFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeUsers: 0,
    customFields: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showSystemFields, setShowSystemFields] = useState(true);
  const [showInactiveFields, setShowInactiveFields] = useState(true);

  const { fields, loading, addField, updateField, deleteField } = useFieldManagement();

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      
      try {
        // Fetch total leads (all pipeline stages)
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });
        
        // Fetch active users
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        
        // Fetch custom fields in use
        const { count: fieldsCount } = await supabase
          .from('crm_fields')
          .select('*', { count: 'exact', head: true })
          .eq('is_in_use', true);
        
        setStats({
          totalLeads: leadsCount || 0,
          activeUsers: usersCount || 0,
          customFields: fieldsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchStats();
  }, []);

  // Apply filters
  const filteredFields = fields.filter(field => {
    const matchesSearch = 
      field.field_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter === "all" || field.section === sectionFilter;
    const matchesType = typeFilter === "all" || field.field_type === typeFilter;
    const matchesSystem = showSystemFields || !field.is_system_field;
    const matchesActive = showInactiveFields || field.is_in_use;
    
    return matchesSearch && matchesSection && matchesType && matchesSystem && matchesActive;
  });

  // Get unique sections and types for filter dropdowns
  const uniqueSections = Array.from(new Set(fields.map(f => f.section))).sort();
  const uniqueTypes = Array.from(new Set(fields.map(f => f.field_type))).sort();

  const systemStats = [
    { 
      label: "Total Pipeline Records", 
      value: loadingStats ? "..." : stats.totalLeads.toLocaleString(), 
      icon: Database, 
      color: "text-primary" 
    },
    { 
      label: "Active Users", 
      value: loadingStats ? "..." : stats.activeUsers.toString(), 
      icon: Users, 
      color: "text-success" 
    },
    { 
      label: "Custom Fields", 
      value: loadingStats ? "..." : stats.customFields.toString(), 
      icon: FileText, 
      color: "text-warning" 
    },
  ];

  const handleAddField = async (fieldData: {
    field_name: string;
    display_name: string;
    description: string;
    section: string;
    field_type: string;
  }) => {
    await addField({
      field_name: fieldData.field_name,
      display_name: fieldData.display_name,
      description: fieldData.description || null,
      section: fieldData.section,
      field_type: fieldData.field_type,
      is_required: false,
      is_visible: true,
      is_system_field: false,
      is_in_use: true,
      sort_order: fields.length + 1,
    });
  };

  const startEdit = (field: any) => {
    setEditingField(field.id);
    setEditData({
      display_name: field.display_name,
      description: field.description,
      section: field.section,
      field_type: field.field_type,
      is_required: field.is_required,
      is_visible: field.is_visible,
      is_in_use: field.is_in_use,
      sort_order: field.sort_order,
    });
  };

  const saveEdit = async (fieldId: string) => {
    await updateField(fieldId, editData);
    setEditingField(null);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditData({});
  };

  const confirmDelete = (field: any) => {
    setFieldToDelete(field);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (fieldToDelete) {
      await deleteField(fieldToDelete.id);
      setDeleteDialogOpen(false);
      setFieldToDelete(null);
    }
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-xs italic text-muted-foreground/70">System configuration and field management</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {systemStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fields">Field Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="task-automations">Task Automations</TabsTrigger>
          <TabsTrigger value="email-automations">Email Automations</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Custom Fields</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure custom fields for your CRM - all fields are available on all boards
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setAddFieldModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/docs/FIELD_REFERENCE.md" target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      Field Documentation
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>

              {/* Filters */}
              <div className="grid grid-cols-5 gap-4 p-3 bg-muted/20 rounded-lg mb-4">
                <div>
                  <Label htmlFor="search" className="text-xs">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search fields..."
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sectionFilter" className="text-xs">Section</Label>
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {uniqueSections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="typeFilter" className="text-xs">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showSystem"
                      checked={showSystemFields}
                      onCheckedChange={setShowSystemFields}
                    />
                    <Label htmlFor="showSystem" className="text-xs cursor-pointer">System</Label>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showInactive"
                      checked={showInactiveFields}
                      onCheckedChange={setShowInactiveFields}
                    />
                    <Label htmlFor="showInactive" className="text-xs cursor-pointer">Inactive</Label>
                  </div>
                </div>
              </div>

              {/* Fields Table */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredFields.length} of {fields.length} fields
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Field Name</TableHead>
                      <TableHead className="w-[140px]">Display Name</TableHead>
                      <TableHead className="w-[120px]">Description</TableHead>
                      <TableHead className="w-[90px]">Section</TableHead>
                      <TableHead className="w-[80px]">Type</TableHead>
                      <TableHead className="w-[70px]">Required</TableHead>
                      <TableHead className="w-[70px]">Visible</TableHead>
                      <TableHead className="w-[70px]">In Use</TableHead>
                      <TableHead className="w-[70px]">System</TableHead>
                      <TableHead className="w-[60px]">Sort</TableHead>
                      <TableHead className="w-[90px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          Loading fields...
                        </TableCell>
                      </TableRow>
                    ) : filteredFields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No fields found matching filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFields.map((field) => (
                        <TableRow key={field.id} className={!field.is_in_use ? "opacity-50" : ""}>
                          <TableCell className="font-mono text-xs">{field.field_name}</TableCell>
                          <TableCell>
                            {editingField === field.id ? (
                              <Input
                                value={editData.display_name}
                                onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                                className="h-7"
                              />
                            ) : (
                              field.display_name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingField === field.id ? (
                              <Input
                                value={editData.description || ""}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                placeholder="Add description..."
                                className="h-7"
                              />
                            ) : (
                              <span 
                                className="text-xs text-muted-foreground truncate block"
                                title={field.description || ""}
                              >
                                {field.description || "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingField === field.id ? (
                              <Select 
                                value={editData.section} 
                                onValueChange={(value) => setEditData({ ...editData, section: value })}
                              >
                                <SelectTrigger className="h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LEAD">Lead Info</SelectItem>
                                  <SelectItem value="FINANCIAL">Financial</SelectItem>
                                  <SelectItem value="PROPERTY">Property</SelectItem>
                                  <SelectItem value="OPERATIONS">Operations</SelectItem>
                                  <SelectItem value="DOCUMENTS">Documents</SelectItem>
                                  <SelectItem value="DATES">Dates</SelectItem>
                                  <SelectItem value="STATUS">Status</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs">{field.section}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingField === field.id ? (
                              <Select 
                                value={editData.field_type} 
                                onValueChange={(value) => setEditData({ ...editData, field_type: value })}
                              >
                                <SelectTrigger className="h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="phone">Phone</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="currency">Currency</SelectItem>
                                  <SelectItem value="percentage">Percentage</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="datetime">DateTime</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                  <SelectItem value="file">File</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge>{field.field_type}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={editingField === field.id ? editData.is_required : field.is_required}
                              disabled={field.is_system_field || editingField !== field.id}
                              onCheckedChange={(checked) => {
                                if (editingField === field.id) {
                                  setEditData({ ...editData, is_required: checked });
                                } else {
                                  updateField(field.id, { is_required: checked });
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={editingField === field.id ? editData.is_visible : field.is_visible}
                              disabled={editingField !== field.id}
                              onCheckedChange={(checked) => {
                                if (editingField === field.id) {
                                  setEditData({ ...editData, is_visible: checked });
                                } else {
                                  updateField(field.id, { is_visible: checked });
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={editingField === field.id ? editData.is_in_use : field.is_in_use}
                              disabled={editingField !== field.id}
                              onCheckedChange={(checked) => {
                                if (editingField === field.id) {
                                  setEditData({ ...editData, is_in_use: checked });
                                } else {
                                  updateField(field.id, { is_in_use: checked });
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {field.is_system_field && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingField === field.id ? (
                              <Input
                                type="number"
                                value={editData.sort_order}
                                onChange={(e) => setEditData({ ...editData, sort_order: parseInt(e.target.value) || 0 })}
                                className="h-7 w-16"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{field.sort_order}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {editingField === field.id ? (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => saveEdit(field.id)}>
                                    <Check className="h-4 w-4 text-success" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => startEdit(field)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!field.is_system_field && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-destructive"
                                      onClick={() => confirmDelete(field)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="email-templates" className="space-y-4">
          <EmailTemplates />
        </TabsContent>

          <TabsContent value="task-automations" className="space-y-4">
            <div className="max-w-7xl mx-auto px-4">
              <TaskAutomationsTable />
            </div>
        </TabsContent>

        <TabsContent value="email-automations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Automations
              </CardTitle>
              <p className="text-sm text-muted-foreground">Configure automated email workflows and triggers</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Coming soon: Set up email automation rules based on pipeline stage changes, task completions, and custom triggers.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Field Modal */}
      <AddFieldModal
        open={addFieldModalOpen}
        onOpenChange={setAddFieldModalOpen}
        onAdd={handleAddField}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the field "{fieldToDelete?.display_name}" from all boards.
              This action cannot be undone. The field will be marked as inactive and data will be preserved but no longer accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}