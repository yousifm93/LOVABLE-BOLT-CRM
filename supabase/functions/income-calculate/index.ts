import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fannie Mae calculation rules per BoltCRM Income Calculation Guide
const FANNIE_MAE_RULES = {
  variableIncomeMinMonths: 24, // 2 years for OT, bonus, commission
  declineTrendThreshold: 0.20, // 20% decline triggers lower year usage
  rentalIncomeVacancyFactor: 0.75, // 75% of rental income for Fannie
  selfEmploymentMinYears: 2,
  mealDeductionRate: 0.50, // 50% of meals can be added back
};

// Mileage depreciation rates by year per IRS notices
const MILEAGE_DEPRECIATION_RATES: Record<number, number> = {
  2024: 0.30, // IRS Notice 2024-08
  2023: 0.28, // IRS Notice 2023-03
  2022: 0.26, // IRS Notice 2022-03
  2021: 0.26, // IRS Notice 2021-02
  2020: 0.27,
  2019: 0.26,
};

interface IncomeComponent {
  component_type: string;
  monthly_amount: number;
  calculation_method: string;
  source_documents: string[];
  months_considered?: number;
  trend_direction?: 'up' | 'down' | 'stable';
  trend_percentage?: number;
  year1_amount?: number;
  year2_amount?: number;
  notes?: string;
}

// Calculate monthly income from pay frequency
function annualizeFromFrequency(amount: number, frequency: string): number {
  switch (frequency?.toLowerCase()) {
    case 'weekly': return amount * 52;
    case 'biweekly': return amount * 26;
    case 'semimonthly': return amount * 24;
    case 'monthly': return amount * 12;
    case 'annual': return amount;
    default: return amount * 12; // Assume monthly if unknown
  }
}

// Calculate variable income with 2-year trending
function calculateVariableIncome(
  year1Amount: number, 
  year2Amount: number, 
  incomeType: string
): { monthlyAmount: number; trend: 'up' | 'down' | 'stable'; trendPct: number; method: string } {
  
  if (!year1Amount && !year2Amount) {
    return { monthlyAmount: 0, trend: 'stable', trendPct: 0, method: 'No data' };
  }
  
  if (!year1Amount) {
    // Only have year 2 - can't establish trend, use year 2 only
    return { 
      monthlyAmount: year2Amount / 12, 
      trend: 'stable', 
      trendPct: 0, 
      method: 'Single year only - cannot establish trend'
    };
  }
  
  if (!year2Amount) {
    // Only have year 1 - use conservatively
    return { 
      monthlyAmount: year1Amount / 12, 
      trend: 'stable', 
      trendPct: 0, 
      method: 'Prior year only'
    };
  }

  // Calculate trend
  const trendPct = (year2Amount - year1Amount) / year1Amount;
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let monthlyAmount: number;
  let method: string;

  if (trendPct < -FANNIE_MAE_RULES.declineTrendThreshold) {
    // Declining > 20% - use lower (most recent) year per Fannie Mae
    trend = 'down';
    monthlyAmount = year2Amount / 12;
    method = `Declining ${Math.abs(trendPct * 100).toFixed(1)}% - using most recent year`;
  } else if (trendPct > 0.05) {
    // Increasing - use 2-year average
    trend = 'up';
    monthlyAmount = (year1Amount + year2Amount) / 2 / 12;
    method = `Increasing ${(trendPct * 100).toFixed(1)}% - using 2-year average`;
  } else {
    // Stable - use 2-year average
    trend = 'stable';
    monthlyAmount = (year1Amount + year2Amount) / 2 / 12;
    method = `Stable (${(trendPct * 100).toFixed(1)}%) - using 2-year average`;
  }

  return { monthlyAmount, trend, trendPct: trendPct * 100, method };
}

// Calculate self-employment income with full add-backs per BoltCRM Guide
function calculateSelfEmploymentIncome(
  year1Data: any,
  year2Data: any
): { monthlyAmount: number; addBacks: any; method: string; warning?: string } {
  
  const years = [year1Data, year2Data].filter(Boolean);
  
  if (years.length < FANNIE_MAE_RULES.selfEmploymentMinYears) {
    return {
      monthlyAmount: 0,
      addBacks: {},
      method: 'Insufficient history',
      warning: `Self-employment requires ${FANNIE_MAE_RULES.selfEmploymentMinYears} years of history`
    };
  }

  // Calculate adjusted income for each year with FULL add-backs
  const adjustedYears = years.map((yearData, idx) => {
    const taxYear = yearData.tax_year || (2024 - idx);
    const mileageRate = MILEAGE_DEPRECIATION_RATES[taxYear] || 0.30;
    
    const netProfit = yearData.line31_net_profit_loss || yearData.net_profit || 0;
    const depreciation = yearData.line13_depreciation || yearData.depreciation || 0;
    const depletion = yearData.line12_depletion || yearData.depletion || 0;
    const homeOffice = yearData.line30_home_office || yearData.home_office_deduction || 0;
    const meals = (yearData.line24b_meals || yearData.meals || 0) * FANNIE_MAE_RULES.mealDeductionRate;
    
    // NEW: Mileage depreciation add-back (Line 44a business miles × rate)
    const businessMiles = yearData.line44a_business_miles || 0;
    const mileageDepreciation = businessMiles * mileageRate;
    
    // NEW: Part V amortization and casualty loss add-backs
    const amortization = yearData.part_v_amortization || 0;
    const casualtyLoss = yearData.part_v_casualty_loss || 0;
    
    // NEW: Deduct non-recurring Line 6 other income
    const line6NonRecurring = yearData.line6_is_non_recurring ? (yearData.line6_other_income || 0) : 0;
    
    const adjustedIncome = netProfit + depreciation + depletion + homeOffice + meals 
                          + mileageDepreciation + amortization + casualtyLoss 
                          - line6NonRecurring;
    
    return {
      year: taxYear,
      netProfit,
      depreciation,
      depletion,
      homeOffice,
      meals,
      mileageDepreciation,
      amortization,
      casualtyLoss,
      line6NonRecurring,
      adjustedIncome
    };
  });

  // Apply trending rules
  const year1Adjusted = adjustedYears[0]?.adjustedIncome || 0;
  const year2Adjusted = adjustedYears[1]?.adjustedIncome || 0;

  const { monthlyAmount, trend, method } = calculateVariableIncome(
    year1Adjusted,
    year2Adjusted,
    'self_employment'
  );

  // Check for red flags
  let warning: string | undefined;
  if (year1Adjusted < 0 || year2Adjusted < 0) {
    warning = 'Business shows net loss in one or more years - may not qualify';
  }

  return {
    monthlyAmount,
    addBacks: {
      depreciation: adjustedYears.reduce((sum, y) => sum + y.depreciation, 0) / years.length,
      depletion: adjustedYears.reduce((sum, y) => sum + y.depletion, 0) / years.length,
      homeOffice: adjustedYears.reduce((sum, y) => sum + y.homeOffice, 0) / years.length,
      meals: adjustedYears.reduce((sum, y) => sum + y.meals, 0) / years.length,
      mileageDepreciation: adjustedYears.reduce((sum, y) => sum + y.mileageDepreciation, 0) / years.length,
      amortization: adjustedYears.reduce((sum, y) => sum + y.amortization, 0) / years.length,
      casualtyLoss: adjustedYears.reduce((sum, y) => sum + y.casualtyLoss, 0) / years.length,
    },
    method: `Self-employment with add-backs: ${method}`,
    warning
  };
}

