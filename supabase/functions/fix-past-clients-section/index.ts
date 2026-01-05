import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Cancel all stuck pricing runs
    console.log('Cancelling stuck pricing runs...');
    const { data: cancelledRuns, error: cancelError } = await supabase
      .from('pricing_runs')
      .update({ status: 'cancelled' })
      .eq('status', 'running')
      .select('id');

    if (cancelError) {
      console.error('Failed to cancel pricing runs:', cancelError.message);
    } else {
      console.log(`✅ Cancelled ${cancelledRuns?.length || 0} stuck pricing runs`);
    }

    // 2. Get all 2024 past clients IDs first
    console.log('Finding 2024 past clients...');
    const { data: leadsToDelete, error: findError } = await supabase
      .from('leads')
      .select('id')
      .eq('is_closed', true)
      .gte('close_date', '2024-01-01')
      .lt('close_date', '2025-01-01');

    if (findError) {
      throw new Error(`Failed to find 2024 past clients: ${findError.message}`);
    }

    const leadIds = leadsToDelete?.map(l => l.id) || [];
    console.log(`Found ${leadIds.length} 2024 past clients to delete`);

    if (leadIds.length > 0) {
      // Delete related tasks first
      console.log('Deleting related tasks...');
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .in('borrower_id', leadIds);

      if (tasksError) {
        console.error('Failed to delete related tasks:', tasksError.message);
      }

      // Delete related email logs
      const { error: emailLogsError } = await supabase
        .from('email_logs')
        .delete()
        .in('lead_id', leadIds);

      if (emailLogsError) {
        console.error('Failed to delete related email logs:', emailLogsError.message);
      }

      // Delete related notes
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .in('lead_id', leadIds);

      if (notesError) {
        console.error('Failed to delete related notes:', notesError.message);
      }

      // Now delete the leads
      console.log('Deleting 2024 past clients...');
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (deleteError) {
        throw new Error(`Failed to delete 2024 past clients: ${deleteError.message}`);
      }
    }

    const deletedCount = leadIds.length;
    console.log(`✅ Deleted ${deletedCount} 2024 past clients`);

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_runs: cancelledRuns?.length || 0,
        deleted_past_clients: deletedCount,
        message: `Cancelled ${cancelledRuns?.length || 0} stuck runs, deleted ${deletedCount} 2024 past clients`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fix error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
