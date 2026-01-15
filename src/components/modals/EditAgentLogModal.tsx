import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const LOG_TYPE_OPTIONS = [
  { value: "call", label: "📞 Call" },
  { value: "meeting", label: "🤝 Meeting" },
  { value: "broker_open", label: "📅 Broker's Open" },
];

const CALL_TYPE_OPTIONS = [
  { value: "new_agent", label: "New Agent Call" },
  { value: "current_agent", label: "Current Agent Call" },
  { value: "top_agent", label: "Top Agent Call" },
  { value: "past_la", label: "Past LA Call" },
];

interface EditAgentLogModalProps {
  log: any;
  isOpen: boolean;
  onClose: () => void;
  onLogUpdated: () => void;
}

export function EditAgentLogModal({
  log,
  isOpen,
  onClose,
  onLogUpdated,
}: EditAgentLogModalProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [logType, setLogType] = useState<string>("call");
  const [callType, setCallType] = useState<string>("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Populate form when log changes
  useEffect(() => {
    if (log) {
      setSummary(log.summary || "");
      setLogType(log.log_type || "call");
      setCallType(log.call_type || "");
      setMeetingLocation(log.meeting_location || "");
    }
  }, [log]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSummary("");
      setLogType("call");
      setCallType("");
      setMeetingLocation("");
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!summary.trim()) {
      toast({
        title: "Error",
        description: "Please enter notes/summary",
        variant: "destructive",
      });
      return;
    }

    if (!log?.id) return;

    setIsLoading(true);
    try {
      await databaseService.updateAgentCallLog(log.id, {
        summary,
        log_type: logType as 'call' | 'meeting' | 'broker_open',
        call_type: logType === 'call' ? callType || null : null,
        meeting_location: logType !== 'call' ? meetingLocation || null : null,
      });

      toast({
        title: "Success",
        description: "Log updated successfully",
      });

      onLogUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error updating log:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update log. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!log) return null;

  const logDate = log.logged_at 
    ? new Date(log.logged_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Unknown date';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Log
          </DialogTitle>
          <DialogDescription>
            Logged on {logDate} by {log.users?.first_name} {log.users?.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="log-type">Log Type</Label>
            <Select value={logType} onValueChange={setLogType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {logType === 'call' && (
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
          )}

          {logType !== 'call' && (
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                placeholder="Where did the meeting take place?"
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label htmlFor="summary">Notes *</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What was discussed? Any follow-up needed?"
              className="mt-2 min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
