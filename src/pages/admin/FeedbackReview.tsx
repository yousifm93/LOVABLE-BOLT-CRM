import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday } from "date-fns";
import { Send, Loader2, MessageSquare, User, Check, HelpCircle, ChevronDown, ChevronRight, Lightbulb, Clock, Mail } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface FeedbackItemContent {
  text: string;
  image_url?: string;
}

interface FeedbackItem {
  id: string;
  user_id: string;
  section_key: string;
  section_label: string;
  feedback_items: Array<FeedbackItemContent | string>;
  created_at: string;
  updated_at: string;
  is_read_by_admin: boolean;
  admin_response_read_by_user: boolean;
}

interface FeedbackComment {
  id: string;
  feedback_id: string;
  item_index: number;
  comment: string;
  admin_id: string;
  admin_name?: string;
  created_at: string;
}

interface ItemStatus {
  id: string;
  feedback_id: string;
  item_index: number;
  status: 'pending' | 'complete' | 'needs_help' | 'idea' | 'pending_user_review';
  updated_by: string;
  updated_at: string;
}

export default function FeedbackReview() {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [itemStatuses, setItemStatuses] = useState<ItemStatus[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [openBucketOpen, setOpenBucketOpen] = useState(false);
  const [pendingReviewBucketOpen, setPendingReviewBucketOpen] = useState(false);
  const [ideasBucketOpen, setIdeasBucketOpen] = useState(false);
  const [completeBucketOpen, setCompleteBucketOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();
  const { crmUser } = useAuth();

  useEffect(() => {
    if (!crmUser?.id) return; // Wait for user to load
    
    const fetchData = async () => {
      try {
        // Use server-side function to determine admin access (not client-side role)
        const { data: isAdminResult } = await supabase.rpc('has_admin_access');
        const isAdmin = isAdminResult === true;
        
        // Build feedback query - admins see all feedback, non-admins only see their own
        let feedbackQuery = supabase
          .from('team_feedback')
          .select('*')
          .order('updated_at', { ascending: false });
        
        // Only filter by user_id if NOT an admin
        if (!isAdmin) {
          feedbackQuery = feedbackQuery.eq('user_id', crmUser.id);
        }

        const { data: feedbackData, error: feedbackError } = await feedbackQuery;

        if (feedbackError) throw feedbackError;

        const userIds = [...new Set(feedbackData?.map(f => f.user_id) || [])];

        // Handle empty userIds - don't call .in() with empty array
        let usersData: { id: string; first_name: string; last_name: string; email?: string }[] = [];
        if (userIds.length > 0) {
          const { data, error: usersError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', userIds);

          if (usersError) throw usersError;
          usersData = data || [];
        }
        
        // Admins see all team members with feedback, non-admins only see their own tab
        const teamMembersToShow = isAdmin 
          ? usersData || []
          : usersData?.filter(u => u.id === crmUser?.id) || [];

        const { data: commentsData, error: commentsError } = await supabase
          .from('team_feedback_comments')
          .select('*')
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        const adminIds = [...new Set(commentsData?.map(c => c.admin_id) || [])];
        
        // Handle empty adminIds - don't call .in() with empty array
        let adminMap = new Map<string, string>();
        if (adminIds.length > 0) {
          const { data: adminData } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', adminIds);

          adminMap = new Map(adminData?.map(a => [a.id, `${a.first_name} ${a.last_name}`]) || []);
        }
        const enrichedComments = commentsData?.map(c => ({
          ...c,
          admin_name: adminMap.get(c.admin_id) || 'Admin'
        })) || [];

        const { data: statusData } = await supabase
          .from('team_feedback_item_status')
          .select('*');

        // Mark all unread feedback as read by admin (only if admin)
        if (isAdmin) {
          const unreadIds = feedbackData?.filter(f => !f.is_read_by_admin).map(f => f.id) || [];
          if (unreadIds.length > 0) {
            await supabase
              .from('team_feedback')
              .update({ is_read_by_admin: true })
              .in('id', unreadIds);
          }
        }

        setTeamMembers(teamMembersToShow);
        setFeedback((feedbackData || []).map(f => ({
          ...f,
          feedback_items: Array.isArray(f.feedback_items) ? f.feedback_items as Array<FeedbackItemContent | string> : []
        })));
        setComments(enrichedComments);
        setItemStatuses((statusData || []) as ItemStatus[]);
        
        if (usersData && usersData.length > 0) {
          setSelectedUser(usersData[0].id);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
        toast({ title: "Error", description: "Failed to load feedback data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast, crmUser?.id]);

  const getUserFeedback = (userId: string) => feedback.filter(f => f.user_id === userId);

  const getItemComments = (feedbackId: string, itemIndex: number) => 
    comments.filter(c => c.feedback_id === feedbackId && c.item_index === itemIndex);

  const getItemStatus = (feedbackId: string, itemIndex: number): 'pending' | 'complete' | 'needs_help' | 'idea' | 'pending_user_review' => 
    itemStatuses.find(s => s.feedback_id === feedbackId && s.item_index === itemIndex)?.status || 'pending';

  const getItemText = (item: FeedbackItemContent | string): string => {
    if (typeof item === 'string') return item;
    return item.text || '';
  };

  const getItemImageUrl = (item: FeedbackItemContent | string): string | undefined => {
    if (typeof item === 'string') return undefined;
    return item.image_url;
  };

  const updateItemStatus = async (feedbackId: string, itemIndex: number, status: 'complete' | 'needs_help' | 'idea' | 'pending_user_review') => {
    if (!crmUser?.id) return;
    
    // Check if clicking the same status - if so, clear it (toggle off)
    const currentStatus = getItemStatus(feedbackId, itemIndex);
    const shouldClear = currentStatus === status;
    
    try {
      if (shouldClear) {
        // Delete the status record to reset to 'pending'
        const { error } = await supabase
          .from('team_feedback_item_status')
          .delete()
          .eq('feedback_id', feedbackId)
          .eq('item_index', itemIndex);

        if (error) throw error;

        setItemStatuses(prev => prev.filter(s => !(s.feedback_id === feedbackId && s.item_index === itemIndex)));
        toast({ title: "Status Cleared", description: "Item returned to pending." });
      } else {
        // Upsert the new status
        const { data, error } = await supabase
          .from('team_feedback_item_status')
          .upsert({ feedback_id: feedbackId, item_index: itemIndex, status, updated_by: crmUser.id, updated_at: new Date().toISOString() }, { onConflict: 'feedback_id,item_index' })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        const newItemStatuses = [...itemStatuses.filter(s => !(s.feedback_id === feedbackId && s.item_index === itemIndex)), data as ItemStatus];
        setItemStatuses(newItemStatuses);
        
        const statusMessages = {
          complete: "Marked Complete",
          needs_help: "Still Needs Help",
          idea: "Marked as Idea",
          pending_user_review: "Sent for User Review"
        };
        toast({ title: statusMessages[status], description: "Status updated." });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const submitComment = async (feedbackId: string, itemIndex: number) => {
    const commentKey = `${feedbackId}-${itemIndex}`;
    const comment = newComments[commentKey]?.trim();
    if (!comment || !crmUser?.id) return;

    setSubmittingComment(commentKey);
    try {
      const { data, error } = await supabase
        .from('team_feedback_comments')
        .insert({ feedback_id: feedbackId, item_index: itemIndex, comment, admin_id: crmUser.id })
        .select()
        .single();

      if (error) throw error;

      // Mark the feedback as having an unread admin response for the user
      await supabase
        .from('team_feedback')
        .update({ admin_response_read_by_user: false })
        .eq('id', feedbackId);

      setComments(prev => [...prev, { ...data, admin_name: `${crmUser.first_name} ${crmUser.last_name}` }]);
      setNewComments(prev => ({ ...prev, [commentKey]: '' }));
      toast({ title: "Comment Added", description: "Your response has been saved." });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({ title: "Error", description: "Failed to submit comment.", variant: "destructive" });
    } finally {
      setSubmittingComment(null);
    }
  };

  // Count Open Items (pending + needs_help status) instead of unread feedback
  const getOpenItemsCount = (userId: string) => {
    const userFeedback = getUserFeedback(userId);
    let count = 0;
    userFeedback.forEach(fb => {
      fb.feedback_items.forEach((item, index) => {
        const status = getItemStatus(fb.id, index);
        // Only count pending and needs_help as "open"
        if (status === 'pending' || status === 'needs_help') {
          count++;
        }
      });
    });
    return count;
  };

  const sendFeedbackUpdate = async (member: TeamMember) => {
    if (!crmUser?.id || !member.email) {
      toast({ title: "Error", description: "User email not available.", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const userFeedback = getUserFeedback(member.id);
      
      // Get comments made by the current admin for this user's feedback
      const adminComments = comments.filter(c => 
        c.admin_id === crmUser.id && 
        userFeedback.some(fb => fb.id === c.feedback_id)
      );

      // Filter to today's comments, or most recent ones if none today
      let relevantComments = adminComments.filter(c => isToday(new Date(c.created_at)));
      
      if (relevantComments.length === 0 && adminComments.length > 0) {
        // Get the most recent day's comments
        const sortedComments = [...adminComments].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const mostRecentDate = new Date(sortedComments[0].created_at).toDateString();
        relevantComments = adminComments.filter(c => 
          new Date(c.created_at).toDateString() === mostRecentDate
        );
      }

      if (relevantComments.length === 0) {
        toast({ title: "No Updates", description: "No recent comments to send.", variant: "destructive" });
        setSendingEmail(false);
        return;
      }

      // Group comments by section
      const commentsBySection: Record<string, { sectionLabel: string; comments: Array<{ itemIndex: number; itemText: string; comment: string }> }> = {};
      
      for (const comment of relevantComments) {
        const fb = userFeedback.find(f => f.id === comment.feedback_id);
        if (fb) {
          if (!commentsBySection[fb.id]) {
            commentsBySection[fb.id] = { sectionLabel: fb.section_label, comments: [] };
          }
          const item = fb.feedback_items[comment.item_index];
          const itemText = getItemText(item);
          commentsBySection[fb.id].comments.push({
            itemIndex: comment.item_index + 1,
            itemText: itemText.substring(0, 100) + (itemText.length > 100 ? '...' : ''),
            comment: comment.comment
          });
        }
      }

      // Build email HTML
      let emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Feedback Update</h2>
          <p>Hi ${member.first_name},</p>
          <p>Here's a summary of the feedback updates I made for you:</p>
      `;

      for (const sectionId of Object.keys(commentsBySection)) {
        const section = commentsBySection[sectionId];
        emailBody += `
          <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #444;">${section.sectionLabel}</h3>
        `;
        for (const c of section.comments) {
          emailBody += `
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #3b82f6;">
              <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;"><strong>Item ${c.itemIndex}:</strong> ${c.itemText}</p>
              <p style="margin: 0; color: #333;">${c.comment}</p>
            </div>
          `;
        }
        emailBody += `</div>`;
      }

      emailBody += `
          <p style="margin-top: 20px;">Let me know if you have any questions!</p>
          <p>- ${crmUser.first_name}</p>
        </div>
      `;

      const { error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: member.email,
          cc: crmUser.email,
          subject: `Feedback Update from ${crmUser.first_name}`,
          html: emailBody,
          from_email: 'noreply@mortgagebolt.org',
          from_name: `${crmUser.first_name} ${crmUser.last_name}`
        }
      });

      if (error) throw error;

      toast({ title: "Email Sent", description: `Update sent to ${member.first_name}.` });
    } catch (error) {
      console.error('Error sending feedback update:', error);
      toast({ title: "Error", description: "Failed to send email.", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (teamMembers.length === 0) return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Team Feedback Review</h1>
      <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback has been submitted yet.</CardContent></Card>
    </div>
  );

  const renderFeedbackItem = (fb: FeedbackItem, item: FeedbackItemContent | string, index: number, isCompleted: boolean, isIdea: boolean, isPendingReview: boolean = false) => {
    const itemComments = getItemComments(fb.id, index);
    const commentKey = `${fb.id}-${index}`;
    const currentStatus = getItemStatus(fb.id, index);
    const itemText = getItemText(item);
    const itemImageUrl = getItemImageUrl(item);

    return (
      <div key={`${fb.id}-${index}`} className={`space-y-3 p-4 rounded-lg border ${isCompleted ? 'bg-muted/30 opacity-75' : isIdea ? 'bg-purple-50 dark:bg-purple-950/20' : isPendingReview ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-muted/50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">{fb.section_label}</Badge>
                {isIdea && <Badge className="bg-purple-100 text-purple-700 text-xs">Idea</Badge>}
                {isPendingReview && <Badge className="bg-blue-100 text-blue-700 text-xs">Pending Review</Badge>}
                {currentStatus === 'needs_help' && <Badge className="bg-orange-100 text-orange-700 text-xs">Needs Help</Badge>}
              </div>
              <p className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{itemText || '(No text)'}</p>
              {itemImageUrl && (
                <a href={itemImageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={itemImageUrl} alt="Attached screenshot" className="h-20 w-auto object-cover rounded border hover:opacity-80 transition-opacity" />
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button size="sm" variant={currentStatus === 'complete' ? 'default' : 'outline'} className={currentStatus === 'complete' ? 'bg-green-600 hover:bg-green-700 h-7' : 'h-7 text-green-600 border-green-600 hover:bg-green-50'} onClick={() => updateItemStatus(fb.id, index, 'complete')}>
              <Check className="h-3.5 w-3.5 mr-1" /> Complete
            </Button>
            <Button size="sm" variant={currentStatus === 'needs_help' ? 'default' : 'outline'} className={currentStatus === 'needs_help' ? 'bg-orange-600 hover:bg-orange-700 h-7' : 'h-7 text-orange-600 border-orange-600 hover:bg-orange-50'} onClick={() => updateItemStatus(fb.id, index, 'needs_help')}>
              <HelpCircle className="h-3.5 w-3.5 mr-1" /> Still Need Help
            </Button>
            <Button size="sm" variant={currentStatus === 'idea' ? 'default' : 'outline'} className={currentStatus === 'idea' ? 'bg-purple-600 hover:bg-purple-700 h-7' : 'h-7 text-purple-600 border-purple-600 hover:bg-purple-50'} onClick={() => updateItemStatus(fb.id, index, 'idea')}>
              <Lightbulb className="h-3.5 w-3.5 mr-1" /> Idea
            </Button>
            <Button size="sm" variant={currentStatus === 'pending_user_review' ? 'default' : 'outline'} className={currentStatus === 'pending_user_review' ? 'bg-blue-600 hover:bg-blue-700 h-7' : 'h-7 text-blue-600 border-blue-600 hover:bg-blue-50'} onClick={() => updateItemStatus(fb.id, index, 'pending_user_review')}>
              <Clock className="h-3.5 w-3.5 mr-1" /> Pending Review
            </Button>
          </div>
        </div>
        {itemComments.length > 0 && (
          <div className="ml-4 space-y-2">
            {itemComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2 text-sm">
                <User className="h-4 w-4 text-primary mt-0.5" />
                <div><span className="font-medium text-primary">{comment.admin_name}:</span><span className="ml-1 text-muted-foreground">{comment.comment}</span><span className="ml-2 text-xs text-muted-foreground">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span></div>
              </div>
            ))}
          </div>
        )}
        <div className="ml-4 flex items-center gap-2">
          <Input placeholder="Add a response..." value={newComments[commentKey] || ''} onChange={(e) => setNewComments(prev => ({ ...prev, [commentKey]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(fb.id, index); } }} className="text-sm" />
          <Button size="sm" onClick={() => submitComment(fb.id, index)} disabled={!newComments[commentKey]?.trim() || submittingComment === commentKey}>{submittingComment === commentKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>
    );
  };

  // Aggregate all items across all feedback entries into four buckets
  const getAggregatedItems = (userId: string) => {
    const userFeedback = getUserFeedback(userId);
    const openItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];
    const pendingReviewItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];
    const ideaItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];
    const completeItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];

    userFeedback.forEach(fb => {
      fb.feedback_items.forEach((item, index) => {
        const status = getItemStatus(fb.id, index);
        if (status === 'complete') {
          completeItems.push({ fb, item, index, status });
        } else if (status === 'pending_user_review') {
          pendingReviewItems.push({ fb, item, index, status });
        } else if (status === 'idea') {
          ideaItems.push({ fb, item, index, status });
        } else {
          // pending, needs_help go to Open Items
          openItems.push({ fb, item, index, status });
        }
      });
    });

    return { openItems, pendingReviewItems, ideaItems, completeItems };
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Team Feedback Review</h1>
      <Tabs value={selectedUser || ''} onValueChange={setSelectedUser}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
        {teamMembers.map((member) => {
            const openCount = getOpenItemsCount(member.id);
            return (
              <div key={member.id} className="flex items-center">
                <TabsTrigger value={member.id} className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {member.first_name} {member.last_name}
                  {openCount > 0 && (
                    <Badge className="ml-1 bg-red-500 text-white h-5 min-w-[20px] text-xs">
                      {openCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-1 text-muted-foreground hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendFeedbackUpdate(member);
                  }}
                  disabled={sendingEmail}
                  title={`Send update email to ${member.first_name}`}
                >
                  {sendingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                </Button>
              </div>
            );
          })}
        </TabsList>
        {teamMembers.map((member) => {
          const { openItems, pendingReviewItems, ideaItems, completeItems } = getAggregatedItems(member.id);
          
          return (
            <TabsContent key={member.id} value={member.id} className="space-y-6">
              {getUserFeedback(member.id).length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback submitted by {member.first_name} yet.</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  {/* Open Bucket - pending, needs_help */}
                  {openItems.length > 0 && (
                    <Collapsible open={openBucketOpen} onOpenChange={setOpenBucketOpen}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {openBucketOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                <HelpCircle className="h-5 w-5 text-orange-500" />
                                <CardTitle className="text-xl">Open Items</CardTitle>
                                <Badge variant="outline" className="ml-2">
                                  {openItems.length}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            {openItems.map(({ fb, item, index, status }) => {
                              return renderFeedbackItem(fb, item, index, false, false, false);
                            })}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Pending Review Bucket */}
                  {pendingReviewItems.length > 0 && (
                    <Collapsible open={pendingReviewBucketOpen} onOpenChange={setPendingReviewBucketOpen}>
                      <Card className="border-blue-200 dark:border-blue-800">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {pendingReviewBucketOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                <Clock className="h-5 w-5 text-blue-500" />
                                <CardTitle className="text-xl">Pending Review</CardTitle>
                                <Badge variant="outline" className="ml-2 border-blue-500 text-blue-600">
                                  {pendingReviewItems.length}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            {pendingReviewItems.map(({ fb, item, index }) => 
                              renderFeedbackItem(fb, item, index, false, false, true)
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Ideas Bucket */}
                  {ideaItems.length > 0 && (
                    <Collapsible open={ideasBucketOpen} onOpenChange={setIdeasBucketOpen}>
                      <Card className="border-purple-200 dark:border-purple-800">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {ideasBucketOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                <Lightbulb className="h-5 w-5 text-purple-500" />
                                <CardTitle className="text-xl">Ideas</CardTitle>
                                <Badge variant="outline" className="ml-2 border-purple-500 text-purple-600">
                                  {ideaItems.length}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            {ideaItems.map(({ fb, item, index }) => 
                              renderFeedbackItem(fb, item, index, false, true, false)
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Complete Bucket - Only complete items */}
                  {completeItems.length > 0 && (
                    <Collapsible open={completeBucketOpen} onOpenChange={setCompleteBucketOpen}>
                      <Card className="border-green-200 dark:border-green-800">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {completeBucketOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                <Check className="h-5 w-5 text-green-500" />
                                <CardTitle className="text-xl">Completed</CardTitle>
                                <Badge variant="outline" className="ml-2 border-green-500 text-green-600">
                                  {completeItems.length}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3">
                            {completeItems.map(({ fb, item, index }) => 
                              renderFeedbackItem(fb, item, index, true, false, false)
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
