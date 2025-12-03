import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('loan-pricer-axiom v3 - deployed');
    const { run_id } = await req.json();
    
    if (!run_id) {
      throw new Error('run_id is required');
    }

    console.log(`Processing pricing run: ${run_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the pricing run
    const { data: pricingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (fetchError || !pricingRun) {
      throw new Error(`Failed to fetch pricing run: ${fetchError?.message || 'Not found'}`);
    }

    const scenario = pricingRun.scenario_json;
    console.log('Scenario data:', scenario);

    // Get Axiom API key
    const axiomApiKey = Deno.env.get('AXIOM_API_KEY');
    if (!axiomApiKey) {
      throw new Error('AXIOM_API_KEY not configured');
    }

    // Prepare data for Axiom - order must match webhook-data indices
    // Index 0: run_id
    // Index 1: fico_score
    // Index 2: zip_code
    // Index 3: num_units
    // Index 4: purchase_price
    // Index 5: loan_amount
    // Index 6: occupancy
    // Index 7: property_type
    // Index 8: term_years
    const axiomData = [[
      run_id,
      scenario.fico_score?.toString() || '',
      scenario.zip_code || '',
      scenario.num_units?.toString() || '1',
      scenario.purchase_price?.toString() || '',
      scenario.loan_amount?.toString() || '',
      scenario.occupancy || '',
      scenario.property_type || '',
      scenario.term_years?.toString() || '30'
    ]];

    console.log('Sending to Axiom:', axiomData);

    // Call Axiom API
    const axiomResponse = await fetch('https://lar.axiom.ai/api/v3/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: axiomApiKey,
        name: 'Axiom Loan Pricer Tool',
        data: axiomData
      }),
    });

    const axiomResult = await axiomResponse.text();
    console.log('Axiom API response:', axiomResponse.status, axiomResult);

    if (!axiomResponse.ok) {
      throw new Error(`Axiom API error: ${axiomResponse.status} - ${axiomResult}`);
    }

    // Update status to 'running'
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('Failed to update status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pricing run triggered successfully',
        axiom_response: axiomResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in loan-pricer-axiom:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
