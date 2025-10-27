import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Mail, MessageSquare, Phone, FileText } from 'lucide-react';

interface NoteDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: {
    id: string | number;
    type?: string;
    title: string;
    description?: string;
    timestamp: string;
    user?: string;
  } | null;
}

const getActivityTitle = (type?: string) => {
  switch (type) {
    case 'email': return 'Email Details';
    case 'sms': return 'SMS Details';
    case 'call': return 'Call Details';
    default: return 'Note Details';
  }
};

const getActivityIcon = (type?: string) => {
  switch (type) {
    case 'email': return <Mail className="h-5 w-5" />;
    case 'sms': return <MessageSquare className="h-5 w-5" />;
    case 'call': return <Phone className="h-5 w-5" />;
    default: return <FileText className="h-5 w-5" />;
  }
};

export function NoteDetailModal({ open, onOpenChange, note }: NoteDetailModalProps) {
  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActivityIcon(note.type)}
            {getActivityTitle(note.type)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {format(new Date(note.timestamp), 'PPpp')}
            </span>
            <span>•</span>
            <span>by {note.user || 'System'}</span>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="whitespace-pre-wrap text-sm">
              {note.description || 'No description provided.'}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
