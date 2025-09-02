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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const contactId = pathParts[pathParts.length - 1];

    if (!contactId) {
      throw new Error('Contact ID is required');
    }

    console.log(`Processing unsubscribe request for contact: ${contactId}`);

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('email_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found');
    }

    // Mark contact as unsubscribed
    const { error: updateError } = await supabase
      .from('email_contacts')
      .update({ 
        unsubscribed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      throw new Error(`Failed to unsubscribe: ${updateError.message}`);
    }

    // Update all list memberships
    const { error: membershipError } = await supabase
      .from('email_list_memberships')
      .update({ 
        subscribed: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('contact_id', contactId);

    if (membershipError) {
      console.error('Error updating memberships:', membershipError);
    }

    // Add to global suppressions
    const { error: suppressionError } = await supabase
      .from('email_suppressions')
      .upsert({
        email: contact.email,
        reason: 'unsubscribe',
      });

    if (suppressionError) {
      console.error('Error adding to suppressions:', suppressionError);
    }

    console.log(`Successfully unsubscribed contact: ${contact.email}`);

    // Return a user-friendly HTML page
    const unsubscribePage = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed - MortgageBolt</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #f9fafb;
            color: #374151;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #fbbf24;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 24px;
            font-weight: bold;
            color: black;
          }
          h1 {
            color: #111827;
            margin-bottom: 16px;
          }
          .email {
            background: #f3f4f6;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: monospace;
            color: #6b7280;
            display: inline-block;
            margin: 16px 0;
          }
          .success-message {
            color: #059669;
            background: #d1fae5;
            padding: 12px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">MB</div>
          <h1>You've been unsubscribed</h1>
          <div class="success-message">
            ✓ Successfully unsubscribed from MortgageBolt email marketing
          </div>
          <p>We've removed the following email address from our mailing lists:</p>
          <div class="email">${contact.email}</div>
          <p>You will no longer receive marketing emails from MortgageBolt.</p>
          <p>If you have any questions or need assistance, please contact our support team.</p>
          <div class="footer">
            <p>MortgageBolt<br>
            123 Main Street<br>
            Miami, FL 33101</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(unsubscribePage, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error('Error processing unsubscribe:', error);

    const errorPage = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribe Error - MortgageBolt</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #f9fafb;
            color: #374151;
            text-align: center;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .error-message {
            color: #dc2626;
            background: #fee2e2;
            padding: 12px;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Unsubscribe Error</h1>
          <div class="error-message">
            Unable to process unsubscribe request. Please contact support.
          </div>
          <p>Error: ${error.message}</p>
        </div>
      </body>
      </html>
    `;
    
    return new Response(errorPage, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders
      }
    });
  }
});