import React, { useMemo } from "react";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        .select('principal_interest, homeowners_insurance, property_taxes, mortgage_insurance, hoa_dues, loan_amount, interest_rate, term')
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
      // Calculate new PITI total
      const currentValues = {
        principal_interest: lead?.principal_interest || 0,
        property_taxes: lead?.property_taxes || 0,
        homeowners_insurance: lead?.homeowners_insurance || 0,
        mortgage_insurance: lead?.mortgage_insurance || 0,
        hoa_dues: lead?.hoa_dues || 0,
      };
      
      // Update the changed field
      currentValues[fieldName as keyof typeof currentValues] = value || 0;
      
      // Calculate new total
      const newTotal = Object.values(currentValues).reduce((sum, val) => sum + val, 0);
      
      // Save both the field and updated PITI total
      await databaseService.updateLead(leadId, { 
        [fieldName]: value,
        piti: Math.round(newTotal)
      });
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

  // Check if P&I was auto-calculated (has loan amount and rate)
  const isAutoCalculated = lead.loan_amount && lead.interest_rate;

  const pitiFields = [
    { 
      label: "Principal & Interest", 
      field: "principal_interest", 
      value: lead.principal_interest,
      tooltip: isAutoCalculated 
        ? `Auto-calculated from $${lead.loan_amount?.toLocaleString()} @ ${lead.interest_rate}% for ${lead.term || 360} months`
        : null
    },
    { label: "Property Taxes", field: "property_taxes", value: lead.property_taxes },
    { label: "HOI (Insurance)", field: "homeowners_insurance", value: lead.homeowners_insurance },
    { label: "Mortgage Insurance", field: "mortgage_insurance", value: lead.mortgage_insurance },
    { label: "Association Dues", field: "hoa_dues", value: lead.hoa_dues },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-1">
        {pitiFields.map((item) => (
          <div key={item.field} className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {item.label}
              {item.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[250px]">
                    <p className="text-xs">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
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
    </TooltipProvider>
  );
}
