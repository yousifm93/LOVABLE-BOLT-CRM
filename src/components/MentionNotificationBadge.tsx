import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';

interface MentionNotification {
  id: string;
  lead_id: string;
  note_id: string | null;
  comment_id: string | null;
  content_preview: string | null;
  is_read: boolean;
  created_at: string;
  mentioner: {
    first_name: string;
    last_name: string;
  } | null;
  lead: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Map lead to route based on pipeline stage
const getPipelineRoute = async (leadId: string): Promise<string> => {
  const { data } = await supabase
    .from('leads')
    .select('pipeline_stage_id')
    .eq('id', leadId)
    .single();

  const routeMap: Record<string, string> = {
    '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': '/pending-app',
    'a4e162e0-5421-4d17-8ad5-4b1195bbc995': '/screening',
    '09162eec-d2b2-48e5-86d0-9e66ee8b2af7': '/pre-qualified',
    '3cbf38ff-752e-4163-a9a3-1757499b4945': '/pre-approved',
    '76eb2e82-e1d9-4f2d-a57d-2120a25696db': '/active',
    'e9fc7eb8-6519-4768-b49e-3ebdd3738ac0': '/past-clients',
    '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a': '/idle',
    'c54f417b-3f67-43de-80f5-954cf260d571': '/leads',
  };
  
  return routeMap[data?.pipeline_stage_id || ''] || '/active';
};

export function MentionNotificationBadge() {
  const [mentions, setMentions] = useState<MentionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { crmUser } = useAuth();
  const navigate = useNavigate();

  // Fetch mentions
  const fetchMentions = async () => {
    if (!crmUser?.id) return;

    const { data, error } = await supabase
      .from('user_mentions')
      .select(`
        id,
        lead_id,
        note_id,
        comment_id,
        content_preview,
        is_read,
        created_at,
        mentioner:mentioner_user_id(first_name, last_name),
        lead:lead_id(first_name, last_name)
      `)
      .eq('mentioned_user_id', crmUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setMentions(data as unknown as MentionNotification[]);
      setUnreadCount(data.filter(m => !m.is_read).length);
    }
  };

  useEffect(() => {
    fetchMentions();
  }, [crmUser?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!crmUser?.id) return;

    const channel = supabase
      .channel('user_mentions_notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_mentions' }, 
        () => fetchMentions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [crmUser?.id]);

  const handleMentionClick = async (mention: MentionNotification) => {
    // Mark as read
    if (!mention.is_read) {
      await supabase
        .from('user_mentions')
        .update({ is_read: true })
        .eq('id', mention.id);
      
      fetchMentions();
    }

    // Navigate to the lead
    const route = await getPipelineRoute(mention.lead_id);
    navigate(`${route}?openLead=${mention.lead_id}`);
    setOpen(false);
  };

  const markAllAsRead = async () => {
    if (!crmUser?.id) return;
    
    await supabase
      .from('user_mentions')
      .update({ is_read: true })
      .eq('mentioned_user_id', crmUser.id)
      .eq('is_read', false);
    
    fetchMentions();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '??';
  };

  const getLeadName = (lead: MentionNotification['lead']) => {
    if (!lead) return 'Unknown Lead';
    return `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead';
  };

  const getMentionerName = (mentioner: MentionNotification['mentioner']) => {
    if (!mentioner) return 'Someone';
    return `${mentioner.first_name || ''} ${mentioner.last_name || ''}`.trim() || 'Someone';
  };

  if (unreadCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Badge 
            variant="destructive" 
            className="h-5 min-w-5 px-1.5 text-xs cursor-pointer ml-1"
          >
            {unreadCount}
          </Badge>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[9999]" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-medium text-sm">Mentions</span>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          {mentions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No mentions yet
            </div>
          ) : (
            <div className="py-1">
              {mentions.map((mention) => (
                <button
                  key={mention.id}
                  onClick={() => handleMentionClick(mention)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-accent flex items-start gap-2 transition-colors",
                    !mention.is_read && "bg-accent/50"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(mention.mentioner?.first_name, mention.mentioner?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{getMentionerName(mention.mentioner)}</span>
                      {' mentioned you on '}
                      <span className="font-medium">{getLeadName(mention.lead)}</span>
                    </p>
                    {mention.content_preview && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        "{mention.content_preview}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistance(new Date(mention.created_at), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  {!mention.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
