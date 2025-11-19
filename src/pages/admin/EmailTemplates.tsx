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

// Define section display order for email template UI
const SECTION_DISPLAY_ORDER = [
  'CONTACT INFO',
  'BORROWER INFO',
  'LOAN INFO',
  'ADDRESS',
  'DATE',
  'LOAN STATUS',
  'OBJECT',
  'NOTES',
  'FILE',
  'TRACKING DATA',
  'AGENT & LENDER FIELDS',
  'OTHER'
];

// Helper function to group fields by their database section
const groupFieldsBySection = (fields: any[]) => {
  const sections: Record<string, Array<{ tag: string; label: string; fieldType: string }>> = {};
  
  fields.forEach(field => {
    const section = field.section || 'OTHER';
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push({
      tag: `{{${field.field_name}}}`,
      label: field.display_name,
      fieldType: field.field_type
    });
  });
  
  return sections;
};

// Helper to add contact relationship fields dynamically
const addContactRelationshipFields = (sections: Record<string, Array<{ tag: string; label: string; fieldType: string }>>) => {
  // Add relationship field templates that will be dynamically populated when sending emails
  sections['AGENT & LENDER FIELDS'] = [
    { tag: '{{buyer_agent_first_name}}', label: "Buyer's Agent First Name", fieldType: 'text' },
    { tag: '{{buyer_agent_last_name}}', label: "Buyer's Agent Last Name", fieldType: 'text' },
    { tag: '{{buyer_agent_name}}', label: "Buyer's Agent Full Name", fieldType: 'text' },
    { tag: '{{buyer_agent_email}}', label: "Buyer's Agent Email", fieldType: 'email' },
    { tag: '{{buyer_agent_phone}}', label: "Buyer's Agent Phone", fieldType: 'phone' },
    { tag: '{{buyer_agent_brokerage}}', label: "Buyer's Agent Brokerage", fieldType: 'text' },
    { tag: '{{listing_agent_first_name}}', label: 'Listing Agent First Name', fieldType: 'text' },
    { tag: '{{listing_agent_last_name}}', label: 'Listing Agent Last Name', fieldType: 'text' },
    { tag: '{{listing_agent_name}}', label: 'Listing Agent Full Name', fieldType: 'text' },
    { tag: '{{listing_agent_email}}', label: 'Listing Agent Email', fieldType: 'email' },
    { tag: '{{listing_agent_phone}}', label: 'Listing Agent Phone', fieldType: 'phone' },
    { tag: '{{listing_agent_company}}', label: 'Listing Agent Company', fieldType: 'text' },
    { tag: '{{lender_name}}', label: 'Lender Name', fieldType: 'text' },
    { tag: '{{account_executive_first_name}}', label: 'Account Executive First Name', fieldType: 'text' },
    { tag: '{{account_executive_last_name}}', label: 'Account Executive Last Name', fieldType: 'text' },
    { tag: '{{account_executive_name}}', label: 'Account Executive Full Name', fieldType: 'text' },
    { tag: '{{account_executive_email}}', label: 'Account Executive Email', fieldType: 'email' },
    { tag: '{{account_executive_phone}}', label: 'Account Executive Phone', fieldType: 'phone' },
  ];
  
  return sections;
};

