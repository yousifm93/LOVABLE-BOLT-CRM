import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://290d256e-ff48-4260-82ff-592fe4284119.lovableproject.com";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": `${APP_URL}/apply/auth?error=invalid_token`
        }
      });
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
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": `${APP_URL}/apply/auth?error=already_verified`
        }
      });
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
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": `${APP_URL}/apply/verified`
      }
    });
  } catch (error: any) {
    console.error("Error in verify-email:", error);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": `${APP_URL}/apply/auth?error=verification_failed`
      }
    });
  }
};

serve(handler);
