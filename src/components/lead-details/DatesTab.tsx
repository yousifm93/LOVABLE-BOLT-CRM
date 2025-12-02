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
        description: `Failed to update ${fieldName}.`,
        variant: "destructive",
      });
    }
  };

  if (!lead) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Subject Address 1</span>
        <InlineEditText
          value={lead.subject_address_1 || ""}
          onValueChange={(value) => handleFieldUpdate('subject_address_1', value)}
          placeholder="Street address"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Subject Address 2</span>
        <InlineEditText
          value={lead.subject_address_2 || ""}
          onValueChange={(value) => handleFieldUpdate('subject_address_2', value)}
          placeholder="Apt, Suite, etc."
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">City</span>
        <InlineEditText
          value={lead.subject_city || ""}
          onValueChange={(value) => handleFieldUpdate('subject_city', value)}
          placeholder="City"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">State</span>
        <InlineEditText
          value={lead.subject_state || ""}
          onValueChange={(value) => handleFieldUpdate('subject_state', value)}
          placeholder="State"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Zip</span>
        <InlineEditText
          value={lead.subject_zip || ""}
          onValueChange={(value) => handleFieldUpdate('subject_zip', value)}
          placeholder="Zip code"
        />
      </div>
    </div>
  );
}
