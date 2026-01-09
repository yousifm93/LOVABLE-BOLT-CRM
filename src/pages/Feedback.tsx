import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Loader2, ChevronDown, ChevronRight, ImagePlus, X, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Master list of feedback categories
const feedbackCategories = [
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
}

interface FeedbackItem {
  id: string;
  user_id: string;
  section_key: string;
  section_label: string;
  feedback_items: FeedbackItemContent[];
  created_at: string;
  updated_at: string;
  is_read_by_admin: boolean;
  admin_response_read_by_user: boolean;
}

interface ItemStatus {
  feedback_id: string;
  item_index: number;
  status: 'pending' | 'complete' | 'needs_help' | 'idea' | 'pending_user_review';
}

interface FeedbackComment {
  id: string;
  feedback_id: string;
  item_index: number;
  comment: string;
  admin_name?: string;
  created_at: string;
}

export default function Feedback() {
  const { crmUser } = useAuth();
  const { toast } = useToast();
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [itemStatuses, setItemStatuses] = useState<ItemStatus[]>([]);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // New feedback dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [newFeedbackImage, setNewFeedbackImage] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [crmUser?.id]);

  const loadFeedback = async () => {
    if (!crmUser?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all feedback for this user
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('team_feedback')
        .select('*')
        .eq('user_id', crmUser.id)
        .order('updated_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // Fetch item statuses
      const feedbackIds = feedbackData?.map(f => f.id) || [];
      let statusData: ItemStatus[] = [];
      if (feedbackIds.length > 0) {
        const { data: statuses } = await supabase
          .from('team_feedback_item_status')
          .select('*')
          .in('feedback_id', feedbackIds);
        statusData = (statuses || []) as ItemStatus[];
      }

      // Fetch comments
      let commentsData: FeedbackComment[] = [];
      if (feedbackIds.length > 0) {
        const { data: commentsResult } = await supabase
          .from('team_feedback_comments')
          .select('*')
          .in('feedback_id', feedbackIds)
          .order('created_at', { ascending: true });
        
        if (commentsResult && commentsResult.length > 0) {
          // Get admin names
          const adminIds = [...new Set(commentsResult.map(c => c.admin_id))];
          const { data: adminData } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', adminIds);
          
          const adminMap = new Map(adminData?.map(a => [a.id, `${a.first_name} ${a.last_name}`]) || []);
          commentsData = commentsResult.map(c => ({
            ...c,
            admin_name: adminMap.get(c.admin_id) || 'Admin'
          }));
        }
      }

      // Mark feedback with unread responses as read
      const unreadFeedbackIds = feedbackData?.filter(f => !f.admin_response_read_by_user).map(f => f.id) || [];
      if (unreadFeedbackIds.length > 0) {
        await supabase
          .from('team_feedback')
          .update({ admin_response_read_by_user: true })
          .in('id', unreadFeedbackIds);
      }

      const processedFeedback = (feedbackData || []).map(f => ({
        ...f,
        feedback_items: Array.isArray(f.feedback_items) 
          ? f.feedback_items.map((item: any) => 
              typeof item === 'string' ? { text: item } : { text: item.text || '', image_url: item.image_url }
            )
          : []
      })) as FeedbackItem[];

      setFeedbackList(processedFeedback);
      setItemStatuses(statusData);
      setComments(commentsData);

      // Expand all sections by default
      const initialExpanded: Record<string, boolean> = {};
      processedFeedback.forEach(f => { initialExpanded[f.id] = true; });
      setExpandedSections(initialExpanded);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast({ title: "Error", description: "Failed to load feedback.", variant: "destructive" });
    } finally {
      setLoading(false);
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

    setSubmitting(true);
    try {
      const categoryLabel = feedbackCategories.find(c => c.key === newCategory)?.label || newCategory;
      
      const feedbackItem: FeedbackItemContent = {
        text: newFeedbackText.trim(),
        image_url: newFeedbackImage
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
      setDialogOpen(false);
      setNewCategory("");
      setNewFeedbackText("");
      setNewFeedbackImage(undefined);
      loadFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getItemStatus = (feedbackId: string, itemIndex: number): 'pending' | 'complete' | 'needs_help' | 'idea' | 'pending_user_review' => {
    return itemStatuses.find(s => s.feedback_id === feedbackId && s.item_index === itemIndex)?.status || 'pending';
  };

  const getItemComments = (feedbackId: string, itemIndex: number) => {
    return comments.filter(c => c.feedback_id === feedbackId && c.item_index === itemIndex);
  };

  const getStatusBadge = (status: 'pending' | 'complete' | 'needs_help' | 'idea' | 'pending_user_review') => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Complete</Badge>;
      case 'needs_help':
        return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Needs Help</Badge>;
      case 'idea':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Idea</Badge>;
      case 'pending_user_review':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Pending Your Review</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Submit Feedback</h1>
          <p className="text-muted-foreground">Share your thoughts on what could be improved in the CRM.</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <Select value={newCategory} onValueChange={setNewCategory}>
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submitNewFeedback} disabled={submitting || !newCategory || !newFeedbackText.trim()}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : <><Send className="h-4 w-4 mr-2" />Submit</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {feedbackList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Feedback Yet</h3>
            <p className="text-muted-foreground mb-4">Click "New Feedback" to submit your first feedback.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((feedback) => {
            const isExpanded = expandedSections[feedback.id] ?? true;
            
            return (
              <Collapsible 
                key={feedback.id} 
                open={isExpanded} 
                onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, [feedback.id]: open }))}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                          <CardTitle className="text-lg">{feedback.section_label}</CardTitle>
                          <Badge variant="outline" className="ml-2">{feedback.feedback_items.length} item{feedback.feedback_items.length !== 1 ? 's' : ''}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(feedback.updated_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {feedback.feedback_items.map((item, index) => {
                        const status = getItemStatus(feedback.id, index);
                        const itemComments = getItemComments(feedback.id, index);
                        const isCompleted = status === 'complete';
                        
                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-lg border ${isCompleted ? 'bg-muted/30 opacity-75' : 'bg-muted/50'}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="text-sm font-medium text-muted-foreground min-w-[24px]">{index + 1}</span>
                                <div className="flex-1">
                                  <p className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {item.text || '(No text)'}
                                  </p>
                                  {item.image_url && (
                                    <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                      <img src={item.image_url} alt="Attached screenshot" className="h-20 w-auto object-cover rounded border hover:opacity-80 transition-opacity" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              {getStatusBadge(status)}
                            </div>
                            
                            {/* Admin Responses */}
                            {itemComments.length > 0 && (
                              <div className="ml-7 mt-3 space-y-2 border-l-2 border-primary/20 pl-3">
                                <p className="text-xs font-medium text-muted-foreground">Responses:</p>
                                {itemComments.map((comment) => (
                                  <div key={comment.id} className="text-sm">
                                    <span className="font-medium text-primary">{comment.admin_name}:</span>
                                    <span className="ml-1 text-muted-foreground">{comment.comment}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
