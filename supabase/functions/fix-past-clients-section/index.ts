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

    console.log('Fixing lead_on_date for Past Clients with December 2025 dates...');

    // Update all closed leads with December 2025 lead_on_date to November 30, 2025
    const { data, error } = await supabase
      .from('leads')
      .update({ lead_on_date: '2025-11-30' })
      .eq('is_closed', true)
      .gte('lead_on_date', '2025-12-01')
      .lt('lead_on_date', '2026-01-01')
      .select('id, first_name, last_name, lead_on_date');

    if (error) {
      throw new Error(`Failed to update leads: ${error.message}`);
    }

    const updatedCount = data?.length || 0;
    console.log(`✅ Updated ${updatedCount} Past Clients lead_on_date to November 30, 2025`);

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
