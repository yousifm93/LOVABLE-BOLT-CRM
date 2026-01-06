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

    const axiomApiKey = Deno.env.get('AXIOM_API_KEY');
    if (!axiomApiKey) {
      throw new Error('AXIOM_API_KEY not configured');
    }

    // Base scenario parameters
    const baseScenario = {
      fico_score: 780,
      zip_code: '33131',
      num_units: 1,
      purchase_price: 400000,
      loan_amount: 320000,
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
    };

    // Define scenario configurations
    const scenarioConfigs: Record<string, any> = {
      '30yr_fixed': {
        ...baseScenario,
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      '15yr_fixed': {
        ...baseScenario,
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 15,
      },
      'fha_30yr': {
        ...baseScenario,
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        loan_term: 30,
      },
      'bank_statement': {
        ...baseScenario,
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        loan_term: 30,
      },
      'dscr': {
        ...baseScenario,
        income_type: 'DSCR',
        dscr_ratio: '1.5',  // CRITICAL: Must always be 1.5 for DSCR scenarios
        occupancy: 'Investment',
        loan_term: 30,
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

    // For DSCR, always ensure dscr_ratio is explicitly set
    const dscrRatioValue = scenario_type === 'dscr' ? '1.5' : (scenarioConfig.dscr_ratio || '');

    // Always send 11 fields including loan_term
    const axiomData = [[
      pricingRun.id,
      scenarioConfig.fico_score?.toString() || '',
      scenarioConfig.zip_code || '',
      scenarioConfig.num_units?.toString() || '1',
      scenarioConfig.purchase_price?.toString() || '',
      scenarioConfig.loan_amount?.toString() || '',
      scenarioConfig.occupancy || '',
      scenarioConfig.property_type || '',
      scenarioConfig.income_type || 'Full Doc - 24M',
      dscrRatioValue,
      (scenarioConfig.loan_term?.toString() || '30') + 'yr',
    ]];

    console.log(`Triggering Axiom for ${scenario_type}:`, {
      run_id: pricingRun.id,
      income_type: scenarioConfig.income_type,
      dscr_ratio: dscrRatioValue,
      occupancy: scenarioConfig.occupancy,
      axiom_data_row: axiomData[0]
    });

    const axiomResponse = await fetch('https://lar.axiom.ai/api/v3/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: axiomApiKey,
        name: 'Axiom Loan Pricer Tool',
        data: axiomData
      }),
    });

    if (!axiomResponse.ok) {
      const errorText = await axiomResponse.text();
      console.error(`Axiom API error for ${scenario_type}:`, errorText);
      throw new Error(`Axiom API error: ${errorText}`);
    }

    const axiomResult = await axiomResponse.json();
    console.log(`Axiom response for ${scenario_type}:`, axiomResult);

    // Update pricing run status to running
    await supabase
      .from('pricing_runs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', pricingRun.id);

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
