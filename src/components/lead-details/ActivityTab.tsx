import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Phone, Mail, MessageSquare, FileText, Circle, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistance } from "date-fns";
import { NoteDetailModal } from "@/components/modals/NoteDetailModal";
import { ReplyEmailModal } from "@/components/modals/ReplyEmailModal";
import { cn } from "@/lib/utils";

interface Activity {
  id: number;
  type: 'call' | 'email' | 'sms' | 'note' | 'task';
  title: string;
  description?: string;
  timestamp: string;
  user: string;
  author_id?: string;
  task_id?: string;
  task_status?: string;
  completed_by_user?: any;
  direction?: 'In' | 'Out';
  from_email?: string;
  subject?: string;
  body?: string;
  html_body?: string;
  lead_id?: string;
  to_email?: string;
}

interface ActivityTabProps {
  activities: Activity[];
  onCallClick?: () => void;
  onSmsClick?: () => void;
  onEmailClick?: () => void;
  onNoteClick?: () => void;
  onTaskClick?: () => void;
  onTaskActivityClick?: (activity: Activity) => void;
  onActivityUpdated?: () => void;
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'call':
      return <Phone className="h-3 w-3" />;
    case 'email':
      return <Mail className="h-3 w-3" />;
    case 'sms':
      return <MessageSquare className="h-3 w-3" />;
    case 'note':
      return <FileText className="h-3 w-3" />;
    case 'task':
      return <Plus className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
};

const getActivityBadgeLabel = (activity: Activity): string => {
  switch (activity.type) {
    case 'call':
      return 'CALL LOGGED';
    case 'email':
      return activity.direction === 'In' ? 'EMAIL RECEIVED' : 'EMAIL LOGGED';
    case 'sms':
      return 'SMS LOGGED';
    case 'note':
      return 'NOTE ADDED';
    case 'task':
      return activity.task_status === 'Done' ? 'TASK COMPLETED' : 'TASK CREATED';
    default:
      return 'ACTIVITY';
  }
};

const getActivityBadgeVariant = (activity: Activity) => {
  switch (activity.type) {
    case 'call':
      return 'default';
    case 'email':
      // Inbound emails get a distinct green variant
      return activity.direction === 'In' ? 'default' : 'secondary';
    case 'sms':
      return 'outline';
    case 'note':
      return 'secondary';
    case 'task':
      // Full orange if completed, lighter if not
      return activity.task_status === 'Done' ? 'default' : 'outline';
    default:
      return 'default';
  }
};

const getEmailBadgeClassName = (activity: Activity): string => {
  if (activity.type === 'email' && activity.direction === 'In') {
    return 'bg-green-100 hover:bg-green-100 border-green-200 text-green-800';
  }
  return '';
};

export function ActivityTab({ activities, onCallClick, onSmsClick, onEmailClick, onNoteClick, onTaskClick, onTaskActivityClick, onActivityUpdated }: ActivityTabProps) {
  const [selectedNote, setSelectedNote] = React.useState<Activity | null>(null);
  const [showNoteDetailModal, setShowNoteDetailModal] = React.useState(false);
  const [expandedActivities, setExpandedActivities] = React.useState<Set<number>>(new Set());
  const [showReplyEmailModal, setShowReplyEmailModal] = React.useState(false);
  const [selectedEmailForReply, setSelectedEmailForReply] = React.useState<Activity | null>(null);

  const toggleActivity = (id: number) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedActivities(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onCallClick}>
          <Phone className="h-4 w-4 mr-2" />
          Call
        </Button>
        <Button variant="outline" size="sm" onClick={onSmsClick}>
          <MessageSquare className="h-4 w-4 mr-2" />
          SMS
        </Button>
        <Button variant="outline" size="sm" onClick={onEmailClick}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        <Button variant="outline" size="sm" onClick={onNoteClick}>
          <FileText className="h-4 w-4 mr-2" />
          Add Note
        </Button>
        <Button variant="outline" size="sm" onClick={onTaskClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Circle className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>No activities recorded yet</p>
          <p className="text-sm mt-1">Activities will appear here as they occur</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3">
        {activities.map((activity, index) => {
          const userInitials = activity.user
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          const isClickable = ['note', 'email', 'sms', 'call', 'task'].includes(activity.type);
          const isExpanded = expandedActivities.has(activity.id);

          return (
            <Collapsible
              key={activity.id}
              open={isExpanded}
              onOpenChange={() => toggleActivity(activity.id)}
              className="pb-3 border-b last:border-0"
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-start gap-3 p-2 -m-2 cursor-pointer hover:bg-muted/50 rounded transition-colors">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant={getActivityBadgeVariant(activity)} 
                className={cn(
                  "text-xs flex items-center gap-1",
                  activity.type === 'task' && activity.task_status !== 'Done' && 
                  "bg-orange-100 hover:bg-orange-100 border-orange-200",
                  getEmailBadgeClassName(activity)
                )}
              >
                {getActivityIcon(activity.type)}
                {getActivityBadgeLabel(activity)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true })}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      by {activity.user}
                    </p>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              {activity.description && (
                <CollapsibleContent>
                  <div className="pl-11 pr-2 pt-2">
                    <div 
                      className="text-sm text-muted-foreground prose prose-sm max-w-none cursor-pointer hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) {
                          if (activity.type === 'task' && onTaskActivityClick) {
                            onTaskActivityClick(activity);
                          } else if (activity.type === 'email' && activity.direction === 'In') {
                            // Open reply modal for inbound emails
                            setSelectedEmailForReply(activity);
                            setShowReplyEmailModal(true);
                          } else {
                            setSelectedNote(activity);
                            setShowNoteDetailModal(true);
                          }
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: activity.description }}
                    />
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
          </div>
        </ScrollArea>
      )}

      <NoteDetailModal
        open={showNoteDetailModal}
        onOpenChange={setShowNoteDetailModal}
        note={selectedNote}
        onActivityUpdated={onActivityUpdated}
      />

      <ReplyEmailModal
        isOpen={showReplyEmailModal}
        onClose={() => {
          setShowReplyEmailModal(false);
          setSelectedEmailForReply(null);
        }}
        originalEmail={selectedEmailForReply ? {
          from_email: selectedEmailForReply.from_email || '',
          subject: selectedEmailForReply.subject || '',
          body: selectedEmailForReply.body,
          html_body: selectedEmailForReply.html_body,
          lead_id: selectedEmailForReply.lead_id,
          to_email: selectedEmailForReply.to_email,
        } : null}
        onEmailSent={onActivityUpdated}
      />
    </div>
  );
}