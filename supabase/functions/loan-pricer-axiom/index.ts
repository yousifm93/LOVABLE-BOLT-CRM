import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id } = await req.json();
    
    if (!run_id) {
      throw new Error('run_id is required');
    }

    console.log('Processing pricing run:', run_id);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the pricing run
    const { data: pricingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (fetchError) {
      console.error('Error fetching pricing run:', fetchError);
      throw new Error(`Failed to fetch pricing run: ${fetchError.message}`);
    }

    if (!pricingRun) {
      throw new Error('Pricing run not found');
    }

    console.log('Pricing run found:', pricingRun.id);
    console.log('Scenario data:', JSON.stringify(pricingRun.scenario_json));

    // Get Axiom API key
    const axiomApiKey = Deno.env.get('AXIOM_API_KEY');
    if (!axiomApiKey) {
      throw new Error('AXIOM_API_KEY not configured');
    }

    // Format scenario data for Axiom
    const scenario = pricingRun.scenario_json || {};
    
    // Build the data array matching Axiom's expected field order (10 fields):
    // Index 0: run_id (for webhook callback)
    // Index 1: fico_score
    // Index 2: zip_code
    // Index 3: num_units
    // Index 4: purchase_price
    // Index 5: loan_amount
    // Index 6: occupancy
    // Index 7: property_type
    // Index 8: income_type
    // Index 9: dscr_ratio
    const axiomData = [[
      run_id,
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

    console.log(`Sending ${axiomData[0].length} fields to Axiom (10 fields)`);
    console.log('Axiom payload:', JSON.stringify(axiomData));

    // Check for direct webhook URL (preferred method for "Receive data from another app" step)
    const webhookUrl = Deno.env.get('AXIOM_WEBHOOK_URL');
    let axiomResponse: any = null;
    let triggerMethod = '';

    if (webhookUrl) {
      // Method 1: Direct webhook POST to Axiom's "Receive data from another app" step
      // This ensures Step 1 receives the data directly
      console.log('Attempting direct webhook trigger...');
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(axiomData),
        });

        if (webhookResponse.ok) {
          axiomResponse = await webhookResponse.text();
          triggerMethod = 'webhook';
          console.log('Direct webhook trigger successful:', axiomResponse);
        } else {
          console.log('Direct webhook failed, falling back to API trigger. Status:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.log('Direct webhook error, falling back to API trigger:', webhookError);
      }
    }

    // Method 2: Fallback to API trigger (key in body, not header)
    if (!axiomResponse) {
      console.log('Using API trigger method...');
      const apiResponse = await fetch('https://lar.axiom.ai/api/v3/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: axiomApiKey,
          name: 'Axiom Loan Pricer Tool',
          data: axiomData,
        }),
      });

      axiomResponse = await apiResponse.text();
      triggerMethod = 'api';
      console.log('Axiom API response:', apiResponse.status, axiomResponse);

      if (!apiResponse.ok) {
        throw new Error(`Axiom API error: ${apiResponse.status} - ${axiomResponse}`);
      }
    }

    // Update pricing run status to running
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({ status: 'running' })
      .eq('id', run_id);

    if (updateError) {
      console.error('Error updating pricing run status:', updateError);
    }

    console.log(`Pricing run ${run_id} triggered successfully via ${triggerMethod}`);

    return new Response(JSON.stringify({ 
      success: true, 
      run_id,
      trigger_method: triggerMethod,
      fields_sent: axiomData[0].length,
      axiom_response: axiomResponse 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in loan-pricer-axiom:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
