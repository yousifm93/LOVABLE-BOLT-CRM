import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare, User, Check, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface FeedbackItem {
  id: string;
  user_id: string;
  section_key: string;
  section_label: string;
  feedback_items: string[];
  created_at: string;
  updated_at: string;
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
  status: 'pending' | 'complete' | 'needs_help';
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
  const [completedSectionsOpen, setCompletedSectionsOpen] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { crmUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('team_feedback')
          .select('*')
          .order('updated_at', { ascending: false });

        if (feedbackError) throw feedbackError;

        const userIds = [...new Set(feedbackData?.map(f => f.user_id) || [])];

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (usersError) throw usersError;

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

        setTeamMembers(usersData || []);
        setFeedback((feedbackData || []).map(f => ({
          ...f,
          feedback_items: Array.isArray(f.feedback_items) ? f.feedback_items as string[] : []
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
  }, [toast]);

  const getUserFeedback = (userId: string) => feedback.filter(f => f.user_id === userId);

  const getItemComments = (feedbackId: string, itemIndex: number) => 
    comments.filter(c => c.feedback_id === feedbackId && c.item_index === itemIndex);

  const getItemStatus = (feedbackId: string, itemIndex: number): 'pending' | 'complete' | 'needs_help' => 
    itemStatuses.find(s => s.feedback_id === feedbackId && s.item_index === itemIndex)?.status || 'pending';

  const updateItemStatus = async (feedbackId: string, itemIndex: number, status: 'complete' | 'needs_help') => {
    if (!crmUser?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('team_feedback_item_status')
        .upsert({ feedback_id: feedbackId, item_index: itemIndex, status, updated_by: crmUser.id, updated_at: new Date().toISOString() }, { onConflict: 'feedback_id,item_index' })
        .select()
        .single();

      if (error) throw error;

      setItemStatuses(prev => [...prev.filter(s => !(s.feedback_id === feedbackId && s.item_index === itemIndex)), data as ItemStatus]);
      toast({ title: status === 'complete' ? "Marked Complete" : "Still Needs Help", description: "Status updated." });
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

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (teamMembers.length === 0) return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Team Feedback Review</h1>
      <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback has been submitted yet.</CardContent></Card>
    </div>
  );

  const renderFeedbackItem = (fb: FeedbackItem, item: string, index: number, isCompleted: boolean) => {
    const itemComments = getItemComments(fb.id, index);
    const commentKey = `${fb.id}-${index}`;
    const currentStatus = getItemStatus(fb.id, index);

    return (
      <div key={index} className={`space-y-3 p-4 rounded-lg border ${isCompleted ? 'bg-muted/30 opacity-75' : 'bg-muted/50'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-sm font-medium text-muted-foreground min-w-[24px]">{index + 1}</span>
            <p className={`text-sm flex-1 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{item}</p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={currentStatus === 'complete' ? 'default' : 'ghost'} className={currentStatus === 'complete' ? 'bg-green-600 hover:bg-green-700 h-7 px-2' : 'h-7 px-2 text-green-600 hover:bg-green-50'} onClick={() => updateItemStatus(fb.id, index, 'complete')}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant={currentStatus === 'needs_help' ? 'default' : 'ghost'} className={currentStatus === 'needs_help' ? 'bg-orange-600 hover:bg-orange-700 h-7 px-2' : 'h-7 px-2 text-orange-600 hover:bg-orange-50'} onClick={() => updateItemStatus(fb.id, index, 'needs_help')}><HelpCircle className="h-3.5 w-3.5" /></Button>
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
          {teamMembers.map((member) => (<TabsTrigger key={member.id} value={member.id} className="flex items-center gap-2"><User className="h-4 w-4" />{member.first_name} {member.last_name}</TabsTrigger>))}
        </TabsList>
        {teamMembers.map((member) => (
          <TabsContent key={member.id} value={member.id} className="space-y-6">
            {getUserFeedback(member.id).length === 0 ? (<Card><CardContent className="py-8 text-center text-muted-foreground">No feedback submitted by {member.first_name} yet.</CardContent></Card>) : (
              getUserFeedback(member.id).map((fb) => {
                const pendingItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => getItemStatus(fb.id, index) !== 'complete');
                const completedItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => getItemStatus(fb.id, index) === 'complete');

                return (
                  <Card key={fb.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><CardTitle className="text-xl">{fb.section_label}</CardTitle></div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm text-muted-foreground">Last updated: {format(new Date(fb.updated_at), 'MMM d, yyyy h:mm a')}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => { fb.feedback_items.forEach((_, index) => { updateItemStatus(fb.id, index, 'complete'); }); }}><Check className="h-4 w-4 mr-1" />Complete</Button>
                            <Button size="sm" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-50" onClick={() => { fb.feedback_items.forEach((_, index) => { updateItemStatus(fb.id, index, 'needs_help'); }); }}><HelpCircle className="h-4 w-4 mr-1" />Still Need Help</Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingItems.length > 0 && <div className="space-y-3">{pendingItems.map(({ item, index }) => renderFeedbackItem(fb, item, index, false))}</div>}
                      {completedItems.length > 0 && (
                        <Collapsible open={completedSectionsOpen[fb.id]} onOpenChange={(open) => setCompletedSectionsOpen(prev => ({ ...prev, [fb.id]: open }))}>
                          <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-start gap-2 text-green-600 hover:text-green-700 hover:bg-green-50">{completedSectionsOpen[fb.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<Check className="h-4 w-4" />Completed ({completedItems.length})</Button></CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 mt-2">{completedItems.map(({ item, index }) => renderFeedbackItem(fb, item, index, true))}</CollapsibleContent>
                        </Collapsible>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
