import { useState } from "react";
import { Phone } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/ui/voice-recorder";

const CALL_TYPE_OPTIONS = [
  { value: "new_agent", label: "New Agent Call" },
  { value: "current_agent", label: "Current Agent Call" },
  { value: "top_agent", label: "Top Agent Call" },
  { value: "past_la", label: "Past LA Call" },
];

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
  const [callDate, setCallDate] = useState(new Date().toISOString().slice(0, 10));
  const [callType, setCallType] = useState<string>("");
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
      // Get CRM user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No user found");
      
      const { data: crmUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();
      
      if (!crmUser) throw new Error("CRM user not found");

      // Create call log with custom date/time and call type
      await databaseService.createAgentCallLog(agentId, summary, crmUser.id, 'call', undefined, callDate, callType || undefined);

      // Update last_agent_call date on the agent using the selected date
      await databaseService.updateBuyerAgent(agentId, {
        last_agent_call: callDate, // Already date-only format
      });

      toast({
        title: "Success",
        description: "Call logged successfully",
      });

      // Auto-complete related tasks
      try {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, buyer_agent_id, listing_agent_id')
          .or(`buyer_agent_id.eq.${agentId},listing_agent_id.eq.${agentId}`);

        if (leads && leads.length > 0) {
          for (const lead of leads) {
            const callLogType = lead.buyer_agent_id === agentId 
              ? 'log_call_buyer_agent' 
              : 'log_call_listing_agent';
            
            const result = await databaseService.autoCompleteTasksAfterCall(
              lead.id,
              callLogType,
              crmUser.id
            );

            if (result.completedCount > 0) {
              toast({
                title: "Tasks Auto-Completed",
                description: `${result.completedCount} task(s) marked as done: ${result.taskTitles.join(', ')}`,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error auto-completing tasks:', error);
        // Don't show error toast - call was still logged successfully
      }

      setSummary("");
      setCallType("");
      onCallLogged();
      onClose();
    } catch (error: any) {
      console.error("Error logging call:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to log call. Please try again.",
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
            <Label htmlFor="call-date">Call Date</Label>
            <Input
              id="call-date"
              type="date"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="call-type">Call Type</Label>
            <Select value={callType} onValueChange={setCallType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select call type..." />
              </SelectTrigger>
              <SelectContent>
                {CALL_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">
                Call Summary *
              </label>
              <VoiceRecorder 
                onTranscriptionComplete={(text) => setSummary(prev => prev ? `${prev} ${text}` : text)}
              />
            </div>
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
