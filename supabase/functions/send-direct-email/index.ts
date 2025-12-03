import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDirectEmailRequest {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, cc, subject, html, from_email, from_name, reply_to }: SendDirectEmailRequest = await req.json();

    console.log(`Sending email to: ${to}, from: ${from_email}, subject: ${subject}`);

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    // Build recipient list
    const personalizations: any = {
      to: [{ email: to }],
    };

    if (cc) {
      personalizations.cc = cc.split(',').map((email: string) => ({ email: email.trim() }));
    }

    const emailPayload: any = {
      personalizations: [personalizations],
      from: {
        email: from_email,
        name: from_name,
      },
      subject: subject,
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    };

    if (reply_to) {
      emailPayload.reply_to = { email: reply_to };
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid error:", errorText);
      throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
    }

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-direct-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