// Calculate rental income with line-by-line add-backs per BoltCRM Guide (Schedule E)
function calculateRentalIncome(scheduleEData: any[]): { 
  monthlyAmount: number; 
  method: string; 
  properties: number;
  breakdown: any;
} {
  if (!scheduleEData || scheduleEData.length === 0) {
    return { monthlyAmount: 0, method: 'No rental data', properties: 0, breakdown: {} };
  }

  let totalAdjustedRental = 0;
  let propertiesCount = 0;
  const propertyBreakdowns: any[] = [];

  for (const data of scheduleEData) {
    // Get properties from parsed data
    const properties = data.properties || [];
    
    for (const prop of properties) {
      // Line-by-line method per BoltCRM Guide
      const rentReceived = prop.line3_rents_received || prop.rents_received || 0;
      const totalExpenses = prop.line20_total_expenses || prop.total_expenses || 0;
      
      // PITIA + Depreciation Add-backs
      const insuranceAddBack = prop.line9_insurance || prop.insurance || 0;
      const mortgageInterestAddBack = prop.line12_mortgage_interest || prop.mortgage_interest || 0;
      const taxesAddBack = prop.line16_taxes || prop.taxes || 0;
      const depreciationAddBack = prop.line18_depreciation || prop.depreciation || 0;
      const hoaAddBack = prop.line19_hoa || prop.hoa || 0;
      
      const totalAddBacks = insuranceAddBack + mortgageInterestAddBack + taxesAddBack + depreciationAddBack + hoaAddBack;
      
      // Adjusted = Rent - Expenses + Add-backs
      const adjustedRental = rentReceived - totalExpenses + totalAddBacks;
      
      // Apply Fannie Mae 75% vacancy factor
      const qualifyingIncome = adjustedRental * FANNIE_MAE_RULES.rentalIncomeVacancyFactor;
      
      totalAdjustedRental += qualifyingIncome;
      propertiesCount++;
      
      propertyBreakdowns.push({
        address: prop.address,
        rentReceived,
        totalExpenses,
        addBacks: { insurance: insuranceAddBack, mortgageInterest: mortgageInterestAddBack, taxes: taxesAddBack, depreciation: depreciationAddBack, hoa: hoaAddBack },
        adjustedRental,
        qualifyingIncome
      });
    }

    // Also check for total_rental_net if properties not itemized (legacy method)
    if (properties.length === 0 && data.total_rental_net) {
      totalAdjustedRental += data.total_rental_net * FANNIE_MAE_RULES.rentalIncomeVacancyFactor;
      propertiesCount = 1;
    }
  }

  // Average across years if multiple Schedule Es
  const yearsOfData = scheduleEData.length;
  const avgAnnualRental = totalAdjustedRental / yearsOfData;
  const monthlyAmount = avgAnnualRental / 12;

  return {
    monthlyAmount,
    method: `Schedule E line-by-line with PITIA add-backs × 75% (${yearsOfData} year avg)`,
    properties: propertiesCount,
    breakdown: { properties: propertyBreakdowns, yearsOfData }
  };
}

// Calculate K-1 income with 1120-S add-backs (SAM Cash Flow method) + liquidity ratios
function calculateK1With1120SIncome(
  k1Data: any[], 
  form1120sData: any[],
  w2OfficerComp: number = 0
): { 
  monthlyAmount: number; 
  method: string; 
  breakdown: any;
  warning?: string;
  liquidityRatios?: { currentRatio: number; quickRatio: number };
} {
  if ((!k1Data || k1Data.length === 0) && (!form1120sData || form1120sData.length === 0)) {
    return { monthlyAmount: 0, method: 'No K-1 or 1120-S data', breakdown: {} };
  }

  // Group data by year
  const byYear: Record<number, { 
    k1Income: number; 
    depreciation: number; 
    depletion: number;
    amortization: number;
    nolCarryover: number;
    shortTermDebt: number;
    nonDeductibleTE: number;
    distributions: number;
    ownershipPct: number;
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
  }> = {};

  // Process K-1s first
  for (const k1 of (k1Data || [])) {
    const year = k1.tax_year || 2023;
    if (!byYear[year]) {
      byYear[year] = { 
        k1Income: 0, depreciation: 0, depletion: 0, amortization: 0, nolCarryover: 0,
        shortTermDebt: 0, nonDeductibleTE: 0, distributions: 0, ownershipPct: 100,
        currentAssets: 0, currentLiabilities: 0, inventory: 0
      };
    }
    
    // K-1 Boxes 1, 2, 3, 4c (ordinary income + rental + guaranteed payments)
    const ordinaryIncome = parseFloat(k1.box1_ordinary_income) || 0;
    const netRentalIncome = parseFloat(k1.box2_net_rental_income) || 0;
    const otherNetRental = parseFloat(k1.box3_other_net_rental) || 0;
    const guaranteedPayments = parseFloat(k1.box4c_guaranteed_payments_total) || parseFloat(k1.box4_guaranteed_payments) || 0;
    const distributions = parseFloat(k1.box16d_distributions) || parseFloat(k1.box16_distributions) || 0;
    const ownership = parseFloat(k1.ownership_percentage) || 100;
    
    byYear[year].k1Income += ordinaryIncome + netRentalIncome + otherNetRental + guaranteedPayments;
    byYear[year].distributions += distributions;
    byYear[year].ownershipPct = ownership;
  }

  // Process 1120-S forms for add-backs and liquidity data
  for (const form of (form1120sData || [])) {
    const year = form.tax_year || 2023;
    if (!byYear[year]) {
      byYear[year] = { 
        k1Income: 0, depreciation: 0, depletion: 0, amortization: 0, nolCarryover: 0,
        shortTermDebt: 0, nonDeductibleTE: 0, distributions: 0, ownershipPct: 100,
        currentAssets: 0, currentLiabilities: 0, inventory: 0
      };
    }
    
    // Add-backs (these get ADDED to income)
    byYear[year].depreciation += parseFloat(form.line14_depreciation) || 0;
    byYear[year].depletion += parseFloat(form.line15_depletion) || 0;
    byYear[year].amortization += parseFloat(form.amortization) || 0;
    byYear[year].nolCarryover += parseFloat(form.net_operating_loss_carryover) || 0;
    
    // Deductions (these get SUBTRACTED from income)
    byYear[year].shortTermDebt += parseFloat(form.schedule_l_line17d_loans_less_1yr) || 0;
    byYear[year].nonDeductibleTE += parseFloat(form.schedule_m1_line3b_travel_entertainment) || 0;
    
    // Liquidity data from Schedule L
    byYear[year].currentAssets = parseFloat(form.schedule_l_line6_current_assets) || 0;
    byYear[year].currentLiabilities = parseFloat(form.schedule_l_line18_current_liabilities) || 0;
    byYear[year].inventory = parseFloat(form.schedule_l_line14_inventory) || 0;
    
    // Distributions from M-2
    if (form.schedule_m2_line7_distributions) {
      byYear[year].distributions = parseFloat(form.schedule_m2_line7_distributions) || byYear[year].distributions;
    }
    
    // If we don't have K-1 income yet, use line 21
    if (byYear[year].k1Income === 0 && form.line21_ordinary_business_income) {
      byYear[year].k1Income = parseFloat(form.line21_ordinary_business_income) || 0;
    }
  }

  // Calculate adjusted income for each year using SAM Cash Flow formula
  const years = Object.keys(byYear).map(y => parseInt(y)).sort();
  const adjustedByYear: Record<number, number> = {};
  
  for (const year of years) {
    const data = byYear[year];
    const ownershipMultiplier = data.ownershipPct / 100;
    
    // SAM Cash Flow = (K1 Income + Add-backs - Deductions) × Ownership%
    const adjustedIncome = (
      data.k1Income + 
      data.depreciation + 
      data.depletion + 
      data.amortization +
      data.nolCarryover -
      data.shortTermDebt -
      data.nonDeductibleTE
    ) * ownershipMultiplier;
    
    adjustedByYear[year] = adjustedIncome;
  }

  // Apply 2-year trending
  let monthlyAmount = 0;
  let method = '';
  let warning: string | undefined;
  let liquidityRatios: { currentRatio: number; quickRatio: number } | undefined;

  if (years.length >= 2) {
    const year1 = adjustedByYear[years[0]] || 0;
    const year2 = adjustedByYear[years[1]] || 0;
    
    const trending = calculateVariableIncome(year1, year2, 's_corp');
    monthlyAmount = trending.monthlyAmount;
    method = `S-Corp SAM Cash Flow: ${trending.method}`;
    
    // Check liquidity - if income > distributions, flag for liquidity test
    const avgDistributions = years.reduce((sum, y) => sum + (byYear[y].distributions || 0), 0) / years.length;
    const avgK1Income = years.reduce((sum, y) => sum + (byYear[y].k1Income || 0), 0) / years.length;
    
    if (avgK1Income > avgDistributions && avgDistributions > 0) {
      warning = `K-1 income ($${avgK1Income.toLocaleString()}) exceeds distributions ($${avgDistributions.toLocaleString()}) - verify business liquidity`;
    }
    
    // Calculate liquidity ratios from most recent year
    const latestYearData = byYear[years[years.length - 1]];
    if (latestYearData.currentLiabilities > 0) {
      const currentRatio = latestYearData.currentAssets / latestYearData.currentLiabilities;
      const quickRatio = (latestYearData.currentAssets - latestYearData.inventory) / latestYearData.currentLiabilities;
      liquidityRatios = { currentRatio, quickRatio };
      
      if (currentRatio < 1.0) {
        warning = (warning ? warning + '; ' : '') + `Business liquidity warning: Current ratio ${currentRatio.toFixed(2)} < 1.0`;
      }
    }
    
    // Check for declining income red flag
    if (trending.trend === 'down' && Math.abs(trending.trendPct) > 20) {
      warning = (warning ? warning + '; ' : '') + `Income declined ${Math.abs(trending.trendPct).toFixed(1)}% year-over-year`;
    }
  } else if (years.length === 1) {
    monthlyAmount = (adjustedByYear[years[0]] || 0) / 12;
    method = 'S-Corp single year (2-year history recommended for trending)';
    warning = 'Only 1 year of S-Corp returns - recommend 2 years for proper trending analysis';
  }

  // Build breakdown for display
  const latestYear = years[years.length - 1];
  const breakdown = byYear[latestYear] ? {
    k1_ordinary_income: byYear[latestYear].k1Income,
    add_back_depreciation: byYear[latestYear].depreciation,
    add_back_depletion: byYear[latestYear].depletion,
    add_back_amortization: byYear[latestYear].amortization,
    add_back_nol: byYear[latestYear].nolCarryover,
    deduct_short_term_debt: byYear[latestYear].shortTermDebt,
    deduct_non_deductible_te: byYear[latestYear].nonDeductibleTE,
    ownership_percentage: byYear[latestYear].ownershipPct,
    distributions: byYear[latestYear].distributions,
    years_analyzed: years.length,
    adjusted_annual_by_year: adjustedByYear,
    liquidity_ratios: liquidityRatios
  } : {};

  return { monthlyAmount, method, breakdown, warning, liquidityRatios };
}

