import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageSquare, FileText, Circle, Plus } from "lucide-react";
import { formatDistance } from "date-fns";
import { NoteDetailModal } from "@/components/modals/NoteDetailModal";

interface Activity {
  id: number;
  type: 'call' | 'email' | 'sms' | 'note' | 'task';
  title: string;
  description?: string;
  timestamp: string;
  user: string;
  author_id?: string;
  task_id?: string;
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

const getActivityBadgeLabel = (type: Activity['type']): string => {
  switch (type) {
    case 'call':
      return 'CALL LOGGED';
    case 'email':
      return 'EMAIL LOGGED';
    case 'sms':
      return 'SMS LOGGED';
    case 'note':
      return 'NOTE ADDED';
    case 'task':
      return 'TASK CREATED';
    default:
      return 'ACTIVITY';
  }
};

const getActivityBadgeVariant = (type: Activity['type']) => {
  switch (type) {
    case 'call':
      return 'default';
    case 'email':
      return 'secondary';
    case 'sms':
      return 'outline';
    case 'note':
      return 'secondary';
    case 'task':
      return 'default';
    default:
      return 'default';
  }
};

export function ActivityTab({ activities, onCallClick, onSmsClick, onEmailClick, onNoteClick, onTaskClick, onTaskActivityClick, onActivityUpdated }: ActivityTabProps) {
  const [selectedNote, setSelectedNote] = React.useState<Activity | null>(null);
  const [showNoteDetailModal, setShowNoteDetailModal] = React.useState(false);

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

          return (
            <div 
              key={activity.id} 
              className={`flex items-start gap-3 pb-3 border-b last:border-0 ${isClickable ? 'cursor-pointer hover:bg-white/50 rounded p-2 -m-2 transition-colors' : ''}`}
              onClick={() => {
                if (isClickable) {
                  if (activity.type === 'task' && onTaskActivityClick) {
                    onTaskActivityClick(activity);
                  } else {
                    setSelectedNote(activity);
                    setShowNoteDetailModal(true);
                  }
                }
              }}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant={getActivityBadgeVariant(activity.type)} 
                    className="text-xs flex items-center gap-1"
                  >
                    {getActivityIcon(activity.type)}
                    {getActivityBadgeLabel(activity.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true })}
                  </span>
                </div>
                
                {activity.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {activity.description}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  by {activity.user}
                </p>
              </div>
            </div>
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
    </div>
  );
}