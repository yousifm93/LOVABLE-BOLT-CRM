import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Auto Status Transition Edge Function
 * 
 * This function runs on a schedule (cron) and automatically transitions
 * leads from "Just Applied" to "Screening" status after 24 hours.
 * 
 * Called by: Cron job (pg_cron) or manually
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto status transition check...');
    
    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const cutoffTime = twentyFourHoursAgo.toISOString();

    console.log(`Looking for leads with converted = 'Just Applied' and app_complete_at before ${cutoffTime}`);

    // Find leads that are still "Just Applied" and have been for more than 24 hours
    const { data: staleLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, converted, app_complete_at')
      .eq('converted', 'Just Applied')
      .lt('app_complete_at', cutoffTime)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('Error fetching stale leads:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${staleLeads?.length || 0} leads to transition`);

    if (!staleLeads || staleLeads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No leads require status transition',
          transitioned: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update each stale lead to "Screening" status
    const leadIds = staleLeads.map(lead => lead.id);
    
    const { data: updatedLeads, error: updateError } = await supabase
      .from('leads')
      .update({
        converted: 'Screening',
        updated_at: new Date().toISOString(),
      })
      .in('id', leadIds)
      .select('id, first_name, last_name, converted');

    if (updateError) {
      console.error('Error updating leads:', updateError);
      throw updateError;
    }

    console.log(`Successfully transitioned ${updatedLeads?.length || 0} leads from "Just Applied" to "Screening"`);

    // Log the transitions
    for (const lead of staleLeads) {
      console.log(`Transitioned: ${lead.first_name} ${lead.last_name} (${lead.email}) from "Just Applied" to "Screening"`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Transitioned ${updatedLeads?.length || 0} leads from "Just Applied" to "Screening"`,
        transitioned: updatedLeads?.length || 0,
        leads: updatedLeads?.map(l => ({ id: l.id, name: `${l.first_name} ${l.last_name}` })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in auto-status-transition:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
