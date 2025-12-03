import { useState, useEffect } from "react";
import { Settings, Database, Users, FileText, Activity, Plus, Edit, Trash2, Check, X, Search, Filter, Zap, Mail, CalendarIcon, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserManagement from "@/pages/UserManagement";
import EmailTemplates from "@/pages/admin/EmailTemplates";
import { TaskAutomationsTable } from "@/components/admin/TaskAutomationsTable";
import { EmailAutomationsTable } from "@/components/admin/EmailAutomationsTable";
import { AddFieldModal } from "@/components/admin/AddFieldModal";
import { statusChangeRules } from "@/services/statusChangeValidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useFieldManagement } from "@/hooks/useFieldManagement";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
interface Field {
  id: string;
  field_name: string;
  display_name: string;
  description?: string | null;
  section: string;
  field_type: string;
  is_required: boolean;
  is_visible: boolean;
  is_in_use: boolean;
  is_system_field: boolean;
  sort_order: number;
  sample_data?: string | null;
  dropdown_options?: string[] | null;
}
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
    taskAutomations: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showSystemFields, setShowSystemFields] = useState(true);
  const [showInactiveFields, setShowInactiveFields] = useState(true);
  const {
    fields,
    loading,
    addField,
    updateField,
    deleteField
  } = useFieldManagement();

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        // Fetch total leads (all pipeline stages)
        const {
          count: leadsCount
        } = await supabase.from('leads').select('*', {
          count: 'exact',
          head: true
        });

        // Fetch active users
        const {
          count: usersCount
        } = await supabase.from('users').select('*', {
          count: 'exact',
          head: true
        }).eq('is_active', true);

        // Fetch custom fields in use
        const {
          count: fieldsCount
        } = await supabase.from('crm_fields').select('*', {
          count: 'exact',
          head: true
        }).eq('is_in_use', true);

        // Fetch task automations count
        const {
          count: automationsCount
        } = await supabase.from('task_automations').select('*', {
          count: 'exact',
          head: true
        });
        setStats({
          totalLeads: leadsCount || 0,
          activeUsers: usersCount || 0,
          customFields: fieldsCount || 0,
          taskAutomations: automationsCount || 0
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
    const matchesSearch = field.field_name.toLowerCase().includes(searchQuery.toLowerCase()) || field.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter === "all" || field.section === sectionFilter;
    const matchesType = typeFilter === "all" || field.field_type === typeFilter;
    const matchesSystem = showSystemFields || !field.is_system_field;
    const matchesActive = showInactiveFields || field.is_in_use;
    return matchesSearch && matchesSection && matchesType && matchesSystem && matchesActive;
  });

  // Get unique sections and types for filter dropdowns
  const uniqueSections = Array.from(new Set(fields.map(f => f.section))).sort();
  const uniqueTypes = Array.from(new Set(fields.map(f => f.field_type))).sort();
  const systemStats = [{
    label: "Total Pipeline Records",
    value: loadingStats ? "..." : stats.totalLeads.toLocaleString(),
    icon: Database,
    color: "text-primary"
  }, {
    label: "Active Users",
    value: loadingStats ? "..." : stats.activeUsers.toString(),
    icon: Users,
    color: "text-success"
  }, {
    label: "Custom Fields",
    value: loadingStats ? "..." : stats.customFields.toString(),
    icon: FileText,
    color: "text-warning"
  }, {
    label: "Task Automations",
    value: loadingStats ? "..." : stats.taskAutomations.toString(),
    icon: Zap,
    color: "text-blue-500"
  }];
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
      sort_order: fields.length + 1
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
      sample_data: field.sample_data
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

  // Define columns for DataTable
  const fieldColumns: ColumnDef<Field>[] = [{
    accessorKey: 'field_name',
    header: 'Field Name',
    width: 130,
    minWidth: 100,
    maxWidth: 200,
    cell: ({
      row
    }) => <span className="font-mono text-xs">{row.original.field_name}</span>
  }, {
    accessorKey: 'display_name',
    header: 'Display Name',
    width: 140,
    minWidth: 100,
    maxWidth: 250,
    cell: ({
      row
    }) => {
      const field = row.original;
      return editingField === field.id ? <Input value={editData.display_name} onChange={e => setEditData({
        ...editData,
        display_name: e.target.value
      })} className="h-7" /> : <span>{field.display_name}</span>;
    }
  }, {
    accessorKey: 'description',
    header: 'Description',
    width: 120,
    minWidth: 80,
    maxWidth: 300,
    cell: ({
      row
    }) => {
      const field = row.original;
      return editingField === field.id ? <Input value={editData.description || ""} onChange={e => setEditData({
        ...editData,
        description: e.target.value
      })} placeholder="Add description..." className="h-7" /> : <span className="text-xs text-muted-foreground truncate block" title={field.description || ""}>
            {field.description || "—"}
          </span>;
    }
  }, {
    accessorKey: 'section',
    header: 'Section',
    width: 90,
    minWidth: 80,
    maxWidth: 150,
    cell: ({
      row
    }) => {
      const field = row.original;
      return editingField === field.id ? <Select value={editData.section} onValueChange={value => setEditData({
        ...editData,
        section: value
      })}>
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
          </Select> : <Badge variant="outline" className="text-xs">{field.section}</Badge>;
    }
  }, {
    accessorKey: 'field_type',
    header: 'Type',
    width: 80,
    minWidth: 70,
    maxWidth: 120,
    cell: ({
      row
    }) => {
      const field = row.original;
      return editingField === field.id ? <Select value={editData.field_type} onValueChange={value => setEditData({
        ...editData,
        field_type: value
      })}>
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
          </Select> : <Badge>{field.field_type}</Badge>;
    }
  }, {
    accessorKey: 'is_required',
    header: 'Required',
    width: 70,
    minWidth: 70,
    maxWidth: 90,
    sortable: false,
    cell: ({
      row
    }) => {
      const field = row.original;
      return <Switch checked={editingField === field.id ? editData.is_required : field.is_required} disabled={field.is_system_field || editingField !== field.id} onCheckedChange={checked => {
        if (editingField === field.id) {
          setEditData({
            ...editData,
            is_required: checked
          });
        } else {
          updateField(field.id, {
            is_required: checked
          });
        }
      }} />;
    }
  }, {
    accessorKey: 'is_visible',
    header: 'Visible',
    width: 70,
    minWidth: 70,
    maxWidth: 90,
    sortable: false,
    cell: ({
      row
    }) => {
      const field = row.original;
      return <Switch checked={editingField === field.id ? editData.is_visible : field.is_visible} disabled={editingField !== field.id} onCheckedChange={checked => {
        if (editingField === field.id) {
          setEditData({
            ...editData,
            is_visible: checked
          });
        } else {
          updateField(field.id, {
            is_visible: checked
          });
        }
      }} />;
    }
  }, {
    accessorKey: 'is_in_use',
    header: 'In Use',
    width: 70,
    minWidth: 70,
    maxWidth: 90,
    sortable: false,
    cell: ({
      row
    }) => {
      const field = row.original;
      return <Switch checked={editingField === field.id ? editData.is_in_use : field.is_in_use} disabled={editingField !== field.id} onCheckedChange={checked => {
        if (editingField === field.id) {
          setEditData({
            ...editData,
            is_in_use: checked
          });
        } else {
          updateField(field.id, {
            is_in_use: checked
          });
        }
      }} />;
    }
  }, {
    accessorKey: 'is_system_field',
    header: 'System',
    width: 70,
    minWidth: 70,
    maxWidth: 90,
    cell: ({
      row
    }) => {
      const field = row.original;
      return field.is_system_field ? <Badge variant="secondary" className="text-xs">System</Badge> : null;
    }
  }, {
    accessorKey: 'sort_order',
    header: 'Sort',
    width: 60,
    minWidth: 50,
    maxWidth: 80,
    cell: ({
      row
    }) => {
      const field = row.original;
      return editingField === field.id ? <Input type="number" value={editData.sort_order} onChange={e => setEditData({
        ...editData,
        sort_order: parseInt(e.target.value) || 0
      })} className="h-7 w-16" /> : <span className="text-xs text-muted-foreground">{field.sort_order}</span>;
    }
  }, {
    accessorKey: 'restrictions',
    header: 'Restrictions',
    width: 150,
    minWidth: 120,
    maxWidth: 200,
    cell: ({
      row
    }) => {
      const field = row.original;
      const fieldName = field.field_name;
      
      // Check if this field has status change rules
      const hasStatusRules = statusChangeRules[fieldName];
      
      // Check if this field is required by another status
      const requiredByFields: string[] = [];
      Object.entries(statusChangeRules).forEach(([statusField, rules]) => {
        Object.entries(rules).forEach(([statusValue, rule]) => {
          if (rule.requires === fieldName) {
            requiredByFields.push(`${statusField} = ${statusValue}`);
          }
        });
      });

      if (!hasStatusRules && requiredByFields.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }

      return (
        <div className="space-y-1">
          {hasStatusRules && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Status rules
            </Badge>
          )}
          {requiredByFields.length > 0 && (
            <div className="text-xs text-muted-foreground" title={requiredByFields.join(', ')}>
              Required for: {requiredByFields.length > 1 ? `${requiredByFields.length} statuses` : requiredByFields[0]}
            </div>
          )}
        </div>
      );
    }
  }, {
    accessorKey: 'sample_data',
    header: 'Sample Data',
    width: 120,
    minWidth: 100,
    maxWidth: 200,
    cell: ({
      row
    }) => {
      const field = row.original;
      
      if (editingField !== field.id) {
        return <span className="text-xs text-muted-foreground truncate block" title={field.sample_data || ""}>
          {field.sample_data || "—"}
        </span>;
      }

      // Render appropriate input based on field type
      switch (field.field_type) {
        case 'date':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-full justify-start text-left font-normal">
                  {editData.sample_data ? format(new Date(editData.sample_data), "MMM dd, yyyy") : "Select date..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editData.sample_data ? new Date(editData.sample_data) : undefined}
                  onSelect={(date) => setEditData({...editData, sample_data: date?.toISOString().split('T')[0] || ""})}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          );

        case 'datetime':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-full justify-start text-left font-normal">
                  {editData.sample_data ? format(new Date(editData.sample_data), "MMM dd, yyyy HH:mm") : "Select date & time..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2">
                  <Calendar
                    mode="single"
                    selected={editData.sample_data ? new Date(editData.sample_data) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const currentTime = editData.sample_data ? new Date(editData.sample_data) : new Date();
                        date.setHours(currentTime.getHours(), currentTime.getMinutes());
                        setEditData({...editData, sample_data: date.toISOString()});
                      }
                    }}
                    className="pointer-events-auto"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={editData.sample_data ? format(new Date(editData.sample_data), "HH:mm") : ""}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const date = editData.sample_data ? new Date(editData.sample_data) : new Date();
                        date.setHours(parseInt(hours), parseInt(minutes));
                        setEditData({...editData, sample_data: date.toISOString()});
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );

        case 'select':
          const options = field.dropdown_options || [];
          return (
            <Select value={editData.sample_data || ""} onValueChange={(v) => setEditData({...editData, sample_data: v})}>
              <SelectTrigger className="h-7">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'boolean':
          return (
            <div className="flex items-center gap-2">
              <Switch 
                checked={editData.sample_data === 'true'}
                onCheckedChange={(checked) => setEditData({...editData, sample_data: String(checked)})}
              />
              <span className="text-xs">{editData.sample_data === 'true' ? 'Yes' : 'No'}</span>
            </div>
          );

        case 'currency':
          return (
            <Input 
              value={editData.sample_data || ""} 
              onChange={(e) => setEditData({...editData, sample_data: e.target.value})}
              placeholder="$0.00"
              className="h-7"
            />
          );

        case 'percentage':
          return (
            <Input 
              value={editData.sample_data || ""} 
              onChange={(e) => setEditData({...editData, sample_data: e.target.value})}
              placeholder="0%"
              className="h-7"
            />
          );

        default: // text, email, phone, number, url, file
          return (
            <Input 
              value={editData.sample_data || ""} 
              onChange={(e) => setEditData({...editData, sample_data: e.target.value})}
              placeholder="Sample value..."
              className="h-7"
            />
          );
      }
    }
  }, {
    accessorKey: 'actions',
    header: 'Actions',
    width: 90,
    minWidth: 90,
    maxWidth: 120,
    sortable: false,
    cell: ({
      row
    }) => {
      const field = row.original;
      return <div className="flex gap-1">
            {editingField === field.id ? <>
                <Button size="sm" variant="ghost" onClick={() => saveEdit(field.id)}>
                  <Check className="h-4 w-4 text-success" />
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </> : <>
                <Button size="sm" variant="ghost" onClick={() => startEdit(field)}>
                  <Edit className="h-4 w-4" />
                </Button>
                {!field.is_system_field && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirmDelete(field)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>}
              </>}
          </div>;
    }
  }];
  return <div className="pl-4 pr-0 pt-2 pb-0 space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-xs italic text-muted-foreground/70">System configuration and field management</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {systemStats.map((stat, index) => <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="fields" className="space-y-4 mx-[10px]">
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
                    <Input id="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search fields..." className="pl-8 h-9" />
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
                      {uniqueSections.map(section => <SelectItem key={section} value={section}>{section}</SelectItem>)}
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
                      {uniqueTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="showSystem" checked={showSystemFields} onCheckedChange={setShowSystemFields} />
                    <Label htmlFor="showSystem" className="text-xs cursor-pointer">System</Label>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="showInactive" checked={showInactiveFields} onCheckedChange={setShowInactiveFields} />
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
                {loading ? <div className="text-center py-8">Loading fields...</div> : <DataTable columns={fieldColumns} data={filteredFields} searchTerm="" lockSort={false} lockReorder={false} lockResize={false} storageKey="admin-fields-table" showRowNumbers={false} />}
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
            <TaskAutomationsTable />
        </TabsContent>

        <TabsContent value="email-automations" className="space-y-4">
          <EmailAutomationsTable />
        </TabsContent>
      </Tabs>

      {/* Add Field Modal */}
      <AddFieldModal open={addFieldModalOpen} onOpenChange={setAddFieldModalOpen} onAdd={handleAddField} loading={loading} />

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
    </div>;
}