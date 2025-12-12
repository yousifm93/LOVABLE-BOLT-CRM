import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fannie Mae calculation rules
const FANNIE_MAE_RULES = {
  variableIncomeMinMonths: 24, // 2 years for OT, bonus, commission
  declineTrendThreshold: 0.20, // 20% decline triggers lower year usage
  rentalIncomeVacancyFactor: 0.75, // 75% of rental income for Fannie
  selfEmploymentMinYears: 2,
  mealDeductionRate: 0.50, // 50% of meals can be added back
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

// Calculate self-employment income with add-backs
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

  // Calculate adjusted income for each year
  const adjustedYears = years.map((yearData, idx) => {
    const netProfit = yearData.line31_net_profit_loss || yearData.net_profit || 0;
    const depreciation = yearData.line13_depreciation || yearData.depreciation || 0;
    const depletion = yearData.line12_depletion || yearData.depletion || 0;
    const homeOffice = yearData.line30_home_office || yearData.home_office_deduction || 0;
    const meals = (yearData.line24b_meals || yearData.meals || 0) * FANNIE_MAE_RULES.mealDeductionRate;
    
    const adjustedIncome = netProfit + depreciation + depletion + homeOffice + meals;
    
    return {
      year: yearData.tax_year || (2024 - idx),
      netProfit,
      depreciation,
      depletion,
      homeOffice,
      meals,
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

  return {
    monthlyAmount,
    addBacks: {
      depreciation: adjustedYears.reduce((sum, y) => sum + y.depreciation, 0) / years.length,
      depletion: adjustedYears.reduce((sum, y) => sum + y.depletion, 0) / years.length,
      homeOffice: adjustedYears.reduce((sum, y) => sum + y.homeOffice, 0) / years.length,
      meals: adjustedYears.reduce((sum, y) => sum + y.meals, 0) / years.length
    },
    method: `Self-employment with add-backs: ${method}`
  };
}

// Calculate rental income (Schedule E)
function calculateRentalIncome(scheduleEData: any[]): { monthlyAmount: number; method: string; properties: number } {
  if (!scheduleEData || scheduleEData.length === 0) {
    return { monthlyAmount: 0, method: 'No rental data', properties: 0 };
  }

  let totalRentalIncome = 0;
  let propertiesCount = 0;

  for (const data of scheduleEData) {
    // Get properties from parsed data
    const properties = data.properties || [];
    
    for (const prop of properties) {
      const netIncome = prop.net_income_loss || 0;
      // Apply Fannie Mae 75% factor
      const qualifyingIncome = netIncome * FANNIE_MAE_RULES.rentalIncomeVacancyFactor;
      totalRentalIncome += qualifyingIncome;
      propertiesCount++;
    }

    // Also check for total_rental_net if properties not itemized
    if (properties.length === 0 && data.total_rental_net) {
      totalRentalIncome += data.total_rental_net * FANNIE_MAE_RULES.rentalIncomeVacancyFactor;
      propertiesCount = 1;
    }
  }

  // Average across years if multiple Schedule Es
  const yearsOfData = scheduleEData.length;
  const avgAnnualRental = totalRentalIncome / yearsOfData;
  const monthlyAmount = avgAnnualRental / 12;

  return {
    monthlyAmount,
    method: `Rental income × 75% vacancy factor (${yearsOfData} year avg)`,
    properties: propertiesCount
  };
}

// Calculate K-1 income
function calculateK1Income(k1Data: any[]): { monthlyAmount: number; method: string } {
  if (!k1Data || k1Data.length === 0) {
    return { monthlyAmount: 0, method: 'No K-1 data' };
  }

  // Group by year
  const byYear: Record<number, number> = {};
  
  for (const k1 of k1Data) {
    const year = k1.tax_year || 2023;
    const ordinaryIncome = k1.box1_ordinary_income || 0;
    const guaranteedPayments = k1.box4_guaranteed_payments || 0;
    
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
      .order('tax_year', { ascending: false });

    if (docsError) throw docsError;

    if (!documents || documents.length === 0) {
      throw new Error('No processed documents found for borrower');
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

    // ===== PROCESS W-2s =====
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
        
        const year1Total = w2ByYear[year1].reduce((sum, w2) => sum + (parseFloat(w2.data.box1_wages) || 0), 0);
        const year2Total = w2ByYear[year2].reduce((sum, w2) => sum + (parseFloat(w2.data.box1_wages) || 0), 0);

        const { monthlyAmount, trend, trendPct, method } = calculateVariableIncome(year1Total, year2Total, 'w2_wages');

        // Only add if we don't already have base income from pay stubs
        const hasBaseFromPaystub = components.some(c => 
          c.component_type === 'base_hourly' || c.component_type === 'base_salary'
        );

        if (!hasBaseFromPaystub) {
          components.push({
            component_type: 'w2_income',
            monthly_amount: monthlyAmount,
            calculation_method: method,
            source_documents: w2s.map(w => w.id),
            months_considered: 24,
            trend_direction: trend,
            trend_percentage: trendPct,
            year1_amount: year1Total,
            year2_amount: year2Total,
            notes: `${year1}: $${year1Total.toLocaleString()} | ${year2}: $${year2Total.toLocaleString()}`
          });
          totalMonthlyIncome += monthlyAmount;
        }
      } else if (years.length === 1) {
        const yearTotal = w2ByYear[parseInt(years[0])].reduce((sum, w2) => 
          sum + (parseFloat(w2.data.box1_wages) || 0), 0
        );
        
        const hasBaseFromPaystub = components.some(c => 
          c.component_type === 'base_hourly' || c.component_type === 'base_salary'
        );

        if (!hasBaseFromPaystub) {
          components.push({
            component_type: 'w2_income',
            monthly_amount: yearTotal / 12,
            calculation_method: 'Single W-2 year ÷ 12 (2-year history recommended)',
            source_documents: w2s.map(w => w.id),
            months_considered: 12
          });
          totalMonthlyIncome += yearTotal / 12;
          warnings.push('Only 1 year of W-2 income - recommend 2 years for trending analysis');
        }
      }
    }

    // ===== PROCESS SCHEDULE C (Self-Employment) =====
    const scheduleCs = docsByType['schedule_c'] || [];
    if (scheduleCs.length > 0) {
      const year1Data = scheduleCs.find(s => s.data.tax_year === 2022)?.data;
      const year2Data = scheduleCs.find(s => s.data.tax_year === 2023)?.data || scheduleCs[0]?.data;

      const { monthlyAmount, addBacks, method, warning } = calculateSelfEmploymentIncome(year1Data, year2Data);

      if (monthlyAmount > 0) {
        components.push({
          component_type: 'self_employment',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: scheduleCs.map(s => s.id),
          months_considered: 24,
          notes: `Add-backs: Depreciation $${addBacks.depreciation?.toLocaleString() || 0}/yr, Home Office $${addBacks.homeOffice?.toLocaleString() || 0}/yr`
        });
        totalMonthlyIncome += monthlyAmount;
      }

      if (warning) warnings.push(warning);
    }

    // ===== PROCESS SCHEDULE E (Rental Income) =====
    const scheduleEs = docsByType['schedule_e'] || [];
    if (scheduleEs.length > 0) {
      const { monthlyAmount, method, properties } = calculateRentalIncome(scheduleEs.map(s => s.data));

      if (monthlyAmount !== 0) { // Can be negative
        components.push({
          component_type: 'rental_income',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: scheduleEs.map(s => s.id),
          notes: `${properties} rental propert${properties === 1 ? 'y' : 'ies'}`
        });
        totalMonthlyIncome += monthlyAmount;

        if (monthlyAmount < 0) {
          warnings.push('Rental properties showing net loss - reduces qualifying income');
        }
      }
    }

    // ===== PROCESS K-1s =====
    const k1s = docsByType['k1'] || [];
    if (k1s.length > 0) {
      const { monthlyAmount, method } = calculateK1Income(k1s.map(k => k.data));

      if (monthlyAmount > 0) {
        components.push({
          component_type: 'k1_income',
          monthly_amount: monthlyAmount,
          calculation_method: method,
          source_documents: k1s.map(k => k.id)
        });
        totalMonthlyIncome += monthlyAmount;
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
        inputs_version: 'v2.0_fannie_mae'
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
          calculation_version: 'v2.0_fannie_mae'
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
