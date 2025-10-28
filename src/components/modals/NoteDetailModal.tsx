import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Mail, MessageSquare, Phone, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { databaseService } from '@/services/database';

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
    author_id?: string;
  } | null;
  onActivityUpdated?: () => void;
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

export function NoteDetailModal({ open, onOpenChange, note, onActivityUpdated }: NoteDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  const canEdit = note?.author_id === user?.id;

  useEffect(() => {
    if (note) {
      setEditedContent(note.description || '');
      setIsEditing(false);
    }
  }, [note]);

  if (!note) return null;

  const handleSave = async () => {
    if (!note) return;
    setIsSaving(true);
    
    try {
      switch (note.type) {
        case 'note':
          await databaseService.updateNote(note.id as string, { body: editedContent });
          break;
        case 'call':
          await databaseService.updateCallLog(note.id as string, { notes: editedContent });
          break;
        case 'sms':
          await databaseService.updateSmsLog(note.id as string, { body: editedContent });
          break;
        case 'email':
          await databaseService.updateEmailLog(note.id as string, { body: editedContent });
          break;
      }
      
      toast({
        title: "Updated",
        description: `${note.type?.charAt(0).toUpperCase()}${note.type?.slice(1)} has been updated successfully.`,
      });
      
      setIsEditing(false);
      if (onActivityUpdated) await onActivityUpdated();
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: "Failed to update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    
    if (!confirm(`Are you sure you want to delete this ${note.type}?`)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      switch (note.type) {
        case 'note':
          await databaseService.deleteNote(note.id as string);
          break;
        case 'call':
          await databaseService.deleteCallLog(note.id as string);
          break;
        case 'sms':
          await databaseService.deleteSmsLog(note.id as string);
          break;
        case 'email':
          await databaseService.deleteEmailLog(note.id as string);
          break;
      }
      
      toast({
        title: "Deleted",
        description: `${note.type?.charAt(0).toUpperCase()}${note.type?.slice(1)} has been deleted.`,
      });
      
      onOpenChange(false);
      if (onActivityUpdated) await onActivityUpdated();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px]"
            />
          ) : (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="whitespace-pre-wrap text-sm">
                {note.description || 'No description provided.'}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-between">
            <div className="flex gap-2">
              {canEdit && !isEditing && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setEditedContent(note.description || '');
                    setIsEditing(false);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
