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
    console.log('fetch-daily-rates: Starting daily rate fetch');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Standard pricing scenario for daily rates
    const scenario = {
      fico_score: 740,
      zip_code: '33166',
      num_units: 1,
      purchase_price: 500000,
      loan_amount: 375000,
      occupancy: 'Primary Residence',
      property_type: 'Single Family',
      income_type: 'Full Doc - 24M',
      dscr_ratio: ''
    };

    // Create a pricing run for 30-year fixed conventional
    const { data: pricingRun, error: createError } = await supabase
      .from('pricing_runs')
      .insert({
        scenario_json: scenario,
        status: 'pending'
      })
      .select()
      .single();

    if (createError || !pricingRun) {
      throw new Error(`Failed to create pricing run: ${createError?.message}`);
    }

    console.log('Created pricing run:', pricingRun.id);

    // Trigger the Axiom loan pricer
    const axiomApiKey = Deno.env.get('AXIOM_API_KEY');
    if (!axiomApiKey) {
      throw new Error('AXIOM_API_KEY not configured');
    }

    const axiomData = [[
      pricingRun.id,
      scenario.fico_score?.toString() || '',
      scenario.zip_code || '',
      scenario.num_units?.toString() || '1',
      scenario.purchase_price?.toString() || '',
      scenario.loan_amount?.toString() || '',
      scenario.occupancy || '',
      scenario.property_type || '',
      scenario.income_type || 'Full Doc - 24M',
      scenario.dscr_ratio || ''
    ]];

    console.log('Triggering Axiom with data:', axiomData);

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
      throw new Error(`Axiom API error: ${axiomResponse.status} - ${errorText}`);
    }

    // Update pricing run status to running
    await supabase
      .from('pricing_runs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', pricingRun.id);

    // The webhook will handle the results when Axiom completes
    // For now, return the pricing run ID so we can poll for results
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily rate fetch triggered',
        pricing_run_id: pricingRun.id
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
