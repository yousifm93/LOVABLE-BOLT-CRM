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

    // Fetch ALL crm_fields for dynamic merge data
    const { data: crmFields } = await supabase
      .from('crm_fields')
      .select('field_name, field_type')
      .eq('is_in_use', true);

    // Fetch lead data with ALL relationships
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(`
        *,
        buyer_agent:buyer_agents!buyer_agent_id(*),
        approved_lender:lenders!approved_lender_id(*),
        pipeline_stage:pipeline_stages!pipeline_stage_id(*),
        assigned_user:users!teammate_assigned(*)
      `)
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Fetch listing agent
    const { data: listingAgentLink } = await supabase
      .from('lead_external_contacts')
      .select('contact:contacts(*)')
      .eq('lead_id', leadId)
      .eq('type', 'listing_agent')
      .maybeSingle();

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

    // Build comprehensive merge data
    const mergeData: Record<string, any> = {};

    // 1. Add all lead fields dynamically
    if (crmFields) {
      crmFields.forEach(field => {
        const value = lead[field.field_name];
        if (field.field_type === 'currency' && value != null) {
          mergeData[field.field_name] = `$${Number(value).toLocaleString()}`;
        } else if (field.field_type === 'date' && value) {
          mergeData[field.field_name] = new Date(value).toLocaleDateString();
        } else if (field.field_type === 'datetime' && value) {
          mergeData[field.field_name] = new Date(value).toLocaleString();
        } else if (field.field_type === 'boolean' && value != null) {
          mergeData[field.field_name] = value ? 'Yes' : 'No';
        } else {
          mergeData[field.field_name] = value || '';
        }
      });
    }

    // 2. Add computed fields
    mergeData.borrower_name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    mergeData.subject_property_address = [lead.subject_address_1, lead.subject_city, lead.subject_state, lead.subject_zip].filter(Boolean).join(', ');

    // 3. Buyer's Agent fields
    if (lead.buyer_agent) {
      mergeData.buyer_agent_first_name = lead.buyer_agent.first_name || '';
      mergeData.buyer_agent_last_name = lead.buyer_agent.last_name || '';
      mergeData.buyer_agent_name = `${lead.buyer_agent.first_name || ''} ${lead.buyer_agent.last_name || ''}`.trim();
      mergeData.buyer_agent_email = lead.buyer_agent.email || '';
      mergeData.buyer_agent_phone = lead.buyer_agent.phone || '';
      mergeData.buyer_agent_brokerage = lead.buyer_agent.brokerage || lead.buyer_agent.company || '';
    }

    // 4. Listing Agent fields
    if (listingAgentLink?.contact) {
      const la = listingAgentLink.contact;
      mergeData.listing_agent_first_name = la.first_name || '';
      mergeData.listing_agent_last_name = la.last_name || '';
      mergeData.listing_agent_name = `${la.first_name || ''} ${la.last_name || ''}`.trim();
      mergeData.listing_agent_email = la.email || '';
      mergeData.listing_agent_phone = la.phone || '';
      mergeData.listing_agent_company = la.company || '';
    }

    // 5. Lender fields
    if (lead.approved_lender) {
      mergeData.lender_name = lead.approved_lender.lender_name || '';
      mergeData.account_executive_first_name = lead.approved_lender.ae_first_name || '';
      mergeData.account_executive_last_name = lead.approved_lender.ae_last_name || '';
      mergeData.account_executive_name = `${lead.approved_lender.ae_first_name || ''} ${lead.approved_lender.ae_last_name || ''}`.trim();
      mergeData.account_executive_email = lead.approved_lender.ae_email || '';
      mergeData.account_executive_phone = lead.approved_lender.ae_phone || '';
    }

    // Replace merge tags in template
    let htmlContent = template.html || "";
    let subject = template.name;

    Object.entries(mergeData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      htmlContent = htmlContent.replace(regex, String(value ?? ''));
      subject = subject.replace(regex, String(value ?? ''));
    });

    // Build recipient lists
    const toEmails: string[] = [];
    const ccEmails: string[] = [];

    if (recipients.borrower && lead.email) toEmails.push(lead.email);
    if (recipients.agent && lead.buyer_agent?.email) ccEmails.push(lead.buyer_agent.email);
    if (recipients.thirdParty?.trim()) ccEmails.push(recipients.thirdParty.trim());

    if (toEmails.length === 0) throw new Error("At least one recipient email is required");

    const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    const emailResponse = await resend.emails.send({
      from: `${sender.first_name} ${sender.last_name} <${fromAddress}>`,
      reply_to: [sender.email],
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject: subject,
      html: htmlContent,
    });

    if (emailResponse.error) throw new Error(`Failed to send email: ${emailResponse.error.message}`);

    await supabase.from("email_logs").insert({
      lead_id: leadId,
      timestamp: new Date().toISOString(),
      direction: 'Out',
      to_email: toEmails.join(', '),
      from_email: fromAddress,
      subject: subject,
      snippet: htmlContent.substring(0, 200).replace(/<[^>]*>/g, ''),
      provider_message_id: emailResponse.data?.id,
      delivery_status: 'sent',
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
