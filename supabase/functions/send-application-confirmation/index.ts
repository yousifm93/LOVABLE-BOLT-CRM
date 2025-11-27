import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  borrowerEmail: string;
  borrowerName: string;
  loanPurpose: string;
  propertyType: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Application confirmation email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { borrowerEmail, borrowerName, loanPurpose, propertyType }: ConfirmationEmailRequest = await req.json();

    console.log('Sending confirmation email to:', borrowerEmail);

    if (!borrowerEmail || !borrowerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: borrowerEmail and borrowerName' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('Resend API key not found');
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: 'Mortgage Bolt - Yousif Mohamed <onboarding@resend.dev>',
      to: [borrowerEmail],
      cc: ['hello@mortgagebolt.com'],
      subject: 'Thank You for Your Mortgage Application',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Thank You, ${borrowerName}!</h2>
          <p style="color: #666; line-height: 1.6;">
            We have received your mortgage application for a <strong>${loanPurpose}</strong> 
            on a <strong>${propertyType}</strong> property.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Your application is being reviewed, and a member of our team will be in contact with you shortly 
            to discuss the next steps.
          </p>
          <p style="color: #666; line-height: 1.6;">
            If you have any questions in the meantime, please don't hesitate to reach out.
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; line-height: 1.6;">
              Best regards,<br>
              <strong>The Mortgage Bolt Team</strong>
            </p>
            <p style="color: #999; font-size: 12px;">
              Mortgage Bolt<br>
              hello@mortgagebolt.com
            </p>
          </div>
        </div>
      `,
    });

    console.log('Resend response:', emailResponse);

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${JSON.stringify(emailResponse.error)}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Confirmation email sent successfully, ID:', emailResponse.data?.id);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-application-confirmation function:", error);
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
