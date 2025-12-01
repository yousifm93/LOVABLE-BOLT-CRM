import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface CampaignSendRequest {
  campaignId: string;
  testMode?: boolean;
  testEmail?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, testMode = false, testEmail } = await req.json() as CampaignSendRequest;

    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    console.log(`Processing campaign send request for campaign: ${campaignId}, testMode: ${testMode}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(*),
        email_senders(*),
        email_lists(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      throw new Error("SendGrid API key not configured");
    }

    if (testMode && testEmail) {
      // Send test email
      console.log(`Sending test email to: ${testEmail}`);
      
      const htmlContent = campaign.email_templates.html
        .replace(/\{\{first_name\}\}/g, 'Test User')
        .replace(/\{\{last_name\}\}/g, 'Recipient')
        .replace(/\{\{full_name\}\}/g, 'Test User Recipient')
        .replace(/\{\{company_address\}\}/g, '123 Main Street, Miami, FL 33101')
        .replace(/\{\{unsubscribe_url\}\}/g, '#unsubscribe');

      const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: testEmail }]
          }],
          from: { 
            email: "yousif@mortgagebolt.com", 
            name: campaign.email_senders.from_name 
          },
          subject: `[TEST] ${campaign.subject}`,
          content: [{ type: "text/html", value: htmlContent }],
        }),
      });

      if (!sendGridResponse.ok) {
        const errorText = await sendGridResponse.text();
        throw new Error(`SendGrid API error: ${sendGridResponse.status} - ${errorText}`);
      }

      const messageId = sendGridResponse.headers.get('X-Message-Id') || `sg-test-${Date.now()}`;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test email sent successfully',
          messageId 
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Production send - get recipients
    let query = supabase
      .from('email_list_memberships')
      .select(`
        email_contacts(*)
      `)
      .eq('list_id', campaign.list_id)
      .eq('subscribed', true);

    // Apply segment filtering if specified
    if (campaign.segment_id) {
      const { data: segment } = await supabase
        .from('email_segments')
        .select('rules_json')
        .eq('id', campaign.segment_id)
        .single();

      if (segment?.rules_json) {
        // Apply segment rules (simplified implementation)
        console.log('Applying segment rules:', segment.rules_json);
      }
    }

    const { data: memberships, error: recipientsError } = await query;

    if (recipientsError) {
      throw new Error(`Failed to get recipients: ${recipientsError.message}`);
    }

    const recipients = memberships
      ?.map(m => m.email_contacts)
      .filter(contact => contact && !contact.unsubscribed) || [];

    console.log(`Found ${recipients.length} recipients for campaign ${campaignId}`);

    // Check for suppressed emails
    const emails = recipients.map(r => r.email);
    const { data: suppressions } = await supabase
      .from('email_suppressions')
      .select('email')
      .in('email', emails);

    const suppressedEmails = new Set(suppressions?.map(s => s.email) || []);
    const validRecipients = recipients.filter(r => !suppressedEmails.has(r.email));

    console.log(`Sending to ${validRecipients.length} valid recipients (${suppressedEmails.size} suppressed)`);

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'sending', 
        started_at: new Date().toISOString(),
        totals_json: { total_recipients: validRecipients.length }
      })
      .eq('id', campaignId);

    let successCount = 0;
    let failureCount = 0;

    // Send emails in batches (rate limiting)
    const BATCH_SIZE = 10;
    const DELAY_MS = 5000; // 5 second delay between batches

    for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
      const batch = validRecipients.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          // Personalize content
          const htmlContent = campaign.email_templates.html
            .replace(/\{\{first_name\}\}/g, recipient.first_name || 'Friend')
            .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
            .replace(/\{\{full_name\}\}/g, `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Friend')
            .replace(/\{\{city\}\}/g, recipient.city || '')
            .replace(/\{\{state\}\}/g, recipient.state || '')
            .replace(/\{\{company_address\}\}/g, '123 Main Street, Miami, FL 33101')
            .replace(/\{\{unsubscribe_url\}\}/g, `https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/email-unsubscribe/${recipient.id}`);

          const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: recipient.email }]
              }],
              from: { 
                email: "yousif@mortgagebolt.com", 
                name: campaign.email_senders.from_name 
              },
              subject: campaign.subject,
              content: [{ type: "text/html", value: htmlContent }],
              custom_args: {
                campaign_id: campaignId,
                contact_id: recipient.id
              }
            }),
          });

          if (!sendGridResponse.ok) {
            const errorText = await sendGridResponse.text();
            console.error(`Failed to send to ${recipient.email}:`, errorText);
            
            // Record failed send
            await supabase.from('email_campaign_sends').insert({
              campaign_id: campaignId,
              contact_id: recipient.id,
              status: 'failed',
              error_message: errorText,
            });
            
            failureCount++;
            return { success: false, email: recipient.email, error: errorText };
          }

          const messageId = sendGridResponse.headers.get('X-Message-Id') || `sg-${Date.now()}`;

          // Record successful send
          await supabase.from('email_campaign_sends').insert({
            campaign_id: campaignId,
            contact_id: recipient.id,
            provider_message_id: messageId,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          successCount++;
          return { success: true, email: recipient.email, messageId };
        } catch (error) {
          console.error(`Error sending to ${recipient.email}:`, error);
          failureCount++;
          return { success: false, email: recipient.email, error: error.message };
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < validRecipients.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    // Update campaign completion
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'sent',
        completed_at: new Date().toISOString(),
        totals_json: { 
          total_recipients: validRecipients.length,
          sent: successCount,
          failed: failureCount
        }
      })
      .eq('id', campaignId);

    console.log(`Campaign ${campaignId} completed: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        campaignId,
        totalRecipients: validRecipients.length,
        sent: successCount,
        failed: failureCount,
        message: `Campaign sent successfully to ${successCount} recipients`
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in email campaign send:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});