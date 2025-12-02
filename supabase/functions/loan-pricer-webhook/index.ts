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
    const body = await req.json();
    console.log('Received webhook payload:', JSON.stringify(body));

    const { run_id, rate, discount_points, status } = body;

    if (!run_id) {
      console.error('Missing run_id in webhook payload');
      return new Response(
        JSON.stringify({ error: 'run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing webhook for run_id: ${run_id}`);
    console.log(`Rate: ${rate}, Discount Points: ${discount_points}, Status: ${status}`);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the run_id exists
    const { data: existingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('id, status')
      .eq('id', run_id)
      .single();

    if (fetchError || !existingRun) {
      console.error('Pricing run not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid run_id - pricing run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found existing run with status: ${existingRun.status}`);

    // Determine final status
    const finalStatus = status === 'failed' ? 'failed' : 'completed';

    // Build results JSON
    const resultsJson: Record<string, any> = {};
    if (rate !== undefined && rate !== null && rate !== '') {
      resultsJson.rate = rate;
    }
    if (discount_points !== undefined && discount_points !== null && discount_points !== '') {
      resultsJson.discount_points = discount_points;
    }

    // Update the pricing run with results
    const updateData: Record<string, any> = {
      status: finalStatus,
      completed_at: new Date().toISOString()
    };

    // Only add results_json if we have results
    if (Object.keys(resultsJson).length > 0) {
      updateData.results_json = resultsJson;
    }

    // Add error message if failed
    if (status === 'failed' && body.error_message) {
      updateData.error_message = body.error_message;
    }

    console.log('Updating pricing run with:', JSON.stringify(updateData));

    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update(updateData)
      .eq('id', run_id);

    if (updateError) {
      console.error('Failed to update pricing run:', updateError);
      throw updateError;
    }

    console.log(`Pricing run ${run_id} updated to status: ${finalStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pricing run ${run_id} updated to ${finalStatus}`,
        run_id,
        status: finalStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in loan-pricer-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
