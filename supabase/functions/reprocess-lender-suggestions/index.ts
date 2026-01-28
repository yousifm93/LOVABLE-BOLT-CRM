import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for batch parameters
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const offset = body.offset || 0;
    const clearPending = body.clearPending !== false; // Default true on first call
    const hoursBack = body.hoursBack || 48;

    console.log(`[reprocess-lender-suggestions] Starting batch processing (offset: ${offset}, batchSize: ${batchSize}, clearPending: ${clearPending})`);

    let clearedCount = 0;

    // Step 1: Clear all pending suggestions (only on first batch)
    if (clearPending && offset === 0) {
      const { data: deletedData, error: deleteError } = await supabase
        .from('lender_field_suggestions')
        .delete()
        .eq('status', 'pending')
        .select('id');

      if (deleteError) {
        console.error('[reprocess-lender-suggestions] Delete error:', deleteError);
        throw new Error(`Failed to delete pending suggestions: ${deleteError.message}`);
      }

      clearedCount = deletedData?.length || 0;
      console.log(`[reprocess-lender-suggestions] Cleared ${clearedCount} pending suggestions`);
    }

    // Step 2: Fetch marketing emails from specified time range
    const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    console.log(`[reprocess-lender-suggestions] Fetching emails since ${cutoffDate}`);

    // First get total count
    const { count: totalCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_lender_marketing', true)
      .gte('timestamp', cutoffDate);

    // Then get batch
    const { data: emails, error: fetchError } = await supabase
      .from('email_logs')
      .select('id, subject, body, html_body, from_email, timestamp')
      .eq('is_lender_marketing', true)
      .gte('timestamp', cutoffDate)
      .order('timestamp', { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      console.error('[reprocess-lender-suggestions] Fetch error:', fetchError);
      throw new Error(`Failed to fetch emails: ${fetchError.message}`);
    }

    const emailCount = emails?.length || 0;
    console.log(`[reprocess-lender-suggestions] Processing batch: ${emailCount} emails (${offset + 1}-${offset + emailCount} of ${totalCount})`);

    // Step 3: Process each email in this batch
    let processed = 0;
    let errorsOccurred: Array<{ emailId: string; subject: string; error: string }> = [];

    for (const email of emails || []) {
      try {
        console.log(`[reprocess-lender-suggestions] Processing: ${email.subject?.substring(0, 50)}...`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/parse-lender-marketing-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: email.subject,
            body: email.body,
            htmlBody: email.html_body,
            fromEmail: email.from_email,
            emailLogId: email.id,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        await response.json();
        processed++;
        console.log(`[reprocess-lender-suggestions] Processed ${processed}/${emailCount}`);
        
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`[reprocess-lender-suggestions] Error:`, errorMsg);
        errorsOccurred.push({ 
          emailId: email.id, 
          subject: email.subject || 'No subject',
          error: errorMsg 
        });
      }
    }

    // Get current pending suggestions count
    const { count: pendingCount } = await supabase
      .from('lender_field_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const hasMore = (offset + emailCount) < (totalCount || 0);
    const nextOffset = offset + batchSize;

    const summary = {
      success: true,
      cleared: clearedCount,
      totalEmails: totalCount,
      batchProcessed: processed,
      batchErrors: errorsOccurred.length,
      currentPendingSuggestions: pendingCount,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
      errors: errorsOccurred,
    };

    console.log('[reprocess-lender-suggestions] Batch complete:', JSON.stringify({ ...summary, errors: errorsOccurred.length }));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[reprocess-lender-suggestions] Fatal error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