// Calculate Partnership K-1 income with Form 1065 adjustments
function calculatePartnershipK1Income(
  k1Data: any[],
  form1065Data: any[]
): { 
  monthlyAmount: number; 
  method: string;
  breakdown: any;
  warning?: string;
  liquidityRatios?: { currentRatio: number; quickRatio: number };
} {
  if (!k1Data || k1Data.length === 0) {
    return { monthlyAmount: 0, method: 'No K-1 data', breakdown: {} };
  }

  // Group by year
  const byYear: Record<number, {
    k1Income: number;
    depreciation: number;
    depletion: number;
    amortization: number;
    shortTermDebt: number;
    nonDeductibleExpenses: number;
    distributions: number;
    ownershipPct: number;
    currentAssets: number;
    currentLiabilities: number;
    inventory: number;
  }> = {};
  
  // Process K-1s
  for (const k1 of k1Data) {
    const year = k1.tax_year || 2023;
    if (!byYear[year]) {
      byYear[year] = { 
        k1Income: 0, depreciation: 0, depletion: 0, amortization: 0,
        shortTermDebt: 0, nonDeductibleExpenses: 0, distributions: 0, ownershipPct: 100,
        currentAssets: 0, currentLiabilities: 0, inventory: 0
      };
    }
    
    // K-1 Boxes 1, 2, 3, 4c
    const ordinaryIncome = parseFloat(k1.box1_ordinary_income) || 0;
    const netRental = parseFloat(k1.box2_net_rental_income) || 0;
    const otherRental = parseFloat(k1.box3_other_net_rental) || 0;
    const guaranteedPayments = parseFloat(k1.box4c_guaranteed_payments_total) || parseFloat(k1.box4_guaranteed_payments) || 0;
    const ownership = parseFloat(k1.ownership_percentage) || 100;
    
    byYear[year].k1Income += ordinaryIncome + netRental + otherRental + guaranteedPayments;
    byYear[year].ownershipPct = ownership;
    byYear[year].distributions += parseFloat(k1.box16d_distributions) || 0;
  }

  // Process Form 1065 for adjustments
  for (const form of (form1065Data || [])) {
    const year = form.tax_year || 2023;
    if (!byYear[year]) continue;
    
    // Add-backs from Form 1065
    byYear[year].depreciation += parseFloat(form.line16c_depreciation) || 0;
    
    // Deductions
    byYear[year].shortTermDebt += parseFloat(form.schedule_l_line16d_loans_less_1yr) || 0;
    byYear[year].nonDeductibleExpenses += parseFloat(form.schedule_m1_line4b_nondeductible_expenses) || 0;
    
    // Liquidity data
    byYear[year].currentAssets = parseFloat(form.schedule_l_line6_current_assets) || 0;
    byYear[year].currentLiabilities = parseFloat(form.schedule_l_line18_current_liabilities) || 0;
    byYear[year].inventory = parseFloat(form.schedule_l_line14_inventory) || 0;
  }

  // Calculate adjusted income
  const years = Object.keys(byYear).map(y => parseInt(y)).sort();
  const adjustedByYear: Record<number, number> = {};
  
  for (const year of years) {
    const data = byYear[year];
    const ownershipMultiplier = data.ownershipPct / 100;
    
    const adjustedIncome = (
      data.k1Income + 
      data.depreciation -
      data.shortTermDebt -
      data.nonDeductibleExpenses
    ) * ownershipMultiplier;
    
    adjustedByYear[year] = adjustedIncome;
  }

  // Apply trending
  let monthlyAmount = 0;
  let method = '';
  let warning: string | undefined;
  let liquidityRatios: { currentRatio: number; quickRatio: number } | undefined;

  if (years.length >= 2) {
    const trending = calculateVariableIncome(adjustedByYear[years[0]] || 0, adjustedByYear[years[1]] || 0, 'partnership');
    monthlyAmount = trending.monthlyAmount;
    method = `Partnership K-1 with 1065 adjustments: ${trending.method}`;
    
    // Calculate liquidity ratios
    const latestYearData = byYear[years[years.length - 1]];
    if (latestYearData.currentLiabilities > 0) {
      liquidityRatios = {
        currentRatio: latestYearData.currentAssets / latestYearData.currentLiabilities,
        quickRatio: (latestYearData.currentAssets - latestYearData.inventory) / latestYearData.currentLiabilities
      };
      
      if (liquidityRatios.currentRatio < 1.0) {
        warning = `Partnership liquidity warning: Current ratio ${liquidityRatios.currentRatio.toFixed(2)} < 1.0`;
      }
    }
  } else if (years.length === 1) {
    monthlyAmount = (adjustedByYear[years[0]] || 0) / 12;
    method = 'Partnership K-1 single year (2-year history recommended)';
  }

  const latestYear = years[years.length - 1];
  const breakdown = byYear[latestYear] ? {
    k1_income: byYear[latestYear].k1Income,
    add_back_depreciation: byYear[latestYear].depreciation,
    deduct_short_term_debt: byYear[latestYear].shortTermDebt,
    deduct_nondeductible: byYear[latestYear].nonDeductibleExpenses,
    ownership_percentage: byYear[latestYear].ownershipPct,
    adjusted_annual_by_year: adjustedByYear,
    liquidity_ratios: liquidityRatios
  } : {};

  return { monthlyAmount, method, breakdown, warning, liquidityRatios };
}

