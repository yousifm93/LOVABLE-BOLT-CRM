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

    const firstName = user.first_name || 'there';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Yellow Header with Lightning Bolt -->
          <tr>
            <td style="background-color: #EAB308; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <span style="font-size: 28px;">⚡</span>
              <span style="color: #1e293b; font-size: 24px; font-weight: 700; margin-left: 8px; vertical-align: middle;">
                Mortgage Bolt
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">
                You were mentioned in a note
              </h2>
              
              <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${mentionerName}</strong> mentioned you in a note on <strong>${leadName || 'a lead'}</strong>:
              </p>
              
              <!-- Note Preview -->
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EAB308;">
                <p style="margin: 0; color: #475569; font-size: 14px; font-style: italic;">
                  "${notePreview}${noteContent && noteContent.length > 200 ? '...' : ''}"
                </p>
              </div>
              
              <!-- CTA Button (Yellow) -->
              <table role="presentation" style="width: 100%; margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${leadUrl}" 
                       style="display: inline-block; padding: 16px 48px; background-color: #EAB308; color: #1e293b; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      View in CRM
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 600;">
                Mortgage Bolt
              </p>
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                848 Brickell Avenue, Suite 840, Miami, FL 33131<br>
                (352) 328-9828
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
        from: { email: 'yousif@mortgagebolt.org', name: 'Mortgage Bolt' },
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
