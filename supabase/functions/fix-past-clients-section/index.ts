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

    console.log('Fixing pipeline_section for Past Clients...');

    // Update all closed leads with NULL pipeline_section to 'Closed'
    const { data, error } = await supabase
      .from('leads')
      .update({ pipeline_section: 'Closed' })
      .eq('is_closed', true)
      .is('pipeline_section', null)
      .select('id, first_name, last_name');

    if (error) {
      throw new Error(`Failed to update leads: ${error.message}`);
    }

    const updatedCount = data?.length || 0;
    console.log(`✅ Updated ${updatedCount} Past Clients with pipeline_section = 'Closed'`);

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: updatedCount,
        updated_leads: data,
        message: `Successfully updated ${updatedCount} Past Clients`,
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
