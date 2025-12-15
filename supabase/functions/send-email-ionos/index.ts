import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IONOS SMTP settings
const SMTP_HOST = "smtp.ionos.com";
const SMTP_PORT = 587;
const EMAIL_USER = "yousif@mortgagebolt.org";

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const password = Deno.env.get("IONOS_EMAIL_PASSWORD");
    if (!password) {
      throw new Error("IONOS_EMAIL_PASSWORD not configured");
    }

    const { to, subject, body, html, cc, bcc, replyTo }: SendEmailRequest = await req.json();

    if (!to || !subject || (!body && !html)) {
      throw new Error("Missing required fields: to, subject, and body/html");
    }

    console.log(`Sending email from ${EMAIL_USER} to ${to}`);

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: {
          username: EMAIL_USER,
          password: password,
        },
      },
    });

    await client.send({
      from: EMAIL_USER,
      to: to,
      cc: cc,
      bcc: bcc,
      replyTo: replyTo,
      subject: subject,
      content: body || "",
      html: html,
    });

    await client.close();

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        sentTo: to,
        sentFrom: EMAIL_USER,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
