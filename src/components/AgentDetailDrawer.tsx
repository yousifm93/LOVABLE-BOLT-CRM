import { useState, useEffect } from "react";
import { X, Building2, Mail, Phone, Calendar, Star, FileText, MessageSquare, Plus, Send } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { AgentCallLogModal } from "@/components/modals/AgentCallLogModal";
import { SendAgentEmailModal } from "@/components/modals/SendAgentEmailModal";
import { Button } from "@/components/ui/button";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AgentDetailDrawerProps {
  agent: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAgentUpdated: () => void;
}

const rankOptions = [
  { value: 'A', label: 'A - Excellent' },
  { value: 'B', label: 'B - Good' },
  { value: 'C', label: 'C - Average' },
  { value: 'D', label: 'D - Below Average' },
  { value: 'F', label: 'F - Poor' },
];

export function AgentDetailDrawer({ agent, isOpen, onClose, onAgentUpdated }: AgentDetailDrawerProps) {
  const { toast } = useToast();
  const [associatedLeads, setAssociatedLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [isLoadingCallLogs, setIsLoadingCallLogs] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (agent?.id && isOpen) {
      loadAssociatedLeads();
      loadCallLogs();
    }
  }, [agent?.id, isOpen]);

  const loadAssociatedLeads = async () => {
    if (!agent?.id) return;
    
    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, pipeline_stage_id, status')
        .eq('buyer_agent_id', agent.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAssociatedLeads(data || []);
    } catch (error) {
      console.error('Error loading associated leads:', error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const loadCallLogs = async () => {
    if (!agent?.id) return;
    
    setIsLoadingCallLogs(true);
    try {
      const logs = await databaseService.getAgentCallLogs(agent.id, 10);
      setCallLogs(logs);
    } catch (error) {
      console.error('Error loading call logs:', error);
    } finally {
      setIsLoadingCallLogs(false);
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!agent?.id) return;

    try {
      await databaseService.updateBuyerAgent(agent.id, { [field]: value });
      onAgentUpdated();
      toast({
        title: "Updated",
        description: "Agent information updated successfully.",
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: "Failed to update agent information.",
        variant: "destructive",
      });
    }
  };

  if (!agent) return null;

  const fullName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || 'Unknown Agent';
  const initials = [agent.first_name?.[0], agent.last_name?.[0]].filter(Boolean).join('') || '??';

  const getRankColor = (rank: string | null) => {
    if (!rank) return 'bg-muted text-muted-foreground';
    const colors = {
      'A': 'bg-success text-success-foreground',
      'B': 'bg-info text-info-foreground',
      'C': 'bg-warning text-warning-foreground',
      'D': 'bg-destructive/70 text-destructive-foreground',
      'F': 'bg-destructive text-destructive-foreground'
    };
    return colors[rank as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-6xl">
          <DrawerHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DrawerTitle className="text-xl">{fullName}</DrawerTitle>
                  <DrawerDescription className="flex items-center gap-2 mt-1">
                    {agent.brokerage && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {agent.brokerage}
                      </span>
                    )}
                    {agent.agent_rank && (
                      <Badge className={cn("font-bold", getRankColor(agent.agent_rank))}>
                        Rank: {agent.agent_rank}
                      </Badge>
                    )}
                  </DrawerDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailModal(true)}
                  disabled={!agent.email}
                  className="h-8"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send Email
                </Button>
                <DrawerClose asChild>
                  <button className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
                    <X className="h-5 w-5" />
                  </button>
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-4">
            {/* Row 1: First Name, Last Name, Email, Phone */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">First Name</label>
                <InlineEditText
                  value={agent.first_name}
                  onValueChange={(value) => handleFieldUpdate('first_name', value)}
                  placeholder="First name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                <InlineEditText
                  value={agent.last_name}
                  onValueChange={(value) => handleFieldUpdate('last_name', value)}
                  placeholder="Last name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <InlineEditText
                  value={agent.email}
                  onValueChange={(value) => handleFieldUpdate('email', value)}
                  placeholder="agent@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </label>
                <InlineEditPhone
                  value={agent.phone}
                  onValueChange={(value) => handleFieldUpdate('phone', value)}
                  placeholder="(555) 555-5555"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Row 2: Brokerage, Agent Rank */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Brokerage
                </label>
                <InlineEditText
                  value={agent.brokerage}
                  onValueChange={(value) => handleFieldUpdate('brokerage', value)}
                  placeholder="Brokerage name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Agent Rank
                </label>
                <InlineEditSelect
                  value={agent.agent_rank}
                  onValueChange={(value) => handleFieldUpdate('agent_rank', value)}
                  options={rankOptions}
                  placeholder="Select rank"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Activity Tracking */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Activity Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Last Call</label>
                    <InlineEditDate
                      value={agent.last_agent_call}
                      onValueChange={(value) => handleFieldUpdate('last_agent_call', value?.toISOString().split('T')[0])}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Next Scheduled Call</label>
                    <InlineEditDate
                      value={agent.next_agent_call}
                      onValueChange={(value) => handleFieldUpdate('next_agent_call', value?.toISOString().split('T')[0])}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Face-to-Face Meeting</label>
                    <InlineEditDateTime
                      value={agent.face_to_face_meeting}
                      onValueChange={(value) => handleFieldUpdate('face_to_face_meeting', value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* General Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">General Notes</label>
              <InlineEditNotes
                value={agent.notes}
                onValueChange={(value) => handleFieldUpdate('notes', value)}
                placeholder="General notes about this agent..."
                className="mt-1"
              />
            </div>

            {/* Call History */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Activity History
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowCallLogModal(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Log Call
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingCallLogs ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : callLogs.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {callLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 border rounded-lg bg-muted/30 text-sm"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.logged_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs font-medium">
                            {log.user?.full_name || 'Unknown User'}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{log.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Associated Leads */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Associated Leads ({associatedLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingLeads ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : associatedLeads.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                    {associatedLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unnamed Lead'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.status || 'No status'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No leads associated.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DrawerContent>

      <AgentCallLogModal
        agentId={agent.id}
        agentName={fullName}
        isOpen={showCallLogModal}
        onClose={() => setShowCallLogModal(false)}
        onCallLogged={() => {
          loadCallLogs();
          onAgentUpdated();
        }}
      />

      <SendAgentEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        agentEmail={agent.email || ''}
        agentName={fullName}
      />
    </Drawer>
  );
}