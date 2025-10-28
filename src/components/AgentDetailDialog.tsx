import { useState, useEffect } from "react";
import { Building2, Mail, Phone, BadgeIcon, Calendar, Star, User, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentDetailDialogProps {
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

export function AgentDetailDialog({ agent, isOpen, onClose, onAgentUpdated }: AgentDetailDialogProps) {
  const { toast } = useToast();
  const [associatedLeads, setAssociatedLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  useEffect(() => {
    if (agent?.id && isOpen) {
      loadAssociatedLeads();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] backdrop-blur-xl bg-background/95 border-border/50 shadow-2xl rounded-xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{fullName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
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
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name</label>
                  <InlineEditText
                    value={agent.first_name}
                    onValueChange={(value) => handleFieldUpdate('first_name', value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
                  <InlineEditText
                    value={agent.last_name}
                    onValueChange={(value) => handleFieldUpdate('last_name', value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <InlineEditText
                    value={agent.email}
                    onValueChange={(value) => handleFieldUpdate('email', value)}
                    placeholder="agent@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</label>
                  <InlineEditPhone
                    value={agent.phone}
                    onValueChange={(value) => handleFieldUpdate('phone', value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
            </div>

            {/* Professional Details */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Professional Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Brokerage</label>
                  <InlineEditText
                    value={agent.brokerage}
                    onValueChange={(value) => handleFieldUpdate('brokerage', value)}
                    placeholder="Enter brokerage"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    Agent Rank
                  </label>
                  <InlineEditSelect
                    value={agent.agent_rank}
                    onValueChange={(value) => handleFieldUpdate('agent_rank', value)}
                    options={rankOptions}
                    placeholder="Select rank"
                  />
                </div>
              </div>
            </div>

            {/* Activity Tracking */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Activity Tracking
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Call</label>
                  <InlineEditDateTime
                    value={agent.last_agent_call}
                    onValueChange={(value) => handleFieldUpdate('last_agent_call', value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next Call</label>
                  <InlineEditDateTime
                    value={agent.next_agent_call}
                    onValueChange={(value) => handleFieldUpdate('next_agent_call', value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Associated Leads Section - Compact */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Associated Leads
              </h3>
              <span className="text-xs text-muted-foreground">{associatedLeads.length} total</span>
            </div>
            {isLoadingLeads ? (
              <p className="text-xs text-muted-foreground">Loading leads...</p>
            ) : associatedLeads.length > 0 ? (
              <div className="space-y-2">
                {associatedLeads.slice(0, 4).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between px-3 py-2 border rounded-md hover:bg-accent/30 transition-colors text-sm"
                  >
                    <span className="font-medium">
                      {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unnamed Lead'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lead.status || 'No status'}
                    </span>
                  </div>
                ))}
                {associatedLeads.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    + {associatedLeads.length - 4} more leads
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No leads associated with this agent yet.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
