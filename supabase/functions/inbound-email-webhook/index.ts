import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadMatch {
  leadId: string;
  score: number;
  matchMethod: string;
}

function calculateMatchScore(
  lead: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    lender_loan_number: string | null;
    mb_loan_number: string | null;
    co_borrower_email: string | null;
    co_borrower_first_name: string | null;
    co_borrower_last_name: string | null;
  },
  subject: string,
  emailContent: string
): LeadMatch | null {
  const subjectLower = subject.toLowerCase();
  const contentLower = emailContent.toLowerCase();
  
  let score = 0;
  const matchMethods: string[] = [];

  // Check lender loan number (100 points - most specific)
  if (lead.lender_loan_number && lead.lender_loan_number.trim()) {
    const loanNum = lead.lender_loan_number.trim();
    if (subjectLower.includes(loanNum.toLowerCase()) || contentLower.includes(loanNum.toLowerCase())) {
      score += 100;
      matchMethods.push('lender_loan_number');
    }
  }

  // Check MB app number (100 points - most specific)
  if (lead.mb_loan_number && lead.mb_loan_number.trim()) {
    const mbNum = lead.mb_loan_number.trim();
    if (subjectLower.includes(mbNum.toLowerCase()) || contentLower.includes(mbNum.toLowerCase())) {
      score += 100;
      matchMethods.push('mb_loan_number');
    }
  }

  // Check borrower email in content (80 points)
  if (lead.email && lead.email.trim()) {
    const email = lead.email.trim().toLowerCase();
    if (contentLower.includes(email)) {
      score += 80;
      matchMethods.push('email_in_content');
    }
  }

  // Check co-borrower email in content (80 points)
  if (lead.co_borrower_email && lead.co_borrower_email.trim()) {
    const coEmail = lead.co_borrower_email.trim().toLowerCase();
    if (contentLower.includes(coEmail)) {
      score += 80;
      matchMethods.push('co_borrower_email_in_content');
    }
  }

  // Check first name + last name together (60 points)
  const firstName = lead.first_name?.trim().toLowerCase();
  const lastName = lead.last_name?.trim().toLowerCase();
  
  if (firstName && lastName && firstName.length >= 2 && lastName.length >= 2) {
    const fullName = `${firstName} ${lastName}`;
    if (subjectLower.includes(fullName) || contentLower.includes(fullName)) {
      score += 60;
      matchMethods.push('full_name');
    } else {
      // Check last name only in subject (30 points) - more specific
      if (lastName.length >= 3 && subjectLower.includes(lastName)) {
        score += 30;
        matchMethods.push('last_name_in_subject');
      }
      // Check first name only in subject (10 points) - less specific, common names
      if (firstName.length >= 3 && subjectLower.includes(firstName)) {
        score += 10;
        matchMethods.push('first_name_in_subject');
      }
    }
  }

  // Check co-borrower first name + last name together (50 points)
  const coFirstName = lead.co_borrower_first_name?.trim().toLowerCase();
  const coLastName = lead.co_borrower_last_name?.trim().toLowerCase();
  
  if (coFirstName && coLastName && coFirstName.length >= 2 && coLastName.length >= 2) {
    const coFullName = `${coFirstName} ${coLastName}`;
    if (subjectLower.includes(coFullName) || contentLower.includes(coFullName)) {
      score += 50;
      matchMethods.push('co_borrower_full_name');
    }
  }

  if (score > 0) {
    return {
      leadId: lead.id,
      score,
      matchMethod: matchMethods.join(', ')
    };
  }

  return null;
}

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

    let leadId: string | null = null;
    let matchedAgent: { id: string } | null = null;
    let matchMethod = 'none';

    // STEP 1: Try to match by sender email (existing behavior)
    const { data: matchingLeads, error: leadError } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email')
      .or(`email.ilike.%${senderEmail}%,co_borrower_email.ilike.%${senderEmail}%`)
      .limit(1);

    if (leadError) {
      console.error('[Inbound Email Webhook] Error searching leads by sender:', leadError);
    }

    if (matchingLeads?.[0]) {
      leadId = matchingLeads[0].id;
      matchMethod = 'sender_email';
      console.log('[Inbound Email Webhook] Matched lead by sender email:', leadId);
    }

    // STEP 2: If no match by sender, try matching by subject/content
    if (!leadId) {
      console.log('[Inbound Email Webhook] No sender match, trying content-based matching...');
      
      // Combine subject and body for content searching
      const emailContent = `${subject} ${textBody} ${htmlBody}`;
      
      // Fetch all leads with identifiers to check against content
      const { data: allLeads, error: allLeadsError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, lender_loan_number, mb_loan_number, co_borrower_email, co_borrower_first_name, co_borrower_last_name')
        .or('first_name.neq.,last_name.neq.,lender_loan_number.neq.,mb_loan_number.neq.');

      if (allLeadsError) {
        console.error('[Inbound Email Webhook] Error fetching leads for content matching:', allLeadsError);
      }

      if (allLeads && allLeads.length > 0) {
        const matches: LeadMatch[] = [];
        
        for (const lead of allLeads) {
          const match = calculateMatchScore(lead, subject, emailContent);
          if (match) {
            matches.push(match);
          }
        }

        // Sort by score descending and take the best match
        if (matches.length > 0) {
          matches.sort((a, b) => b.score - a.score);
          const bestMatch = matches[0];
          
          // Only accept matches with score >= 30 (at least a last name in subject)
          if (bestMatch.score >= 30) {
            leadId = bestMatch.leadId;
            matchMethod = bestMatch.matchMethod;
            console.log('[Inbound Email Webhook] Content match found:', {
              leadId,
              score: bestMatch.score,
              matchMethod
            });
          } else {
            console.log('[Inbound Email Webhook] Best match score too low:', bestMatch.score);
          }
        } else {
          console.log('[Inbound Email Webhook] No content matches found');
        }
      }
    }

    // STEP 3: Search for matching buyer agent by sender email
    const { data: matchingAgents, error: agentError } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, email')
      .ilike('email', `%${senderEmail}%`)
      .limit(1);

    if (agentError) {
      console.error('[Inbound Email Webhook] Error searching agents:', agentError);
    }

    matchedAgent = matchingAgents?.[0] || null;
    console.log('[Inbound Email Webhook] Matched agent:', matchedAgent?.id || 'none');

    // If still no lead found, check if agent has associated leads
    if (!leadId && matchedAgent) {
      const { data: agentLeads } = await supabase
        .from('leads')
        .select('id')
        .or(`buyer_agent_id.eq.${matchedAgent.id},listing_agent_id.eq.${matchedAgent.id}`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (agentLeads?.[0]) {
        leadId = agentLeads[0].id;
        matchMethod = 'agent_association';
        console.log('[Inbound Email Webhook] Found lead through agent:', leadId);
      }
    }

    // Only proceed if we have a lead to associate with
    if (!leadId) {
      console.log('[Inbound Email Webhook] No matching lead found for email');
      console.log('[Inbound Email Webhook] Subject:', subject);
      console.log('[Inbound Email Webhook] Sender:', senderEmail);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Email received but no matching lead found',
        senderEmail,
        subject,
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
    console.log('[Inbound Email Webhook] Match method:', matchMethod);

    return new Response(JSON.stringify({
      success: true,
      emailLogId: emailLog.id,
      matchedLeadId: leadId,
      matchedAgentId: matchedAgent?.id || null,
      matchMethod,
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
