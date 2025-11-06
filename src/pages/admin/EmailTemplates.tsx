import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

// Helper function to categorize fields with contact relationships
const categorizeFieldsByType = (fields: any[]) => {
  const categories: Record<string, Array<{ tag: string; label: string }>> = {
    'Borrower Information': [],
    'Loan & Property': [],
    'Financial Information': [],
    "Buyer's Agent": [
      { tag: '{{buyer_agent_first_name}}', label: 'First Name' },
      { tag: '{{buyer_agent_last_name}}', label: 'Last Name' },
      { tag: '{{buyer_agent_name}}', label: 'Full Name' },
      { tag: '{{buyer_agent_email}}', label: 'Email' },
      { tag: '{{buyer_agent_phone}}', label: 'Phone' },
      { tag: '{{buyer_agent_brokerage}}', label: 'Brokerage' },
    ],
    'Listing Agent': [
      { tag: '{{listing_agent_first_name}}', label: 'First Name' },
      { tag: '{{listing_agent_last_name}}', label: 'Last Name' },
      { tag: '{{listing_agent_name}}', label: 'Full Name' },
      { tag: '{{listing_agent_email}}', label: 'Email' },
      { tag: '{{listing_agent_phone}}', label: 'Phone' },
      { tag: '{{listing_agent_company}}', label: 'Company' },
    ],
    'Lender & Account Executive': [
      { tag: '{{lender_name}}', label: 'Lender Name' },
      { tag: '{{account_executive_first_name}}', label: 'AE First Name' },
      { tag: '{{account_executive_last_name}}', label: 'AE Last Name' },
      { tag: '{{account_executive_name}}', label: 'AE Full Name' },
      { tag: '{{account_executive_email}}', label: 'AE Email' },
      { tag: '{{account_executive_phone}}', label: 'AE Phone' },
    ],
    'Dates & Timeline': [],
    'Status & Operations': [],
    'Other Fields': []
  };
  
  fields.forEach(field => {
    const fieldName = field.field_name.toLowerCase();
    const tag = `{{${field.field_name}}}`;
    const item = { tag, label: field.display_name };
    
    // Categorize based on field name patterns and types
    if (
      fieldName.includes('first_name') || 
      fieldName.includes('last_name') || 
      fieldName.includes('middle_name') ||
      fieldName.includes('borrower_name') ||
      fieldName.includes('dob') ||
      fieldName === 'name'
    ) {
      categories['Names & Identity'].push(item);
    } else if (
      fieldName.includes('email') || 
      fieldName.includes('phone')
    ) {
      categories['Contact Information'].push(item);
    } else if (
      field.field_type === 'date' || 
      field.field_type === 'datetime' ||
      fieldName.includes('_at') ||
      fieldName.includes('_date') ||
      fieldName.includes('_eta')
    ) {
      categories['Dates & Deadlines'].push(item);
    } else if (
      field.field_type === 'currency' ||
      fieldName.includes('amount') ||
      fieldName.includes('price') ||
      fieldName.includes('payment') ||
      fieldName.includes('income') ||
      fieldName.includes('assets') ||
      fieldName.includes('liabilities') ||
      fieldName.includes('dues') ||
      fieldName.includes('insurance') ||
      fieldName.includes('rate') ||
      fieldName.includes('piti') ||
      fieldName.includes('principal') ||
      fieldName.includes('taxes') ||
      fieldName.includes('hoa')
    ) {
      categories['Financial & Currency'].push(item);
    } else if (
      fieldName.includes('status') ||
      fieldName.includes('converted')
    ) {
      categories['Status & Progress'].push(item);
    } else if (
      fieldName.includes('loan_') ||
      fieldName.includes('program') ||
      fieldName.includes('term') ||
      fieldName.includes('residency') ||
      fieldName.includes('occupancy') ||
      fieldName.includes('pr_type')
    ) {
      categories['Loan Details'].push(item);
    } else if (
      fieldName.includes('property_') ||
      fieldName.includes('subject_') ||
      fieldName.includes('address') ||
      fieldName.includes('city') ||
      fieldName.includes('state') ||
      fieldName.includes('zip') ||
      fieldName.includes('appraisal_value')
    ) {
      categories['Property Information'].push(item);
    } else if (
      field.field_type === 'file' ||
      fieldName.includes('_file')
    ) {
      categories['Documents & Files'].push(item);
    } else if (
      fieldName.includes('agent') ||
      fieldName.includes('lender') ||
      fieldName.includes('teammate') ||
      fieldName.includes('assigned')
    ) {
      categories['Team & Contacts'].push(item);
    } else {
      categories['Other Information'].push(item);
    }
  });
  
  return categories;
};

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
    
    // Convert newlines to <br> tags if in plain text mode
    if (editorMode === 'plain') {
      preview = preview.replace(/\n/g, '<br>');
    }
    
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
                  {Object.entries(categorizeFieldsByType(crmFields))
                    .filter(([_, fields]) => fields.length > 0)
                    .map(([category, fields]: [string, Array<{ tag: string; label: string }>]) => (
                      <div key={category} className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedSections(prev => ({ ...prev, [category]: !prev[category] }))}
                          type="button"
                          className="w-full justify-between h-auto p-2"
                        >
                          <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                          <span className="text-xs text-muted-foreground">
                            {expandedSections[category] ? 'Collapse' : 'Expand'} ({fields.length} fields)
                          </span>
                        </Button>
                        
                        {expandedSections[category] && (
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
                    className="mt-2 p-4 border rounded-md bg-background whitespace-pre-wrap"
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

{templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No email templates yet. Create your first template!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
