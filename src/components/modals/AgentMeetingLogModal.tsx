import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/ui/voice-recorder";

interface AgentMeetingLogModalProps {
  agent: {
    id: string;
    first_name: string;
    last_name: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onMeetingSaved: () => void;
}

export function AgentMeetingLogModal({ agent, isOpen, onClose, onMeetingSaved }: AgentMeetingLogModalProps) {
  const [meetingType, setMeetingType] = useState<'face_to_face' | 'broker_open'>('face_to_face');
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!summary.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter meeting notes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get CRM user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      
      const { data: crmUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (!crmUser) throw new Error("CRM user not found");

      // Create activity log entry with the user-selected date
      const logType = meetingType === 'broker_open' ? 'broker_open' : 'meeting';
      await databaseService.createAgentCallLog(
        agent.id,
        summary.trim(),
        crmUser.id,
        logType,
        location.trim() || undefined,
        new Date(meetingDate + 'T12:00:00').toISOString()
      );

      // Update appropriate agent field based on meeting type
      if (meetingType === 'broker_open') {
        await databaseService.updateBuyerAgent(agent.id, {
          broker_open: meetingDate,
        });
      } else {
        await databaseService.updateBuyerAgent(agent.id, {
          face_to_face_meeting: new Date(meetingDate).toISOString(),
        });
      }

      const typeLabel = meetingType === 'broker_open' ? "Broker's Open" : "Face-to-Face Meeting";
      toast({
        title: `${typeLabel} logged`,
        description: `${typeLabel} with ${agent.first_name} ${agent.last_name} has been logged`,
      });

      // Reset form
      setSummary("");
      setLocation("");
      setMeetingDate(new Date().toISOString().slice(0, 10));
      setMeetingType('face_to_face');
      onMeetingSaved();
      onClose();
    } catch (error) {
      console.error("Error logging meeting:", error);
      toast({
        title: "Error",
        description: "Failed to log meeting",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Meeting Type <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={meetingType}
              onValueChange={(value) => setMeetingType(value as 'face_to_face' | 'broker_open')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="face_to_face" id="face_to_face" />
                <Label htmlFor="face_to_face" className="font-normal cursor-pointer">Face-to-Face Meeting</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broker_open" id="broker_open" />
                <Label htmlFor="broker_open" className="font-normal cursor-pointer">Broker's Open</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-date">
              {meetingType === 'broker_open' ? "Date of Broker's Open" : "Meeting Date"} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="meeting-date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., Office, Coffee shop, Property address"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="summary">Notes <span className="text-destructive">*</span></Label>
              <VoiceRecorder
                onTranscriptionComplete={(text) => setSummary(prev => prev ? `${prev} ${text}` : text)}
              />
            </div>
            <Textarea
              id="summary"
              placeholder={meetingType === 'broker_open' 
                ? "Notes about the broker's open event..."
                : "What was discussed during the meeting?"
              }
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Logging..." : "Log Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
