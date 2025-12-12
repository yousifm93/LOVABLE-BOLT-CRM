import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This function runs daily at 7:00 AM to send "It's Closing Day!" emails
 * to borrowers whose closing_date is today AND package_status = "Final"
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Running closing day email job...");

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    console.log(`Checking for leads with closing_date = ${todayStr} AND package_status = 'Final'`);

    // Find the "Closing Day" automation
    const { data: automation, error: automationError } = await supabase
      .from('email_automations')
      .select('*, template:email_templates(*)')
      .eq('is_active', true)
      .eq('trigger_type', 'date_based')
      .ilike('name', '%closing day%')
      .maybeSingle();

    if (automationError) {
      console.error("Error fetching automation:", automationError);
      throw automationError;
    }

    if (!automation) {
      console.log("No active 'Closing Day' automation found");
      return new Response(
        JSON.stringify({ success: true, message: "No closing day automation configured", emailsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find leads with closing_date = today AND package_status = 'Final'
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*, buyer_agent:buyer_agents!buyer_agent_id(*), approved_lender:lenders!approved_lender_id(*)')
      .eq('close_date', todayStr)
      .eq('package_status', 'Final')
      .not('email', 'is', null);

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      throw leadsError;
    }

    console.log(`Found ${leads?.length || 0} leads closing today with Final package status`);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No leads closing today", emailsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get test mode settings
    const { data: settings } = await supabase
      .from('email_automation_settings')
      .select('*')
      .limit(1)
      .single();

    const isTestMode = settings?.test_mode_enabled || false;

    // Get the sender
    const { data: sender } = await supabase
      .from('users')
      .select('first_name, last_name, email, email_signature, phone')
      .eq('email', 'yousif@mortgagebolt.org')
      .single();

    if (!sender) {
      throw new Error("Default sender not found");
    }

    const template = automation.template;
    if (!template) {
      throw new Error("No template linked to closing day automation");
    }

    const results = [];
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    for (const lead of leads) {
      try {
        // Build merge data
        const mergeData: Record<string, any> = {
          first_name: lead.first_name || '',
          last_name: lead.last_name || '',
          borrower_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          email: lead.email || '',
          phone: lead.phone || '',
          lender_name: lead.approved_lender?.lender_name || '',
          close_date: lead.close_date ? new Date(lead.close_date).toLocaleDateString() : '',
          closing_date: lead.close_date ? new Date(lead.close_date).toLocaleDateString() : '',
          loan_amount: lead.loan_amount ? `$${Number(lead.loan_amount).toLocaleString()}` : '',
          sales_price: lead.sales_price ? `$${Number(lead.sales_price).toLocaleString()}` : '',
          property_address: [lead.subject_address_1, lead.subject_city, lead.subject_state, lead.subject_zip].filter(Boolean).join(', '),
          loan_officer_name: `${sender.first_name} ${sender.last_name}`.trim(),
          loan_officer_phone: sender.phone || '',
        };

        // Add buyer agent info
        if (lead.buyer_agent) {
          mergeData.buyer_agent_first_name = lead.buyer_agent.first_name || '';
          mergeData.buyer_agent_name = `${lead.buyer_agent.first_name || ''} ${lead.buyer_agent.last_name || ''}`.trim();
          mergeData.buyer_agent_email = lead.buyer_agent.email || '';
        }

        // Replace merge tags
        let htmlContent = template.html || "";
        let subject = template.name || "It's Closing Day!";

        const jsonBlocks = template.json_blocks as any;
        if (jsonBlocks?.subject) {
          subject = jsonBlocks.subject;
        }

        Object.entries(mergeData).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          htmlContent = htmlContent.replace(regex, String(value ?? ''));
          subject = subject.replace(regex, String(value ?? ''));
        });

        // Append signature
        if (sender.email_signature) {
          const signatureHtml = `<br><br>Best,<br><br>${sender.email_signature}`;
          if (htmlContent.includes('</div>')) {
            const lastDivIndex = htmlContent.lastIndexOf('</div>');
            htmlContent = htmlContent.slice(0, lastDivIndex) + signatureHtml + htmlContent.slice(lastDivIndex);
          } else {
            htmlContent += signatureHtml;
          }
        }

        // Determine recipient
        let recipientEmail = isTestMode 
          ? (settings?.test_borrower_email || 'mbborrower@gmail.com')
          : lead.email;

        let ccEmail: string | null = null;
        if (automation.cc_recipient_type === 'buyer_agent') {
          ccEmail = isTestMode
            ? (settings?.test_buyer_agent_email || 'mbbuyersagent@gmail.com')
            : lead.buyer_agent?.email;
        }

        // Build personalizations
        const personalizations: any[] = [{
          to: [{ email: recipientEmail }],
        }];

        if (ccEmail && ccEmail !== recipientEmail) {
          personalizations[0].cc = [{ email: ccEmail }];
        }

        // Send via SendGrid
        const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations,
            from: { email: sender.email, name: `${sender.first_name} ${sender.last_name}` },
            reply_to: { email: sender.email },
            subject: subject,
            content: [{ type: "text/html", value: htmlContent }],
          }),
        });

        if (!sendGridResponse.ok) {
          const errorText = await sendGridResponse.text();
          throw new Error(`SendGrid error: ${errorText}`);
        }

        const messageId = sendGridResponse.headers.get('X-Message-Id') || `auto-${Date.now()}`;

        // Log the email
        await supabase.from("email_logs").insert({
          lead_id: lead.id,
          timestamp: new Date().toISOString(),
          direction: 'Out',
          to_email: recipientEmail,
          from_email: sender.email,
          subject: subject,
          snippet: htmlContent.substring(0, 200).replace(/<[^>]*>/g, ''),
          html_body: htmlContent,
          body: htmlContent.replace(/<[^>]*>/g, ''),
          provider_message_id: messageId,
          delivery_status: 'sent',
        });

        results.push({
          leadId: lead.id,
          borrower: `${lead.first_name} ${lead.last_name}`,
          recipientEmail,
          success: true
        });

        console.log(`Closing day email sent to ${lead.first_name} ${lead.last_name}`);

      } catch (err: any) {
        console.error(`Error sending closing day email for lead ${lead.id}:`, err);
        results.push({
          leadId: lead.id,
          borrower: `${lead.first_name} ${lead.last_name}`,
          error: err.message
        });
      }
    }

    console.log(`Closing day emails completed. Sent: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => r.error).length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: results.filter(r => r.success).length,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-closing-day-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);