// Calculate C-Corporation income (Form 1120) - 100% ownership only
function calculateCCorpIncome(
  form1120Data: any[]
): {
  monthlyAmount: number;
  method: string;
  breakdown: any;
  warning?: string;
} {
  if (!form1120Data || form1120Data.length === 0) {
    return { monthlyAmount: 0, method: 'No Form 1120 data', breakdown: {} };
  }

  // Group by year
  const byYear: Record<number, number> = {};
  const breakdownByYear: Record<number, any> = {};
  
  for (const form of form1120Data) {
    const year = form.tax_year || 2023;
    
    // Start with Line 30 Taxable Income
    const taxableIncome = parseFloat(form.line30_taxable_income) || 0;
    
    // Subtract Line 31 Total Tax
    const totalTax = parseFloat(form.line31_total_tax) || 0;
    
    // Add-backs
    const depreciation = parseFloat(form.line20_depreciation) || 0;
    const depletion = parseFloat(form.line21_depletion) || 0;
    const amortization = parseFloat(form.amortization) || 0;
    const nolDeduction = parseFloat(form.line29a_nol_deduction) || 0;
    
    // Deductions
    const shortTermDebt = parseFloat(form.schedule_l_line16d_loans_less_1yr) || 0;
    
    const adjustedIncome = taxableIncome - totalTax + depreciation + depletion + amortization + nolDeduction - shortTermDebt;
    
    byYear[year] = adjustedIncome;
    breakdownByYear[year] = {
      taxableIncome,
      totalTax,
      depreciation,
      depletion,
      amortization,
      nolDeduction,
      shortTermDebt,
      adjustedIncome
    };
  }

  const years = Object.keys(byYear).map(y => parseInt(y)).sort();
  let monthlyAmount = 0;
  let method = '';
  let warning: string | undefined = 'C-Corp income only valid for 100% ownership - verify ownership';

  if (years.length >= 2) {
    const trending = calculateVariableIncome(byYear[years[0]] || 0, byYear[years[1]] || 0, 'c_corp');
    monthlyAmount = trending.monthlyAmount;
    method = `C-Corp (100% ownership): ${trending.method}`;
  } else if (years.length === 1) {
    monthlyAmount = (byYear[years[0]] || 0) / 12;
    method = 'C-Corp single year (2-year history recommended)';
  }

  return {
    monthlyAmount,
    method,
    breakdown: breakdownByYear,
    warning
  };
}

// Calculate Farm Income (Schedule F)
function calculateFarmIncome(
  scheduleFData: any[]
): {
  monthlyAmount: number;
  method: string;
  addBacks: any;
  warning?: string;
} {
  if (!scheduleFData || scheduleFData.length === 0) {
    return { monthlyAmount: 0, method: 'No Schedule F data', addBacks: {} };
  }

  // Calculate adjusted income for each year
  const adjustedYears = scheduleFData.map((data, idx) => {
    const taxYear = data.tax_year || (2024 - idx);
    
    // Start with Line 34 Net Farm Profit
    const netFarmProfit = parseFloat(data.line34_net_farm_profit) || 0;
    
    // Add-backs per BoltCRM Guide
    const coopDistributions = parseFloat(data.line3a_coop_distributions) || 0;
    const cccLoans = parseFloat(data.line4a_ccc_loans) || 0;
    const programPayments = parseFloat(data.line6a_other_income) || 0;
    const depreciation = parseFloat(data.line14_depreciation) || 0;
    const amortization = parseFloat(data.line32_amortization) || 0;
    const depletion = parseFloat(data.line32_depletion) || 0;
    
    const adjustedIncome = netFarmProfit + coopDistributions + cccLoans + programPayments + depreciation + amortization + depletion;
    
    return {
      year: taxYear,
      netFarmProfit,
      coopDistributions,
      cccLoans,
      programPayments,
      depreciation,
      amortization,
      depletion,
      adjustedIncome
    };
  });

  // Apply trending
  const year1Adjusted = adjustedYears[0]?.adjustedIncome || 0;
  const year2Adjusted = adjustedYears[1]?.adjustedIncome || 0;

  let monthlyAmount = 0;
  let method = '';
  let warning: string | undefined;

  if (adjustedYears.length >= 2) {
    const trending = calculateVariableIncome(year1Adjusted, year2Adjusted, 'farm');
    monthlyAmount = trending.monthlyAmount;
    method = `Farm income with add-backs: ${trending.method}`;
  } else if (adjustedYears.length === 1) {
    monthlyAmount = year1Adjusted / 12;
    method = 'Farm income single year (2-year history recommended)';
    warning = 'Only 1 year of farm income - recommend 2 years for trending analysis';
  }

  // Check for losses
  if (year1Adjusted < 0 || year2Adjusted < 0) {
    warning = (warning ? warning + '; ' : '') + 'Farm shows net loss in one or more years';
  }

  return {
    monthlyAmount,
    method,
    addBacks: {
      depreciation: adjustedYears.reduce((sum, y) => sum + y.depreciation, 0) / adjustedYears.length,
      amortization: adjustedYears.reduce((sum, y) => sum + y.amortization, 0) / adjustedYears.length,
      depletion: adjustedYears.reduce((sum, y) => sum + y.depletion, 0) / adjustedYears.length,
      coopDistributions: adjustedYears.reduce((sum, y) => sum + y.coopDistributions, 0) / adjustedYears.length,
      cccLoans: adjustedYears.reduce((sum, y) => sum + y.cccLoans, 0) / adjustedYears.length,
    },
    warning
  };
}

