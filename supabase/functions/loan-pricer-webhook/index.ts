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

    const { run_id, rate, discount_points, status, screenshot_1, screenshot_2 } = body;

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

    // Verify the run_id exists and get scenario_type
    const { data: existingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('id, status, scenario_type')
      .eq('id', run_id)
      .single();

    if (fetchError || !existingRun) {
      console.error('Pricing run not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid run_id - pricing run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found existing run with status: ${existingRun.status}, scenario_type: ${existingRun.scenario_type}`);

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
    // Add screenshot URLs
    if (screenshot_1) {
      resultsJson.screenshot_1 = screenshot_1;
    }
    if (screenshot_2) {
      resultsJson.screenshot_2 = screenshot_2;
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

    // If this is a daily rate run (has scenario_type), update daily_market_updates
    if (existingRun.scenario_type && finalStatus === 'completed' && resultsJson.rate) {
      await updateDailyMarketRates(supabase, existingRun.scenario_type, resultsJson.rate, resultsJson.discount_points);
    }

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

async function updateDailyMarketRates(supabase: any, scenarioType: string, rate: string, points: string) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`Updating daily_market_updates for ${scenarioType} with rate: ${rate}, points: ${points}`);

  // Parse rate and points as numbers
  const rateNum = parseFloat(rate);
  const pointsNum = points ? parseFloat(points) : null;

  // Check if today's record exists
  const { data: existing, error: fetchError } = await supabase
    .from('daily_market_updates')
    .select('id')
    .eq('date', today)
    .single();

  // Build update object based on scenario type
  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  switch (scenarioType) {
    // 80% LTV scenarios
    case '30yr_fixed':
      updateFields.rate_30yr_fixed = rateNum;
      updateFields.points_30yr_fixed = pointsNum;
      break;
    case '15yr_fixed':
      updateFields.rate_15yr_fixed = rateNum;
      updateFields.points_15yr_fixed = pointsNum;
      break;
    case 'fha_30yr':
      updateFields.rate_30yr_fha = rateNum;
      updateFields.points_30yr_fha = pointsNum;
      break;
    case 'bank_statement':
      updateFields.rate_bank_statement = rateNum;
      updateFields.points_bank_statement = pointsNum;
      break;
    case 'dscr':
      updateFields.rate_dscr = rateNum;
      updateFields.points_dscr = pointsNum;
      break;
    // 70% LTV scenarios
    case '30yr_fixed_70ltv':
      updateFields.rate_30yr_fixed_70ltv = rateNum;
      updateFields.points_30yr_fixed_70ltv = pointsNum;
      break;
    case '15yr_fixed_70ltv':
      updateFields.rate_15yr_fixed_70ltv = rateNum;
      updateFields.points_15yr_fixed_70ltv = pointsNum;
      break;
    case 'fha_30yr_70ltv':
      updateFields.rate_30yr_fha_70ltv = rateNum;
      updateFields.points_30yr_fha_70ltv = pointsNum;
      break;
    case 'bank_statement_70ltv':
      updateFields.rate_bank_statement_70ltv = rateNum;
      updateFields.points_bank_statement_70ltv = pointsNum;
      break;
    case 'dscr_70ltv':
      updateFields.rate_dscr_70ltv = rateNum;
      updateFields.points_dscr_70ltv = pointsNum;
      break;
    // 60% LTV scenarios (DSCR only)
    case 'dscr_60ltv':
      updateFields.rate_dscr_60ltv = rateNum;
      updateFields.points_dscr_60ltv = pointsNum;
      break;
    // 75% LTV scenarios
    case 'dscr_75ltv':
      updateFields.rate_dscr_75ltv = rateNum;
      updateFields.points_dscr_75ltv = pointsNum;
      break;
    case 'bank_statement_75ltv':
      updateFields.rate_bank_statement_75ltv = rateNum;
      updateFields.points_bank_statement_75ltv = pointsNum;
      break;
    // 85% LTV scenarios
    case 'dscr_85ltv':
      updateFields.rate_dscr_85ltv = rateNum;
      updateFields.points_dscr_85ltv = pointsNum;
      break;
    case 'bank_statement_85ltv':
      updateFields.rate_bank_statement_85ltv = rateNum;
      updateFields.points_bank_statement_85ltv = pointsNum;
      break;
    // 90% LTV scenarios (no DSCR)
    case '30yr_fixed_90ltv':
      updateFields.rate_30yr_fixed_90ltv = rateNum;
      updateFields.points_30yr_fixed_90ltv = pointsNum;
      break;
    case '15yr_fixed_90ltv':
      updateFields.rate_15yr_fixed_90ltv = rateNum;
      updateFields.points_15yr_fixed_90ltv = pointsNum;
      break;
    case 'fha_30yr_90ltv':
      updateFields.rate_30yr_fha_90ltv = rateNum;
      updateFields.points_30yr_fha_90ltv = pointsNum;
      break;
    case 'bank_statement_90ltv':
      updateFields.rate_bank_statement_90ltv = rateNum;
      updateFields.points_bank_statement_90ltv = pointsNum;
      break;
    // 95% LTV scenarios (no Bank Statement or DSCR)
    case '30yr_fixed_95ltv':
      updateFields.rate_30yr_fixed_95ltv = rateNum;
      updateFields.points_30yr_fixed_95ltv = pointsNum;
      break;
    case '15yr_fixed_95ltv':
      updateFields.rate_15yr_fixed_95ltv = rateNum;
      updateFields.points_15yr_fixed_95ltv = pointsNum;
      break;
    case 'fha_30yr_95ltv':
      updateFields.rate_30yr_fha_95ltv = rateNum;
      updateFields.points_30yr_fha_95ltv = pointsNum;
      break;
    // 96.5% LTV scenarios (FHA only)
    case 'fha_30yr_965ltv':
      updateFields.rate_30yr_fha_965ltv = rateNum;
      updateFields.points_30yr_fha_965ltv = pointsNum;
      break;
    // 97% LTV scenarios (30yr and 15yr fixed)
    case '30yr_fixed_97ltv':
      updateFields.rate_30yr_fixed_97ltv = rateNum;
      updateFields.points_30yr_fixed_97ltv = pointsNum;
      break;
    case '15yr_fixed_97ltv':
      updateFields.rate_15yr_fixed_97ltv = rateNum;
      updateFields.points_15yr_fixed_97ltv = pointsNum;
      break;
  }

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('daily_market_updates')
      .update(updateFields)
      .eq('date', today);

    if (updateError) {
      console.error('Error updating daily_market_updates:', updateError);
    } else {
      console.log(`Updated daily_market_updates for ${scenarioType}`);
    }
  } else {
    // Create new record
    const { error: insertError } = await supabase
      .from('daily_market_updates')
      .insert({
        date: today,
        ...updateFields
      });

    if (insertError) {
      console.error('Error inserting daily_market_updates:', insertError);
    } else {
      console.log(`Created daily_market_updates record for ${scenarioType}`);
    }
  }
}
