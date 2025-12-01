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

interface SendGridWebhookEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_message_id?: string;
  sg_event_id?: string;
  campaign_id?: string;
  contact_id?: string;
  reason?: string;
  url?: string;
  useragent?: string;
  ip?: string;
  [key: string]: any;
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
    const events: SendGridWebhookEvent[] = await req.json();
    
    console.log(`Received ${events.length} webhook events from SendGrid`);

    for (const event of events) {
      console.log('Processing webhook event:', event.event, 'for email:', event.email);

      const { event: eventType, sg_message_id, timestamp, campaign_id, contact_id } = event;
      const messageId = sg_message_id;

      if (!messageId) {
        console.warn('No message ID in webhook event');
        continue;
      }

      // Find the campaign send record by provider_message_id
      const { data: sendRecord } = await supabase
        .from('email_campaign_sends')
        .select('*, email_campaigns(*)')
        .eq('provider_message_id', messageId)
        .maybeSingle();

      // Also check for template emails in email_logs
      const { data: emailLog } = await supabase
        .from('email_logs')
        .select('*')
        .eq('provider_message_id', messageId)
        .maybeSingle();

      if (!sendRecord && !emailLog) {
        console.warn(`No send record or email log found for message_id: ${messageId}`);
        continue;
      }

      const campaignSend = sendRecord || null;

      // Map SendGrid event types to our event types
      const eventTypeMapping: Record<string, string> = {
        'delivered': 'delivered',
        'bounce': 'bounce',
        'dropped': 'bounce',
        'spamreport': 'spam',
        'click': 'click',
        'open': 'open',
      };

      const mappedEventType = eventTypeMapping[eventType];

      if (!mappedEventType) {
        console.warn(`Unknown webhook event type: ${eventType}`);
        continue;
      }

      const occurredAt = new Date(timestamp * 1000).toISOString();

      // Update send status for campaign emails
      if (mappedEventType === 'delivered' && campaignSend) {
        await supabase
          .from('email_campaign_sends')
          .update({ 
            status: 'delivered', 
            delivered_at: occurredAt
          })
          .eq('id', campaignSend.id);
      }

      // Update email_logs for template emails
      if (emailLog) {
        const updates: any = {};
        
        if (mappedEventType === 'delivered') {
          updates.delivery_status = 'delivered';
        } else if (mappedEventType === 'bounce') {
          updates.delivery_status = 'bounced';
          updates.bounced_at = occurredAt;
          updates.error_details = event.reason || 'Bounced';
        } else if (mappedEventType === 'spam') {
          updates.delivery_status = 'complained';
        } else if (mappedEventType === 'open') {
          updates.opened_at = occurredAt;
        } else if (mappedEventType === 'click') {
          updates.clicked_at = occurredAt;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('email_logs')
            .update(updates)
            .eq('id', emailLog.id);
        }
      }

      // Record the event for campaign emails
      if (campaignSend) {
        await supabase
          .from('email_events')
          .insert({
            campaign_id: campaignSend.campaign_id,
            contact_id: campaignSend.contact_id,
            type: mappedEventType,
            meta: {
              provider_data: event,
              webhook_type: eventType,
              occurred_at: occurredAt,
              user_agent: event.useragent,
              ip_address: event.ip,
              url: event.url
            },
            occurred_at: occurredAt
          });
      }

      // Handle special event types
      switch (mappedEventType) {
        case 'bounce':
          // Add email to suppressions for bounces
          await supabase
            .from('email_suppressions')
            .upsert({
              email: event.email,
              reason: 'bounce',
            }, {
              onConflict: 'email'
            });
          break;

        case 'spam':
          // Add email to suppressions for spam complaints
          await supabase
            .from('email_suppressions')
            .upsert({
              email: event.email,
              reason: 'spam',
            }, {
              onConflict: 'email'
            });
          break;

        case 'click':
          // Log activity to CRM if enabled
          if (campaignSend) {
            try {
              const { data: contact } = await supabase
                .from('email_contacts')
                .select('object_type, object_id')
                .eq('id', campaignSend.contact_id)
                .single();

              if (contact?.object_type === 'lead' && contact.object_id) {
                console.log(`Contact clicked email - Lead ID: ${contact.object_id}`);
              }
            } catch (error) {
              console.error('Error logging CRM activity:', error);
            }
          }
          break;
      }

      console.log(`Successfully processed ${mappedEventType} event for ${campaignSend ? `campaign ${campaignSend.campaign_id}` : `email ${messageId}`}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
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