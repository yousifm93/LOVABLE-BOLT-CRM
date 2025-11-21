import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  primaryEmail: string;
  secondaryEmail?: string;
  customerName: string;
  pdfAttachment: string; // base64 encoded PDF
  fileName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Function invoked with method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function invoked, parsing request body...');
    const body = await req.text();
    console.log('Raw body length:', body.length);

    let parsedBody: EmailRequest;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { primaryEmail, secondaryEmail, customerName, pdfAttachment, fileName } = parsedBody;

    console.log('Request data received:', {
      primaryEmail,
      secondaryEmail,
      customerName,
      fileName,
      attachmentSize: pdfAttachment?.length || 0,
      hasAttachment: !!pdfAttachment
    });

    // Validate required fields with detailed logging
    const missingFields = [];
    if (!primaryEmail) missingFields.push('primaryEmail');
    if (!customerName) missingFields.push('customerName');
    if (!pdfAttachment) missingFields.push('pdfAttachment');
    if (!fileName) missingFields.push('fileName');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.error('Full request body structure:', JSON.stringify(parsedBody, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missingFields,
          received: Object.keys(parsedBody)
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!pdfAttachment || pdfAttachment.length === 0) {
      console.error('PDF attachment is empty or invalid');
      return new Response(
        JSON.stringify({ error: 'PDF attachment is empty or invalid' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending pre-approval email to:", primaryEmail, secondaryEmail ? `and ${secondaryEmail}` : "");

    // Prepare recipient list - avoid duplicates
    const recipients = [primaryEmail];
    if (secondaryEmail && secondaryEmail.trim() && secondaryEmail !== primaryEmail) {
      recipients.push(secondaryEmail);
    }

    console.log('Recipients:', recipients);
    console.log('CC: yousif@mortgagebolt.com');

    // Check if Resend API key exists
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('Resend API key not found');
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Convert base64 to buffer for attachment
    console.log('Converting base64 to buffer...');
    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = Uint8Array.from(atob(pdfAttachment), c => c.charCodeAt(0));
      console.log('PDF attachment prepared, size:', pdfBuffer.length, 'bytes');
    } catch (bufferError) {
      console.error('Error converting base64 to buffer:', bufferError);
      return new Response(
        JSON.stringify({ error: 'Invalid PDF attachment data' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Resend client
    const resend = new Resend(resendApiKey);

    // Send email with PDF attachment using Resend
    console.log('Calling Resend API...');

    const emailResponse = await resend.emails.send({
      from: 'Mortgage Bolt - Yousif Mohamed <onboarding@resend.dev>',
      to: recipients,
      cc: ['yousif@mortgagebolt.com'],
      subject: `Pre-Approval Letter - ${customerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Congrats!</h2>
          <p style="color: #666; line-height: 1.6;">Your pre-approval letter is attached.</p>
          <p style="color: #666; line-height: 1.6;">Please let us know if you have any questions.</p>
          <p style="color: #666; line-height: 1.6;">Best,<br>The Mortgage Bolt Team</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfAttachment
        }
      ]
    });

    console.log('Resend response:', emailResponse);

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      return new Response(
        JSON.stringify({ error: `Resend API failed: ${JSON.stringify(emailResponse.error)}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Email sent successfully via Resend, ID:', emailResponse.data?.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-preapproval-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
