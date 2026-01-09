import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare, User, Check, HelpCircle, ChevronDown, ChevronRight, Lightbulb, Clock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completedSectionsOpen, setCompletedSectionsOpen] = useState<Record<string, boolean>>({});
  const [ideasSectionsOpen, setIdeasSectionsOpen] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { crmUser } = useAuth();

  useEffect(() => {
    if (!crmUser?.id) return; // Wait for user to load
    
    const fetchData = async () => {
      try {
        // Determine if current user is admin
        const isAdmin = crmUser?.role === 'admin';
        
        // Build feedback query - non-admins only see their own feedback
        let feedbackQuery = supabase
          .from('team_feedback')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (!isAdmin && crmUser?.id) {
          feedbackQuery = feedbackQuery.eq('user_id', crmUser.id);
        }

        const { data: feedbackData, error: feedbackError } = await feedbackQuery;

        if (feedbackError) throw feedbackError;

        const userIds = [...new Set(feedbackData?.map(f => f.user_id) || [])];

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds.length > 0 ? userIds : ['none']);

        if (usersError) throw usersError;
        
        // Non-admins only see their own tab
        const teamMembersToShow = isAdmin 
          ? usersData || []
          : usersData?.filter(u => u.id === crmUser?.id) || [];

        const { data: commentsData, error: commentsError } = await supabase
          .from('team_feedback_comments')
          .select('*')
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        const adminIds = [...new Set(commentsData?.map(c => c.admin_id) || [])];
        const { data: adminData } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', adminIds);

        const adminMap = new Map(adminData?.map(a => [a.id, `${a.first_name} ${a.last_name}`]) || []);
        const enrichedComments = commentsData?.map(c => ({
          ...c,
          admin_name: adminMap.get(c.admin_id) || 'Admin'
        })) || [];

        const { data: statusData } = await supabase
          .from('team_feedback_item_status')
          .select('*');

        // Mark all unread feedback as read by admin
        const unreadIds = feedbackData?.filter(f => !f.is_read_by_admin).map(f => f.id) || [];
        if (unreadIds.length > 0) {
          await supabase
            .from('team_feedback')
            .update({ is_read_by_admin: true })
            .in('id', unreadIds);
        }

        setTeamMembers(teamMembersToShow);
        setFeedback((feedbackData || []).map(f => ({
          ...f,
          feedback_items: Array.isArray(f.feedback_items) ? f.feedback_items as Array<FeedbackItemContent | string> : []
        })));
        setComments(enrichedComments);
        setItemStatuses((statusData || []) as ItemStatus[]);
        
        // Initialize expanded sections
        const initialExpanded: Record<string, boolean> = {};
        feedbackData?.forEach(f => {
          initialExpanded[f.id] = true;
        });
        setExpandedSections(initialExpanded);
        
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
  }, [toast, crmUser?.id, crmUser?.role]);

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

        setItemStatuses(prev => [...prev.filter(s => !(s.feedback_id === feedbackId && s.item_index === itemIndex)), data as ItemStatus]);
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

  const getUnreadCount = (userId: string) => {
    const userFeedback = getUserFeedback(userId);
    return userFeedback.filter(f => !f.is_read_by_admin).length;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (teamMembers.length === 0) return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Team Feedback Review</h1>
      <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback has been submitted yet.</CardContent></Card>
    </div>
  );

  const renderFeedbackItem = (fb: FeedbackItem, item: FeedbackItemContent | string, index: number, isCompleted: boolean, isIdea: boolean) => {
    const itemComments = getItemComments(fb.id, index);
    const commentKey = `${fb.id}-${index}`;
    const currentStatus = getItemStatus(fb.id, index);
    const itemText = getItemText(item);
    const itemImageUrl = getItemImageUrl(item);

    return (
      <div key={index} className={`space-y-3 p-4 rounded-lg border ${isCompleted ? 'bg-muted/30 opacity-75' : isIdea ? 'bg-purple-50 dark:bg-purple-950/20' : 'bg-muted/50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-sm font-medium text-muted-foreground min-w-[24px]">{index + 1}</span>
            <div className="flex-1">
              <p className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{itemText || '(No text)'}</p>
              {itemImageUrl && (
                <a href={itemImageUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={itemImageUrl} alt="Attached screenshot" className="h-20 w-auto object-cover rounded border hover:opacity-80 transition-opacity" />
                </a>
              )}
              {isIdea && <span className="text-xs text-purple-600 font-medium mt-1 block">Section: {fb.section_label}</span>}
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
          <div className="ml-7 space-y-2">
            {itemComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2 text-sm">
                <User className="h-4 w-4 text-primary mt-0.5" />
                <div><span className="font-medium text-primary">{comment.admin_name}:</span><span className="ml-1 text-muted-foreground">{comment.comment}</span><span className="ml-2 text-xs text-muted-foreground">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span></div>
              </div>
            ))}
          </div>
        )}
        <div className="ml-7 flex items-center gap-2">
          <Input placeholder="Add a response..." value={newComments[commentKey] || ''} onChange={(e) => setNewComments(prev => ({ ...prev, [commentKey]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(fb.id, index); } }} className="text-sm" />
          <Button size="sm" onClick={() => submitComment(fb.id, index)} disabled={!newComments[commentKey]?.trim() || submittingComment === commentKey}>{submittingComment === commentKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Team Feedback Review</h1>
      <Tabs value={selectedUser || ''} onValueChange={setSelectedUser}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {teamMembers.map((member) => {
            const unreadCount = getUnreadCount(member.id);
            return (
              <TabsTrigger key={member.id} value={member.id} className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {member.first_name} {member.last_name}
                {unreadCount > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white h-5 min-w-[20px] text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {teamMembers.map((member) => (
          <TabsContent key={member.id} value={member.id} className="space-y-6">
            {getUserFeedback(member.id).length === 0 ? (<Card><CardContent className="py-8 text-center text-muted-foreground">No feedback submitted by {member.first_name} yet.</CardContent></Card>) : (
              getUserFeedback(member.id).map((fb) => {
                const pendingItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => {
                  const status = getItemStatus(fb.id, index);
                  return status !== 'complete' && status !== 'idea';
                });
                const completedItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => getItemStatus(fb.id, index) === 'complete');
                const ideaItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => getItemStatus(fb.id, index) === 'idea');
                const isExpanded = expandedSections[fb.id] ?? true;

                return (
                  <Collapsible key={fb.id} open={isExpanded} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, [fb.id]: open }))}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                              <MessageSquare className="h-5 w-5 text-primary" />
                              <CardTitle className="text-xl">{fb.section_label}</CardTitle>
                            </div>
                            <span className="text-sm text-muted-foreground">Last updated: {format(new Date(fb.updated_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {pendingItems.length > 0 && <div className="space-y-3">{pendingItems.map(({ item, index }) => renderFeedbackItem(fb, item, index, false, false))}</div>}
                          {completedItems.length > 0 && (
                            <Collapsible open={completedSectionsOpen[fb.id]} onOpenChange={(open) => setCompletedSectionsOpen(prev => ({ ...prev, [fb.id]: open }))}>
                              <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2 text-green-600 hover:text-green-700 hover:bg-green-50">{completedSectionsOpen[fb.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<Check className="h-4 w-4" />Completed ({completedItems.length})</Button></CollapsibleTrigger>
                              <CollapsibleContent className="space-y-3 mt-2">{completedItems.map(({ item, index }) => renderFeedbackItem(fb, item, index, true, false))}</CollapsibleContent>
                            </Collapsible>
                          )}
                          {ideaItems.length > 0 && (
                            <Collapsible open={ideasSectionsOpen[fb.id]} onOpenChange={(open) => setIdeasSectionsOpen(prev => ({ ...prev, [fb.id]: open }))}>
                              <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50">{ideasSectionsOpen[fb.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<Lightbulb className="h-4 w-4" />Ideas ({ideaItems.length})</Button></CollapsibleTrigger>
                              <CollapsibleContent className="space-y-3 mt-2">{ideaItems.map(({ item, index }) => renderFeedbackItem(fb, item, index, false, true))}</CollapsibleContent>
                            </Collapsible>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
