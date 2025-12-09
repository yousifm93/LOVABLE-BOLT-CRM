import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    console.log('[Inbound Email Webhook] Received request');

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse multipart form data from SendGrid
    const formData = await req.formData();
    
    // Extract email data from SendGrid Inbound Parse format
    const fromRaw = formData.get('from') as string || '';
    const toRaw = formData.get('to') as string || '';
    const subject = formData.get('subject') as string || '(No Subject)';
    const textBody = formData.get('text') as string || '';
    const htmlBody = formData.get('html') as string || '';
    const attachmentCount = parseInt(formData.get('attachments') as string || '0', 10);
    const envelopeRaw = formData.get('envelope') as string || '{}';
    
    console.log('[Inbound Email Webhook] From:', fromRaw);
    console.log('[Inbound Email Webhook] To:', toRaw);
    console.log('[Inbound Email Webhook] Subject:', subject);
    console.log('[Inbound Email Webhook] Attachments:', attachmentCount);

    // Parse the envelope for actual email addresses
    let envelope: { from?: string; to?: string[] } = {};
    try {
      envelope = JSON.parse(envelopeRaw);
    } catch (e) {
      console.log('[Inbound Email Webhook] Could not parse envelope, using raw from/to');
    }

    // Extract email address from "Name <email@domain.com>" format
    const extractEmail = (raw: string): string => {
      const match = raw.match(/<([^>]+)>/);
      if (match) return match[1].toLowerCase();
      // If no angle brackets, the whole thing might be the email
      return raw.trim().toLowerCase();
    };

    // Prioritize the raw 'from' field (actual sender) over envelope.from (which may be the forwarding address)
    const senderEmail = extractEmail(fromRaw) || (envelope.from ? envelope.from.toLowerCase() : '');
    const recipientEmail = envelope.to?.[0]?.toLowerCase() || extractEmail(toRaw);
    
    console.log('[Inbound Email Webhook] Parsed sender email:', senderEmail);
    console.log('[Inbound Email Webhook] Parsed recipient email:', recipientEmail);

    // Extract sender name from raw format
    const extractName = (raw: string): string => {
      const match = raw.match(/^([^<]+)</);
      if (match) return match[1].trim();
      return '';
    };
    const senderName = extractName(fromRaw) || senderEmail;

    // Search for matching lead by email
    const { data: matchingLeads, error: leadError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email')
      .or(`email.ilike.%${senderEmail}%,co_borrower_email.ilike.%${senderEmail}%`)
      .limit(1);

    if (leadError) {
      console.error('[Inbound Email Webhook] Error searching leads:', leadError);
    }

    // Search for matching buyer agent by email
    const { data: matchingAgents, error: agentError } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, email')
      .ilike('email', `%${senderEmail}%`)
      .limit(1);

    if (agentError) {
      console.error('[Inbound Email Webhook] Error searching agents:', agentError);
    }

    const matchedLead = matchingLeads?.[0] || null;
    const matchedAgent = matchingAgents?.[0] || null;

    console.log('[Inbound Email Webhook] Matched lead:', matchedLead?.id || 'none');
    console.log('[Inbound Email Webhook] Matched agent:', matchedAgent?.id || 'none');

    // If no lead found, we still want to log the email but need a lead_id
    // Check if the agent has any associated leads
    let leadId = matchedLead?.id;
    
    if (!leadId && matchedAgent) {
      // Find leads associated with this agent
      const { data: agentLeads } = await supabase
        .from('leads')
        .select('id')
        .or(`buyer_agent_id.eq.${matchedAgent.id},listing_agent_id.eq.${matchedAgent.id}`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (agentLeads?.[0]) {
        leadId = agentLeads[0].id;
        console.log('[Inbound Email Webhook] Found lead through agent:', leadId);
      }
    }

    // Only proceed if we have a lead to associate with
    if (!leadId) {
      console.log('[Inbound Email Webhook] No matching lead found for email:', senderEmail);
      // Return success but log that no lead was found
      return new Response(JSON.stringify({
        success: true,
        message: 'Email received but no matching lead found',
        senderEmail,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build attachments info
    const attachmentsInfo: { name: string; type: string; size: number }[] = [];
    for (let i = 1; i <= attachmentCount; i++) {
      const attachment = formData.get(`attachment${i}`) as File | null;
      if (attachment) {
        attachmentsInfo.push({
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
        });
      }
    }

    // Create snippet from text body (first 200 chars)
    const snippet = textBody.substring(0, 200) + (textBody.length > 200 ? '...' : '');

    // Insert email log with direction 'In'
    const { data: emailLog, error: insertError } = await supabase
      .from('email_logs')
      .insert({
        lead_id: leadId,
        agent_id: matchedAgent?.id || null,
        direction: 'In',
        from_email: senderEmail,
        to_email: recipientEmail,
        subject: subject,
        snippet: snippet,
        body: textBody,
        html_body: htmlBody,
        attachments_json: attachmentsInfo,
        delivery_status: 'delivered',
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Inbound Email Webhook] Error inserting email log:', insertError);
      throw insertError;
    }

    console.log('[Inbound Email Webhook] Successfully logged inbound email:', emailLog.id);

    return new Response(JSON.stringify({
      success: true,
      emailLogId: emailLog.id,
      matchedLeadId: leadId,
      matchedAgentId: matchedAgent?.id || null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Inbound Email Webhook] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