// Helper to sort sections by priority
const sortSectionsByPriority = (sections: Record<string, any[]>) => {
  const sorted: Record<string, any[]> = {};
  
  SECTION_DISPLAY_ORDER.forEach(sectionName => {
    if (sections[sectionName]) {
      sorted[sectionName] = sections[sectionName];
    }
  });
  
  // Add any sections not in priority list at the end
  Object.keys(sections).forEach(sectionName => {
    if (!SECTION_DISPLAY_ORDER.includes(sectionName)) {
      sorted[sectionName] = sections[sectionName];
    }
  });
  
  return sorted;
};

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", html: "" });
  const [previewHtml, setPreviewHtml] = useState("");
  const [crmFields, setCrmFields] = useState<any[]>([]);
  const [categorizedFields, setCategorizedFields] = useState<Record<string, Array<{ tag: string; label: string; fieldType: string }>>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mergeTagSearch, setMergeTagSearch] = useState("");
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
      
      // Group fields by section and add relationship fields
      let sections = groupFieldsBySection(data || []);
      sections = addContactRelationshipFields(sections);
      sections = sortSectionsByPriority(sections);
      setCategorizedFields(sections);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.html) {
      toast({ title: "Validation Error", description: "Name and content are required", variant: "destructive" });
      return;
    }

    // Convert plain text to HTML if needed
    let htmlContent = formData.html;
    
    if (editorMode === 'plain') {
      // Convert plain text with newlines to HTML
      // Split by double newlines to identify paragraphs
      const paragraphs = htmlContent
        .split('\n\n')
        .map(para => para.trim())
        .filter(para => para.length > 0);
      
      // Convert each paragraph: replace single newlines with <br>
      const htmlParagraphs = paragraphs.map(para => {
        const withBreaks = para.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
      });
      
      // Wrap in basic HTML structure
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  ${htmlParagraphs.join('\n  ')}
</body>
</html>`;
    }

    const dataToSave = { ...formData, html: htmlContent };

    if (editingTemplate) {
      const { error } = await supabase
        .from("email_templates")
        .update(dataToSave)
        .eq("id", editingTemplate.id);

      if (error) {
        toast({ title: "Error updating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template updated successfully" });
        fetchTemplates();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("email_templates").insert(dataToSave);

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
                <div className="flex items-center justify-between mb-2">
                  <Label>Merge Tags</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allCategories = Object.keys(categorizedFields);
                        const newState: Record<string, boolean> = {};
                        allCategories.forEach(cat => newState[cat] = true);
                        setExpandedSections(newState);
                      }}
                      type="button"
                      className="text-xs h-7"
                    >
                      Expand All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedSections({})}
                      type="button"
                      className="text-xs h-7"
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>
                
                <Input
                  placeholder="Search merge tags..."
                  value={mergeTagSearch}
                  onChange={(e) => setMergeTagSearch(e.target.value)}
                  className="mb-2"
                />
                
                <div className="mt-2 max-h-96 overflow-y-auto border rounded-md p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(categorizedFields)
                      .filter(([category, fields]) => {
                        if (!mergeTagSearch) return fields.length > 0;
                        
                        // Filter based on search
                        const searchLower = mergeTagSearch.toLowerCase();
                        const categoryMatch = category.toLowerCase().includes(searchLower);
                        const fieldsMatch = fields.some(f => 
                          f.label.toLowerCase().includes(searchLower) || 
                          f.tag.toLowerCase().includes(searchLower)
                        );
                        
                        return (categoryMatch || fieldsMatch) && fields.length > 0;
                      })
                      .map(([category, fields]: [string, Array<{ tag: string; label: string }>]) => {
                        // Filter fields based on search
                        const filteredFields = mergeTagSearch 
                          ? fields.filter(f => 
                              f.label.toLowerCase().includes(mergeTagSearch.toLowerCase()) || 
                              f.tag.toLowerCase().includes(mergeTagSearch.toLowerCase())
                            )
                          : fields;
                        
                        if (filteredFields.length === 0) return null;
                        
                        return (
                          <div key={category} className="border rounded-md p-2 bg-card">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedSections(prev => ({ 
                                ...prev, 
                                [category]: !prev[category] 
                              }))}
                              type="button"
                              className="w-full justify-between h-auto p-2"
                            >
                              <h4 className="text-xs font-semibold text-foreground">
                                {category}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {expandedSections[category] ? '−' : '+'} {filteredFields.length}
                              </span>
                            </Button>
                            
                            {expandedSections[category] && (
                              <div className="flex flex-wrap gap-1.5 p-2 bg-muted rounded-md mt-2">
                                {filteredFields.map(({ tag, label }: { tag: string; label: string }) => (
                                  <Button
                                    key={tag}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => insertMergeTag(tag)}
                                    type="button"
                                    className="text-xs h-auto py-1 px-2"
                                  >
                                    {label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
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
                      ? "Type your email here. Press Enter twice for new paragraphs, once for line breaks. Click merge tag buttons to insert fields like {{first_name}}..."
                      : "Enter HTML content with merge tags..."
                  }
                  rows={12}
                  className={editorMode === 'html' ? 'font-mono text-sm' : 'text-sm'}
                />
                {editorMode === 'plain' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Enter twice to create paragraph spacing, or once for line breaks. Merge tags like {`{{first_name}}`} will be automatically replaced. Text will be converted to HTML when saved.
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
