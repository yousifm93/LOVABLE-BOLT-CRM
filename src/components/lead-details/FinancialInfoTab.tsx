import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FourColumnDetailLayout } from "./FourColumnDetailLayout";
import { DollarSign, CreditCard, TrendingUp, Home } from "lucide-react";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";

interface FinancialInfoTabProps {
  client: any;
  leadId: string | null;
  onLeadUpdated?: () => void;
}

export function FinancialInfoTab({ client, leadId, onLeadUpdated }: FinancialInfoTabProps) {
  const { toast } = useToast();

  const handleFieldUpdate = async (fieldName: string, value: any) => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing. Cannot save field.",
        variant: "destructive",
      });
      return;
    }

    try {
      await databaseService.updateLead(leadId, { [fieldName]: value });
      
      if (onLeadUpdated) {
        onLeadUpdated();
      }

      toast({
        title: "Field Updated",
        description: "Financial information updated successfully",
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${fieldName}`,
        variant: "destructive",
      });
    }
  };

  // Calculate PITI
  const calculatePITI = () => {
    const pi = client?.principalInterest || 0;
    const taxes = client?.propertyTaxes || 0;
    const insurance = client?.homeownersInsurance || 0;
    const mi = client?.mortgageInsurance || 0;
    const hoa = client?.hoaDues || 0;
    return pi + taxes + insurance + mi + hoa;
  };

  // Calculate DTI
  const calculateDTI = () => {
    const totalIncome = client?.totalMonthlyIncome || 0;
    const totalLiabilities = client?.monthlyLiabilities || 0;
    
    if (totalIncome > 0) {
      return ((totalLiabilities / totalIncome) * 100).toFixed(2);
    }
    return null;
  };

  const piti = calculatePITI();
  const dti = calculateDTI();

  // Income & Liabilities Data
  const financialData = [
    {
      icon: DollarSign,
      label: "Total Monthly Income",
      value: client?.totalMonthlyIncome 
        ? `$${client.totalMonthlyIncome.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.totalMonthlyIncome || null}
          onValueChange={(value) => handleFieldUpdate('total_monthly_income', value)}
        />
      ),
    },
    {
      icon: TrendingUp,
      label: "Total Assets",
      value: client?.assets 
        ? `$${client.assets.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.assets || null}
          onValueChange={(value) => handleFieldUpdate('assets', value)}
        />
      ),
    },
    {
      icon: CreditCard,
      label: "Total Monthly Liabilities",
      value: client?.monthlyLiabilities 
        ? `$${client.monthlyLiabilities.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.monthlyLiabilities || null}
          onValueChange={(value) => handleFieldUpdate('monthly_liabilities', value)}
        />
      ),
    },
  ];

  // Monthly Payment Breakdown Data
  const paymentBreakdownData = [
    {
      icon: Home,
      label: "Principal & Interest",
      value: client?.principalInterest 
        ? `$${client.principalInterest.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.principalInterest || null}
          onValueChange={(value) => handleFieldUpdate('principal_interest', value)}
        />
      ),
    },
    {
      icon: Home,
      label: "Property Taxes",
      value: client?.propertyTaxes 
        ? `$${client.propertyTaxes.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.propertyTaxes || null}
          onValueChange={(value) => handleFieldUpdate('property_taxes', value)}
        />
      ),
    },
    {
      icon: Home,
      label: "Homeowners Insurance",
      value: client?.homeownersInsurance 
        ? `$${client.homeownersInsurance.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.homeownersInsurance || null}
          onValueChange={(value) => handleFieldUpdate('homeowners_insurance', value)}
        />
      ),
    },
    {
      icon: Home,
      label: "Mortgage Insurance",
      value: client?.mortgageInsurance 
        ? `$${client.mortgageInsurance.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.mortgageInsurance || null}
          onValueChange={(value) => handleFieldUpdate('mortgage_insurance', value)}
        />
      ),
    },
    {
      icon: Home,
      label: "HOA Dues",
      value: client?.hoaDues 
        ? `$${client.hoaDues.toLocaleString()}` 
        : "—",
      editComponent: (
        <InlineEditCurrency
          value={client?.hoaDues || null}
          onValueChange={(value) => handleFieldUpdate('hoa_dues', value)}
        />
      ),
    },
    {
      icon: Home,
      label: "PITI (Calculated)",
      value: piti > 0 ? `$${piti.toLocaleString()}` : "—",
      editComponent: null,
      isCalculated: true,
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-8">
        {/* Income, Assets & Liabilities Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </h3>
          <FourColumnDetailLayout items={financialData} />
        </div>

        {/* Monthly Payment Breakdown Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Home className="h-5 w-5" />
            Monthly Payment Breakdown
          </h3>
          <FourColumnDetailLayout items={paymentBreakdownData} />
        </div>

        {/* DTI Calculation */}
        {dti && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Debt-to-Income Ratio (DTI):</span>
              <span className="text-lg font-bold">{dti}%</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
