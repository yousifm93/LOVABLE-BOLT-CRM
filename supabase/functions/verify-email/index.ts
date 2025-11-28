import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - Mortgage Bolt</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 400px; }
            h1 { color: #ef4444; margin: 0 0 1rem; font-size: 1.5rem; }
            p { color: #475569; margin: 0 0 1.5rem; line-height: 1.6; }
            a { display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Verification Link</h1>
            <p>This verification link is invalid or has expired.</p>
            <a href="${Deno.env.get("APP_URL") || "https://290d256e-ff48-4260-82ff-592fe4284119.lovableproject.com"}/apply/auth">Back to Sign In</a>
          </div>
        </body>
        </html>
        `,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find user with this token
    const { data: user, error: findError } = await supabaseAdmin
      .from("application_users")
      .select("*")
      .eq("verification_token", token)
      .single();

    if (findError || !user) {
      console.error("Token not found:", findError);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - Mortgage Bolt</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 400px; }
            h1 { color: #ef4444; margin: 0 0 1rem; font-size: 1.5rem; }
            p { color: #475569; margin: 0 0 1.5rem; line-height: 1.6; }
            a { display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Verification Link</h1>
            <p>This verification link is invalid or has already been used.</p>
            <a href="${Deno.env.get("APP_URL") || "https://290d256e-ff48-4260-82ff-592fe4284119.lovableproject.com"}/apply/auth">Back to Sign In</a>
          </div>
        </body>
        </html>
        `,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabaseAdmin
      .from("application_users")
      .update({
        email_verified: true,
        verification_token: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error verifying email:", updateError);
      throw updateError;
    }

    console.log("Email verified for user:", user.email);

    // Redirect to success page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - Mortgage Bolt</title>
        <meta http-equiv="refresh" content="3;url=${Deno.env.get("APP_URL") || "https://290d256e-ff48-4260-82ff-592fe4284119.lovableproject.com"}/apply">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 400px; }
          h1 { color: #10b981; margin: 0 0 1rem; font-size: 1.75rem; }
          p { color: #475569; margin: 0 0 1.5rem; line-height: 1.6; }
          .checkmark { width: 64px; height: 64px; margin: 0 auto 1.5rem; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold; }
          a { display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>Email Verified!</h1>
          <p>Your email has been successfully verified. You can now access your mortgage application.</p>
          <p style="font-size: 14px; color: #64748b;">Redirecting you to the application...</p>
          <a href="${Deno.env.get("APP_URL") || "https://290d256e-ff48-4260-82ff-592fe4284119.lovableproject.com"}/apply">Continue to Application</a>
        </div>
      </body>
      </html>
      `,
      { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-email:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Mortgage Bolt</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 400px; }
          h1 { color: #ef4444; margin: 0 0 1rem; font-size: 1.5rem; }
          p { color: #475569; margin: 0 0 1.5rem; line-height: 1.6; }
          a { display: inline-block; padding: 0.75rem 2rem; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification Error</h1>
          <p>An error occurred while verifying your email. Please try again or contact support.</p>
          <a href="${Deno.env.get("APP_URL") || "https://290d256e-ff48-4260-82ff-592fe4284119.lovableproject.com"}/apply/auth">Back to Sign In</a>
        </div>
      </body>
      </html>
      `,
      { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  }
};

serve(handler);
