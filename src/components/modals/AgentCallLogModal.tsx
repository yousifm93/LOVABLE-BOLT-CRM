import { useState } from "react";
import { X, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";

interface AgentCallLogModalProps {
  agentId: string;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
  onCallLogged: () => void;
}

export function AgentCallLogModal({
  agentId,
  agentName,
  isOpen,
  onClose,
  onCallLogged,
}: AgentCallLogModalProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [callDateTime, setCallDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!summary.trim()) {
      toast({
        title: "Error",
        description: "Please enter call notes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Create call log with custom date/time
      await databaseService.createAgentCallLog(agentId, summary, user.id, 'call', undefined, callDateTime);

      // Update last_agent_call date on the agent using the selected date
      await databaseService.updateBuyerAgent(agentId, {
        last_agent_call: new Date(callDateTime).toISOString().split('T')[0], // Date only
      });

      toast({
        title: "Success",
        description: "Call logged successfully",
      });

      setSummary("");
      onCallLogged();
      onClose();
    } catch (error) {
      console.error("Error logging call:", error);
      toast({
        title: "Error",
        description: "Failed to log call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Log Call - {agentName}
          </DialogTitle>
          <DialogDescription>
            Record details about your call with this agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="call-date">Call Date & Time</Label>
            <Input
              id="call-date"
              type="datetime-local"
              value={callDateTime}
              onChange={(e) => setCallDateTime(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Call Summary *
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did you discuss? Any follow-up needed?"
              className="min-h-[120px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Log Call"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
