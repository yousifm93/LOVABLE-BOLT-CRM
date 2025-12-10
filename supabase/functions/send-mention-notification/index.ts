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
    const { mentionedUserId, mentionerName, noteContent, leadId, leadName, noteId } = await req.json();
    
    if (!mentionedUserId || !mentionerName || !leadId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the mentioned user's email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name')
      .eq('id', mentionedUserId)
      .single();

    if (userError || !user?.email) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Could not find user email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a clean preview of the note content
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').substring(0, 200);
    const notePreview = stripHtml(noteContent || '');

    // Build the CRM URL
    const appUrl = Deno.env.get('APP_URL') || 'https://bolt-crm.lovable.app';
    const leadUrl = `${appUrl}/active?lead=${leadId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .note-preview { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .btn { display: inline-block; background-color: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">You were mentioned in a note</h2>
          </div>
          <div class="content">
            <p>Hi ${user.first_name || 'there'},</p>
            <p><strong>${mentionerName}</strong> mentioned you in a note on <strong>${leadName || 'a lead'}</strong>:</p>
            
            <div class="note-preview">
              ${notePreview}${noteContent && noteContent.length > 200 ? '...' : ''}
            </div>
            
            <a href="${leadUrl}" class="btn">View in CRM</a>
            
            <div class="footer">
              <p>This is an automated notification from Mortgage Bolt CRM.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: user.email }],
        }],
        from: { email: 'yousif@mortgagebolt.org', name: 'Mortgage Bolt CRM' },
        subject: `${mentionerName} mentioned you in a note`,
        content: [{ type: 'text/html', value: emailHtml }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Mention notification sent successfully to:', user.email);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-mention-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});