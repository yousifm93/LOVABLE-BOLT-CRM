import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { databaseService, type CallLogInsert, type SmsLogInsert, type EmailLogInsert, type NoteInsert } from '@/services/database';

interface ActivityLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onActivityCreated: (activity: any) => void;
}

export function CallLogModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  // UUID validation helper
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate UUID before attempting to save
    if (!isValidUUID(leadId)) {
      toast({
        title: 'Error',
        description: 'Invalid lead ID format. Please refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      if (!crmUser) {
        toast({
          title: 'Error',
          description: 'User profile not loaded. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      const callLogData: CallLogInsert = {
        lead_id: leadId,
        user_id: crmUser.id,
        timestamp: new Date(formData.timestamp).toISOString(),
        outcome: 'Connected' as any,
        duration_seconds: null,
        notes: formData.notes || null,
      };

      const newLog = await databaseService.createCallLog(callLogData);
      onActivityCreated(newLog);
      onOpenChange(false);
      
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        notes: '',
      });

      toast({
        title: 'Success',
        description: 'Call logged',
      });

      // Auto-complete related tasks for borrower calls
      try {
        const result = await databaseService.autoCompleteTasksAfterCall(
          leadId,
          'log_call_borrower',
          crmUser.id
        );

        if (result.completedCount > 0) {
          toast({
            title: "Tasks Auto-Completed",
            description: `${result.completedCount} task(s) marked as done: ${result.taskTitles.join(', ')}`,
          });
        }
      } catch (error) {
        console.error('Error auto-completing tasks:', error);
        // Don't show error toast - call was still logged successfully
      }
    } catch (error) {
      console.error('Error creating call log:', error);
      toast({
        title: 'Error',
        description: 'Failed to create call log',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timestamp">Timestamp</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={formData.timestamp}
              onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <RichTextEditor
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Enter call notes..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SmsLogModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  // UUID validation helper
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate UUID before attempting to save
    if (!isValidUUID(leadId)) {
      toast({
        title: 'Error',
        description: 'Invalid lead ID format. Please refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      if (!crmUser) {
        toast({
          title: 'Error',
          description: 'User profile not loaded. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      const smsLogData: SmsLogInsert = {
        lead_id: leadId,
        user_id: crmUser.id,
        timestamp: new Date(formData.timestamp).toISOString(),
        direction: 'Out' as any,
        to_number: 'client-number',
        from_number: 'user-number',
        body: formData.notes,
      };

      const newLog = await databaseService.createSmsLog(smsLogData);
      onActivityCreated(newLog);
      onOpenChange(false);
      
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        notes: '',
      });

      toast({
        title: 'Success',
        description: 'SMS logged',
      });
    } catch (error) {
      console.error('Error creating SMS log:', error);
      toast({
        title: 'Error',
        description: 'Failed to create SMS log',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log SMS</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timestamp">Timestamp</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={formData.timestamp}
              onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <RichTextEditor
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Enter SMS notes..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmailLogModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  // UUID validation helper
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate UUID before attempting to save
    if (!isValidUUID(leadId)) {
      toast({
        title: 'Error',
        description: 'Invalid lead ID format. Please refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      if (!crmUser) {
        toast({
          title: 'Error',
          description: 'User profile not loaded. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      const emailLogData: EmailLogInsert = {
        lead_id: leadId,
        user_id: crmUser.id,
        timestamp: new Date(formData.timestamp).toISOString(),
        direction: 'Out' as any,
        to_email: 'client@example.com',
        from_email: 'user@example.com',
        subject: 'Email Activity',
        snippet: formData.notes || null,
      };

      const newLog = await databaseService.createEmailLog(emailLogData);
      onActivityCreated(newLog);
      onOpenChange(false);
      
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        notes: '',
      });

      toast({
        title: 'Success',
        description: 'Email logged',
      });
    } catch (error) {
      console.error('Error creating email log:', error);
      toast({
        title: 'Error',
        description: 'Failed to create email log',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Email</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timestamp">Timestamp</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={formData.timestamp}
              onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <RichTextEditor
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Enter email notes..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddNoteModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [noteBody, setNoteBody] = useState('');

  // UUID validation helper
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    
    // Validate UUID before attempting to save
    if (!isValidUUID(leadId)) {
      toast({
        title: 'Error',
        description: 'Invalid lead ID format. Please refresh the page and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      if (!crmUser) {
        toast({
          title: 'Error',
          description: 'User profile not loaded. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      const noteData: NoteInsert = {
        lead_id: leadId,
        author_id: crmUser.id,
        body: noteBody.trim(),
      };

      const newNote = await databaseService.createNote(noteData);
      onActivityCreated(newNote);
      onOpenChange(false);
      setNoteBody('');

      toast({
        title: 'Success',
        description: 'Note added',
      });

      // Auto-complete related tasks for borrower notes
      try {
        const result = await databaseService.autoCompleteTasksAfterNote(
          leadId,
          crmUser.id
        );

        if (result.completedCount > 0) {
          toast({
            title: "Tasks Auto-Completed",
            description: `${result.completedCount} task(s) marked as done: ${result.taskTitles.join(', ')}`,
          });
        }
      } catch (error) {
        console.error('Error auto-completing tasks:', error);
        // Don't show error toast - note was still added successfully
      }
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <RichTextEditor
              value={noteBody}
              onChange={setNoteBody}
              placeholder="Enter your note here..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !noteBody.trim()}>
              {loading ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}