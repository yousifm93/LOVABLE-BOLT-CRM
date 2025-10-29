import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
  created_at: string;
}

// Merge tags are now dynamically loaded from crm_fields table

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", html: "" });
  const [previewHtml, setPreviewHtml] = useState("");
  const [crmFields, setCrmFields] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editorMode, setEditorMode] = useState<'plain' | 'html'>('plain');
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchCrmFields();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading templates", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
  };

  const fetchCrmFields = async () => {
    const { data, error } = await supabase
      .from('crm_fields')
      .select('field_name, display_name, section, field_type')
      .eq('is_in_use', true)
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Error loading CRM fields:', error);
    } else {
      setCrmFields(data || []);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.html) {
      toast({ title: "Validation Error", description: "Name and content are required", variant: "destructive" });
      return;
    }

    if (editingTemplate) {
      const { error } = await supabase
        .from("email_templates")
        .update(formData)
        .eq("id", editingTemplate.id);

      if (error) {
        toast({ title: "Error updating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template updated successfully" });
        fetchTemplates();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("email_templates").insert(formData);

      if (error) {
        toast({ title: "Error creating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template created successfully" });
        fetchTemplates();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase.from("email_templates").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template deleted successfully" });
      fetchTemplates();
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, html: template.html });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: "", html: "" });
    setPreviewHtml("");
  };

  const insertMergeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      html: prev.html + tag,
    }));
  };

  const handlePreview = () => {
    let preview = formData.html;
    
    // Generate sample data for all CRM fields
    const sampleData: Record<string, string> = {};
    
    crmFields.forEach((field) => {
      const tag = `{{${field.field_name}}}`;
      let sampleValue = '';
      
      // Generate appropriate sample value based on field name patterns
      if (field.field_name.includes('first_name')) {
        sampleValue = 'John';
      } else if (field.field_name.includes('last_name')) {
        sampleValue = 'Doe';
      } else if (field.field_name.includes('name') && !field.field_name.includes('_name')) {
        sampleValue = 'Sample Name';
      } else if (field.field_name.includes('email')) {
        sampleValue = 'example@email.com';
      } else if (field.field_name.includes('phone')) {
        sampleValue = '(555) 123-4567';
      } else if (field.field_name.includes('amount') || field.field_name.includes('price')) {
        sampleValue = '$450,000';
      } else if (field.field_name.includes('rate') && !field.field_name.includes('operating')) {
        sampleValue = '6.5%';
      } else if (field.field_name.includes('date')) {
        sampleValue = new Date().toLocaleDateString();
      } else if (field.field_name.includes('address')) {
        sampleValue = '123 Main Street';
      } else if (field.field_name.includes('city')) {
        sampleValue = 'Los Angeles';
      } else if (field.field_name.includes('state')) {
        sampleValue = 'CA';
      } else if (field.field_name.includes('zip')) {
        sampleValue = '90001';
      } else if (field.field_name.includes('status')) {
        sampleValue = 'Active';
      } else if (field.field_name.includes('score') || field.field_name.includes('fico')) {
        sampleValue = '740';
      } else if (field.field_name.includes('dti')) {
        sampleValue = '38%';
      } else {
        sampleValue = `Sample ${field.display_name}`;
      }
      
      sampleData[tag] = sampleValue;
    });
    
    // Replace all merge tags with sample data
    Object.entries(sampleData).forEach(([tag, value]) => {
      preview = preview.replace(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    
    setPreviewHtml(preview);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Email Templates</h2>
          <p className="text-muted-foreground">Create and manage email templates with merge tags</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/email-history">
              <History className="h-4 w-4 mr-2" />
              Email History
            </Link>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTemplate(null)}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Appraisal Scheduled"
                />
              </div>

              <div>
                <Label>Merge Tags</Label>
                <div className="space-y-3 mt-2 max-h-96 overflow-y-auto border rounded-md p-3">
                  {Object.entries(
                    crmFields.reduce((acc, field) => {
                      if (!acc[field.section]) {
                        acc[field.section] = [];
                      }
                      acc[field.section].push({
                        tag: `{{${field.field_name}}}`,
                        label: field.display_name,
                      });
                      return acc;
                    }, {} as Record<string, Array<{ tag: string; label: string }>>)
                  )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([section, fields]: [string, Array<{ tag: string; label: string }>]) => (
                      <div key={section} className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))}
                          type="button"
                          className="w-full justify-between h-auto p-2"
                        >
                          <h4 className="text-sm font-semibold text-foreground">{section}</h4>
                          <span className="text-xs text-muted-foreground">
                            {expandedSections[section] ? 'Collapse' : 'Expand'} ({fields.length} fields)
                          </span>
                        </Button>
                        
                        {expandedSections[section] && (
                          <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                            {fields.map(({ tag, label }: { tag: string; label: string }) => (
                              <Button
                                key={tag}
                                variant="outline"
                                size="sm"
                                onClick={() => insertMergeTag(tag)}
                                type="button"
                                className="text-xs h-auto py-1"
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="content">Email Content</Label>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      variant={editorMode === 'plain' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditorMode('plain')}
                    >
                      Plain Text
                    </Button>
                    <Button
                      type="button"
                      variant={editorMode === 'html' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditorMode('html')}
                    >
                      HTML
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="content"
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  placeholder={
                    editorMode === 'plain'
                      ? "Type your email here. Click merge tag buttons above to insert fields like {{first_name}}..."
                      : "Enter HTML content with merge tags..."
                  }
                  rows={12}
                  className={editorMode === 'html' ? 'font-mono text-sm' : 'text-sm'}
                />
                {editorMode === 'plain' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    The email will be formatted as HTML when sent. Use merge tags like {`{{first_name}}`} anywhere in your text.
                  </p>
                )}
              </div>

              {previewHtml && (
                <div>
                  <Label>Preview</Label>
                  <div
                    className="mt-2 p-4 border rounded-md bg-background"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreview} type="button">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingTemplate ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>
                Created {new Date(template.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No email templates yet. Create your first template!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
