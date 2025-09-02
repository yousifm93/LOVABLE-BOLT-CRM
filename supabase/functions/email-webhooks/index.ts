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

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    tags?: any[];
    headers?: Record<string, string>;
    [key: string]: any;
  };
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
    const payload: ResendWebhookPayload = await req.json();
    
    console.log('Received webhook:', payload.type, 'for email:', payload.data.email_id);

    const { type, data, created_at } = payload;
    const emailId = data.email_id;

    if (!emailId) {
      console.warn('No email_id in webhook payload');
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Find the campaign send record by provider_message_id
    const { data: sendRecord, error: sendError } = await supabase
      .from('email_campaign_sends')
      .select('*, email_campaigns(*)')
      .eq('provider_message_id', emailId)
      .single();

    if (sendError || !sendRecord) {
      console.warn(`No send record found for email_id: ${emailId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Map webhook types to our event types
    const eventTypeMapping: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounce',
      'email.complained': 'spam',
      'email.clicked': 'click',
      'email.opened': 'open',
    };

    const eventType = eventTypeMapping[type];

    if (!eventType) {
      console.warn(`Unknown webhook type: ${type}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Update send status for delivered events
    if (eventType === 'delivered') {
      await supabase
        .from('email_campaign_sends')
        .update({ 
          status: 'delivered', 
          delivered_at: new Date(created_at).toISOString() 
        })
        .eq('id', sendRecord.id);
    }

    // Record the event
    const { error: eventError } = await supabase
      .from('email_events')
      .insert({
        campaign_id: sendRecord.campaign_id,
        contact_id: sendRecord.contact_id,
        type: eventType,
        meta: {
          provider_data: data,
          webhook_type: type,
          occurred_at: created_at,
          user_agent: data.headers?.['user-agent'],
          ip_address: data.headers?.['x-forwarded-for']
        },
        occurred_at: new Date(created_at).toISOString()
      });

    if (eventError) {
      console.error('Error recording event:', eventError);
    }

    // Handle special event types
    switch (eventType) {
      case 'bounce':
        // Add email to suppressions for hard bounces
        if (data.reason && data.reason.includes('permanent')) {
          const { error: suppressError } = await supabase
            .from('email_suppressions')
            .upsert({
              email: data.to[0],
              reason: 'bounce',
            });

          if (suppressError) {
            console.error('Error adding bounce suppression:', suppressError);
          }
        }
        break;

      case 'spam':
        // Add email to suppressions for spam complaints
        const { error: spamSuppressionError } = await supabase
          .from('email_suppressions')
          .upsert({
            email: data.to[0],
            reason: 'spam',
          });

        if (spamSuppressionError) {
          console.error('Error adding spam suppression:', spamSuppressionError);
        }
        break;

      case 'click':
        // Log activity to CRM if enabled
        try {
          const { data: contact } = await supabase
            .from('email_contacts')
            .select('object_type, object_id')
            .eq('id', sendRecord.contact_id)
            .single();

          if (contact?.object_type === 'lead' && contact.object_id) {
            // Create activity log entry for the lead
            // This would integrate with your existing activity logging system
            console.log(`Contact clicked email - Lead ID: ${contact.object_id}`);
          }
        } catch (error) {
          console.error('Error logging CRM activity:', error);
        }
        break;
    }

    console.log(`Successfully processed ${eventType} event for campaign ${sendRecord.campaign_id}`);

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