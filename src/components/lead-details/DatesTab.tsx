import React from "react";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DatesTabProps {
  leadId: string;
}

export function DatesTab({ leadId }: DatesTabProps) {
  const { toast } = useToast();

  const { data: lead, refetch } = useQuery({
    queryKey: ['lead-address', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('subject_address_1, subject_address_2, subject_city, subject_state, subject_zip')
        .eq('id', leadId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const handleFieldUpdate = async (fieldName: string, value: string | null) => {
    try {
      await databaseService.updateLead(leadId, { [fieldName]: value });
      await refetch();
      toast({
        title: "Updated",
        description: "Address updated successfully.",
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        title: "Error",
        description: `Failed to update address.`,
        variant: "destructive",
      });
    }
  };

  if (!lead) return null;

  return (
    <div className="space-y-3">
      {/* Row 1: Address 1 and Address 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Subject Address 1</span>
          <InlineEditText
            value={lead.subject_address_1 || ""}
            onValueChange={(value) => handleFieldUpdate('subject_address_1', value || null)}
            placeholder="—"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Subject Address 2</span>
          <InlineEditText
            value={lead.subject_address_2 || ""}
            onValueChange={(value) => handleFieldUpdate('subject_address_2', value || null)}
            placeholder="—"
          />
        </div>
      </div>
      
      {/* Row 2: City, State, Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">City</span>
          <InlineEditText
            value={lead.subject_city || ""}
            onValueChange={(value) => handleFieldUpdate('subject_city', value || null)}
            placeholder="—"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">State</span>
          <InlineEditText
            value={lead.subject_state || ""}
            onValueChange={(value) => handleFieldUpdate('subject_state', value || null)}
            placeholder="—"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Zip</span>
          <InlineEditText
            value={lead.subject_zip || ""}
            onValueChange={(value) => handleFieldUpdate('subject_zip', value || null)}
            placeholder="—"
          />
        </div>
      </div>
    </div>
  );
}