import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MentionableRichTextEditor } from '@/components/ui/mentionable-rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { databaseService, type CallLogInsert, type SmsLogInsert, type EmailLogInsert, type NoteInsert } from '@/services/database';
import { Mic, Loader2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

// Voice recording hook (for verbatim transcription)
function useVoiceRecording(onTranscriptionComplete: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to record voice notes.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text) {
        onTranscriptionComplete(data.text);
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: 'Transcription Failed',
        description: 'Could not transcribe the audio. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return { isRecording, isTranscribing, handleClick };
}

// Call recording hook (records, transcribes, and summarizes)
function useCallRecording(onSummaryComplete: (summary: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAndSummarize(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: 'Recording Started',
        description: 'Recording your call. Click again to stop and summarize.',
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to record calls.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAndSummarize = async (audioBlob: Blob) => {
    setIsSummarizing(true);
    try {
      // Step 1: Transcribe the audio
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('voice-transcribe', {
        body: { audio: base64Audio }
      });

      if (transcribeError) throw transcribeError;

      if (!transcribeData?.text) {
        throw new Error('No transcription returned');
      }

      const transcript = transcribeData.text;

      // Step 2: Summarize the transcript
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-transcript', {
        body: { transcript }
      });

      if (summaryError) throw summaryError;

      if (summaryData?.summary) {
        onSummaryComplete(summaryData.summary);
        toast({
          title: 'Call Summarized',
          description: 'Call recording has been transcribed and summarized.',
        });
      } else {
        // Fallback to transcript if summarization fails
        onSummaryComplete(transcript);
        toast({
          title: 'Call Transcribed',
          description: 'Could not summarize, but transcript was added.',
        });
      }
    } catch (error) {
      console.error('Error processing call recording:', error);
      toast({
        title: 'Processing Failed',
        description: 'Could not process the call recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return { isRecording, isSummarizing, handleClick };
}

// Voice button component (for verbatim transcription)
function VoiceButton({ isRecording, isTranscribing, onClick }: { isRecording: boolean; isTranscribing: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={isTranscribing}
      className={cn(
        "w-9 h-9 rounded-full transition-all",
        isRecording && "animate-pulse bg-red-500/10 border-red-500 hover:bg-red-500/20"
      )}
      title={isRecording ? "Stop recording" : "Record voice note (verbatim)"}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className={cn("h-4 w-4", isRecording && "text-red-500")} />
      )}
    </Button>
  );
}

// Call record button component (for recording and summarizing calls)
function CallRecordButton({ isRecording, isSummarizing, onClick }: { isRecording: boolean; isSummarizing: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={isSummarizing}
      className={cn(
        "w-9 h-9 rounded-full transition-all",
        isRecording && "animate-pulse bg-green-500/10 border-green-500 hover:bg-green-500/20"
      )}
      title={isRecording ? "Stop and summarize call" : "Record call (will summarize)"}
    >
      {isSummarizing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Phone className={cn("h-4 w-4", isRecording && "text-green-500")} />
      )}
    </Button>
  );
}

// Helper to get local datetime string for datetime-local input
const getLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

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
    timestamp: getLocalDateTimeString(),
    notes: '',
  });
  
  // Verbatim voice transcription
  const { isRecording, isTranscribing, handleClick: handleVoiceClick } = useVoiceRecording((text) => {
    setFormData(prev => ({ ...prev, notes: prev.notes ? prev.notes + ' ' + text : text }));
  });

  // Call recording with summarization
  const { isRecording: isRecordingCall, isSummarizing, handleClick: handleCallRecordClick } = useCallRecording((summary) => {
    setFormData(prev => ({ ...prev, notes: prev.notes ? prev.notes + '\n\n' + summary : summary }));
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
        timestamp: getLocalDateTimeString(),
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
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Notes</Label>
              <div className="flex items-center gap-2">
                <VoiceButton isRecording={isRecording} isTranscribing={isTranscribing} onClick={handleVoiceClick} />
                <CallRecordButton isRecording={isRecordingCall} isSummarizing={isSummarizing} onClick={handleCallRecordClick} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <Mic className="h-3 w-3 inline mr-1" /> Verbatim transcription | <Phone className="h-3 w-3 inline mx-1" /> Record & summarize call
            </p>
            <MentionableRichTextEditor
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Enter call notes... Use @ to mention team members"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || isRecordingCall || isSummarizing}>
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
    timestamp: getLocalDateTimeString(),
    notes: '',
  });
  
  const { isRecording, isTranscribing, handleClick: handleVoiceClick } = useVoiceRecording((text) => {
    setFormData(prev => ({ ...prev, notes: prev.notes ? prev.notes + ' ' + text : text }));
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
        timestamp: getLocalDateTimeString(),
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
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Notes</Label>
              <VoiceButton isRecording={isRecording} isTranscribing={isTranscribing} onClick={handleVoiceClick} />
            </div>
            <MentionableRichTextEditor
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Enter SMS notes... Use @ to mention team members"
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
    timestamp: getLocalDateTimeString(),
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
        timestamp: getLocalDateTimeString(),
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
            <MentionableRichTextEditor
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Enter email notes... Use @ to mention team members"
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
  const [mentions, setMentions] = useState<TeamMember[]>([]);
  
  const { isRecording, isTranscribing, handleClick: handleVoiceClick } = useVoiceRecording((text) => {
    setNoteBody(prev => prev ? prev + ' ' + text : text);
  });

  // UUID validation helper
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Send mention notifications
  const sendMentionNotifications = async (noteId: string, mentionedMembers: TeamMember[]) => {
    // Get lead name for notification
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
            noteContent: noteBody,
            leadId,
            leadName,
            noteId,
          }
        });
      } catch (error) {
        console.error('Error sending mention notification:', error);
      }
    }
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
      
      // Send mention notifications if there are mentions
      if (mentions.length > 0 && newNote?.id) {
        await sendMentionNotifications(newNote.id, mentions);
        toast({
          title: 'Notifications Sent',
          description: `${mentions.length} team member(s) were notified of your mention.`,
        });
      }

      onActivityCreated(newNote);
      onOpenChange(false);
      setNoteBody('');
      setMentions([]);

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
            <div className="flex items-center justify-between">
              <Label htmlFor="note">Note <span className="text-xs text-muted-foreground">(Type @ to mention team members)</span></Label>
              <VoiceButton isRecording={isRecording} isTranscribing={isTranscribing} onClick={handleVoiceClick} />
            </div>
            <MentionableRichTextEditor
              value={noteBody}
              onChange={setNoteBody}
              placeholder="Enter your note here... Use @ to mention team members"
              onMentionsChange={setMentions}
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