import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  userId: string;
  email: string;
  firstName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, firstName }: VerificationRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing userId or email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const verificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-email?token=${verificationToken}`;

    // Store token in application_users
    const { error: updateError } = await supabaseAdmin
      .from("application_users")
      .update({
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating verification token:", updateError);
      throw updateError;
    }

    // Send verification email via SendGrid
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                        Mortgage Bolt
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">
                        Verify Your Account
                      </h2>
                      
                      <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                        ${firstName ? `Hi ${firstName},` : 'Hello,'}
                      </p>
                      
                      <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                        Thank you for creating an account with Mortgage Bolt. Please verify your email address by clicking the button below to complete your registration and access your mortgage application.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                              Verify Account
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 16px; color: #64748b; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      
                      <p style="margin: 0 0 24px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #475569; font-size: 13px; word-break: break-all;">
                        ${verificationUrl}
                      </p>
                      
                      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                        If you did not create this account, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-align: center;">
                        <strong>Mortgage Bolt</strong><br>
                        848 Brickell Avenue, Suite 840<br>
                        Miami, Florida 33131<br>
                        NMLS #1390971
                      </p>
                      
                      <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                        Please do not reply to this automated email.<br>
                        For assistance, contact us at hello@mortgagebolt.com
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

    const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ 
          to: [{ email: email }] 
        }],
        from: { 
          email: "yousif@mortgagebolt.org", 
          name: "Mortgage Bolt" 
        },
        subject: "Verify Your Mortgage Bolt Account",
        content: [{ 
          type: "text/html", 
          value: htmlContent
        }],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", errorText);
      throw new Error(`SendGrid API error: ${sendGridResponse.status}`);
    }

    console.log("Verification email sent via SendGrid");

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
