import { useState } from "react";
import { Settings, Database, Users, FileText, BarChart3, Shield, Plus, Edit, Trash2, Check, X } from "lucide-react";
import UserManagement from "@/pages/UserManagement";
import PasswordsVault from "@/pages/PasswordsVault";
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
  const [selectedSection, setSelectedSection] = useState("all");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDisplayName, setNewFieldDisplayName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldSection, setNewFieldSection] = useState("LEAD");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<any>(null);

  const { fields, loading, addField, updateField, deleteField } = useFieldManagement();

  const filteredFields = selectedSection === "all" 
    ? fields 
    : fields.filter(field => field.section === selectedSection);

  const sections = [...new Set(fields.map(field => field.section))];

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
      sort_order: fields.length + 1,
    });
    
    if (success) {
      setNewFieldName("");
      setNewFieldDisplayName("");
      setNewFieldType("text");
    }
  };

  const startEdit = (field: any) => {
    setEditingField(field.id);
    setEditData({
      display_name: field.display_name,
      field_type: field.field_type,
      is_required: field.is_required,
      is_visible: field.is_visible,
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
        <TabsList>
          <TabsTrigger value="fields">Field Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="passwords">Passwords</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card className="bg-gradient-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>CRM Field Configuration</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage custom fields across all CRM sections. {filteredFields.length} fields shown.
              </p>
            </CardHeader>
            <CardContent>
              {/* Add New Field Form */}
              <div className="grid grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg mb-6">
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
                <div>
                  <Label htmlFor="fieldSection">Section</Label>
                  <Select value={newFieldSection} onValueChange={setNewFieldSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD">LEAD</SelectItem>
                      <SelectItem value="APP COMPLETE">APP COMPLETE</SelectItem>
                      <SelectItem value="APP REVIEW">APP REVIEW</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="PRE_APPROVED">PRE_APPROVED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddField} 
                    className="w-full"
                    disabled={!newFieldName || !newFieldDisplayName || loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>

              {/* Fields Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Visible</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading fields...
                        </TableCell>
                      </TableRow>
                    ) : filteredFields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No fields found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Badge variant="outline">{field.section}</Badge>
                          </TableCell>
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