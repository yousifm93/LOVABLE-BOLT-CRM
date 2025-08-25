import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { databaseService, type CallLogInsert, type SmsLogInsert, type EmailLogInsert, type NoteInsert } from '@/services/database';

interface ActivityLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onActivityCreated: (activity: any) => void;
}

export function CallLogModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    outcome: 'Connected' as any,
    duration_seconds: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const callLogData: CallLogInsert = {
        lead_id: leadId,
        user_id: 'temp-user-id', // TODO: Get from auth context
        timestamp: new Date(formData.timestamp).toISOString(),
        outcome: formData.outcome,
        duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
        notes: formData.notes || null,
      };

      const newLog = await databaseService.createCallLog(callLogData);
      onActivityCreated(newLog);
      onOpenChange(false);
      
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        outcome: 'Connected',
        duration_seconds: '',
        notes: '',
      });

      toast({
        title: 'Success',
        description: 'Call log created successfully',
      });
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Select value={formData.outcome} onValueChange={(value) => setFormData(prev => ({ ...prev, outcome: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No Answer">No Answer</SelectItem>
                <SelectItem value="Left VM">Left VM</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_seconds}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_seconds: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Call Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SmsLogModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    direction: 'Out' as any,
    to_number: '',
    from_number: '',
    body: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const smsLogData: SmsLogInsert = {
        lead_id: leadId,
        user_id: 'temp-user-id', // TODO: Get from auth context
        timestamp: new Date(formData.timestamp).toISOString(),
        direction: formData.direction,
        to_number: formData.to_number,
        from_number: formData.from_number,
        body: formData.body,
      };

      const newLog = await databaseService.createSmsLog(smsLogData);
      onActivityCreated(newLog);
      onOpenChange(false);
      
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        direction: 'Out',
        to_number: '',
        from_number: '',
        body: '',
      });

      toast({
        title: 'Success',
        description: 'SMS log created successfully',
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select value={formData.direction} onValueChange={(value) => setFormData(prev => ({ ...prev, direction: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In">Incoming</SelectItem>
                <SelectItem value="Out">Outgoing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to_number">To Number</Label>
              <Input
                id="to_number"
                value={formData.to_number}
                onChange={(e) => setFormData(prev => ({ ...prev, to_number: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="from_number">From Number</Label>
              <Input
                id="from_number"
                value={formData.from_number}
                onChange={(e) => setFormData(prev => ({ ...prev, from_number: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message Body</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save SMS Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmailLogModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    direction: 'Out' as any,
    to_email: '',
    from_email: '',
    subject: '',
    snippet: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emailLogData: EmailLogInsert = {
        lead_id: leadId,
        user_id: 'temp-user-id', // TODO: Get from auth context
        timestamp: new Date(formData.timestamp).toISOString(),
        direction: formData.direction,
        to_email: formData.to_email,
        from_email: formData.from_email,
        subject: formData.subject,
        snippet: formData.snippet || null,
      };

      const newLog = await databaseService.createEmailLog(emailLogData);
      onActivityCreated(newLog);
      onOpenChange(false);
      
      setFormData({
        timestamp: new Date().toISOString().slice(0, 16),
        direction: 'Out',
        to_email: '',
        from_email: '',
        subject: '',
        snippet: '',
      });

      toast({
        title: 'Success',
        description: 'Email log created successfully',
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select value={formData.direction} onValueChange={(value) => setFormData(prev => ({ ...prev, direction: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In">Incoming</SelectItem>
                <SelectItem value="Out">Outgoing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to_email">To Email</Label>
              <Input
                id="to_email"
                type="email"
                value={formData.to_email}
                onChange={(e) => setFormData(prev => ({ ...prev, to_email: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="snippet">Email Body/Snippet</Label>
            <Textarea
              id="snippet"
              value={formData.snippet}
              onChange={(e) => setFormData(prev => ({ ...prev, snippet: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Email Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddNoteModal({ open, onOpenChange, leadId, onActivityCreated }: ActivityLogModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [noteBody, setNoteBody] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    
    setLoading(true);

    try {
      const noteData: NoteInsert = {
        lead_id: leadId,
        author_id: 'temp-user-id', // TODO: Get from auth context
        body: noteBody.trim(),
      };

      const newNote = await databaseService.createNote(noteData);
      onActivityCreated(newNote);
      onOpenChange(false);
      setNoteBody('');

      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
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
            <Textarea
              id="note"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={4}
              placeholder="Enter your note here..."
              required
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