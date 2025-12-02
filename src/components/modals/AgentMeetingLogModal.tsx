import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";

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
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 16));
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

      // Create meeting log
      await databaseService.createAgentCallLog(
        agent.id,
        summary.trim(),
        crmUser.id,
        'meeting',
        location.trim() || undefined
      );

      // Update agent's face_to_face_meeting timestamp
      await databaseService.updateBuyerAgent(agent.id, {
        face_to_face_meeting: new Date(meetingDate).toISOString(),
      });

      toast({
        title: "Meeting logged",
        description: `Meeting with ${agent.first_name} ${agent.last_name} has been logged`,
      });

      setSummary("");
      setLocation("");
      setMeetingDate(new Date().toISOString().slice(0, 16));
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
          <DialogTitle>Log Face-to-Face Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-date">Meeting Date & Time</Label>
            <Input
              id="meeting-date"
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., Office, Coffee shop, Client's home"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Meeting Notes</Label>
            <Textarea
              id="summary"
              placeholder="What was discussed during the meeting?"
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
