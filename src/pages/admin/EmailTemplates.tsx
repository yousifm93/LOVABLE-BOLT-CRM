import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  html: string;
  created_at: string;
}

const MERGE_TAGS = [
  { tag: "{{borrower_first_name}}", label: "Borrower First Name" },
  { tag: "{{borrower_last_name}}", label: "Borrower Last Name" },
  { tag: "{{borrower_email}}", label: "Borrower Email" },
  { tag: "{{borrower_phone}}", label: "Borrower Phone" },
  { tag: "{{address}}", label: "Property Address" },
  { tag: "{{city}}", label: "City" },
  { tag: "{{state}}", label: "State" },
  { tag: "{{zip_code}}", label: "Zip Code" },
  { tag: "{{loan_amount}}", label: "Loan Amount" },
  { tag: "{{sales_price}}", label: "Sales Price" },
  { tag: "{{loan_type}}", label: "Loan Type" },
  { tag: "{{property_type}}", label: "Property Type" },
  { tag: "{{program}}", label: "Program" },
  { tag: "{{agent_name}}", label: "Agent Name" },
  { tag: "{{agent_email}}", label: "Agent Email" },
  { tag: "{{sender_name}}", label: "Sender Name" },
  { tag: "{{sender_email}}", label: "Sender Email" },
];

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", html: "" });
  const [previewHtml, setPreviewHtml] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
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
    // Replace merge tags with sample data for preview
    let preview = formData.html;
    const sampleData = {
      "{{borrower_first_name}}": "John",
      "{{borrower_last_name}}": "Doe",
      "{{borrower_email}}": "john.doe@example.com",
      "{{borrower_phone}}": "(555) 123-4567",
      "{{address}}": "123 Main Street",
      "{{city}}": "Los Angeles",
      "{{state}}": "CA",
      "{{zip_code}}": "90001",
      "{{loan_amount}}": "$450,000",
      "{{sales_price}}": "$500,000",
      "{{loan_type}}": "Purchase",
      "{{property_type}}": "Single Family",
      "{{program}}": "Conventional",
      "{{agent_name}}": "Jane Smith",
      "{{agent_email}}": "jane.smith@realty.com",
      "{{sender_name}}": "Yousif Mohammed",
      "{{sender_email}}": "yusufminc@gmail.com",
    };

    Object.entries(sampleData).forEach(([tag, value]) => {
      preview = preview.replace(new RegExp(tag, "g"), value);
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
                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                  {MERGE_TAGS.map(({ tag, label }) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => insertMergeTag(tag)}
                      type="button"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="content">HTML Content</Label>
                <Textarea
                  id="content"
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  placeholder="Enter HTML content with merge tags..."
                  rows={12}
                  className="font-mono text-sm"
                />
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
