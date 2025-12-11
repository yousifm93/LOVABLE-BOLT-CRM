import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { updates } = await req.json();
    const results: any[] = [];

    for (const update of updates) {
      const { firstName, lastName, data } = update;
      
      // Find the lead
      const { data: leads, error: findError } = await supabase
        .from('leads')
        .select('id')
        .ilike('first_name', firstName)
        .ilike('last_name', `${lastName}%`)
        .limit(1);

      if (findError || !leads?.length) {
        results.push({ name: `${firstName} ${lastName}`, error: findError?.message || 'Not found' });
        continue;
      }

      // Update the lead
      const { error: updateError } = await supabase
        .from('leads')
        .update(data)
        .eq('id', leads[0].id);

      if (updateError) {
        results.push({ name: `${firstName} ${lastName}`, error: updateError.message });
      } else {
        results.push({ name: `${firstName} ${lastName}`, success: true });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
