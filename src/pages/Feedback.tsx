import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, ImagePlus, X, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Master list of feedback categories - Website is first
const feedbackCategories = [
  { key: 'website', label: 'Website' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'email', label: 'Email' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'past_clients', label: 'Past Clients' },
  { key: 'real_estate_agents', label: 'Real Estate Agents' },
  { key: 'approved_lenders', label: 'Approved Lenders' },
  { key: 'bolt_bot', label: 'Bolt Bot' },
  { key: 'preapproval_letter', label: 'Pre-Approval Letter' },
  { key: 'loan_pricer', label: 'Loan Pricer' },
  { key: 'property_value', label: 'Property Value' },
  { key: 'income_calculator', label: 'Income Calculator' },
  { key: 'loan_estimate', label: 'Loan Estimate' },
  { key: 'condolist', label: 'Condolist' },
  { key: 'other', label: 'Other' },
];

interface FeedbackItemContent {
  text: string;
  image_url?: string;
  level?: number;
}

export default function Feedback() {
  const { crmUser } = useAuth();
  const { toast } = useToast();
  
  // New feedback dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [newFeedbackImage, setNewFeedbackImage] = useState<string | undefined>();
  const [feedbackLevel, setFeedbackLevel] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset level when category changes away from website
  const handleCategoryChange = (value: string) => {
    setNewCategory(value);
    if (value !== 'website') {
      setFeedbackLevel(null);
    }
  };

  // Reset all fields when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setNewCategory("");
      setNewFeedbackText("");
      setNewFeedbackImage(undefined);
      setFeedbackLevel(null);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | undefined> => {
    if (!crmUser?.id) return undefined;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${crmUser.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('feedback-attachments')
      .upload(fileName, file);
    
    if (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
      return undefined;
    }
    
    const { data: { publicUrl } } = supabase.storage.from('feedback-attachments').getPublicUrl(fileName);
    return publicUrl;
  };

  const submitNewFeedback = async () => {
    if (!crmUser?.id || !newCategory || !newFeedbackText.trim()) {
      toast({ title: "Error", description: "Please select a category and enter feedback.", variant: "destructive" });
      return;
    }

    // For website category, level is required
    if (newCategory === 'website' && !feedbackLevel) {
      toast({ title: "Error", description: "Please select a feedback level.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const categoryLabel = feedbackCategories.find(c => c.key === newCategory)?.label || newCategory;
      
      const feedbackItem: FeedbackItemContent = {
        text: newFeedbackText.trim(),
        image_url: newFeedbackImage,
        level: newCategory === 'website' ? feedbackLevel ?? undefined : undefined
      };

      const { error } = await supabase
        .from('team_feedback')
        .insert({
          user_id: crmUser.id,
          section_key: newCategory,
          section_label: categoryLabel,
          feedback_items: [feedbackItem] as any,
          is_read_by_admin: false,
          admin_response_read_by_user: true
        } as any);

      if (error) throw error;

      toast({ title: "Feedback Submitted", description: "Your feedback has been submitted successfully." });
      handleDialogOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Submit Feedback</h1>
          <p className="text-muted-foreground">Share your thoughts on what could be improved in the CRM.</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Submit New Feedback</h3>
          <p className="text-muted-foreground mb-6">Have an idea or suggestion? Let us know what could be improved.</p>
          
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Submit New Feedback</DialogTitle>
                <DialogDescription>
                  Select a category and describe what you'd like to see improved.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {feedbackCategories.map(cat => (
                        <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="feedback">Your Feedback</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Describe what you'd like to see changed or improved..."
                    value={newFeedbackText}
                    onChange={(e) => setNewFeedbackText(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                {/* Website Feedback Level - Only show when website category is selected */}
                {newCategory === 'website' && (
                  <div className="space-y-2">
                    <Label>Website Feedback Level</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={feedbackLevel === level ? "default" : "outline"}
                          className={cn(
                            "flex-1 flex flex-col h-auto py-3",
                            feedbackLevel === level && level === 1 && "bg-blue-600 hover:bg-blue-700",
                            feedbackLevel === level && level === 2 && "bg-yellow-500 hover:bg-yellow-600",
                            feedbackLevel === level && level === 3 && "bg-red-600 hover:bg-red-700"
                          )}
                          onClick={() => setFeedbackLevel(level)}
                        >
                          <span className="text-lg font-bold">{level}</span>
                          <span className="text-xs">
                            {level === 1 ? "Low" : level === 2 ? "Medium" : "High"}
                          </span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      1 = Low priority, 2 = Medium, 3 = High/Urgent
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Screenshot (optional)</Label>
                  {newFeedbackImage ? (
                    <div className="relative inline-block">
                      <img src={newFeedbackImage} alt="Attached" className="h-20 w-auto object-cover rounded border" />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-5 w-5" 
                        onClick={() => setNewFeedbackImage(undefined)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          if (e.target.files?.[0]) {
                            const url = await handleImageUpload(e.target.files[0]);
                            if (url) setNewFeedbackImage(url);
                          }
                        }} 
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span><ImagePlus className="h-4 w-4 mr-1" />Attach Screenshot</span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>Cancel</Button>
                <Button 
                  onClick={submitNewFeedback} 
                  disabled={submitting || !newCategory || !newFeedbackText.trim() || (newCategory === 'website' && !feedbackLevel)}
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : <><Send className="h-4 w-4 mr-2" />Submit</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
