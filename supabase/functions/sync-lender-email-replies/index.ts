import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

if (import.meta.main) {
  console.log("sync-lender-email-replies function started");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Get all lenders with email addresses
    const { data: lenders, error: lendersError } = await supabase
      .from("lenders")
      .select("id, lender_name, account_executive_email")
      .not("account_executive_email", "is", null);

    if (lendersError) {
      console.error("Error fetching lenders:", lendersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch lenders" }),
        { status: 500, headers: corsHeaders }
      );
    }

    let updatedCount = 0;

    // For each lender, check for reply emails
    for (const lender of lenders || []) {
      if (!lender.account_executive_email) continue;

      // Extract domain from lender's AE email
      const aeEmail = lender.account_executive_email;
      const domain = aeEmail.split("@")[1];

      // Find emails FROM the lender domain TO scenarios inbox (replies)
      const { data: replyEmails, error: emailError } = await supabase
        .from("email_logs")
        .select("id, subject, from_email, body, html_body, timestamp")
        .eq("to_email", "scenarios@mortgagebolt.org")
        .ilike("from_email", `%@${domain}`)
        .eq("direction", "In")
        .order("timestamp", { ascending: false })
        .limit(1);

      if (emailError) {
        console.error(`Error fetching emails for ${lender.lender_name}:`, emailError);
        continue;
      }

      // If we found a reply, update the lender
      if (replyEmails && replyEmails.length > 0) {
        const latestReply = replyEmails[0];
        const { error: updateError } = await supabase
          .from("lenders")
          .update({
            last_email_replied: true,
            last_email_replied_at: latestReply.timestamp,
            last_email_reply_content: latestReply.body || latestReply.html_body || "Email received",
          })
          .eq("id", lender.id);

        if (updateError) {
          console.error(`Error updating ${lender.lender_name}:`, updateError);
        } else {
          updatedCount++;
          console.log(
            `Updated ${lender.lender_name} - reply detected at ${latestReply.timestamp}`
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced email replies for ${updatedCount} lenders`,
        updated_count: updatedCount,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in sync-lender-email-replies:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
