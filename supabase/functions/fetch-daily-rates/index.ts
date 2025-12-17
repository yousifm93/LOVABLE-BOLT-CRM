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
    console.log('fetch-daily-rates: Starting daily rate fetch with 3 scenarios');

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

    // Three scenarios: 30Y Conventional, Bank Statement, DSCR
    const scenarios = [
      {
        ...baseScenario,
        income_type: 'Full Doc - 24M',
        dscr_ratio: '',
        scenario_type: '30yr_fixed'
      },
      {
        ...baseScenario,
        income_type: '24Mo Business Bank Statements',
        dscr_ratio: '',
        scenario_type: 'bank_statement'
      },
      {
        ...baseScenario,
        income_type: 'DSCR',
        dscr_ratio: '1.3',
        occupancy: 'Investment',
        scenario_type: 'dscr'
      }
    ];

    const pricingRunIds: string[] = [];

    // Create pricing runs and trigger Axiom for each scenario
    for (const scenario of scenarios) {
      const { scenario_type, ...scenarioData } = scenario;
      
      // Create pricing run
      const { data: pricingRun, error: createError } = await supabase
        .from('pricing_runs')
        .insert({
          scenario_json: scenarioData,
          scenario_type: scenario_type,
          status: 'pending'
        })
        .select()
        .single();

      if (createError || !pricingRun) {
        throw new Error(`Failed to create pricing run for ${scenario_type}: ${createError?.message}`);
      }

      console.log(`Created pricing run for ${scenario_type}:`, pricingRun.id);
      pricingRunIds.push(pricingRun.id);

      // Trigger Axiom
      const axiomData = [[
        pricingRun.id,
        scenarioData.fico_score?.toString() || '',
        scenarioData.zip_code || '',
        scenarioData.num_units?.toString() || '1',
        scenarioData.purchase_price?.toString() || '',
        scenarioData.loan_amount?.toString() || '',
        scenarioData.occupancy || '',
        scenarioData.property_type || '',
        scenarioData.income_type || 'Full Doc - 24M',
        scenarioData.dscr_ratio || ''
      ]];

      console.log(`Triggering Axiom for ${scenario_type} with data:`, axiomData);

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
        // Continue with other scenarios even if one fails
      }

      // Update pricing run status to running
      await supabase
        .from('pricing_runs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', pricingRun.id);

      // Longer delay between API calls - Axiom needs time to process each scenario
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily rate fetch triggered for 3 scenarios',
        pricing_run_ids: pricingRunIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-daily-rates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
