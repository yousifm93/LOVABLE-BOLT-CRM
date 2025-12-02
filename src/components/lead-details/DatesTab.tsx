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

  const addressFields = [
    { label: "Subject Address 1", field: "subject_address_1", value: lead.subject_address_1 },
    { label: "Subject Address 2", field: "subject_address_2", value: lead.subject_address_2 },
    { label: "City", field: "subject_city", value: lead.subject_city },
    { label: "State", field: "subject_state", value: lead.subject_state },
    { label: "Zip", field: "subject_zip", value: lead.subject_zip },
  ];

  return (
    <div className="space-y-1">
      {addressFields.map((item) => (
        <div key={item.field} className="flex items-center justify-between py-1">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <InlineEditText
            value={item.value || ""}
            onValueChange={(value) => handleFieldUpdate(item.field, value || null)}
            placeholder="—"
          />
        </div>
      ))}
    </div>
  );
}
