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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching emails from Scenarios inbox via IMAP...");

    // Step 1: Fetch last 100 emails from Scenarios inbox via internal call to fetch-emails-imap
    const imapResponse = await fetch(
      `${supabaseUrl}/functions/v1/fetch-emails-imap`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: "scenarios",
          folder: "INBOX",
          limit: 100,
        }),
      }
    );

    if (!imapResponse.ok) {
      const errorText = await imapResponse.text();
      console.error("IMAP fetch failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch emails from IMAP", details: errorText }),
        { status: 500, headers: corsHeaders }
      );
    }

    const imapData = await imapResponse.json();
    const emails = imapData.emails || [];
    console.log(`Fetched ${emails.length} emails from Scenarios inbox`);

    // Step 2: Build domain-to-email map (most recent email per domain)
    const domainEmailMap = new Map<string, { date: string; fromEmail: string }>();
    for (const email of emails) {
      if (!email.fromEmail) continue;
      const domain = email.fromEmail.split("@")[1]?.toLowerCase();
      // Exclude mortgagebolt.org emails (our own emails)
      if (domain && !domain.includes("mortgagebolt")) {
        // Keep the most recent email per domain (emails are sorted by date desc)
        if (!domainEmailMap.has(domain)) {
          domainEmailMap.set(domain, { 
            date: email.date || new Date().toISOString(), 
            fromEmail: email.fromEmail 
          });
        }
      }
    }
    console.log(`Built domain map with ${domainEmailMap.size} unique domains`);

    // Step 3: Get all lenders with email addresses
    const { data: lenders, error: lendersError } = await supabase
      .from("lenders")
      .select("id, lender_name, account_executive_email, last_email_replied")
      .not("account_executive_email", "is", null);

    if (lendersError) {
      console.error("Error fetching lenders:", lendersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch lenders" }),
        { status: 500, headers: corsHeaders }
      );
    }

    let updatedCount = 0;

    // Step 4: For each lender, check if their AE domain appears in the emails map
    for (const lender of lenders || []) {
      if (!lender.account_executive_email) continue;

      const aeDomain = lender.account_executive_email.split("@")[1]?.toLowerCase();
      
      if (aeDomain && domainEmailMap.has(aeDomain)) {
        const emailInfo = domainEmailMap.get(aeDomain)!;
        
        // Update lender as having replied
        const { error: updateError } = await supabase
          .from("lenders")
          .update({
            last_email_replied: true,
            last_email_replied_at: emailInfo.date,
          })
          .eq("id", lender.id);

        if (updateError) {
          console.error(`Error updating ${lender.lender_name}:`, updateError);
        } else {
          updatedCount++;
          console.log(
            `Updated ${lender.lender_name} - reply detected from ${emailInfo.fromEmail} at ${emailInfo.date}`
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced email replies for ${updatedCount} lenders`,
        updated_count: updatedCount,
        domains_found: domainEmailMap.size,
        emails_scanned: emails.length,
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
