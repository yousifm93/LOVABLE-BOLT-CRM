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

    console.log('Starting Active Pipeline sync...');

    const updates: string[] = [];
    const errors: { lead: string; error: string }[] = [];

    // Lender IDs
    const LENDERS = {
      UWM: 'de9cb248-08fe-4554-a746-cb51a89c310b',
      PENNYMAC: '8ce48b0c-5c4e-43f9-8ac1-5c7f962c05ab',
      DEEPHAVEN: 'ca7ce886-de8f-4a0b-9735-92ac95e02d9b',
      AD: '42d1d051-3d59-4f9a-af15-003a465fe68e'
    };

    // Active pipeline stage ID
    const ACTIVE_STAGE_ID = '76eb2e82-e1d9-4f2d-a57d-2120a25696db';

    // === PHASE 1: Files Moving from Incoming to Live ===

    // 1. Milton Mora
    const { error: e1 } = await supabase
      .from('leads')
      .update({
        pipeline_section: 'Live',
        approved_lender_id: LENDERS.UWM,
        loan_status: 'AWC',
        appraisal_status: 'Scheduled',
        title_status: 'Received',
        hoi_status: 'Ordered',
        condo_status: 'N/A',
        lock_expiration_date: '2025-01-02'
      })
      .eq('id', '080dd5e0-c6ca-43de-aca1-2c10b76f55d0');
    if (e1) errors.push({ lead: 'Milton Mora', error: e1.message });
    else updates.push('Milton Mora - moved to Live, updated all statuses');

    // 2. Younes Bekhou
    const { error: e2 } = await supabase
      .from('leads')
      .update({
        pipeline_section: 'Live',
        approved_lender_id: LENDERS.PENNYMAC,
        loan_status: 'SUB',
        title_status: 'Requested',
        hoi_status: 'Ordered'
      })
      .eq('id', '2d0fc3d0-1fdd-4426-b7ab-d0e710197d73');
    if (e2) errors.push({ lead: 'Younes Bekhou', error: e2.message });
    else updates.push('Younes Bekhou - moved to Live, updated statuses');

    // === PHASE 2: Updates for Live Pipeline Files ===

    // 3. Myles Munroe
    const { error: e3 } = await supabase
      .from('leads')
      .update({
        title_status: 'Requested',
        condo_status: 'Received',
        cd_status: 'Signed'
      })
      .eq('id', '8a0eed48-b877-4b25-87e8-f13ab8c263fa');
    if (e3) errors.push({ lead: 'Myles Munroe', error: e3.message });
    else updates.push('Myles Munroe - updated title, condo, cd statuses');

    // 4. Jason Jerald
    const { error: e4 } = await supabase
      .from('leads')
      .update({
        condo_status: 'Approved',
        lock_expiration_date: '2025-12-26'
      })
      .eq('id', '40188208-e1c5-4120-b48a-5f3e5e583636');
    if (e4) errors.push({ lead: 'Jason Jerald', error: e4.message });
    else updates.push('Jason Jerald - updated condo status');

    // 5. Diana Alzate - TRANSFER not available, skipping condo update

    // 6. Geetha Sankuratri
    const { error: e6 } = await supabase
      .from('leads')
      .update({
        approved_lender_id: LENDERS.DEEPHAVEN,
        package_status: 'Final'
      })
      .eq('id', '1439b165-8ed9-439c-b09b-e022303e413f');
    if (e6) errors.push({ lead: 'Geetha Sankuratri', error: e6.message });
    else updates.push('Geetha Sankuratri - updated lender to Deephaven');

    // 7. Daniel Faltas
    const { error: e7 } = await supabase
      .from('leads')
      .update({
        package_status: null,
        epo_status: 'Signed'
      })
      .eq('id', 'df4e155b-52d8-4ae4-a36a-4831d189c263');
    if (e7) errors.push({ lead: 'Daniel Faltas', error: e7.message });
    else updates.push('Daniel Faltas - cleared package, set EPO to Signed');

    // 8. Sheela Vallabhaneni
    const { error: e8 } = await supabase
      .from('leads')
      .update({
        approved_lender_id: LENDERS.DEEPHAVEN,
        condo_status: 'Approved',
        cd_status: 'N/A',
        package_status: 'Initial'
      })
      .eq('id', '6c16c2c4-3fa3-461e-ba50-ca7a1f954e08');
    if (e8) errors.push({ lead: 'Sheela Vallabhaneni', error: e8.message });
    else updates.push('Sheela Vallabhaneni - updated lender, condo, cd, package');

    // 9. Rahul Kommineni
    const { error: e9 } = await supabase
      .from('leads')
      .update({
        cd_status: null
      })
      .eq('id', 'f4a85815-4e2a-44b3-b21b-367145e604f8');
    if (e9) errors.push({ lead: 'Rahul Kommineni', error: e9.message });
    else updates.push('Rahul Kommineni - cleared cd_status');

    // 10. Rayza Occelli - already correct, no changes needed

    // 11. Cullen Mahoney
    const { error: e11 } = await supabase
      .from('leads')
      .update({
        ba_status: 'N/A'
      })
      .eq('id', '1ce1e6c2-c5d1-4f39-9f90-78101269cc88');
    if (e11) errors.push({ lead: 'Cullen Mahoney', error: e11.message });
    else updates.push('Cullen Mahoney - set BA to N/A');

    // 12. Ethan Guillen
    const { error: e12 } = await supabase
      .from('leads')
      .update({
        loan_status: 'AWC',
        appraisal_status: 'Inspected'
      })
      .eq('id', '9ef0bad3-2231-4e17-ac39-fc0ba6346fa0');
    if (e12) errors.push({ lead: 'Ethan Guillen', error: e12.message });
    else updates.push('Ethan Guillen - updated loan_status to AWC, appraisal to Inspected');

    // 13. Dario Occelli
    const { error: e13 } = await supabase
      .from('leads')
      .update({
        title_status: null,
        condo_status: 'Received'
      })
      .eq('id', '3baf56ce-8b87-4d61-82f3-30da8a0d595a');
    if (e13) errors.push({ lead: 'Dario Occelli', error: e13.message });
    else updates.push('Dario Occelli - set title to null (on hold), condo to Received');

    // 14. Sundeep Sayapneni
    const { error: e14 } = await supabase
      .from('leads')
      .update({
        condo_status: 'Received',
        package_status: null,
        epo_status: 'Send'
      })
      .eq('id', 'e6ab6ded-9b3b-4cc5-997a-732471c4ccab');
    if (e14) errors.push({ lead: 'Sundeep Sayapneni', error: e14.message });
    else updates.push('Sundeep Sayapneni - cleared package, set EPO to Send');

    // 15. Ryan Rached
    const { error: e15 } = await supabase
      .from('leads')
      .update({
        approved_lender_id: LENDERS.AD,
        loan_amount: 585000,
        loan_status: 'AWC',
        title_status: 'Requested',
        hoi_status: 'Ordered',
        ba_status: 'Signed'
      })
      .eq('id', 'a5d69ab1-9117-464f-8efe-fa21c206f3a7');
    if (e15) errors.push({ lead: 'Ryan Rached', error: e15.message });
    else updates.push('Ryan Rached - updated lender to A&D, loan amount, statuses');

    // 16. Alejandro Rasic
    const { error: e16 } = await supabase
      .from('leads')
      .update({
        appraisal_status: null,
        title_status: null,
        hoi_status: null
      })
      .eq('id', '07afa406-106c-4369-a049-8dc1d2a19853');
    if (e16) errors.push({ lead: 'Alejandro Rasic', error: e16.message });
    else updates.push('Alejandro Rasic - set appraisal, title, hoi to null (on hold)');

    // === PHASE 3: Updates for Incoming Section ===

    // 17. Jackeline Londono
    const { error: e17 } = await supabase
      .from('leads')
      .update({
        package_status: null
      })
      .eq('id', '72f0663a-ef9e-4c41-834a-2fa37aaf20f6');
    if (e17) errors.push({ lead: 'Jackeline Londono', error: e17.message });
    else updates.push('Jackeline Londono - cleared package_status');

    // === PHASE 4: Add New File to Incoming ===

    // 18. Gaurav Sharma - move to Active pipeline
    const { error: e18 } = await supabase
      .from('leads')
      .update({
        pipeline_stage_id: ACTIVE_STAGE_ID,
        pipeline_section: 'Incoming',
        approved_lender_id: LENDERS.PENNYMAC,
        loan_amount: 560000,
        close_date: '2025-01-30'
      })
      .eq('id', '7da2997e-a8b1-4177-bedc-84a6157c4617');
    if (e18) errors.push({ lead: 'Gaurav Sharma', error: e18.message });
    else updates.push('Gaurav Sharma - moved to Active/Incoming with Pennymac');

    console.log('Sync completed!');
    console.log('Updates:', updates);
    console.log('Errors:', errors);

    return new Response(
      JSON.stringify({
        success: true,
        updates_count: updates.length,
        errors_count: errors.length,
        updates,
        errors,
        message: `Updated ${updates.length} leads with ${errors.length} errors`
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
