import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, MessageSquare, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
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
  admin_id: string;
  comment: string;
  created_at: string;
  admin_name?: string;
  item_index?: number | null;
}

export default function FeedbackReview() {
  const { crmUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  // Fetch team members who have submitted feedback
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch all feedback with user info
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('team_feedback')
        .select('*')
        .order('updated_at', { ascending: false });

      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set((feedbackData || []).map(f => f.user_id))];

      // Fetch user details
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        setTeamMembers(usersData || []);
        if (usersData && usersData.length > 0) {
          setSelectedUser(usersData[0].id);
        }
      }

      setFeedback((feedbackData || []).map(f => ({
        ...f,
        feedback_items: f.feedback_items as string[]
      })));

      // Fetch all comments
      const { data: commentsData } = await supabase
        .from('team_feedback_comments')
        .select('*')
        .order('created_at', { ascending: true });

      // Get admin names for comments
      if (commentsData && commentsData.length > 0) {
        const adminIds = [...new Set(commentsData.map(c => c.admin_id))];
        const { data: admins } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', adminIds);

        const adminMap = new Map((admins || []).map(a => [a.id, `${a.first_name} ${a.last_name}`]));
        
        setComments(commentsData.map(c => ({
          ...c,
          admin_name: adminMap.get(c.admin_id) || 'Admin',
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const getUserFeedback = (userId: string) => {
    return feedback.filter(f => f.user_id === userId);
  };

  const getFeedbackComments = (feedbackId: string, itemIndex?: number) => {
    return comments.filter(c => 
      c.feedback_id === feedbackId && 
      (itemIndex !== undefined ? c.item_index === itemIndex : true)
    );
  };

  const getItemComments = (feedbackId: string, itemIndex: number) => {
    return comments.filter(c => c.feedback_id === feedbackId && c.item_index === itemIndex);
  };

  const submitComment = async (feedbackId: string, itemIndex: number) => {
    const commentKey = `${feedbackId}-${itemIndex}`;
    if (!crmUser?.id || !newComments[commentKey]?.trim()) return;

    setSubmittingComment(commentKey);

    try {
      const { data, error } = await supabase
        .from('team_feedback_comments')
        .insert({
          feedback_id: feedbackId,
          admin_id: crmUser.id,
          comment: newComments[commentKey].trim(),
          item_index: itemIndex,
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new comment to state
      setComments(prev => [...prev, {
        ...data,
        admin_name: `${crmUser.first_name} ${crmUser.last_name}`,
      }]);

      // Clear the input
      setNewComments(prev => ({ ...prev, [commentKey]: '' }));

      toast({
        title: "Comment Added",
        description: "Your response has been saved.",
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Feedback Review</CardTitle>
            <CardDescription>
              No feedback has been submitted yet by team members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team Feedback Review</h1>
        <p className="text-muted-foreground mt-2">
          Review and respond to feedback from team members testing the CRM.
        </p>
      </div>

      <Tabs value={selectedUser} onValueChange={setSelectedUser}>
        <TabsList className="mb-6">
          {teamMembers.map(member => (
            <TabsTrigger key={member.id} value={member.id} className="gap-2">
              <User className="h-4 w-4" />
              {member.first_name} {member.last_name}
              <Badge variant="secondary" className="ml-1">
                {getUserFeedback(member.id).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {teamMembers.map(member => (
          <TabsContent key={member.id} value={member.id} className="space-y-6">
            {getUserFeedback(member.id).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No feedback submitted yet from {member.first_name}.
                </CardContent>
              </Card>
            ) : (
              getUserFeedback(member.id).map(fb => (
                  <Card key={fb.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{fb.section_label}</CardTitle>
                        <span className="text-sm text-muted-foreground">
                          Last updated: {format(new Date(fb.updated_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Feedback Items with Individual Comments */}
                      <div className="space-y-4">
                        {fb.feedback_items.map((item, index) => {
                          const itemComments = getItemComments(fb.id, index);
                          const commentKey = `${fb.id}-${index}`;
                          
                          return (
                            <div key={index} className="border rounded-lg overflow-hidden">
                              {/* Feedback Item */}
                              <div className="flex gap-3 p-3 bg-muted/50">
                                <Badge variant="outline" className="h-6 shrink-0">
                                  {index + 1}
                                </Badge>
                                <p className="text-sm">{item}</p>
                              </div>
                              
                              {/* Comments for this item */}
                              <div className="p-3 space-y-3 bg-background">
                                {/* Existing Comments */}
                                {itemComments.length > 0 && (
                                  <div className="space-y-2">
                                    {itemComments.map(comment => (
                                      <div key={comment.id} className="bg-primary/5 border border-primary/10 rounded-md p-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-xs text-primary">{comment.admin_name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                          </span>
                                        </div>
                                        <p className="text-sm">{comment.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Add Comment Form */}
                                <div className="flex gap-2">
                                  <Textarea
                                    value={newComments[commentKey] || ''}
                                    onChange={(e) => setNewComments(prev => ({ ...prev, [commentKey]: e.target.value }))}
                                    placeholder="Add a response..."
                                    className="min-h-[50px] text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => submitComment(fb.id, index)}
                                    disabled={!newComments[commentKey]?.trim() || submittingComment === commentKey}
                                    className="shrink-0"
                                  >
                                    {submittingComment === commentKey ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
