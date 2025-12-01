import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, History, ChevronDown, ChevronRight, FileText, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFields } from "@/contexts/FieldsContext";
import { generateTestValue } from "@/utils/testDataGenerator";

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

// Helper function to highlight merge tags in preview
const highlightMergeTags = (html: string): string => {
  // Replace {{field_name}} with styled badges
  return html.replace(/\{\{([^}]+)\}\}/g, (match, fieldName) => {
    return `<span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; font-weight: 500; display: inline-block; margin: 0 2px;">{{${fieldName}}}</span>`;
  });
};

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", html: "" });
  const [crmFields, setCrmFields] = useState<any[]>([]);
  const [categorizedFields, setCategorizedFields] = useState<Record<string, Array<{ tag: string; label: string; fieldType: string }>>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mergeTagSearch, setMergeTagSearch] = useState("");
  const [isMergeTagsCollapsed, setIsMergeTagsCollapsed] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiPanelExpanded, setIsAiPanelExpanded] = useState(true);
  const { toast } = useToast();
  const { allFields } = useFields();

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
      .select('field_name, display_name, section, field_type, sample_data')
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

    const dataToSave = { ...formData };

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
    setIsMergeTagsCollapsed(false);
  };

  const insertMergeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      html: prev.html + (prev.html ? ' ' : '') + tag,
    }));
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Error", description: "Please describe what email you want to create", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-template', {
        body: { prompt: aiPrompt }
      });

      if (error) throw error;

      if (data?.content) {
        setFormData(prev => ({ ...prev, html: data.content }));
        toast({ title: "Success", description: "Email content generated successfully!" });
        setAiPrompt("");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate email content", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Error", description: "Please describe how you want to refine the email", variant: "destructive" });
      return;
    }

    if (!formData.html.trim()) {
      toast({ title: "Error", description: "No content to refine. Please create content first.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-template', {
        body: { 
          prompt: aiPrompt,
          currentContent: formData.html
        }
      });

      if (error) throw error;

      if (data?.content) {
        setFormData(prev => ({ ...prev, html: data.content }));
        toast({ title: "Success", description: "Email content refined successfully!" });
        setAiPrompt("");
      }
    } catch (error: any) {
      console.error("AI refinement error:", error);
      toast({ title: "Error", description: error.message || "Failed to refine email content", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Live preview with sample data (memoized for performance)
  const livePreview = useMemo(() => {
    if (!formData.html) return '';
    
    let preview = formData.html;
    
    if (showSampleData) {
      // Build sample data from database fields with fallback to generated values
      const sampleData: Record<string, string> = {};
      
      allFields.forEach(field => {
        const fieldName = field.field_name;
        
        // Use sample_data from database if available, otherwise generate
        if (field.sample_data) {
          sampleData[fieldName] = field.sample_data;
        } else {
          // Fallback to generated value
          sampleData[fieldName] = generateTestValue(field, 0);
        }
      });
      
      // Replace merge tags with sample data
      preview = preview.replace(/\{\{([^}]+)\}\}/g, (match, fieldName) => {
        return sampleData[fieldName] || match;
      });
    } else {
      // Highlight merge tags as badges
      preview = highlightMergeTags(preview);
    }
    
    return preview;
  }, [formData.html, showSampleData, allFields]);

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
            <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Appraisal Scheduled"
                />
              </div>

              {/* AI Assistant Panel */}
              <Collapsible open={isAiPanelExpanded} onOpenChange={setIsAiPanelExpanded}>
                <Card className="border-primary/20 bg-primary/5">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">AI Assistant</CardTitle>
                        </div>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isAiPanelExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      <CardDescription>Let AI help you create or refine your email template</CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor="ai-prompt">Describe your email</Label>
                        <Textarea
                          id="ai-prompt"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g., Create a welcome email for new borrowers that introduces our team and explains the next steps..."
                          rows={3}
                          disabled={isGenerating}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleGenerateWithAI}
                          disabled={isGenerating || !aiPrompt.trim()}
                          className="flex-1"
                        >
                          {isGenerating ? (
                            <>Generating...</>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Email
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleRefineWithAI}
                          disabled={isGenerating || !aiPrompt.trim() || !formData.html.trim()}
                          variant="outline"
                          className="flex-1"
                        >
                          {isGenerating ? (
                            <>Refining...</>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refine Current
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                        <strong>💡 Tips:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Be specific about tone (professional, friendly, urgent)</li>
                          <li>Mention key points to include (dates, actions, deadlines)</li>
                          <li>AI will automatically include relevant merge tags</li>
                          <li>Use "Refine Current" to improve existing content</li>
                        </ul>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible open={!isMergeTagsCollapsed} onOpenChange={(open) => setIsMergeTagsCollapsed(!open)}>
                <div className="flex items-center justify-between mb-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
                      {isMergeTagsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <Label className="cursor-pointer">Merge Tags</Label>
                    </Button>
                  </CollapsibleTrigger>
                  {!isMergeTagsCollapsed && (
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
                  )}
                </div>
                
                <CollapsibleContent>
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
                          const filteredFields = fields.filter(field => 
                            field.label.toLowerCase().includes(mergeTagSearch.toLowerCase()) ||
                            field.tag.toLowerCase().includes(mergeTagSearch.toLowerCase())
                          );
                          return filteredFields.length > 0;
                        })
                        .map(([category, fields]) => {
                          const filteredFields = mergeTagSearch
                            ? fields.filter(field => 
                                field.label.toLowerCase().includes(mergeTagSearch.toLowerCase()) ||
                                field.tag.toLowerCase().includes(mergeTagSearch.toLowerCase())
                              )
                            : fields;
                          
                          return (
                            <Collapsible 
                              key={category} 
                              open={expandedSections[category]}
                              onOpenChange={(open) => setExpandedSections({...expandedSections, [category]: open})}
                            >
                              <div className="border rounded-md bg-card">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-between p-2 h-auto hover:bg-accent font-semibold text-xs"
                                    type="button"
                                  >
                                    <span className="text-left">{category}</span>
                                    {expandedSections[category] ? (
                                      <ChevronDown className="h-3 w-3 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 shrink-0" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="p-2 pt-0">
                                  <div className="flex flex-col gap-1">
                                    {filteredFields.map((field) => (
                                      <Button
                                        key={field.tag}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start text-xs h-auto py-1.5 px-2 hover:bg-accent"
                                        onClick={() => insertMergeTag(field.tag)}
                                        type="button"
                                      >
                                        <span className="font-medium text-primary">{field.label}</span>
                                      </Button>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="grid grid-cols-2 gap-4">
                {/* Rich Text Email Content */}
                <div className="space-y-2">
                  <Label htmlFor="html">Email Content *</Label>
                  <RichTextEditor
                    value={formData.html || ''}
                    onChange={(html) => setFormData({ ...formData, html })}
                    placeholder="Type your email content here. Use {{field_name}} for merge tags. Click the merge tags below to insert them."
                    className="min-h-[520px]"
                  />
                </div>

                 {/* Live Preview Panel */}
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label>Live Preview</Label>
                     <div className="flex items-center gap-2">
                       <Label htmlFor="sample-data" className="text-sm font-normal cursor-pointer">
                         Preview with Sample Data
                       </Label>
                       <Switch
                         id="sample-data"
                         checked={showSampleData}
                         onCheckedChange={setShowSampleData}
                       />
                     </div>
                   </div>

                   {/* Editable Sample Data Panel */}
                    {showSampleData && (
                      <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mb-4">
                        📝 Sample data is pulled from Field Management settings
                      </div>
                    )}

                    <div className="border rounded-md bg-muted/30 h-[520px] overflow-auto p-4">
                    {livePreview ? (
                      <div
                        className="bg-background prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: livePreview }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileText className="h-12 w-12 mb-2" />
                        <p>Preview will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseDialog} type="button">
                  Cancel
                </Button>
                <Button onClick={handleSave} type="button">
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">Create your first email template to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Created</TableHead>
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
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
