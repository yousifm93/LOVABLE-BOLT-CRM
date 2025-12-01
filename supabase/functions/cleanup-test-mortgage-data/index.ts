import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Simple auth check - require a confirmation parameter
    const url = new URL(req.url);
    const confirm = url.searchParams.get('confirm');
    
    if (confirm !== 'yes') {
      return new Response(
        JSON.stringify({ error: 'Please add ?confirm=yes to the URL to proceed with deletion' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting cleanup of test mortgage application data...');

    const testUserIds = [
      'f25da9be-7a0b-451d-bb4d-72cecf4aa542', // Joey Whiney
      '7461735d-01c2-45a5-8c27-60acaeef5e51'  // Sammy Yarbou
    ];

    const testLeadIds = [
      'aadc7064-2e89-4460-9f8c-fe1c41ef91c8', // Joey Whiney lead
      'd0831d44-2863-48be-970b-e468bb97cec3'  // Sammy Yarbou lead
    ];

    // Step 1: Delete mortgage_applications
    console.log('Deleting mortgage_applications...');
    const { error: appsError, data: deletedApps } = await supabase
      .from('mortgage_applications')
      .delete()
      .in('user_id', testUserIds)
      .select();

    if (appsError) {
      console.error('Error deleting applications:', appsError);
      throw appsError;
    }
    console.log(`Deleted ${deletedApps?.length || 0} mortgage applications`);

    // Step 2: Delete application_users
    console.log('Deleting application_users...');
    const { error: usersError, data: deletedUsers } = await supabase
      .from('application_users')
      .delete()
      .in('id', testUserIds)
      .select();

    if (usersError) {
      console.error('Error deleting users:', usersError);
      throw usersError;
    }
    console.log(`Deleted ${deletedUsers?.length || 0} application users`);

    // Step 3: Delete related leads
    console.log('Deleting related leads...');
    const { error: leadsError, data: deletedLeads } = await supabase
      .from('leads')
      .delete()
      .in('id', testLeadIds)
      .select();

    if (leadsError) {
      console.error('Error deleting leads:', leadsError);
      throw leadsError;
    }
    console.log(`Deleted ${deletedLeads?.length || 0} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          applications: deletedApps?.length || 0,
          users: deletedUsers?.length || 0,
          leads: deletedLeads?.length || 0
        },
        message: 'Test data cleared successfully. Note: You still need to manually delete auth users from Supabase Dashboard.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
