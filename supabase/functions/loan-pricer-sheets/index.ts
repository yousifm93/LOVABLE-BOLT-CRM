import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create JWT for Google Service Account authentication
async function createGoogleJWT(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  // Base64url encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${unsignedToken}.${signatureB64}`;
}

// Exchange JWT for Google access token
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google OAuth error:', errorText);
    throw new Error(`Failed to get Google access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id } = await req.json();
    
    if (!run_id) {
      console.error('Missing run_id in request');
      return new Response(
        JSON.stringify({ error: 'run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing pricing run: ${run_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the pricing run
    const { data: pricingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (fetchError || !pricingRun) {
      console.error('Failed to fetch pricing run:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Pricing run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scenario = pricingRun.scenario_json;
    console.log('Scenario data:', JSON.stringify(scenario));

    // Get Google credentials
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID');

    if (!serviceAccountJson || !sheetId) {
      console.error('Missing Google credentials');
      return new Response(
        JSON.stringify({ error: 'Google credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Service account email:', serviceAccount.client_email);

    // Get Google access token
    const accessToken = await getGoogleAccessToken(serviceAccount);
    console.log('Got Google access token');

    // Prepare row data for Google Sheet
    // Columns: A=run_id, B=fico_score, C=loan_type, D=term_years, E=loan_purpose, 
    //          F=purchase_price, G=loan_amount, H=occupancy, I=property_type, 
    //          J=num_units, K=zip_code, L=state, M=status
    const rowData = [
      run_id,
      scenario.fico_score || '',
      scenario.loan_type || '',
      scenario.term_years || '',
      scenario.loan_purpose || '',
      scenario.purchase_price || '',
      scenario.loan_amount || '',
      scenario.occupancy || '',
      scenario.property_type || '',
      scenario.num_units || '',
      scenario.zip_code || '',
      scenario.state || '',
      'Pending'
    ];

    console.log('Appending row to Google Sheet:', rowData);

    // Append row to Google Sheet
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:M:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowData]
        })
      }
    );

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Google Sheets API error:', errorText);
      throw new Error(`Failed to append to Google Sheet: ${errorText}`);
    }

    const sheetsResult = await sheetsResponse.json();
    console.log('Google Sheets append result:', JSON.stringify(sheetsResult));

    // Update pricing run status to 'running'
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({ status: 'running' })
      .eq('id', run_id);

    if (updateError) {
      console.error('Failed to update status:', updateError);
      throw updateError;
    }

    console.log(`Pricing run ${run_id} status updated to 'running'`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data written to Google Sheet',
        run_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in loan-pricer-sheets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
