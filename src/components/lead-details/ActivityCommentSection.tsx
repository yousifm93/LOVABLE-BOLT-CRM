import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MentionableRichTextEditor } from '@/components/ui/mentionable-rich-text-editor';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ActivityComment {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author?: {
    first_name: string;
    last_name: string;
  };
}

interface ActivityCommentSectionProps {
  activityType: string;
  activityId: string;
  leadId: string;
  comments: ActivityComment[];
  onCommentAdded?: () => void;
}

export function ActivityCommentSection({
  activityType,
  activityId,
  leadId,
  comments,
  onCommentAdded,
}: ActivityCommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentions, setMentions] = useState<TeamMember[]>([]);
  const commentFormRef = useRef<HTMLDivElement>(null);
  const { crmUser } = useAuth();
  const { toast } = useToast();

  // Auto-scroll to comment form when it opens
  useEffect(() => {
    if (isAdding && commentFormRef.current) {
      setTimeout(() => {
        commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isAdding]);

  // Send mention notifications
  const sendMentionNotifications = async (commentId: string, mentionedMembers: TeamMember[]) => {
    const { data: leadData } = await supabase
      .from('leads')
      .select('first_name, last_name')
      .eq('id', leadId)
      .single();

    const leadName = leadData ? `${leadData.first_name} ${leadData.last_name}` : 'Unknown Lead';
    const mentionerName = crmUser ? `${crmUser.first_name} ${crmUser.last_name}` : 'A team member';

    for (const member of mentionedMembers) {
      try {
        await supabase.functions.invoke('send-mention-notification', {
          body: {
            mentionedUserId: member.id,
            mentionerName,
            noteContent: commentBody,
            leadId,
            leadName,
            noteId: commentId,
          }
        });
      } catch (error) {
        console.error('Error sending mention notification:', error);
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!commentBody.trim() || !crmUser) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('activity_comments')
        .insert({
          activity_type: activityType,
          activity_id: activityId,
          lead_id: leadId,
          author_id: crmUser.id,
          body: commentBody.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send mention notifications if there are mentions
      if (mentions.length > 0 && data?.id) {
        await sendMentionNotifications(data.id, mentions);
        toast({
          title: 'Notifications Sent',
          description: `${mentions.length} team member(s) were notified.`,
        });
      }

      setCommentBody('');
      setMentions([]);
      setIsAdding(false);
      // Keep comments expanded after posting so user can see their comment
      setIsExpanded(true);
      onCommentAdded?.();
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully.',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '??';
  };

  return (
    <div className="mt-2 pl-11">
      {/* Toggle and Comment Count */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3 w-3" />
        {comments.length > 0 ? (
          <span>{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
        ) : (
          <span>Add comment</span>
        )}
      </button>

      {/* Expanded Comments Section */}
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {/* Existing Comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 bg-muted/30 rounded-lg p-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                  {getInitials(comment.author?.first_name, comment.author?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {comment.author?.first_name} {comment.author?.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistance(new Date(comment.created_at), new Date(), { addSuffix: true })}
                  </span>
                </div>
                <div 
                  className="text-xs text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: comment.body }}
                />
              </div>
            </div>
          ))}

          {/* Add Comment Form */}
          {isAdding ? (
            <div ref={commentFormRef} className="space-y-2 bg-background border rounded-lg p-2">
              <MentionableRichTextEditor
                value={commentBody}
                onChange={setCommentBody}
                placeholder="Write a comment... Use @ to mention team members"
                onMentionsChange={setMentions}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setCommentBody('');
                  }}
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!commentBody.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAdding(true)}
              className="text-xs h-7"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Add a comment
            </Button>
          )}
        </div>
      )}
    </div>
  );
}