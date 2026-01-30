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
    console.log('process-pricing-queue: Starting queue processing...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any run is currently active
    const { data: activeRun, error: activeError } = await supabase
      .from('pricing_runs')
      .select('id, created_at, scenario_type')
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) {
      console.error('Error checking active runs:', activeError);
      throw new Error(`Failed to check active runs: ${activeError.message}`);
    }

    if (activeRun) {
      // Check if it's been running too long (>3 minutes = likely stuck)
      const runningFor = Date.now() - new Date(activeRun.created_at).getTime();
      const THREE_MINUTES = 180000;

      if (runningFor > THREE_MINUTES) {
        // Mark as failed - it's stuck
        console.log(`Marking stuck run ${activeRun.id} (${activeRun.scenario_type}) as failed after ${Math.round(runningFor / 1000)}s`);
        await supabase
          .from('pricing_runs')
          .update({ 
            status: 'failed', 
            error_message: `Timed out after ${Math.round(runningFor / 1000)} seconds - marked by queue processor` 
          })
          .eq('id', activeRun.id);
      } else {
        // Still running normally - don't start another
        console.log(`Run ${activeRun.id} (${activeRun.scenario_type}) still active (${Math.round(runningFor / 1000)}s), skipping queue processing`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Another run still active',
            active_run_id: activeRun.id,
            running_for_seconds: Math.round(runningFor / 1000)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Find the oldest queued or failed run that's eligible for retry
    const { data: nextRun, error: queueError } = await supabase
      .from('pricing_runs')
      .select('*')
      .in('status', ['queued', 'failed'])
      .lt('retry_count', 3) // Only retry up to 3 times
      .order('queued_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queueError) {
      console.error('Error fetching queued runs:', queueError);
      throw new Error(`Failed to fetch queued runs: ${queueError.message}`);
    }

    if (!nextRun) {
      console.log('No runs in queue to process');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No runs in queue'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing queued run: ${nextRun.id} (${nextRun.scenario_type}), retry_count: ${nextRun.retry_count || 0}`);

    // Update retry count and set status to running BEFORE triggering
    const newRetryCount = (nextRun.retry_count || 0) + 1;
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({ 
        retry_count: newRetryCount,
        status: 'running',
        error_message: null // Clear previous error
      })
      .eq('id', nextRun.id);

    if (updateError) {
      console.error('Error updating run status:', updateError);
      throw new Error(`Failed to update run status: ${updateError.message}`);
    }

    // Trigger the Axiom run via loan-pricer-axiom
    console.log(`Triggering loan-pricer-axiom for ${nextRun.scenario_type} (attempt ${newRetryCount})`);
    
    const { data: axiomResult, error: axiomError } = await supabase.functions.invoke('loan-pricer-axiom', {
      body: { run_id: nextRun.id }
    });

    if (axiomError) {
      console.error(`loan-pricer-axiom error:`, axiomError);
      // Don't throw - the run is already marked as running, Axiom will handle the webhook
    } else {
      console.log(`loan-pricer-axiom triggered successfully:`, axiomResult);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Triggered queued run`,
        run_id: nextRun.id,
        scenario_type: nextRun.scenario_type,
        retry_attempt: newRetryCount,
        axiom_result: axiomResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-pricing-queue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
