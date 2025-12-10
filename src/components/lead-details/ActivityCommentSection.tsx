import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';

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
  const { crmUser } = useAuth();
  const { toast } = useToast();

  const handleSubmitComment = async () => {
    if (!commentBody.trim() || !crmUser) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('activity_comments')
        .insert({
          activity_type: activityType,
          activity_id: activityId,
          lead_id: leadId,
          author_id: crmUser.id,
          body: commentBody.trim(),
        });

      if (error) throw error;

      setCommentBody('');
      setIsAdding(false);
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
            <div className="space-y-2 bg-background border rounded-lg p-2">
              <RichTextEditor
                value={commentBody}
                onChange={setCommentBody}
                placeholder="Write a comment..."
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