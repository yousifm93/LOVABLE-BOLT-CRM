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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Principal & Interest</span>
        <InlineEditCurrency
          value={lead.principal_interest}
          onValueChange={(value) => handleFieldUpdate('principal_interest', value)}
          placeholder="$0"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">HOI (Insurance)</span>
        <InlineEditCurrency
          value={lead.homeowners_insurance}
          onValueChange={(value) => handleFieldUpdate('homeowners_insurance', value)}
          placeholder="$0"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Property Taxes</span>
        <InlineEditCurrency
          value={lead.property_taxes}
          onValueChange={(value) => handleFieldUpdate('property_taxes', value)}
          placeholder="$0"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Mortgage Insurance</span>
        <InlineEditCurrency
          value={lead.mortgage_insurance}
          onValueChange={(value) => handleFieldUpdate('mortgage_insurance', value)}
          placeholder="$0"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Association Dues</span>
        <InlineEditCurrency
          value={lead.hoa_dues}
          onValueChange={(value) => handleFieldUpdate('hoa_dues', value)}
          placeholder="$0"
        />
      </div>

      <div className="flex items-center justify-between py-3 mt-4 bg-muted/30 px-3 rounded-md">
        <span className="text-base font-semibold text-foreground">Total PITI</span>
        <span className="text-base font-bold text-foreground">{formatCurrency(totalPITI)}</span>
      </div>
    </div>
  );
}
