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

// Team member names to exclude from content-based matching
const EXCLUDED_TEAM_NAMES = [
  { first_name: 'yousif', last_name: 'mohamed' },
  { first_name: 'salma', last_name: 'mohamed' },
  { first_name: 'herman', last_name: 'daza' },
  { first_name: 'juan', last_name: 'diego' },
  { first_name: 'ashley', last_name: 'merizio' },
];

// Team member emails to exclude from lead matching
const EXCLUDED_TEAM_EMAILS = [
  'yousif@mortgagebolt.com',
  'yousif@mortgagebolt.org',
  'yousifminc@gmail.com',
  'scenarios@mortgagebolt.org',
  'salma@mortgagebolt.com',
  'salma@mortgagebolt.org',
  'herman@mortgagebolt.com',
  'herman@mortgagebolt.org',
  'juan@mortgagebolt.com',
  'juan@mortgagebolt.org',
  'processing@mortgagebolt.org',
];

// Email addresses to ignore as they are forwarding addresses, not actual senders
const IGNORED_FORWARDING_EMAILS = [
  'yousif@mortgagebolt.com',
  'yousif@mortgagebolt.org',
  'yousifminc@gmail.com',
  'scenarios@mortgagebolt.org',
];

/**
 * Extract the original sender from a forwarded email body
 * Looks for patterns like:
 * - "---------- Forwarded message ---------" followed by "From: Name <email>"
 * - "-------- Original Message --------" followed by "From: Name <email>"
 * - Direct "From:" line at the start of content
 */
