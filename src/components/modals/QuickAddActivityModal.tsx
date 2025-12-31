import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Calendar, Users, Phone } from "lucide-react";
import { VoiceRecorder } from "@/components/ui/voice-recorder";

export type ActivityType = 'broker_open' | 'face_to_face' | 'call' | 'lead';
export type CallSubType = 'new_agent' | 'current_agent' | 'top_agent' | 'past_la';

interface QuickAddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityType: ActivityType;
  callSubType?: CallSubType;
  onActivityAdded: () => void;
}

const CALL_TYPE_LABELS: Record<CallSubType, string> = {
  new_agent: "New Agent Call",
  current_agent: "Current Agent Call",
  top_agent: "Top Agent Call",
  past_la: "Past LA Call",
};

const ACTIVITY_CONFIG = {
  broker_open: {
    title: "Add Broker Open",
    icon: Calendar,
    dateLabel: "Broker Open Date",
    notesLabel: "Notes (Optional)",
  },
  face_to_face: {
    title: "Add Face-to-Face Meeting",
    icon: Users,
    dateLabel: "Meeting Date & Time",
    notesLabel: "Meeting Notes",
  },
  call: {
    title: "Log Agent Call",
    icon: Phone,
    dateLabel: "Call Date & Time",
    notesLabel: "Call Summary",
  },
  lead: {
    title: "Add New Lead",
    icon: Users,
    dateLabel: "",
    notesLabel: "",
  },
};

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  brokerage: string;
  notes?: string | null;
}

export function QuickAddActivityModal({
  isOpen,
  onClose,
  activityType,
  callSubType,
  onActivityAdded,
}: QuickAddActivityModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    if (isOpen && activityType !== 'lead') {
      fetchAgents();
    }
  }, [isOpen, activityType]);

  // Filter agents based on search - show ALL matches when searching
  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredAgents(
        agents.filter(
          (a) =>
            `${a.first_name} ${a.last_name}`.toLowerCase().includes(term) ||
            a.first_name?.toLowerCase().includes(term) ||
            a.last_name?.toLowerCase().includes(term) ||
            a.brokerage?.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredAgents(agents); // Show all agents when not searching
    }
  }, [searchTerm, agents]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId("");
      setActivityDate(new Date().toISOString().slice(0, 16));
      setNotes("");
      setLocation("");
      setSearchTerm("");
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const { data, error } = await supabase
        .from("buyer_agents")
        .select("id, first_name, last_name, brokerage")
        .is("deleted_at", null)
        .order("first_name");

      if (error) throw error;
      setAgents(data || []);
      setFilteredAgents(data || []); // Show all agents initially
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAgentId) {
      toast({
        title: "Error",
        description: "Please select an agent",
        variant: "destructive",
      });
      return;
    }

    if (activityType === 'call' && !notes.trim()) {
      toast({
        title: "Error",
        description: "Please enter call notes",
        variant: "destructive",
      });
      return;
    }

    // Require notes for broker opens
    if (activityType === 'broker_open' && !notes.trim()) {
      toast({
        title: "Error",
        description: "Please enter notes about the broker open",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get CRM user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data: crmUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!crmUser) throw new Error("CRM user not found");

      const selectedAgent = agents.find((a) => a.id === selectedAgentId);

      if (activityType === 'broker_open') {
        // Update agent's broker_open date and notes
        await databaseService.updateBuyerAgent(selectedAgentId, {
          broker_open: new Date(activityDate).toISOString().split('T')[0],
          notes: notes.trim() || selectedAgent?.notes, // Update notes with broker open notes
        });

        toast({
          title: "Broker Open Added",
          description: `Logged broker open for ${selectedAgent?.first_name} ${selectedAgent?.last_name}`,
        });
      } else if (activityType === 'face_to_face') {
        // Create meeting log
        await databaseService.createAgentCallLog(
          selectedAgentId,
          notes.trim() || "Face-to-face meeting",
          crmUser.id,
          'meeting',
          location.trim() || undefined,
          activityDate
        );

        // Update agent's face_to_face_meeting timestamp
        await databaseService.updateBuyerAgent(selectedAgentId, {
          face_to_face_meeting: new Date(activityDate).toISOString(),
        });

        toast({
          title: "Meeting Logged",
          description: `Logged meeting with ${selectedAgent?.first_name} ${selectedAgent?.last_name}`,
        });
      } else if (activityType === 'call') {
        // Create call log
        await databaseService.createAgentCallLog(
          selectedAgentId,
          notes.trim(),
          crmUser.id,
          'call',
          undefined,
          activityDate,
          callSubType
        );

        // Update last_agent_call date on the agent
        await databaseService.updateBuyerAgent(selectedAgentId, {
          last_agent_call: new Date(activityDate).toISOString().split('T')[0],
        });

        toast({
          title: "Call Logged",
          description: `Logged ${CALL_TYPE_LABELS[callSubType || 'new_agent']} with ${selectedAgent?.first_name} ${selectedAgent?.last_name}`,
        });
      }

      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-agents'] });

      onActivityAdded();
      onClose();
    } catch (error) {
      console.error("Error saving activity:", error);
      toast({
        title: "Error",
        description: "Failed to save activity",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (activityType === 'lead') {
    // For leads, we'll just close this and let the parent handle it
    return null;
  }

  const config = ACTIVITY_CONFIG[activityType];
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {activityType === 'call' && callSubType
              ? `Log ${CALL_TYPE_LABELS[callSubType]}`
              : config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Search/Select */}
          <div className="space-y-2">
            <Label>Select Agent</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {isLoadingAgents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {filteredAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name}
                      {agent.brokerage && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({agent.brokerage})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  {filteredAgents.length === 0 && (
                    <div className="py-2 px-4 text-sm text-muted-foreground">
                      No agents found
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="activity-date">{config.dateLabel}</Label>
            <Input
              id="activity-date"
              type={activityType === 'broker_open' ? 'date' : 'datetime-local'}
              value={activityType === 'broker_open' ? activityDate.split('T')[0] : activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
          </div>

          {/* Location (for face-to-face only) */}
          {activityType === 'face_to_face' && (
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                placeholder="e.g., Office, Coffee shop, Client's home"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          {(activityType === 'call' || activityType === 'face_to_face') && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="notes">
                  {config.notesLabel}
                  {activityType === 'call' && ' *'}
                </Label>
                <VoiceRecorder 
                  onTranscriptionComplete={(text) => setNotes(prev => prev ? `${prev} ${text}` : text)}
                />
              </div>
              <Textarea
                id="notes"
                placeholder={
                  activityType === 'call'
                    ? "What did you discuss? Any follow-up needed?"
                    : "What was discussed during the meeting?"
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
