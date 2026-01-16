import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CondoRow {
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source_uwm: boolean;
  source_ad: boolean;
  review_type: string | null;
  approval_expiration_date: string | null;
  primary_down: string | null;
  second_down: string | null;
  investment_down: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { condos, clearExisting = true } = await req.json();

    if (!condos || !Array.isArray(condos)) {
      return new Response(
        JSON.stringify({ error: 'condos array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importing ${condos.length} condos...`);

    // Clear existing condos if requested
    if (clearExisting) {
      // First clear any references in leads
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({ condo_id: null })
        .not('condo_id', 'is', null);

      if (leadUpdateError) {
        console.error('Error clearing lead condo references:', leadUpdateError);
      }

      const { error: deleteError } = await supabase
        .from('condos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('Error clearing condos:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to clear existing condos', details: deleteError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Cleared existing condos');
    }

    // Insert new condos in batches of 100
    const batchSize = 100;
    let inserted = 0;
    const errors: any[] = [];

    for (let i = 0; i < condos.length; i += batchSize) {
      const batch = condos.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('condos')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        errors.push({ batch: i / batchSize + 1, error });
      } else {
        inserted += data?.length || 0;
        console.log(`Inserted batch ${i / batchSize + 1}: ${data?.length} condos`);
      }
    }

    console.log(`Import complete. Inserted ${inserted} of ${condos.length} condos`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted,
        total: condos.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-condos:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
