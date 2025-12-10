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

    console.log('Starting remaining Active Pipeline sync fixes...');

    const updates: string[] = [];
    const errors: { lead: string; error: string }[] = [];

    // Update Mohamed Rasmy - using specific ID
    const { error: e1 } = await supabase
      .from('leads')
      .update({
        loan_amount: 215000,
        mb_loan_number: '12807701',
        lender_loan_number: '1161948',
        close_date: '2025-12-17',
        program: 'Bank Statement'
      })
      .eq('id', 'c758b3a2-c7e4-4ffc-a908-c27eddbd8e03');
    if (e1) errors.push({ lead: 'Mohamed Rasmy', error: e1.message });
    else updates.push('Mohamed Rasmy - loan_amount, close_date, program updated');

    // Update Yoseph Cetton - using specific ID (mb_loan_number: 14548295)
    const { error: e2 } = await supabase
      .from('leads')
      .update({
        lender_loan_number: '1120765'
      })
      .eq('id', '4a7e6f1e-f235-45f4-9069-883d5e9a0525');
    if (e2) errors.push({ lead: 'Yoseph Cetton', error: e2.message });
    else updates.push('Yoseph Cetton - lender_loan_number updated');

    // Update Dario Occelli - using specific ID, set title_status to null for "On Hold"
    const { error: e3 } = await supabase
      .from('leads')
      .update({
        lender_loan_number: '1136600',
        close_date: '2026-01-06',
        title_status: null // On Hold in Excel = null in CRM
      })
      .eq('id', '3baf56ce-8b87-4d61-82f3-30da8a0d595a');
    if (e3) errors.push({ lead: 'Dario Occelli', error: e3.message });
    else updates.push('Dario Occelli - close_date, lender_loan_number updated, title on hold');

    // Update Alejandro Rasic - using specific ID, set statuses to null for "On Hold"
    const { error: e4 } = await supabase
      .from('leads')
      .update({
        lender_loan_number: '1137285',
        close_date: '2026-01-30',
        appraisal_status: null, // On Hold in Excel = null in CRM
        hoi_status: null,       // On Hold in Excel = null in CRM
        condo_status: null      // On Hold in Excel = null in CRM
      })
      .eq('id', '07afa406-106c-4369-a049-8dc1d2a19853');
    if (e4) errors.push({ lead: 'Alejandro Rasic', error: e4.message });
    else updates.push('Alejandro Rasic - close_date, lender_loan_number updated, statuses on hold');

    console.log('Sync fixes completed!');
    console.log('Updates:', updates);
    console.log('Errors:', errors);

    return new Response(
      JSON.stringify({
        success: true,
        updates_count: updates.length,
        errors_count: errors.length,
        updates,
        errors,
        message: `Fixed ${updates.length} remaining leads`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
