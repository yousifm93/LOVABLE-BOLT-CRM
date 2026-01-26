import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

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

    // Parse request body for optional parameters
    let hoursBack = 24;
    let delayMs = 500;
    
    try {
      const body = await req.json();
      if (body.hoursBack) hoursBack = body.hoursBack;
      if (body.delayMs) delayMs = body.delayMs;
    } catch {
      // Use defaults if no body
    }

    console.log(`[Backfill] Processing emails from last ${hoursBack} hours with ${delayMs}ms delay`);

    // Calculate the timestamp for X hours ago
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    // Fetch all inbound emails from the specified time period
    const { data: emails, error: emailsError } = await supabase
      .from('email_logs')
      .select('id, from_email, subject, body, html_body, timestamp')
      .eq('direction', 'In')
      .gte('timestamp', cutoffTime.toISOString())
      .order('timestamp', { ascending: false });

    if (emailsError) {
      console.error('[Backfill] Error fetching emails:', emailsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails', details: emailsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Backfill] Found ${emails?.length || 0} inbound emails to process`);

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No emails found in the specified time period',
          processed: 0,
          contactsFound: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track results
    const results = {
      totalEmails: emails.length,
      processed: 0,
      successful: 0,
      failed: 0,
      contactsFound: 0,
      errors: [] as string[],
    };

    // Process each email
    for (const email of emails) {
      try {
        console.log(`[Backfill] Processing email ${results.processed + 1}/${emails.length}: ${email.subject?.substring(0, 50)}...`);

        // Build the email content object - extract name from email if possible
        const fromName = email.from_email ? email.from_email.split('@')[0].replace(/[._-]/g, ' ') : '';
        const emailContent = {
          from: fromName,
          fromEmail: email.from_email || '',
          subject: email.subject || '',
          body: email.body || email.html_body || '',
          date: email.timestamp,
        };

        // Call parse-email-contacts function
        const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            emailLogId: email.id,
            emailContent: emailContent,
          }),
        });

        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          results.successful++;
          
          if (parseData.count && parseData.count > 0) {
            results.contactsFound += parseData.count;
            console.log(`[Backfill] Found ${parseData.count} contacts in email: ${email.subject?.substring(0, 30)}`);
          }
        } else {
          const errorText = await parseResponse.text();
          results.failed++;
          results.errors.push(`Email ${email.id}: ${errorText.substring(0, 100)}`);
          console.error(`[Backfill] Failed to parse email ${email.id}:`, errorText.substring(0, 200));
        }

        results.processed++;

        // Add delay between calls to avoid rate limiting
        if (results.processed < emails.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (err) {
        results.failed++;
        results.processed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Email ${email.id}: ${errorMsg.substring(0, 100)}`);
        console.error(`[Backfill] Error processing email ${email.id}:`, errorMsg);
      }
    }

    console.log('[Backfill] Complete!', JSON.stringify({
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      contactsFound: results.contactsFound
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} emails, found ${results.contactsFound} new contacts`,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Backfill] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
