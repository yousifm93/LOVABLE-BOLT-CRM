import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenario_type } = await req.json();
    
    if (!scenario_type) {
      throw new Error('scenario_type is required');
    }

    console.log(`fetch-single-rate: Starting rate fetch for scenario: ${scenario_type}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);


    // Base scenario parameters - 60% LTV
    const baseScenario60LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 240000, // 60% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 70% LTV
    const baseScenario70LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 280000, // 70% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 75% LTV
    const baseScenario75LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 300000, // 75% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 80% LTV
    const baseScenario80LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 320000, // 80% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 85% LTV
    const baseScenario85LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 340000, // 85% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 90% LTV
    const baseScenario90LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 360000, // 90% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 95% LTV
    const baseScenario95LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 380000, // 95% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 96.5% LTV
    const baseScenario965LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 386000, // 96.5% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Base scenario parameters - 97% LTV
    const baseScenario97LTV = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 388000, // 97% LTV
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Define scenario configurations
    const scenarioConfigs: Record<string, any> = {
      // 80% LTV scenarios
      '30yr_fixed': {
        ...baseScenario80LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      '15yr_fixed': {
        ...baseScenario80LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 15,
      },
      'fha_30yr': {
        ...baseScenario80LTV,
        loan_type: 'FHA',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      'bank_statement': {
        ...baseScenario80LTV,
        loan_type: 'Conventional',
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        loan_term: 30,
      },
      'dscr': {
        ...baseScenario80LTV,
        loan_type: 'Conventional',
        income_type: 'DSCR',
        dscr_ratio: '1.5',  // CRITICAL: Must always be 1.5 for DSCR scenarios
        occupancy: 'Investment',
        loan_term: 30,
      },
      // 70% LTV scenarios
      '30yr_fixed_70ltv': {
        ...baseScenario70LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      '15yr_fixed_70ltv': {
        ...baseScenario70LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 15,
      },
      'fha_30yr_70ltv': {
        ...baseScenario70LTV,
        loan_type: 'FHA',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      'bank_statement_70ltv': {
        ...baseScenario70LTV,
        loan_type: 'Conventional',
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        loan_term: 30,
      },
      'dscr_70ltv': {
        ...baseScenario70LTV,
        loan_type: 'Conventional',
        income_type: 'DSCR',
        dscr_ratio: '1.5',  // CRITICAL: Must always be 1.5 for DSCR scenarios
        occupancy: 'Investment',
        loan_term: 30,
      },
      // 60% LTV scenarios (DSCR only)
      'dscr_60ltv': {
        ...baseScenario60LTV,
        loan_type: 'Conventional',
        income_type: 'DSCR',
        dscr_ratio: '1.5',
        occupancy: 'Investment',
        loan_term: 30,
      },
      // 75% LTV scenarios (DSCR and Bank Statement)
      'dscr_75ltv': {
        ...baseScenario75LTV,
        loan_type: 'Conventional',
        income_type: 'DSCR',
        dscr_ratio: '1.5',
        occupancy: 'Investment',
        loan_term: 30,
      },
      'bank_statement_75ltv': {
        ...baseScenario75LTV,
        loan_type: 'Conventional',
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        loan_term: 30,
      },
      // 85% LTV scenarios (Bank Statement only - DSCR 85% removed)
      'bank_statement_85ltv': {
        ...baseScenario85LTV,
        loan_type: 'Conventional',
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        loan_term: 30,
      },
      // 90% LTV scenarios (no DSCR)
      '30yr_fixed_90ltv': {
        ...baseScenario90LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      '15yr_fixed_90ltv': {
        ...baseScenario90LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 15,
      },
      'fha_30yr_90ltv': {
        ...baseScenario90LTV,
        loan_type: 'FHA',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      'bank_statement_90ltv': {
        ...baseScenario90LTV,
        loan_type: 'Conventional',
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        loan_term: 30,
      },
      // 95% LTV scenarios (no Bank Statement or DSCR)
      '30yr_fixed_95ltv': {
        ...baseScenario95LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      '15yr_fixed_95ltv': {
        ...baseScenario95LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 15,
      },
      'fha_30yr_95ltv': {
        ...baseScenario95LTV,
        loan_type: 'FHA',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      // 96.5% LTV scenarios (FHA only)
      'fha_30yr_965ltv': {
        ...baseScenario965LTV,
        loan_type: 'FHA',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      // 97% LTV scenarios (30yr and 15yr fixed)
      '30yr_fixed_97ltv': {
        ...baseScenario97LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      '15yr_fixed_97ltv': {
        ...baseScenario97LTV,
        loan_type: 'Conventional',
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 15,
      }
    };

    const scenarioConfig = scenarioConfigs[scenario_type];
    if (!scenarioConfig) {
      throw new Error(`Unknown scenario_type: ${scenario_type}. Valid types: ${Object.keys(scenarioConfigs).join(', ')}`);
    }

    console.log(`Scenario configuration for ${scenario_type}:`, {
      income_type: scenarioConfig.income_type,
      dscr_ratio: scenarioConfig.dscr_ratio,
      occupancy: scenarioConfig.occupancy
    });

    // Create pricing run
    const { data: pricingRun, error: createError } = await supabase
      .from('pricing_runs')
      .insert({
        scenario_json: scenarioConfig,
        scenario_type: scenario_type,
        status: 'pending'
      })
      .select()
      .single();

    if (createError || !pricingRun) {
      throw new Error(`Failed to create pricing run for ${scenario_type}: ${createError?.message}`);
    }

    console.log(`Created pricing run for ${scenario_type}:`, pricingRun.id);


    console.log(`Triggering loan-pricer-axiom for ${scenario_type}:`, {
      run_id: pricingRun.id,
      income_type: scenarioConfig.income_type,
      dscr_ratio: scenarioConfig.dscr_ratio,
      occupancy: scenarioConfig.occupancy
    });

    // Use loan-pricer-axiom edge function for consistency with regular Loan Pricer
    const { data: axiomResult, error: axiomError } = await supabase.functions.invoke('loan-pricer-axiom', {
      body: { run_id: pricingRun.id }
    });

    if (axiomError) {
      console.error(`loan-pricer-axiom error for ${scenario_type}:`, axiomError);
      throw new Error(`loan-pricer-axiom error: ${axiomError.message}`);
    }

    console.log(`loan-pricer-axiom response for ${scenario_type}:`, axiomResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rate fetch triggered for ${scenario_type}`,
        pricing_run_id: pricingRun.id,
        scenario_type: scenario_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-single-rate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
