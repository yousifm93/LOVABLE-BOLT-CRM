import { useState } from "react";
import { ChevronDown, ChevronRight, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PipelineStage {
  stage_id: string;
  stage_name: string;
  count: number;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_on_date: string;
}

export function PipelineSummarySection({ 
  pipelineStageCounts 
}: { 
  pipelineStageCounts: PipelineStage[] 
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  return (
    <Card className="bg-gradient-card shadow-soft border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <h3 className="text-sm font-semibold text-foreground">Pipeline Summary</h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {pipelineStageCounts.reduce((sum, stage) => sum + stage.count, 0)} total
          </span>
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent className="pt-0 space-y-2">
          {pipelineStageCounts.length > 0 ? (
            pipelineStageCounts.map((stage) => (
              <StageItem
                key={stage.stage_id}
                stage={stage}
                isExpanded={expandedStages.has(stage.stage_id)}
                onToggle={() => toggleStage(stage.stage_id)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pipeline data
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function StageItem({ 
  stage, 
  isExpanded, 
  onToggle 
}: { 
  stage: PipelineStage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Query leads for this stage when expanded
  const { data: stageLeads, isLoading } = useQuery({
    queryKey: ['stageLeads', stage.stage_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date')
        .eq('pipeline_stage_id', stage.stage_id)
        .order('lead_on_date', { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: isExpanded,
    staleTime: 30000,
  });

  return (
    <div className="space-y-2">
      {/* Stage Header */}
      <div 
        className="flex justify-between items-center p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          <span className="text-sm font-medium">{stage.stage_name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {stage.count} {stage.count === 1 ? 'client' : 'clients'}
        </span>
      </div>

      {/* Stage Leads (when expanded) */}
      {isExpanded && (
        <div className="ml-6 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : stageLeads && stageLeads.length > 0 ? (
            stageLeads.map((lead) => (
              <div 
                key={lead.id} 
                className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground hover:text-warning transition-colors">
                    {lead.first_name} {lead.last_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone || '-'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lead.email || '-'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(lead.lead_on_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No leads in this stage
            </p>
          )}
        </div>
      )}
    </div>
  );
}
