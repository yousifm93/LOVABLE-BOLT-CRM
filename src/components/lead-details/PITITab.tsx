import React, { useMemo } from "react";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PITITabProps {
  leadId: string;
}

export function PITITab({ leadId }: PITITabProps) {
  const { toast } = useToast();

  const { data: lead, refetch } = useQuery({
    queryKey: ['lead-piti', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('principal_interest, homeowners_insurance, property_taxes, mortgage_insurance, hoa_dues')
        .eq('id', leadId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const totalPITI = useMemo(() => {
    if (!lead) return 0;
    return (
      (lead.principal_interest || 0) +
      (lead.homeowners_insurance || 0) +
      (lead.property_taxes || 0) +
      (lead.mortgage_insurance || 0) +
      (lead.hoa_dues || 0)
    );
  }, [lead]);

  const handleFieldUpdate = async (fieldName: string, value: number | null) => {
    try {
      await databaseService.updateLead(leadId, { [fieldName]: value });
      await refetch();
      toast({
        title: "Updated",
        description: "Monthly payment updated successfully.",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pitiFields = [
    { label: "Principal & Interest", field: "principal_interest", value: lead.principal_interest },
    { label: "Property Taxes", field: "property_taxes", value: lead.property_taxes },
    { label: "HOI (Insurance)", field: "homeowners_insurance", value: lead.homeowners_insurance },
    { label: "Mortgage Insurance", field: "mortgage_insurance", value: lead.mortgage_insurance },
    { label: "Association Dues", field: "hoa_dues", value: lead.hoa_dues },
  ];

  return (
    <div className="space-y-1">
      {pitiFields.map((item) => (
        <div key={item.field} className="flex items-center justify-between py-1">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <InlineEditCurrency
            value={item.value}
            onValueChange={(value) => handleFieldUpdate(item.field, value)}
            placeholder="$0"
          />
        </div>
      ))}

      <div className="flex items-center justify-between py-1 mt-2 border-t border-border">
        <span className="text-xs font-semibold text-foreground">Total PITI</span>
        <span className="text-sm font-bold text-foreground">{formatCurrency(totalPITI)}</span>
      </div>
    </div>
  );
}