// Legacy K-1 calculation for simple partnerships without Form 1065
function calculateK1Income(k1Data: any[]): { monthlyAmount: number; method: string } {
  if (!k1Data || k1Data.length === 0) {
    return { monthlyAmount: 0, method: 'No K-1 data' };
  }

  // Group by year
  const byYear: Record<number, number> = {};
  
  for (const k1 of k1Data) {
    const year = k1.tax_year || 2023;
    const ordinaryIncome = parseFloat(k1.box1_ordinary_income) || 0;
    const guaranteedPayments = parseFloat(k1.box4_guaranteed_payments) || parseFloat(k1.box4c_guaranteed_payments_total) || 0;
    
    // For qualifying income: ordinary income + guaranteed payments
    const qualifyingIncome = ordinaryIncome + guaranteedPayments;
    
    byYear[year] = (byYear[year] || 0) + qualifyingIncome;
  }

  const years = Object.keys(byYear).sort();
  if (years.length >= 2) {
    const year1 = byYear[parseInt(years[0])] || 0;
    const year2 = byYear[parseInt(years[1])] || 0;
    const { monthlyAmount, method } = calculateVariableIncome(year1, year2, 'k1');
    return { monthlyAmount, method: `K-1 income: ${method}` };
  } else if (years.length === 1) {
    const amount = byYear[parseInt(years[0])] || 0;
    return { 
      monthlyAmount: amount / 12, 
      method: 'K-1 single year (2-year history recommended)'
    };
  }

  return { monthlyAmount: 0, method: 'Insufficient K-1 data' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { borrower_id, agency, loan_program } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all processed documents for this borrower
    const { data: documents, error: docsError } = await supabaseClient
      .from('income_documents')
      .select('*')
      .eq('borrower_id', borrower_id)
      .eq('ocr_status', 'success')
      .order('doc_period_end', { ascending: false, nullsFirst: false });

    if (docsError) throw docsError;

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({
        error: 'No processed documents found',
        user_message: 'No documents have been processed yet. Please upload income documents (pay stubs, W-2s, etc.) and wait for OCR processing to complete.',
        documents_needed: ['Pay stub (most recent)', 'W-2s (optional, for 2-year trending)']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${documents.length} documents for borrower ${borrower_id}`);

    // Organize documents by type
    const docsByType: Record<string, any[]> = {};
    for (const doc of documents) {
      const type = doc.doc_type || 'unknown';
      if (!docsByType[type]) docsByType[type] = [];
      docsByType[type].push({
        ...doc,
        data: doc.parsed_json || {}
      });
    }

    const components: IncomeComponent[] = [];
    const warnings: string[] = [];
    let totalMonthlyIncome = 0;

    // ===== PROCESS PAY STUBS =====
    const payStubs = docsByType['pay_stub'] || [];
    if (payStubs.length > 0) {
      // Get most recent pay stub
      const mostRecent = payStubs[0];
      const data = mostRecent.data;

      // Base income from hourly rate
      if (data.hourly_rate && data.regular_hours_current) {
        const hourlyRate = parseFloat(data.hourly_rate);
        const weeklyHours = parseFloat(data.regular_hours_current);
        const annualBase = hourlyRate * weeklyHours * 52;
        const monthlyBase = annualBase / 12;

        components.push({
          component_type: 'base_hourly',
          monthly_amount: monthlyBase,
          calculation_method: `$${hourlyRate.toFixed(2)}/hr × ${weeklyHours} hrs × 52 weeks ÷ 12`,
          source_documents: [mostRecent.id],
          notes: `Employer: ${data.employer_name || 'Unknown'}`
        });
        totalMonthlyIncome += monthlyBase;
      }
      // OR base from gross pay
      else if (data.gross_current && data.pay_frequency) {
        const gross = parseFloat(data.gross_current);
        const annual = annualizeFromFrequency(gross, data.pay_frequency);
        const monthly = annual / 12;

        components.push({
          component_type: 'base_salary',
          monthly_amount: monthly,
          calculation_method: `${data.pay_frequency} gross $${gross.toLocaleString()} annualized`,
          source_documents: [mostRecent.id],
          notes: `Employer: ${data.employer_name || 'Unknown'}`
        });
        totalMonthlyIncome += monthly;
      }

      // Variable income from pay stubs (OT, bonus, commission) - need YTD data
      if (data.overtime_pay_ytd || data.bonus_ytd || data.commission_ytd) {
        // For pay stub YTD, we estimate annual by calculating the rate
        const ytdTotal = (parseFloat(data.overtime_pay_ytd) || 0) + 
                        (parseFloat(data.bonus_ytd) || 0) + 
                        (parseFloat(data.commission_ytd) || 0);
        
        if (ytdTotal > 0) {
          // Estimate full year based on pay period
          const payPeriodEnd = new Date(data.pay_period_end);
          const yearStart = new Date(payPeriodEnd.getFullYear(), 0, 1);
          const daysPassed = (payPeriodEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
          const projectedAnnual = (ytdTotal / daysPassed) * 365;

          components.push({
            component_type: 'variable_income_ytd',
            monthly_amount: projectedAnnual / 12,
            calculation_method: 'YTD variable income projected to annual (requires W-2 history for trending)',
            source_documents: [mostRecent.id],
            notes: 'OT + Bonus + Commission from pay stub YTD'
          });
          
          warnings.push('Variable income from pay stub YTD - recommend 2 years W-2s for proper trending analysis');
        }
      }
    }

    // ===== PROCESS W-2s (with 401k add-back) =====
    const w2s = docsByType['w2'] || [];
    if (w2s.length > 0) {
      // Group W-2s by tax year
      const w2ByYear: Record<number, any[]> = {};
      for (const w2 of w2s) {
        const year = w2.data.tax_year || 2023;
        if (!w2ByYear[year]) w2ByYear[year] = [];
        w2ByYear[year].push(w2);
      }

      const years = Object.keys(w2ByYear).sort((a, b) => parseInt(b) - parseInt(a));
      
      if (years.length >= 2) {
        // Have 2 years - calculate trending
        const year1 = parseInt(years[1]);
        const year2 = parseInt(years[0]);
        
        // Include 401k/403b deferrals in income (Box 12 codes D, E)
        let year1Total = 0;
        let year2Total = 0;
        let year1_401k = 0;
        let year2_401k = 0;
        
        for (const w2 of w2ByYear[year1]) {
          year1Total += parseFloat(w2.data.box1_wages) || 0;
          year1_401k += parseFloat(w2.data.box12_code_d_401k) || 0;
          year1_401k += parseFloat(w2.data.box12_code_e_403b) || 0;
        }
        for (const w2 of w2ByYear[year2]) {
          year2Total += parseFloat(w2.data.box1_wages) || 0;
          year2_401k += parseFloat(w2.data.box12_code_d_401k) || 0;
          year2_401k += parseFloat(w2.data.box12_code_e_403b) || 0;
        }
        
        // Add back 401k deferrals
        year1Total += year1_401k;
        year2Total += year2_401k;

        const { monthlyAmount, trend, trendPct, method } = calculateVariableIncome(year1Total, year2Total, 'w2_wages');

        // Only add if we don't already have base income from pay stubs
        const hasBaseFromPaystub = components.some(c => 
          c.component_type === 'base_hourly' || c.component_type === 'base_salary'
        );

        if (!hasBaseFromPaystub) {
          const notes = (year1_401k > 0 || year2_401k > 0) 
            ? `${year1}: $${year1Total.toLocaleString()} (incl 401k) | ${year2}: $${year2Total.toLocaleString()} (incl 401k)`
            : `${year1}: $${year1Total.toLocaleString()} | ${year2}: $${year2Total.toLocaleString()}`;
          
          components.push({
            component_type: 'w2_income',
            monthly_amount: monthlyAmount,
            calculation_method: method + (year1_401k > 0 || year2_401k > 0 ? ' (includes 401k/403b add-back)' : ''),
            source_documents: w2s.map(w => w.id),
            months_considered: 24,
            trend_direction: trend,
            trend_percentage: trendPct,
            year1_amount: year1Total,
            year2_amount: year2Total,
            notes
          });
          totalMonthlyIncome += monthlyAmount;
        }
      } else if (years.length === 1) {
        let yearTotal = 0;
        let year_401k = 0;
        
        for (const w2 of w2ByYear[parseInt(years[0])]) {
          yearTotal += parseFloat(w2.data.box1_wages) || 0;
          year_401k += parseFloat(w2.data.box12_code_d_401k) || 0;
          year_401k += parseFloat(w2.data.box12_code_e_403b) || 0;
        }
        yearTotal += year_401k;
        
        const hasBaseFromPaystub = components.some(c => 
          c.component_type === 'base_hourly' || c.component_type === 'base_salary'
        );

        if (!hasBaseFromPaystub) {
          components.push({
            component_type: 'w2_income',
            monthly_amount: yearTotal / 12,
            calculation_method: 'Single W-2 year ÷ 12 (2-year history recommended)' + (year_401k > 0 ? ' (includes 401k add-back)' : ''),
            source_documents: w2s.map(w => w.id),
            months_considered: 12
          });
          totalMonthlyIncome += yearTotal / 12;
          warnings.push('Only 1 year of W-2 income - recommend 2 years for trending analysis');
        }
      }
    }

    // ===== PROCESS SCHEDULE C (Self-Employment) with full add-backs =====
    const scheduleCs = docsByType['schedule_c'] || [];
    if (scheduleCs.length > 0) {
      const year1Data = scheduleCs.find(s => s.data.tax_year === 2022)?.data;
      const year2Data = scheduleCs.find(s => s.data.tax_year === 2023)?.data || scheduleCs[0]?.data;

      const { monthlyAmount, addBacks, method, warning } = calculateSelfEmploymentIncome(year1Data, year2Data);

      if (monthlyAmount > 0) {
        const addBackNotes = [
          addBacks.depreciation > 0 ? `Depreciation $${Math.round(addBacks.depreciation).toLocaleString()}` : null,
          addBacks.homeOffice > 0 ? `Home Office $${Math.round(addBacks.homeOffice).toLocaleString()}` : null,
          addBacks.mileageDepreciation > 0 ? `Mileage $${Math.round(addBacks.mileageDepreciation).toLocaleString()}` : null,
          addBacks.amortization > 0 ? `Amortization $${Math.round(addBacks.amortization).toLocaleString()}` : null,
        ].filter(Boolean).join(' | ');
        
        components.push({
          component_type: 'self_employment',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: scheduleCs.map(s => s.id),
          months_considered: 24,
          notes: `Add-backs (avg/yr): ${addBackNotes}`
        });
        totalMonthlyIncome += monthlyAmount;
      }

      if (warning) warnings.push(warning);
    }

    // ===== PROCESS SCHEDULE E (Rental Income) with line-by-line add-backs =====
    const scheduleEs = docsByType['schedule_e'] || [];
    if (scheduleEs.length > 0) {
      const { monthlyAmount, method, properties, breakdown } = calculateRentalIncome(scheduleEs.map(s => s.data));

      if (monthlyAmount !== 0) { // Can be negative
        components.push({
          component_type: 'rental_income',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: scheduleEs.map(s => s.id),
          notes: `${properties} rental propert${properties === 1 ? 'y' : 'ies'} with PITIA add-backs`
        });
        totalMonthlyIncome += monthlyAmount;

        if (monthlyAmount < 0) {
          warnings.push('Rental properties showing net loss - reduces qualifying income');
        }
      }
    }

    // ===== PROCESS SCHEDULE F (Farm Income) =====
    const scheduleFs = docsByType['schedule_f'] || [];
    if (scheduleFs.length > 0) {
      const { monthlyAmount, method, addBacks, warning } = calculateFarmIncome(scheduleFs.map(s => s.data));

      if (monthlyAmount !== 0) {
        components.push({
          component_type: 'farm_income',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: scheduleFs.map(s => s.id),
          notes: `Add-backs: Depreciation $${Math.round(addBacks.depreciation || 0).toLocaleString()}/yr`
        });
        totalMonthlyIncome += monthlyAmount;
      }

      if (warning) warnings.push(warning);
    }

    // ===== PROCESS K-1s AND 1120-S (S-Corp Income) =====
    const k1s = docsByType['k1'] || [];
    const form1120s = docsByType['form_1120s'] || [];
    
    // Check if we have S-Corp documents (K-1 from 1120-S or actual 1120-S forms)
    const sCorpK1s = k1s.filter(k => k.data.form_type === '1120S' || k.data.form_type === '1120-S');
    const partnershipK1s = k1s.filter(k => k.data.form_type === '1065' || !k.data.form_type);
    
    // Process S-Corp income with 1120-S add-backs
    if (sCorpK1s.length > 0 || form1120s.length > 0) {
      const { monthlyAmount, method, breakdown, warning, liquidityRatios } = calculateK1With1120SIncome(
        sCorpK1s.map(k => k.data),
        form1120s.map(f => f.data)
      );

      if (monthlyAmount !== 0) {
        const breakdownNotes = breakdown.k1_ordinary_income ? 
          `K-1: $${breakdown.k1_ordinary_income?.toLocaleString() || 0} | ` +
          `+Depreciation: $${breakdown.add_back_depreciation?.toLocaleString() || 0} | ` +
          `+Amortization: $${breakdown.add_back_amortization?.toLocaleString() || 0} | ` +
          `-Short-term debt: $${breakdown.deduct_short_term_debt?.toLocaleString() || 0} | ` +
          `Ownership: ${breakdown.ownership_percentage || 100}%` +
          (liquidityRatios ? ` | Current Ratio: ${liquidityRatios.currentRatio.toFixed(2)}` : '') : '';
        
        components.push({
          component_type: 's_corp_income',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: [...sCorpK1s.map(k => k.id), ...form1120s.map(f => f.id)],
          months_considered: (breakdown.years_analyzed || 1) * 12,
          notes: breakdownNotes
        });
        totalMonthlyIncome += monthlyAmount;
        
        if (warning) {
          warnings.push(warning);
        }
      }
    }
    
    // Process partnership K-1s with Form 1065 adjustments
    const form1065s = docsByType['form_1065'] || [];
    if (partnershipK1s.length > 0) {
      if (form1065s.length > 0) {
        // Use enhanced partnership calculation with 1065 adjustments
        const { monthlyAmount, method, breakdown, warning, liquidityRatios } = calculatePartnershipK1Income(
          partnershipK1s.map(k => k.data),
          form1065s.map(f => f.data)
        );

        if (monthlyAmount > 0) {
          components.push({
            component_type: 'partnership_k1_income',
            monthly_amount: monthlyAmount,
            calculation_method: method,
            source_documents: [...partnershipK1s.map(k => k.id), ...form1065s.map(f => f.id)],
            notes: liquidityRatios ? `Current Ratio: ${liquidityRatios.currentRatio.toFixed(2)}` : undefined
          });
          totalMonthlyIncome += monthlyAmount;
          
          if (warning) warnings.push(warning);
        }
      } else {
        // Legacy calculation without 1065
        const { monthlyAmount, method } = calculateK1Income(partnershipK1s.map(k => k.data));

        if (monthlyAmount > 0) {
          components.push({
            component_type: 'partnership_k1_income',
            monthly_amount: monthlyAmount,
            calculation_method: method,
            source_documents: partnershipK1s.map(k => k.id)
          });
          totalMonthlyIncome += monthlyAmount;
        }
      }
    }

    // ===== PROCESS FORM 1120 (C-Corporation) =====
    const form1120s_ccorp = docsByType['form_1120'] || [];
    if (form1120s_ccorp.length > 0) {
      const { monthlyAmount, method, breakdown, warning } = calculateCCorpIncome(form1120s_ccorp.map(f => f.data));

      if (monthlyAmount !== 0) {
        components.push({
          component_type: 'c_corp_income',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: form1120s_ccorp.map(f => f.id)
        });
        totalMonthlyIncome += monthlyAmount;
        
        if (warning) warnings.push(warning);
      }
    }

    // ===== PROCESS FORM 1040s (ENHANCED - captures all income sources including Schedule E Part III S-Corp) =====
    const form1040s = docsByType['form_1040'] || [];
    if (form1040s.length > 0) {
      // Group by tax year
      const form1040ByYear: Record<number, any[]> = {};
      for (const form of form1040s) {
        const year = form.data.tax_year || 2023;
        if (!form1040ByYear[year]) form1040ByYear[year] = [];
        form1040ByYear[year].push(form);
      }

      const years = Object.keys(form1040ByYear).sort((a, b) => parseInt(b) - parseInt(a));
      
      // Check if we already have income from other sources
      const hasBaseIncome = components.some(c => 
        ['base_hourly', 'base_salary', 'w2_income'].includes(c.component_type)
      );
      const hasSelfEmploymentIncome = components.some(c => 
        ['self_employment'].includes(c.component_type)
      );
      const hasSCorpIncome = components.some(c => 
        ['s_corp_income', 'partnership_k1_income'].includes(c.component_type)
      );
      const hasRentalIncome = components.some(c => c.component_type === 'rental_income');

      // ===== EXTRACT SCHEDULE E PART III S-CORP/PARTNERSHIP INCOME FROM 1040 =====
      // This captures K-1 income when only 1040s are uploaded (no separate K-1/1120-S)
      if (!hasSCorpIncome && years.length > 0) {
        const sCorpIncomeByYear: Record<number, { 
          totalK1Income: number; 
          depreciation: number; 
          entities: { name: string; income: number; depreciation: number }[] 
        }> = {};
        
        for (const yearStr of years) {
          const year = parseInt(yearStr);
          const yearForms = form1040ByYear[year];
          
          sCorpIncomeByYear[year] = { totalK1Income: 0, depreciation: 0, entities: [] };
          
          for (const form of yearForms) {
            const data = form.data;
            
            // Extract Schedule E Part III entities (S-corps and Partnerships)
            // These flow from K-1s to Schedule E Part III, then to 1040 Line 5
            const scheduleEPart3 = data.schedule_e_part_iii || data.schedule_e_part3 || [];
            if (Array.isArray(scheduleEPart3)) {
              for (const entity of scheduleEPart3) {
                const entityIncome = parseFloat(entity.ordinary_income) || parseFloat(entity.k1_box1) || parseFloat(entity.net_income) || 0;
                const entityDepreciation = parseFloat(entity.depreciation) || parseFloat(entity.add_back_depreciation) || 0;
                
                if (entityIncome !== 0 || entityDepreciation !== 0) {
                  sCorpIncomeByYear[year].totalK1Income += entityIncome;
                  sCorpIncomeByYear[year].depreciation += entityDepreciation;
                  sCorpIncomeByYear[year].entities.push({
                    name: entity.entity_name || entity.business_name || 'Unknown Entity',
                    income: entityIncome,
                    depreciation: entityDepreciation
                  });
                }
              }
            }
            
            // Also check for aggregate K-1 income fields in 1040 data
            const k1OrdinaryIncome = parseFloat(data.k1_ordinary_income) || parseFloat(data.schedule_e_part3_income) || 0;
            const k1Depreciation = parseFloat(data.k1_depreciation_addback) || parseFloat(data.schedule_e_depreciation) || 0;
            
            if (k1OrdinaryIncome > 0 && sCorpIncomeByYear[year].totalK1Income === 0) {
              sCorpIncomeByYear[year].totalK1Income = k1OrdinaryIncome;
              sCorpIncomeByYear[year].depreciation = k1Depreciation;
            }
            
            // Check Line 5 (Schedule E income) if no K-1 specific data found
            // Line 5 = Total rental/royalty/partnership/S-corp/estate/trust income
            const line5Income = parseFloat(data.line5_schedule_e) || parseFloat(data.line_5_schedule_e) || 0;
            if (line5Income > 0 && sCorpIncomeByYear[year].totalK1Income === 0 && !hasRentalIncome) {
              // This likely includes S-corp/partnership income - use conservative estimate
              sCorpIncomeByYear[year].totalK1Income = line5Income;
              // Estimate depreciation add-back as ~8% of gross income (typical for small S-corps)
              sCorpIncomeByYear[year].depreciation = line5Income * 0.08;
            }
          }
        }
        
        // Calculate 2-year averaged S-Corp income with depreciation add-backs
        const yearsWithSCorpIncome = Object.keys(sCorpIncomeByYear)
          .map(y => parseInt(y))
          .filter(y => sCorpIncomeByYear[y].totalK1Income !== 0)
          .sort((a, b) => b - a);
        
        if (yearsWithSCorpIncome.length >= 2) {
          const year1 = yearsWithSCorpIncome[1];
          const year2 = yearsWithSCorpIncome[0];
          
          // Adjusted income = K-1 Income + Depreciation Add-back (per Form 1084 methodology)
          const year1Adjusted = sCorpIncomeByYear[year1].totalK1Income + sCorpIncomeByYear[year1].depreciation;
          const year2Adjusted = sCorpIncomeByYear[year2].totalK1Income + sCorpIncomeByYear[year2].depreciation;
          
          const { monthlyAmount, trend, trendPct, method } = calculateVariableIncome(year1Adjusted, year2Adjusted, 's_corp_1040');
          
          if (monthlyAmount > 0) {
            const entityNames = [...new Set([
              ...sCorpIncomeByYear[year1].entities.map(e => e.name),
              ...sCorpIncomeByYear[year2].entities.map(e => e.name)
            ])].join(', ') || 'S-Corp/Partnership';
            
            const breakdownNotes = 
              `${year1}: K-1 $${sCorpIncomeByYear[year1].totalK1Income.toLocaleString()} + Depr $${Math.round(sCorpIncomeByYear[year1].depreciation).toLocaleString()} = $${year1Adjusted.toLocaleString()} | ` +
              `${year2}: K-1 $${sCorpIncomeByYear[year2].totalK1Income.toLocaleString()} + Depr $${Math.round(sCorpIncomeByYear[year2].depreciation).toLocaleString()} = $${year2Adjusted.toLocaleString()} | ` +
              `2-yr avg: $${Math.round((year1Adjusted + year2Adjusted) / 2).toLocaleString()}/yr`;
            
            components.push({
              component_type: 's_corp_income',
              monthly_amount: monthlyAmount,
              calculation_method: `S-Corp/Partnership (1040 Schedule E Part III) with depreciation add-back: ${method}`,
              source_documents: form1040s.map(f => f.id),
              months_considered: 24,
              trend_direction: trend,
              trend_percentage: trendPct,
              year1_amount: year1Adjusted,
              year2_amount: year2Adjusted,
              notes: `${entityNames} | ${breakdownNotes}`
            });
            totalMonthlyIncome += monthlyAmount;
          }
        } else if (yearsWithSCorpIncome.length === 1) {
          const year = yearsWithSCorpIncome[0];
          const adjusted = sCorpIncomeByYear[year].totalK1Income + sCorpIncomeByYear[year].depreciation;
          const monthly = adjusted / 12;
          
          if (monthly > 0) {
            components.push({
              component_type: 's_corp_income',
              monthly_amount: monthly,
              calculation_method: 'S-Corp/Partnership (1040 Schedule E Part III) single year with depreciation add-back',
              source_documents: form1040s.map(f => f.id),
              months_considered: 12,
              notes: `${year}: K-1 $${sCorpIncomeByYear[year].totalK1Income.toLocaleString()} + Depr $${Math.round(sCorpIncomeByYear[year].depreciation).toLocaleString()} = $${adjusted.toLocaleString()}/yr`
            });
            totalMonthlyIncome += monthly;
            warnings.push('Only 1 year of S-Corp/Partnership returns - recommend 2 years for proper Form 1084 trending analysis');
          }
        }
      }

      // Process wage income from 1040 Line 1 (only if not already captured)
      if (!hasBaseIncome && years.length > 0) {
        if (years.length >= 2) {
          // Use trending for wages across years
          const year1 = parseInt(years[1]);
          const year2 = parseInt(years[0]);
          const year1Wages = form1040ByYear[year1]?.reduce((sum, f) => 
            sum + (parseFloat(f.data.line1_wages) || parseFloat(f.data.line_1_wages) || 0), 0) || 0;
          const year2Wages = form1040ByYear[year2]?.reduce((sum, f) => 
            sum + (parseFloat(f.data.line1_wages) || parseFloat(f.data.line_1_wages) || 0), 0) || 0;
          
          if (year1Wages > 0 || year2Wages > 0) {
            const { monthlyAmount, trend, trendPct, method } = calculateVariableIncome(year1Wages, year2Wages, '1040_wages');
            
            components.push({
              component_type: 'form_1040_wages',
              monthly_amount: monthlyAmount,
              calculation_method: `Form 1040 Line 1: ${method}`,
              source_documents: form1040s.map(f => f.id),
              months_considered: 24,
              trend_direction: trend,
              trend_percentage: trendPct,
              year1_amount: year1Wages,
              year2_amount: year2Wages,
              notes: `${year1}: $${year1Wages.toLocaleString()} | ${year2}: $${year2Wages.toLocaleString()}`
            });
            totalMonthlyIncome += monthlyAmount;
          }
        } else {
          const wages = form1040ByYear[parseInt(years[0])]?.reduce((sum, f) => 
            sum + (parseFloat(f.data.line1_wages) || parseFloat(f.data.line_1_wages) || 0), 0) || 0;
          
          if (wages > 0) {
            components.push({
              component_type: 'form_1040_wages',
              monthly_amount: wages / 12,
              calculation_method: 'Form 1040 Line 1 single year ÷ 12',
              source_documents: form1040s.map(f => f.id),
              months_considered: 12,
              notes: `Tax year ${years[0]}: $${wages.toLocaleString()}`
            });
            totalMonthlyIncome += wages / 12;
          }
        }
      }
      
      // Line 8 - Schedule 1 Additional Income (only if no self-employment income captured)
      if (!hasSelfEmploymentIncome && !hasRentalIncome && !hasSCorpIncome && years.length > 0) {
        if (years.length >= 2) {
          const year1 = parseInt(years[1]);
          const year2 = parseInt(years[0]);
          const year1Schedule1 = form1040ByYear[year1]?.reduce((sum, f) => 
            sum + (parseFloat(f.data.line8_schedule1_income) || parseFloat(f.data.line_8_schedule1_income) || 0), 0) || 0;
          const year2Schedule1 = form1040ByYear[year2]?.reduce((sum, f) => 
            sum + (parseFloat(f.data.line8_schedule1_income) || parseFloat(f.data.line_8_schedule1_income) || 0), 0) || 0;
          
          if (year1Schedule1 > 0 || year2Schedule1 > 0) {
            const { monthlyAmount, trend, trendPct, method } = calculateVariableIncome(year1Schedule1, year2Schedule1, 'schedule1_income');
            
            components.push({
              component_type: 'schedule_1_business_income',
              monthly_amount: monthlyAmount,
              calculation_method: `Form 1040 Line 8 (Schedule 1 business income): ${method}`,
              source_documents: form1040s.map(f => f.id),
              months_considered: 24,
              trend_direction: trend,
              trend_percentage: trendPct,
              year1_amount: year1Schedule1,
              year2_amount: year2Schedule1,
              notes: `${year1}: $${year1Schedule1.toLocaleString()} | ${year2}: $${year2Schedule1.toLocaleString()}`
            });
            totalMonthlyIncome += monthlyAmount;
            warnings.push('Schedule 1 income captured from 1040 - upload individual Schedules C/E/F for add-back calculations');
          }
        }
      }
      
      // Capture interest/dividend income from 1040 (first year only)
      if (years.length > 0) {
        const latestYear = form1040ByYear[parseInt(years[0])];
        for (const form of latestYear) {
          const data = form.data;
          
          // Interest income (Line 2b)
          const taxableInterest = parseFloat(data.line2b_taxable_interest) || 0;
          if (taxableInterest > 1200) { // Only include if significant ($100+/month)
            components.push({
              component_type: 'interest_income',
              monthly_amount: taxableInterest / 12,
              calculation_method: 'Form 1040 Line 2b taxable interest ÷ 12',
              source_documents: [form.id],
              notes: `Tax year ${years[0]}: $${taxableInterest.toLocaleString()}`
            });
            totalMonthlyIncome += taxableInterest / 12;
          }
          
          // Dividend income (Line 3b)
          const dividends = parseFloat(data.line3b_ordinary_dividends) || 0;
          if (dividends > 1200) { // Only include if significant
            components.push({
              component_type: 'dividend_income',
              monthly_amount: dividends / 12,
              calculation_method: 'Form 1040 Line 3b ordinary dividends ÷ 12',
              source_documents: [form.id],
              notes: `Tax year ${years[0]}: $${dividends.toLocaleString()}`
            });
            totalMonthlyIncome += dividends / 12;
          }
          break; // Only process first form of latest year
        }
      }
    }

    // ===== PROCESS VOE =====
    const voes = docsByType['voe'] || [];
    if (voes.length > 0) {
      const voe = voes[0].data;
      
      // VOE can provide base pay verification
      if (voe.base_pay_amount && voe.base_pay_period) {
        const annual = annualizeFromFrequency(
          parseFloat(voe.base_pay_amount), 
          voe.base_pay_period
        );
        
        components.push({
          component_type: 'voe_verified',
          monthly_amount: annual / 12,
          calculation_method: `VOE verified: $${voe.base_pay_amount} ${voe.base_pay_period}`,
          source_documents: [voes[0].id],
          notes: `Employment since ${voe.employment_start_date}, ${voe.hours_per_week} hrs/wk`
        });
        
        // Don't add to total - VOE is verification, not additional income
      }

      // VOE historical earnings for trending
      if (voe.prior_year_earnings || voe.prior_year2_earnings) {
        const priorYear1 = parseFloat(voe.prior_year_earnings) || 0;
        const priorYear2 = parseFloat(voe.prior_year2_earnings) || 0;
        
        if (priorYear1 && priorYear2) {
          const trendPct = ((priorYear1 - priorYear2) / priorYear2) * 100;
          warnings.push(`VOE shows ${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}% earnings trend over 2 years`);
        }
      }
    }

    // Calculate overall confidence
    const confidence = Math.min(
      0.5 + (components.length * 0.1) + (documents.length * 0.05),
      1.0
    );

    // Create calculation record
    const { data: calculation, error: calcError } = await supabaseClient
      .from('income_calculations')
      .insert({
        borrower_id,
        agency: agency || 'fannie',
        loan_program: loan_program || null,
        result_monthly_income: totalMonthlyIncome,
        confidence,
        warnings: warnings.length > 0 ? warnings : null,
        inputs_version: 'v3.0_boltcrm_guide'
      })
      .select()
      .single();

    if (calcError) throw calcError;

    // Insert income components
    for (const component of components) {
      await supabaseClient
        .from('income_components')
        .insert({
          calculation_id: calculation.id,
          component_type: component.component_type,
          monthly_amount: component.monthly_amount,
          calculation_method: component.calculation_method,
          source_documents: component.source_documents,
          months_considered: component.months_considered,
          trend_direction: component.trend_direction,
          trend_percentage: component.trend_percentage,
          year1_amount: component.year1_amount,
          year2_amount: component.year2_amount,
          notes: component.notes
        });
    }

    // Log audit event
    await supabaseClient
      .from('income_audit_events')
      .insert({
        calculation_id: calculation.id,
        step: 'calculate',
        payload: {
          agency,
          loan_program,
          components_count: components.length,
          monthly_income: totalMonthlyIncome,
          documents_processed: documents.length,
          doc_types: Object.keys(docsByType),
          warnings_count: warnings.length,
          calculation_version: 'v3.0_boltcrm_guide'
        }
      });

    console.log(`Calculation complete: $${totalMonthlyIncome.toLocaleString()}/mo from ${components.length} components`);

    return new Response(JSON.stringify({
      success: true,
      calculation_id: calculation.id,
      monthly_income: totalMonthlyIncome,
      components: components.length,
      warnings: warnings.length,
      confidence
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Calculation Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
