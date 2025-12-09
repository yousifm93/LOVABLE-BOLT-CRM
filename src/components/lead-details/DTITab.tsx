import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DTITabProps {
  leadId: string;
}

export function DTITab({ leadId }: DTITabProps) {
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState<{
    totalMonthlyLiabilities: number | null;
    piti: number | null;
    totalMonthlyIncome: number | null;
    subjectPropertyRentalIncome: number | null;
  }>({
    totalMonthlyLiabilities: null,
    piti: null,
    totalMonthlyIncome: null,
    subjectPropertyRentalIncome: null,
  });
  const [grossRentalIncome, setGrossRentalIncome] = useState<number>(0);
  const [reoNetIncome, setReoNetIncome] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      // Fetch lead data - use correct column names
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('monthly_liabilities, piti, total_monthly_income, subject_property_rental_income')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      setLeadData({
        totalMonthlyLiabilities: (lead as any)?.monthly_liabilities || null,
        piti: (lead as any)?.piti || null,
        totalMonthlyIncome: (lead as any)?.total_monthly_income || null,
        subjectPropertyRentalIncome: (lead as any)?.subject_property_rental_income || null,
      });

      // Fetch real estate properties for rental income (GROSS, not net)
      const { data: properties, error: propError } = await supabase
        .from('real_estate_properties')
        .select('monthly_rent, monthly_expenses')
        .eq('lead_id', leadId);

      if (!propError && properties) {
        // Sum gross rental income (all monthly_rent values)
        const totalGrossRent = properties.reduce((sum, prop) => {
          return sum + (prop.monthly_rent || 0);
        }, 0);
        setGrossRentalIncome(totalGrossRent);

        // Sum REO net income (rent - expenses) for income side
        const totalNetIncome = properties.reduce((sum, prop) => {
          return sum + ((prop.monthly_rent || 0) - (prop.monthly_expenses || 0));
        }, 0);
        setReoNetIncome(totalNetIncome);
      }
    } catch (error) {
      console.error('Error loading DTI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Debt side: monthly_liabilities from lead + PITI
  const monthlyDebt = leadData.totalMonthlyLiabilities || 0;
  const piti = leadData.piti || 0;
  const totalDebt = monthlyDebt + piti;

  // Income side: total_monthly_income + subject property rental income + REO net income
  const monthlyIncome = leadData.totalMonthlyIncome || 0;
  const subjectPropertyRental = leadData.subjectPropertyRentalIncome || 0;
  const totalRentalIncome = subjectPropertyRental + reoNetIncome;
  const totalIncome = monthlyIncome + totalRentalIncome;

  // Front-end DTI = PITI / Total Income
  const frontEndDTI = totalIncome > 0 ? (piti / totalIncome) * 100 : 0;
  // Back-end DTI = Total Debt / Total Income
  const backEndDTI = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-muted/50 rounded animate-pulse" />
        <div className="h-20 bg-muted/50 rounded animate-pulse" />
        <div className="h-12 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Debt Section */}
      <div className="border rounded-lg p-3 bg-background">
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Monthly Debt</p>
            <p className="text-sm font-medium">{formatCurrency(monthlyDebt)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">PITI</p>
            <p className="text-sm font-medium">{formatCurrency(piti)}</p>
          </div>
          <div className="text-center border-l pl-2">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-sm font-bold">{formatCurrency(totalDebt)}</p>
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="border rounded-lg p-3 bg-background">
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Monthly Income</p>
            <p className="text-sm font-medium">{formatCurrency(monthlyIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Rental Income</p>
            <p className="text-sm font-medium">{formatCurrency(totalRentalIncome)}</p>
          </div>
          <div className="text-center border-l pl-2">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-sm font-bold">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
      </div>

      {/* DTI Section */}
      <div className="border rounded-lg p-3 bg-background">
        <p className="text-xs text-muted-foreground text-center mb-2">DTI</p>
        <div className="flex justify-center items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{frontEndDTI.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Front-end</p>
          </div>
          <div className="text-muted-foreground">/</div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{backEndDTI.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Back-end</p>
          </div>
        </div>
      </div>
    </div>
  );
}
