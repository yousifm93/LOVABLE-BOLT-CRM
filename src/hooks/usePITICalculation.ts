import { useCallback } from 'react';
import { databaseService } from '@/services/database';

interface PITIComponents {
  principalInterest: number;
  propertyTaxes: number;
  homeownersInsurance: number;
  mortgageInsurance: number;
  hoaDues: number;
  totalPiti: number;
}

interface CalculatePITIParams {
  loanAmount: number;
  salesPrice: number;
  interestRate: number;
  term?: number;
  propertyType?: string;
}

// Calculate monthly P&I using mortgage amortization formula
export function calculatePrincipalAndInterest(
  loanAmount: number,
  annualInterestRate: number,
  termMonths: number = 360
): number {
  if (loanAmount <= 0 || termMonths <= 0) return 0;
  
  const monthlyRate = annualInterestRate / 100 / 12;
  
  if (monthlyRate <= 0) {
    // If rate is 0, just divide loan by term
    return loanAmount / termMonths;
  }
  
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  
  return loanAmount * (numerator / denominator);
}

// Calculate all PITI components
export function calculatePITIComponents({
  loanAmount,
  salesPrice,
  interestRate,
  term = 360,
  propertyType = ''
}: CalculatePITIParams): PITIComponents {
  // Calculate P&I
  const principalInterest = calculatePrincipalAndInterest(loanAmount, interestRate, term);
  
  // Calculate Property Taxes (1.5% of sales price annually / 12)
  const propertyTaxes = salesPrice > 0 ? (salesPrice * 0.015) / 12 : 0;
  
  // Calculate Homeowners Insurance
  const isCondo = propertyType?.toLowerCase()?.includes('condo');
  const homeownersInsurance = isCondo ? 75 : Math.max(75, (salesPrice / 100000) * 75);
  
  // Calculate HOA Dues (condos only: $150 per $100K)
  const hoaDues = isCondo ? (salesPrice / 100000) * 150 : 0;
  
  // Calculate Mortgage Insurance (if LTV > 80%)
  const ltv = salesPrice > 0 ? (loanAmount / salesPrice) * 100 : 0;
  const mortgageInsurance = ltv > 80 ? (loanAmount * 0.005) / 12 : 0;
  
  // Total PITI
  const totalPiti = principalInterest + propertyTaxes + homeownersInsurance + hoaDues + mortgageInsurance;
  
  return {
    principalInterest: Math.round(principalInterest),
    propertyTaxes: Math.round(propertyTaxes),
    homeownersInsurance: Math.round(homeownersInsurance),
    mortgageInsurance: Math.round(mortgageInsurance),
    hoaDues: Math.round(hoaDues),
    totalPiti: Math.round(totalPiti)
  };
}

// Hook for reactive PITI calculation and saving
export function usePITICalculation(leadId: string | null) {
  
  // Recalculate and save only P&I and PITI when rate/amount/term changes
  const recalculatePrincipalInterest = useCallback(async ({
    loanAmount,
    interestRate,
    term = 360,
    existingTaxes = 0,
    existingInsurance = 0,
    existingMI = 0,
    existingHOA = 0
  }: {
    loanAmount: number;
    interestRate: number;
    term?: number;
    existingTaxes?: number;
    existingInsurance?: number;
    existingMI?: number;
    existingHOA?: number;
  }) => {
    if (!leadId || loanAmount <= 0) return null;
    
    const principalInterest = calculatePrincipalAndInterest(loanAmount, interestRate, term);
    const totalPiti = principalInterest + existingTaxes + existingInsurance + existingMI + existingHOA;
    
    const updateData = {
      principal_interest: Math.round(principalInterest),
      piti: Math.round(totalPiti)
    };
    
    try {
      await databaseService.updateLead(leadId, updateData);
      console.log('[usePITICalculation] Saved P&I:', Math.round(principalInterest), 'PITI:', Math.round(totalPiti));
      return {
        principalInterest: Math.round(principalInterest),
        totalPiti: Math.round(totalPiti)
      };
    } catch (error) {
      console.error('[usePITICalculation] Error saving:', error);
      return null;
    }
  }, [leadId]);

  // Full PITI recalculation (when loan amount or sales price changes)
  const recalculateFullPITI = useCallback(async (params: CalculatePITIParams) => {
    if (!leadId) return null;
    
    const components = calculatePITIComponents(params);
    
    const updateData = {
      principal_interest: components.principalInterest,
      property_taxes: components.propertyTaxes,
      homeowners_insurance: components.homeownersInsurance,
      mortgage_insurance: components.mortgageInsurance,
      hoa_dues: components.hoaDues,
      piti: components.totalPiti
    };
    
    try {
      await databaseService.updateLead(leadId, updateData);
      console.log('[usePITICalculation] Saved full PITI:', components);
      return components;
    } catch (error) {
      console.error('[usePITICalculation] Error saving full PITI:', error);
      return null;
    }
  }, [leadId]);

  return {
    calculatePrincipalAndInterest,
    calculatePITIComponents,
    recalculatePrincipalInterest,
    recalculateFullPITI
  };
}
