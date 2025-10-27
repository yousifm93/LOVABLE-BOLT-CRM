import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  leadId: string;
  templateId: string;
  senderId: string;
  recipients: {
    borrower: boolean;
    agent: boolean;
    thirdParty: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, templateId, senderId, recipients }: SendEmailRequest = await req.json();

    console.log("Sending email:", { leadId, templateId, senderId, recipients });

    // Fetch lead data with buyer agent
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(`
        *,
        buyer_agent:buyer_agents!buyer_agent_id(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateError?.message}`);
    }

    // Fetch sender profile
    const { data: sender, error: senderError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", senderId)
      .single();

    if (senderError || !sender) {
      throw new Error(`Sender not found: ${senderError?.message}`);
    }

    // Build merge data object
    const mergeData: Record<string, any> = {
      borrower_first_name: lead.first_name || "",
      borrower_last_name: lead.last_name || "",
      borrower_email: lead.email || "",
      borrower_phone: lead.phone || "",
      address: lead.subject_address_1 || "",
      city: lead.subject_city || "",
      state: lead.subject_state || "",
      zip_code: lead.subject_zip || "",
      loan_amount: lead.loan_amount ? `$${Number(lead.loan_amount).toLocaleString()}` : "",
      sales_price: lead.sales_price ? `$${Number(lead.sales_price).toLocaleString()}` : "",
      loan_type: lead.loan_type || "",
      property_type: lead.property_type || "",
      program: lead.program || "",
      agent_first_name: lead.buyer_agent?.first_name || "",
      agent_last_name: lead.buyer_agent?.last_name || "",
      agent_name: lead.buyer_agent ? `${lead.buyer_agent.first_name} ${lead.buyer_agent.last_name}`.trim() : "",
      agent_email: lead.buyer_agent?.email || "",
      sender_first_name: sender.first_name || "",
      sender_last_name: sender.last_name || "",
      sender_name: `${sender.first_name} ${sender.last_name}`.trim(),
      sender_email: sender.email || "",
    };

    // Replace merge tags in template
    let htmlContent = template.html_content || "";
    let subject = template.name; // Use template name as subject for now

    Object.entries(mergeData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlContent = htmlContent.replace(regex, String(value));
      subject = subject.replace(regex, String(value));
    });

    // Build recipient lists
    const toEmails: string[] = [];
    const ccEmails: string[] = [];
    const recipientData: Record<string, string> = {};

    if (recipients.borrower && lead.email) {
      toEmails.push(lead.email);
      recipientData.borrower = lead.email;
    }

    if (recipients.agent && lead.buyer_agent?.email) {
      ccEmails.push(lead.buyer_agent.email);
      recipientData.agent = lead.buyer_agent.email;
    }

    if (recipients.thirdParty && recipients.thirdParty.trim()) {
      ccEmails.push(recipients.thirdParty.trim());
      recipientData.thirdParty = recipients.thirdParty.trim();
    }

    if (toEmails.length === 0) {
      throw new Error("At least one recipient email is required");
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${sender.first_name} ${sender.last_name} <${sender.email}>`,
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email in database
    const { error: logError } = await supabase.from("email_logs").insert({
      template_id: templateId,
      lead_id: leadId,
      sender_id: senderId,
      recipients: recipientData,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.error("Failed to log email:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: emailResponse.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
