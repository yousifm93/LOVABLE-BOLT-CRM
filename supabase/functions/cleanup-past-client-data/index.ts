import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of past client data...');

    // Step 1: Get all past client lead IDs (where is_closed = true)
    const { data: pastClientLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('is_closed', true);

    if (leadsError) {
      console.error('Error fetching past client leads:', leadsError);
      throw leadsError;
    }

    const leadIds = pastClientLeads?.map(l => l.id) || [];
    console.log(`Found ${leadIds.length} past client leads`);

    // Step 2: Delete auto-generated tasks for past clients
    let tasksDeleted = 0;
    if (leadIds.length > 0) {
      // Delete tasks in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        
        const { data: deletedTasks, error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .in('borrower_id', batch)
          .ilike('title', '%follow up on new lead%')
          .select('id');

        if (deleteError) {
          console.error(`Error deleting tasks batch ${i / batchSize + 1}:`, deleteError);
          // Continue with other batches
        } else {
          tasksDeleted += deletedTasks?.length || 0;
        }
      }
    }

    console.log(`Deleted ${tasksDeleted} auto-generated tasks for past clients`);

    return new Response(
      JSON.stringify({
        success: true,
        pastClientCount: leadIds.length,
        tasksDeleted,
        message: `Found ${leadIds.length} past clients and deleted ${tasksDeleted} auto-generated tasks. Dashboard queries now filter out past clients (is_closed = true).`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
