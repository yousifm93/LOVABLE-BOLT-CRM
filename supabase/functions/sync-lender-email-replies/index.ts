import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Public email domains that require exact email matching instead of domain matching
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
  'aol.com', 'icloud.com', 'protonmail.com', 'live.com',
  'msn.com', 'me.com', 'mail.com', 'ymail.com', 'googlemail.com'
]);

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

    // Step 2: Build both domain-level and email-level maps for matching
    const domainEmailsMap = new Map<string, Array<{ rawDate: string; fromEmail: string }>>();
    const exactEmailsMap = new Map<string, Array<{ rawDate: string; fromEmail: string }>>();
    
    for (const email of emails) {
      if (!email.fromEmail) continue;
      const fromEmailLower = email.fromEmail.toLowerCase();
      const domain = fromEmailLower.split("@")[1];
      
      // Exclude mortgagebolt.org emails (our own emails)
      if (domain && !domain.includes("mortgagebolt")) {
        // Add to domain map
        if (!domainEmailsMap.has(domain)) {
          domainEmailsMap.set(domain, []);
        }
        domainEmailsMap.get(domain)!.push({ 
          rawDate: email.rawDate || new Date().toISOString(), 
          fromEmail: fromEmailLower 
        });
        
        // Add to exact email map
        if (!exactEmailsMap.has(fromEmailLower)) {
          exactEmailsMap.set(fromEmailLower, []);
        }
        exactEmailsMap.get(fromEmailLower)!.push({ 
          rawDate: email.rawDate || new Date().toISOString(), 
          fromEmail: fromEmailLower 
        });
      }
    }
    console.log(`Built domain map with ${domainEmailsMap.size} unique domains, exact email map with ${exactEmailsMap.size} unique emails`);

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

    // Step 4: For each lender, check if their AE has replied AFTER we sent our email
    for (const lender of lenders || []) {
      if (!lender.account_executive_email || !lender.last_email_sent_at) continue;

      const aeEmailLower = lender.account_executive_email.toLowerCase();
      const aeDomain = aeEmailLower.split("@")[1];
      const lastSentAt = new Date(lender.last_email_sent_at).getTime();
      
      if (!aeDomain) continue;

      let validReply: { rawDate: string; fromEmail: string } | undefined;

      // Check if this is a public domain that requires exact email matching
      if (PUBLIC_DOMAINS.has(aeDomain)) {
        // For public domains (gmail, yahoo, etc.), require EXACT email match
        const emailsFromExact = exactEmailsMap.get(aeEmailLower);
        if (emailsFromExact) {
          validReply = emailsFromExact.find(email => {
            const replyDate = new Date(email.rawDate).getTime();
            return replyDate > lastSentAt;
          });
        }
        
        if (!validReply) {
          console.log(
            `Skipped ${lender.lender_name} - public domain (${aeDomain}) requires exact match for ${aeEmailLower}, no reply found after ${lender.last_email_sent_at}`
          );
        }
      } else {
        // For corporate domains, use domain matching
        const emailsFromDomain = domainEmailsMap.get(aeDomain);
        if (emailsFromDomain) {
          validReply = emailsFromDomain.find(email => {
            const replyDate = new Date(email.rawDate).getTime();
            return replyDate > lastSentAt;
          });
        }
        
        if (!validReply && domainEmailsMap.has(aeDomain)) {
          console.log(
            `Skipped ${lender.lender_name} - domain ${aeDomain} found but no reply after ${lender.last_email_sent_at}`
          );
        }
      }
      
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
