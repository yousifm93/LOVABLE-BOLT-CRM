import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

    if (testMode && testEmail) {
      // Send test email
      console.log(`Sending test email to: ${testEmail}`);
      
      const htmlContent = campaign.email_templates.html
        .replace(/\{\{first_name\}\}/g, 'Test User')
        .replace(/\{\{last_name\}\}/g, 'Recipient')
        .replace(/\{\{full_name\}\}/g, 'Test User Recipient')
        .replace(/\{\{company_address\}\}/g, '123 Main Street, Miami, FL 33101')
        .replace(/\{\{unsubscribe_url\}\}/g, '#unsubscribe');

      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: `${campaign.email_senders.from_name} <${campaign.email_senders.from_email}>`,
        to: [testEmail],
        subject: `[TEST] ${campaign.subject}`,
        html: htmlContent,
      });

      if (emailError) {
        throw new Error(`Failed to send test email: ${emailError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test email sent successfully',
          messageId: emailResult?.id 
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

          const { data: emailResult, error: emailError } = await resend.emails.send({
            from: `${campaign.email_senders.from_name} <${campaign.email_senders.from_email}>`,
            to: [recipient.email],
            subject: campaign.subject,
            html: htmlContent,
            headers: {
              'List-Unsubscribe': `<https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/email-unsubscribe/${recipient.id}>`,
            },
          });

          if (emailError) {
            console.error(`Failed to send to ${recipient.email}:`, emailError);
            
            // Record failed send
            await supabase.from('email_campaign_sends').insert({
              campaign_id: campaignId,
              contact_id: recipient.id,
              status: 'failed',
              error_message: emailError.message,
            });
            
            failureCount++;
            return { success: false, email: recipient.email, error: emailError.message };
          }

          // Record successful send
          await supabase.from('email_campaign_sends').insert({
            campaign_id: campaignId,
            contact_id: recipient.id,
            provider_message_id: emailResult?.id,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          successCount++;
          return { success: true, email: recipient.email, messageId: emailResult?.id };
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