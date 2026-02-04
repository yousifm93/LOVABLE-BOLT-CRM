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

    // Step 2: Build domain-to-emails map (all emails per domain with rawDate for filtering)
    const domainEmailsMap = new Map<string, Array<{ rawDate: string; fromEmail: string }>>();
    for (const email of emails) {
      if (!email.fromEmail) continue;
      const domain = email.fromEmail.split("@")[1]?.toLowerCase();
      // Exclude mortgagebolt.org emails (our own emails)
      if (domain && !domain.includes("mortgagebolt")) {
        if (!domainEmailsMap.has(domain)) {
          domainEmailsMap.set(domain, []);
        }
        domainEmailsMap.get(domain)!.push({ 
          rawDate: email.rawDate || new Date().toISOString(), 
          fromEmail: email.fromEmail 
        });
      }
    }
    console.log(`Built domain map with ${domainEmailsMap.size} unique domains`);

    // Step 3: Get all lenders with email addresses AND their last_email_sent_at
    const { data: lenders, error: lendersError } = await supabase
      .from("lenders")
      .select("id, lender_name, account_executive_email, last_email_replied, last_email_sent_at")
      .not("account_executive_email", "is", null)
      .not("last_email_sent_at", "is", null); // Only check lenders we've actually emailed

    if (lendersError) {
      console.error("Error fetching lenders:", lendersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch lenders" }),
        { status: 500, headers: corsHeaders }
      );
    }

    let updatedCount = 0;

    // Step 4: For each lender, check if their AE domain has a reply AFTER we sent our email
    for (const lender of lenders || []) {
      if (!lender.account_executive_email || !lender.last_email_sent_at) continue;

      const aeDomain = lender.account_executive_email.split("@")[1]?.toLowerCase();
      const lastSentAt = new Date(lender.last_email_sent_at).getTime();
      
      if (aeDomain && domainEmailsMap.has(aeDomain)) {
        const emailsFromDomain = domainEmailsMap.get(aeDomain)!;
        
        // Find a reply that came AFTER our last sent email
        const validReply = emailsFromDomain.find(email => {
          const replyDate = new Date(email.rawDate).getTime();
          return replyDate > lastSentAt;
        });
        
        if (validReply) {
          // Update lender as having replied
          const { error: updateError } = await supabase
            .from("lenders")
            .update({
              last_email_replied: true,
              last_email_replied_at: new Date().toISOString(),
            })
            .eq("id", lender.id);

          if (updateError) {
            console.error(`Error updating ${lender.lender_name}:`, updateError);
          } else {
            updatedCount++;
            console.log(
              `Updated ${lender.lender_name} - reply detected from ${validReply.fromEmail} at ${validReply.rawDate} (sent at: ${lender.last_email_sent_at})`
            );
          }
        } else {
          console.log(
            `Skipped ${lender.lender_name} - domain found but no reply after ${lender.last_email_sent_at}`
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced email replies for ${updatedCount} lenders`,
        updated_count: updatedCount,
        domains_found: domainEmailsMap.size,
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