function extractForwardedSender(textBody: string, htmlBody: string): string | null {
  const content = textBody || htmlBody || '';
  
  console.log('[extractForwardedSender] Analyzing content for forwarded sender...');
  
  // Patterns to find the original sender in forwarded emails
  const patterns = [
    // Gmail forwarded message format
    /---------- Forwarded message ---------[\s\S]*?From:\s*(?:[^<\n]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
    // Outlook/Generic forwarded message format
    /-------- Original Message --------[\s\S]*?From:\s*(?:[^<\n]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
    // Simple "From:" pattern for forwarded content
    /^From:\s*(?:[^<\n]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/im,
    // Alternative pattern with "From:" after a line break
    /\nFrom:\s*(?:[^<\n]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const extractedEmail = match[1].toLowerCase().trim();
      
      // Make sure we didn't extract a team email (which would be in CC or the forwarder)
      if (!IGNORED_FORWARDING_EMAILS.includes(extractedEmail) && 
          !EXCLUDED_TEAM_EMAILS.includes(extractedEmail)) {
        console.log('[extractForwardedSender] Found original sender:', extractedEmail);
        return extractedEmail;
      } else {
        console.log('[extractForwardedSender] Skipping team email found in forward:', extractedEmail);
      }
    }
  }
  
  console.log('[extractForwardedSender] No original sender found in forwarded content');
  return null;
}

/**
 * Check if a lead matches a team member (should be excluded from matching)
 */
function isTeamMemberLead(lead: { first_name: string | null; last_name: string | null; email: string | null }): boolean {
  // Check by email
  if (lead.email && EXCLUDED_TEAM_EMAILS.includes(lead.email.toLowerCase())) {
    return true;
  }
  
  // Check by name
  const firstName = lead.first_name?.toLowerCase().trim() || '';
  const lastName = lead.last_name?.toLowerCase().trim() || '';
  
  for (const teamMember of EXCLUDED_TEAM_NAMES) {
    if (firstName === teamMember.first_name && lastName === teamMember.last_name) {
      return true;
    }
  }
  
  return false;
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
  // Skip team member leads entirely
  if (isTeamMemberLead(lead)) {
    console.log(`[calculateMatchScore] Skipping team member lead: ${lead.first_name} ${lead.last_name}`);
    return null;
  }

  const subjectLower = subject.toLowerCase();
  const contentLower = emailContent.toLowerCase();
  const combinedContent = `${subject} ${emailContent}`;

  // Escape special regex characters in a string
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // HIGHEST PRIORITY: Check lender loan number - EXACT WORD MATCH ONLY (minimum 5 chars)
  if (lead.lender_loan_number && lead.lender_loan_number.trim().length >= 5) {
    const loanNum = lead.lender_loan_number.trim();
    const loanRegex = new RegExp(`\\b${escapeRegex(loanNum)}\\b`, 'i');
    if (loanRegex.test(combinedContent)) {
      console.log(`[Match] Lead ${lead.id} matched by lender_loan_number: ${loanNum} (PRIORITY)`);
      return { leadId: lead.id, score: 100, matchMethod: 'lender_loan_number' };
    }
  }

  // HIGHEST PRIORITY: Check MB app number - EXACT WORD MATCH ONLY (minimum 5 chars)
  if (lead.mb_loan_number && lead.mb_loan_number.trim().length >= 5) {
    const mbNum = lead.mb_loan_number.trim();
    const mbRegex = new RegExp(`\\b${escapeRegex(mbNum)}\\b`, 'i');
    if (mbRegex.test(combinedContent)) {
      console.log(`[Match] Lead ${lead.id} matched by mb_loan_number: ${mbNum} (PRIORITY)`);
      return { leadId: lead.id, score: 100, matchMethod: 'mb_loan_number' };
    }
  }

  // NEW: Match by last name + partial loan number (at least 5 consecutive digits in subject)
  const lastName = lead.last_name?.trim();
  if (lastName && lastName.length >= 2) {
    const lastNameLower = lastName.toLowerCase();
    
    // Check if last name appears in subject
    if (subjectLower.includes(lastNameLower)) {
      // Look for 5+ consecutive digit sequences in the subject
      const digitMatches = subject.match(/\d{5,}/g) || [];
      
      for (const digits of digitMatches) {
        // Check if any lead's loan number contains these digits
        const loanNum = lead.lender_loan_number?.trim() || '';
        const mbNum = lead.mb_loan_number?.trim() || '';
        
        if ((loanNum && loanNum.includes(digits)) || (mbNum && mbNum.includes(digits))) {
          console.log(`[Match] Lead ${lead.id} matched by last_name + partial_loan_number: ${lastNameLower} + ${digits}`);
          return { leadId: lead.id, score: 90, matchMethod: 'last_name_partial_loan' };
        }
      }
    }
  }

  // Check first name + last name together in SUBJECT ONLY (higher priority - score 80)
  const firstName = lead.first_name?.trim();
  
  if (firstName && lastName && firstName.length >= 2 && lastName.length >= 2) {
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    
    // Subject match is more reliable (score 80)
    if (subjectLower.includes(fullName)) {
      console.log(`[Match] Lead ${lead.id} matched by full_name in subject: ${fullName}`);
      return { leadId: lead.id, score: 80, matchMethod: 'full_name_subject' };
    }
    
    // Body match is less reliable due to CC lists (score 50)
    if (contentLower.includes(fullName)) {
      console.log(`[Match] Lead ${lead.id} matched by full_name in body: ${fullName}`);
      return { leadId: lead.id, score: 50, matchMethod: 'full_name_body' };
    }
  }

  // Check co-borrower first name + last name together in SUBJECT ONLY
  const coFirstName = lead.co_borrower_first_name?.trim();
  const coLastName = lead.co_borrower_last_name?.trim();
  
  if (coFirstName && coLastName && coFirstName.length >= 2 && coLastName.length >= 2) {
    const coFullName = `${coFirstName} ${coLastName}`.toLowerCase();
    
    // Subject match (score 80)
    if (subjectLower.includes(coFullName)) {
      console.log(`[Match] Lead ${lead.id} matched by co_borrower_full_name in subject: ${coFullName}`);
      return { leadId: lead.id, score: 80, matchMethod: 'co_borrower_full_name_subject' };
    }
    
    // Body match (score 50)
    if (contentLower.includes(coFullName)) {
      console.log(`[Match] Lead ${lead.id} matched by co_borrower_full_name in body: ${coFullName}`);
      return { leadId: lead.id, score: 50, matchMethod: 'co_borrower_full_name_body' };
    }
  }

  return null; // No match
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
    
    console.log('[Inbound Email Webhook] From (raw):', fromRaw);
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

    // Extract sender email from header
    let headerSenderEmail = extractEmail(fromRaw) || (envelope.from ? envelope.from.toLowerCase() : '');
    const recipientEmail = envelope.to?.[0]?.toLowerCase() || extractEmail(toRaw);
    
    // Check if the header sender is a forwarding/team address
    const isForwardingAddress = IGNORED_FORWARDING_EMAILS.some(
      ignored => headerSenderEmail.toLowerCase() === ignored.toLowerCase()
    );
    
    // Try to extract the REAL sender from forwarded email content
    let actualSenderEmail = headerSenderEmail;
    let isForwardedEmail = false;
    
    if (isForwardingAddress) {
      console.log('[Inbound Email Webhook] Header sender is a forwarding address:', headerSenderEmail);
      console.log('[Inbound Email Webhook] Attempting to extract original sender from email body...');
      
      const forwardedSender = extractForwardedSender(textBody, htmlBody);
      if (forwardedSender) {
        actualSenderEmail = forwardedSender;
        isForwardedEmail = true;
        console.log('[Inbound Email Webhook] Extracted original sender:', actualSenderEmail);
      } else {
        console.log('[Inbound Email Webhook] Could not extract original sender, will use content-based matching');
        actualSenderEmail = ''; // Clear so we rely on content matching
      }
    }
    
    console.log('[Inbound Email Webhook] Actual sender email:', actualSenderEmail || '(using content matching)');
    console.log('[Inbound Email Webhook] Is forwarded email:', isForwardedEmail);

    // Extract sender name from raw format
    const extractName = (raw: string): string => {
      const match = raw.match(/^([^<]+)</);
      if (match) return match[1].trim();
      return '';
    };
    const senderName = extractName(fromRaw) || actualSenderEmail;

    let leadId: string | null = null;
    let matchedAgent: { id: string } | null = null;
    let matchMethod = 'none';

    // STEP 1: Try to match by actual sender email (only if we have a valid non-team email)
    if (actualSenderEmail && !EXCLUDED_TEAM_EMAILS.includes(actualSenderEmail.toLowerCase())) {
      // Check for lead match
      const { data: matchingLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .or(`email.ilike.%${actualSenderEmail}%,co_borrower_email.ilike.%${actualSenderEmail}%`)
        .limit(1);

      if (matchingLeads?.[0] && !isTeamMemberLead(matchingLeads[0])) {
        leadId = matchingLeads[0].id;
        matchMethod = 'sender_email';
        console.log('[Inbound Email Webhook] Matched lead by sender email:', leadId);
      }

      // Check for lender match
      const { data: matchingLenders } = await supabase
        .from('lenders')
        .select('id, lender_name')
        .ilike('account_executive_email', actualSenderEmail)
        .limit(1);

      if (matchingLenders?.[0]) {
        const lender = matchingLenders[0];
        console.log('[Inbound Email Webhook] Matched lender by sender email:', lender.id);
        
        // Log to email_logs with lender_id (use correct column names)
        try {
          const { error: emailLogError } = await supabase.from('email_logs').insert({
            lender_id: lender.id,
            lead_id: leadId,
            to_email: recipientEmail,
            from_email: actualSenderEmail,
            subject: subject,
            body: textBody,
            html_body: htmlBody,
            direction: 'In',
            delivery_status: 'received',
            timestamp: new Date().toISOString(),
          });
          
          if (emailLogError) {
            console.error('[Inbound Email Webhook] Error logging lender reply email:', emailLogError);
          } else {
            console.log('[Inbound Email Webhook] Successfully logged lender reply email');
          }
        } catch (logError) {
          console.error('[Inbound Email Webhook] Exception logging lender reply:', logError);
        }

        // Update lender record for reply tracking (always attempt even if logging fails)
        try {
          const { error: lenderUpdateError } = await supabase.from('lenders').update({
            last_email_replied: true,
            last_email_replied_at: new Date().toISOString()
          }).eq('id', lender.id);
          
          if (lenderUpdateError) {
            console.error('[Inbound Email Webhook] Error updating lender reply flags:', lenderUpdateError);
          } else {
            console.log('[Inbound Email Webhook] Successfully updated lender reply flags');
          }
        } catch (updateError) {
          console.error('[Inbound Email Webhook] Exception updating lender:', updateError);
        }
      }
    }

    // STEP 2: If no match by sender, try matching by subject/content (ALWAYS do this for forwarded emails)
    if (!leadId) {
      console.log('[Inbound Email Webhook] No sender match, trying content-based matching...');
      
      // Combine subject and body for content searching
      const emailContent = `${subject} ${textBody} ${htmlBody}`;
      
      // Fetch all leads with identifiers to check against content
      // Exclude team member emails from the query
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
          
          console.log('[Inbound Email Webhook] Top matches:', matches.slice(0, 3).map(m => ({
            leadId: m.leadId,
            score: m.score,
            method: m.matchMethod
          })));
          
          // Only accept matches with score >= 50 (at least a full name in body)
          if (bestMatch.score >= 50) {
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

    // STEP 3: Search for matching buyer agent by sender email (only if not a team email)
    if (actualSenderEmail && !EXCLUDED_TEAM_EMAILS.includes(actualSenderEmail.toLowerCase())) {
      const { data: matchingAgents, error: agentError } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, email')
        .ilike('email', `%${actualSenderEmail}%`)
        .limit(1);

      if (agentError) {
        console.error('[Inbound Email Webhook] Error searching agents:', agentError);
      }

      matchedAgent = matchingAgents?.[0] || null;
      console.log('[Inbound Email Webhook] Matched agent:', matchedAgent?.id || 'none');
    }

    // If still no lead found, check if agent has associated leads
    if (!leadId && matchedAgent) {
      const { data: agentLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .or(`buyer_agent_id.eq.${matchedAgent.id},listing_agent_id.eq.${matchedAgent.id}`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (agentLeads?.[0] && !isTeamMemberLead(agentLeads[0])) {
        leadId = agentLeads[0].id;
        matchMethod = 'agent_association';
        console.log('[Inbound Email Webhook] Found lead through agent:', leadId);
      }
    }

    // Check for lender marketing BEFORE potentially returning (so marketing emails get logged even without leads)
    let isLenderMarketing = false;
    let marketingCategory: string | null = null;

    try {
      console.log('[Inbound Email Webhook] Checking for lender marketing...');
      const lenderMarketingResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-lender-marketing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          subject: subject,
          body: textBody,
          htmlBody: htmlBody,
          fromEmail: actualSenderEmail,
        }),
      });

      if (lenderMarketingResponse.ok) {
        const marketingData = await lenderMarketingResponse.json();
        isLenderMarketing = marketingData.isLenderMarketing;
        marketingCategory = marketingData.category;
        console.log('[Inbound Email Webhook] Lender marketing check result:', { isLenderMarketing, marketingCategory });
      }
    } catch (err) {
      console.error('[Inbound Email Webhook] Error checking lender marketing:', err);
    }

    // If no lead found but IS lender marketing, log it anyway with null lead_id
    if (!leadId && isLenderMarketing) {
      console.log('[Inbound Email Webhook] No lead match, but IS lender marketing - logging email');
      
      const snippet = textBody.substring(0, 200) + (textBody.length > 200 ? '...' : '');
      const fromEmailToStore = actualSenderEmail || headerSenderEmail || 'unknown';
      
      const { data: emailLog, error: insertError } = await supabase
        .from('email_logs')
        .insert({
          lead_id: null, // No lead association for marketing emails
          agent_id: matchedAgent?.id || null,
          direction: 'In',
          from_email: fromEmailToStore,
          to_email: recipientEmail,
          subject: subject,
          snippet: snippet,
          body: textBody,
          html_body: htmlBody,
          attachments_json: [],
          delivery_status: 'delivered',
          timestamp: new Date().toISOString(),
          is_lender_marketing: true,
          lender_marketing_category: marketingCategory,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Inbound Email Webhook] Error inserting marketing email log:', insertError);
      } else {
        console.log('[Inbound Email Webhook] Successfully logged lender marketing email:', emailLog?.id);
        
        // Asynchronously extract lender marketing data
        if (emailLog?.id) {
          console.log('[Inbound Email Webhook] Triggering lender data extraction...');
          fetch(`${supabaseUrl}/functions/v1/parse-lender-marketing-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              subject: subject,
              body: textBody,
              htmlBody: htmlBody,
              fromEmail: fromEmailToStore,
              emailLogId: emailLog.id,
            }),
          }).then(response => {
            console.log('[Inbound Email Webhook] Lender data extraction response:', response.status);
          }).catch(err => {
            console.error('[Inbound Email Webhook] Error triggering lender data extraction:', err);
          });

          // Parse email for contact extraction (auto-add contacts from lender marketing)
          try {
            console.log('[Inbound Email Webhook] Triggering contact parsing for lender marketing email...');
            
            const contactParseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-contacts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                emailLogId: emailLog.id,
                emailContent: {
                  from: senderName,
                  fromEmail: fromEmailToStore,
                  subject: subject,
                  body: textBody || htmlBody,
                  date: new Date().toISOString()
                }
              }),
            });

            if (contactParseResponse.ok) {
              const contactData = await contactParseResponse.json();
              if (contactData.count > 0) {
                console.log('[Inbound Email Webhook] Extracted', contactData.count, 'new contacts from lender marketing');
              }
            } else {
              console.log('[Inbound Email Webhook] Contact parsing failed:', await contactParseResponse.text());
            }
          } catch (contactError) {
            console.error('[Inbound Email Webhook] Error parsing contacts:', contactError);
            // Don't fail the webhook if contact parsing fails
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Lender marketing email logged',
        emailLogId: emailLog?.id,
        category: marketingCategory,
        isLenderMarketing: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only proceed if we have a lead to associate with (and not lender marketing)
    if (!leadId) {
      console.log('[Inbound Email Webhook] No matching lead found for email');
      console.log('[Inbound Email Webhook] Subject:', subject);
      console.log('[Inbound Email Webhook] Actual Sender:', actualSenderEmail);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Email received but no matching lead found',
        senderEmail: actualSenderEmail,
        subject,
        isForwarded: isForwardedEmail,
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

    // Store the ACTUAL sender email (extracted from forwarded content if applicable)
    const fromEmailToStore = actualSenderEmail || headerSenderEmail || 'unknown';

    // Insert email log with direction 'In'
    const { data: emailLog, error: insertError } = await supabase
      .from('email_logs')
      .insert({
        lead_id: leadId,
        agent_id: matchedAgent?.id || null,
        direction: 'In',
        from_email: fromEmailToStore,
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
    console.log('[Inbound Email Webhook] From email stored:', fromEmailToStore);

    // Upload attachments to storage and create document records
    if (attachmentCount > 0 && leadId) {
      console.log('[Inbound Email Webhook] Uploading', attachmentCount, 'attachments to documents...');
      
      // Fetch lead name for file naming
      const { data: leadInfo } = await supabase
        .from('leads')
        .select('first_name, last_name')
        .eq('id', leadId)
        .single();
      
      const lastName = leadInfo?.last_name || 'Unknown';
      
      for (let i = 1; i <= attachmentCount; i++) {
        const attachment = formData.get(`attachment${i}`) as File | null;
        if (attachment) {
          try {
            // Generate unique filename
            const timestamp = Date.now();
            const safeName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${leadId}/email-attachments/${safeName}-${lastName}-${timestamp}`;
            
            // Convert File to ArrayBuffer then Uint8Array
            const arrayBuffer = await attachment.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('lead-documents')
              .upload(filePath, uint8Array, {
                contentType: attachment.type,
                upsert: false
              });
            
            if (uploadError) {
              console.error('[Inbound Email Webhook] Upload error for', attachment.name, ':', uploadError);
              continue;
            }
            
            // Get signed URL (1 year expiration) since bucket is private
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('lead-documents')
              .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year in seconds
            
            if (signedUrlError) {
              console.error('[Inbound Email Webhook] Signed URL error:', signedUrlError);
              continue;
            }
            
            // Create document record - store storage PATH, not signed URL
            // The signed URL will be generated fresh when viewing/downloading
            const { error: docError } = await supabase.from('documents').insert({
              lead_id: leadId,
              file_name: `${attachment.name}-${lastName}`,
              file_url: filePath, // Store just the storage path, not the signed URL
              mime_type: attachment.type,
              size_bytes: attachment.size,
              uploaded_by: '08e73d69-4707-4773-84a4-69ce2acd6a11', // System user (Yousif)
              notes: `Received via email: ${subject}`,
              status: 'pending',
            });
            
            if (docError) {
              console.error('[Inbound Email Webhook] Document record error:', docError);
            } else {
              console.log('[Inbound Email Webhook] Uploaded attachment:', attachment.name);
            }
          } catch (attachError) {
            console.error('[Inbound Email Webhook] Error uploading attachment:', attachError);
          }
        }
      }
    }

    // Generate AI summary asynchronously (don't block the response)
    try {
      const summaryResponse = await fetch(`${supabaseUrl}/functions/v1/summarize-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          subject: subject,
          body: textBody,
          htmlBody: htmlBody,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.summary) {
          // Update the email log with the AI summary
          await supabase
            .from('email_logs')
            .update({ ai_summary: summaryData.summary })
            .eq('id', emailLog.id);
          console.log('[Inbound Email Webhook] AI summary added:', summaryData.summary);
        }
      } else {
        console.log('[Inbound Email Webhook] Failed to generate AI summary:', await summaryResponse.text());
      }
    } catch (summaryError) {
      console.error('[Inbound Email Webhook] Error generating AI summary:', summaryError);
      // Don't fail the webhook if summary generation fails
    }

    // Parse email for field update suggestions
    // SKIP field parsing for internal @mortgagebolt.com emails
    const isMortgageBoltEmail = fromEmailToStore.toLowerCase().includes('@mortgagebolt.com');
    
    // ACTIVE PIPELINE STAGE ID - only generate suggestions for leads in Active pipeline
    const ACTIVE_PIPELINE_ID = '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
    
    if (isMortgageBoltEmail) {
      console.log('[Inbound Email Webhook] Skipping field suggestions for internal team email from:', fromEmailToStore);
    } else {
      try {
        // Fetch current lead data for context - include pipeline_stage_id for filtering
        const { data: leadData } = await supabase
          .from('leads')
          .select('pipeline_stage_id, loan_status, appraisal_status, title_status, hoi_status, condo_status, disclosure_status, cd_status, package_status, epo_status, interest_rate, lock_expiration_date, close_date, discount_points, loan_amount, sales_price, appraisal_value, program, property_taxes, homeowners_insurance, total_monthly_income, escrows, occupancy, loan_type, cash_to_close, property_type, dscr_ratio, fico_score, term, prepayment_penalty, appr_date_time')
          .eq('id', leadId)
          .single();

        // ONLY generate suggestions for leads in Active pipeline
        if (!leadData || leadData.pipeline_stage_id !== ACTIVE_PIPELINE_ID) {
          console.log('[Inbound Email Webhook] Skipping field suggestions - lead not in Active pipeline. Stage:', leadData?.pipeline_stage_id);
        } else {
          // Field name mapping: AI parser field names -> database column names
          const fieldNameMap: Record<string, string> = {
            'loan_program': 'program',
            'monthly_taxes': 'property_taxes',
            'monthly_insurance': 'homeowners_insurance',
            'insurance_amount': 'homeowners_insurance',
            'transaction_type': 'loan_type',
            'escrow': 'escrows',
            'appraisal_date_time': 'appr_date_time',
          };

          const fieldUpdateResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-field-updates`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              subject: subject,
              body: textBody,
              htmlBody: htmlBody,
              leadId: leadId,
              currentLeadData: leadData,
            }),
          });

          if (fieldUpdateResponse.ok) {
            const fieldUpdateData = await fieldUpdateResponse.json();
            if (fieldUpdateData.suggestions && fieldUpdateData.suggestions.length > 0) {
              console.log('[Inbound Email Webhook] Field update suggestions:', fieldUpdateData.suggestions.length);
              
              // Insert suggestions into database
              for (const suggestion of fieldUpdateData.suggestions) {
                // Map AI field name to database column name
                const mappedFieldName = fieldNameMap[suggestion.field_name] || suggestion.field_name;
                const currentValue = leadData?.[mappedFieldName as keyof typeof leadData]?.toString() || null;
                
                // Skip suggestions where current value equals suggested value
                if (currentValue && currentValue === suggestion.suggested_value) {
                  console.log(`[Inbound Email Webhook] Skipping suggestion for ${suggestion.field_name}: value already set to ${currentValue}`);
                  continue;
                }
                
                await supabase
                  .from('email_field_suggestions')
                  .insert({
                    email_log_id: emailLog.id,
                    lead_id: leadId,
                    field_name: suggestion.field_name,
                    field_display_name: suggestion.field_display_name,
                    current_value: currentValue,
                    suggested_value: suggestion.suggested_value,
                    reason: suggestion.reason,
                    confidence: suggestion.confidence || 0.8,
                    status: 'pending',
                  });
              }
              console.log('[Inbound Email Webhook] Inserted field update suggestions');
            }
          } else {
            console.log('[Inbound Email Webhook] Failed to parse field updates:', await fieldUpdateResponse.text());
          }
        }
      } catch (fieldUpdateError) {
        console.error('[Inbound Email Webhook] Error parsing field updates:', fieldUpdateError);
        // Don't fail the webhook if field update parsing fails
      }

    // Parse email for lender marketing content (applies to ALL emails, including those without leads)
    try {
      const lenderMarketingResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-lender-marketing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          subject: subject,
          body: textBody,
          htmlBody: htmlBody,
          fromEmail: fromEmailToStore,
          emailLogId: emailLog.id,
        }),
      });

      if (lenderMarketingResponse.ok) {
        const lenderMarketingData = await lenderMarketingResponse.json();
        if (lenderMarketingData.isLenderMarketing) {
          console.log('[Inbound Email Webhook] Email tagged as lender marketing:', lenderMarketingData.category);
        }
      } else {
        console.log('[Inbound Email Webhook] Failed to parse lender marketing:', await lenderMarketingResponse.text());
      }
    } catch (lenderMarketingError) {
      console.error('[Inbound Email Webhook] Error parsing lender marketing:', lenderMarketingError);
      // Don't fail the webhook if lender marketing parsing fails
    }

    // Parse email for contact extraction (auto-add contacts)
    try {
      console.log('[Inbound Email Webhook] Triggering contact parsing...');
      
      const contactParseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          emailLogId: emailLog.id,
          emailContent: {
            from: senderName,
            fromEmail: fromEmailToStore,
            subject: subject,
            body: textBody || htmlBody,
            date: new Date().toISOString()
          }
        }),
      });

      if (contactParseResponse.ok) {
        const contactData = await contactParseResponse.json();
        if (contactData.count > 0) {
          console.log('[Inbound Email Webhook] Extracted', contactData.count, 'new contacts');
        }
      } else {
        console.log('[Inbound Email Webhook] Contact parsing failed:', await contactParseResponse.text());
      }
    } catch (contactError) {
      console.error('[Inbound Email Webhook] Error parsing contacts:', contactError);
      // Don't fail the webhook if contact parsing fails
    }
    }

    return new Response(JSON.stringify({
      success: true,
      emailLogId: emailLog.id,
      matchedLeadId: leadId,
      matchedAgentId: matchedAgent?.id || null,
      matchMethod,
      isForwarded: isForwardedEmail,
      actualSender: fromEmailToStore,
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
