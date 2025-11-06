import { useState } from "react";
import { Settings, Database, Users, FileText, BarChart3, Shield, Plus, Edit, Trash2, Check, X, Search, Filter, FileQuestion } from "lucide-react";
import UserManagement from "@/pages/UserManagement";
import PasswordsVault from "@/pages/PasswordsVault";
import EmailTemplates from "@/pages/admin/EmailTemplates";
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

const systemStats = [
  { label: "Total Records", value: "1,247", icon: Database, color: "text-primary" },
  { label: "Active Users", value: "23", icon: Users, color: "text-success" },
  { label: "Custom Fields", value: "72", icon: FileText, color: "text-warning" },
  { label: "System Health", value: "98%", icon: BarChart3, color: "text-info" },
];

export default function Admin() {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDisplayName, setNewFieldDisplayName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldSection, setNewFieldSection] = useState("LEAD");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showSystemFields, setShowSystemFields] = useState(true);
  const [showInactiveFields, setShowInactiveFields] = useState(true);

  const { fields, loading, addField, updateField, deleteField } = useFieldManagement();

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

  const handleAddField = async () => {
    if (!newFieldName || !newFieldDisplayName) return;
    
    const success = await addField({
      field_name: newFieldName,
      display_name: newFieldDisplayName,
      section: newFieldSection,
      field_type: newFieldType,
      is_required: false,
      is_visible: true,
      is_system_field: false,
      is_in_use: true,
      sort_order: fields.length + 1,
    });
    
    if (success) {
      setNewFieldName("");
      setNewFieldDisplayName("");
      setNewFieldType("text");
      setNewFieldSection("LEAD");
    }
  };

  const startEdit = (field: any) => {
    setEditingField(field.id);
    setEditData({
      display_name: field.display_name,
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="fields">Field Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="passwords">Passwords</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Custom Fields</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure custom fields for your CRM - all fields are available on all boards
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/docs/FIELD_REFERENCE.md" target="_blank" rel="noopener noreferrer">
                    <FileQuestion className="h-4 w-4 mr-2" />
                    Field Documentation
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add New Field Form */}
              <div className="grid grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg mb-6">
                <div>
                  <Label htmlFor="fieldName">Field Name</Label>
                  <Input
                    id="fieldName"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g. middle_name"
                  />
                </div>
                <div>
                  <Label htmlFor="fieldDisplayName">Display Name</Label>
                  <Input
                    id="fieldDisplayName"
                    value={newFieldDisplayName}
                    onChange={(e) => setNewFieldDisplayName(e.target.value)}
                    placeholder="e.g. Middle Name"
                  />
                </div>
                <div>
                  <Label htmlFor="fieldSection">Section</Label>
                  <Select value={newFieldSection} onValueChange={setNewFieldSection}>
                    <SelectTrigger>
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
                </div>
                <div>
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger>
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
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                    <Button 
                      onClick={handleAddField} 
                      className="w-full"
                      disabled={!newFieldName || !newFieldDisplayName || !newFieldType || loading}
                    >
                      {loading ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Field
                        </>
                      )}
                    </Button>
                    {(!newFieldName || !newFieldDisplayName) && (
                      <p className="text-xs text-red-500">
                        Field name and display name are required
                      </p>
                    )}
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-5 gap-4 p-4 bg-muted/20 rounded-lg mb-4">
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
                      <TableHead className="w-[150px]">Field Name</TableHead>
                      <TableHead className="w-[150px]">Display Name</TableHead>
                      <TableHead className="w-[100px]">Section</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[80px]">Required</TableHead>
                      <TableHead className="w-[80px]">Visible</TableHead>
                      <TableHead className="w-[80px]">In Use</TableHead>
                      <TableHead className="w-[80px]">System</TableHead>
                      <TableHead className="w-[80px]">Sort</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          Loading fields...
                        </TableCell>
                      </TableRow>
                    ) : filteredFields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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

        <TabsContent value="passwords" className="space-y-4">
          <PasswordsVault />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Configure system-wide settings and preferences</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System settings interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">Generate reports and view system analytics</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Reports interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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