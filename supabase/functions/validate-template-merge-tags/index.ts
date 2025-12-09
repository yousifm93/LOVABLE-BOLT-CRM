import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  leadId: string;
  templateId: string;
}

// Map merge tag names to human-readable field names
const MERGE_TAG_LABELS: Record<string, string> = {
  first_name: "Borrower First Name",
  last_name: "Borrower Last Name",
  email: "Borrower Email",
  phone: "Borrower Phone",
  borrower_name: "Borrower Name",
  subject_property_address: "Subject Property Address",
  subject_address_1: "Subject Address",
  subject_city: "Subject City",
  subject_state: "Subject State",
  subject_zip: "Subject Zip",
  sales_price: "Sales Price",
  loan_amount: "Loan Amount",
  loan_type: "Loan Type",
  loan_program: "Loan Program",
  interest_rate: "Interest Rate",
  close_date: "Close Date",
  buyer_agent_first_name: "Buyer's Agent First Name",
  buyer_agent_last_name: "Buyer's Agent Last Name",
  buyer_agent_name: "Buyer's Agent Name",
  buyer_agent_email: "Buyer's Agent Email",
  buyer_agent_phone: "Buyer's Agent Phone",
  buyer_agent_brokerage: "Buyer's Agent Brokerage",
  listing_agent_first_name: "Listing Agent First Name",
  listing_agent_last_name: "Listing Agent Last Name",
  listing_agent_name: "Listing Agent Name",
  listing_agent_email: "Listing Agent Email",
  listing_agent_phone: "Listing Agent Phone",
  listing_agent_company: "Listing Agent Company",
  lender_name: "Lender Name",
  account_executive_first_name: "Account Executive First Name",
  account_executive_last_name: "Account Executive Last Name",
  account_executive_name: "Account Executive Name",
  account_executive_email: "Account Executive Email",
  account_executive_phone: "Account Executive Phone",
  co_borrower_first_name: "Co-Borrower First Name",
  co_borrower_last_name: "Co-Borrower Last Name",
  co_borrower_email: "Co-Borrower Email",
  co_borrower_phone: "Co-Borrower Phone",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, templateId }: ValidateRequest = await req.json();

    console.log("Validating merge tags:", { leadId, templateId });

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("html, name")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateError?.message}`);
    }

    // Extract all merge tags from template (e.g., {{field_name}})
    const mergeTagRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const templateContent = template.html + " " + template.name;
    const foundTags: string[] = [];
    let match;

    while ((match = mergeTagRegex.exec(templateContent)) !== null) {
      const tagName = match[1];
      if (!foundTags.includes(tagName)) {
        foundTags.push(tagName);
      }
    }

    console.log("Found merge tags:", foundTags);

    if (foundTags.length === 0) {
      return new Response(
        JSON.stringify({ valid: true, missingFields: [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch lead data with relationships
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(`
        *,
        buyer_agent:buyer_agents!buyer_agent_id(*),
        approved_lender:lenders!approved_lender_id(*)
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

    // Build merge data (same logic as send-template-email)
    const mergeData: Record<string, any> = {};

    // Lead fields
    Object.keys(lead).forEach(key => {
      if (typeof lead[key] !== 'object' || lead[key] === null) {
        mergeData[key] = lead[key];
      }
    });

    // Computed fields
    mergeData.borrower_name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    mergeData.subject_property_address = [lead.subject_address_1, lead.subject_city, lead.subject_state, lead.subject_zip].filter(Boolean).join(', ');

    // Buyer's Agent fields
    if (lead.buyer_agent) {
      mergeData.buyer_agent_first_name = lead.buyer_agent.first_name || '';
      mergeData.buyer_agent_last_name = lead.buyer_agent.last_name || '';
      mergeData.buyer_agent_name = `${lead.buyer_agent.first_name || ''} ${lead.buyer_agent.last_name || ''}`.trim();
      mergeData.buyer_agent_email = lead.buyer_agent.email || '';
      mergeData.buyer_agent_phone = lead.buyer_agent.phone || '';
      mergeData.buyer_agent_brokerage = lead.buyer_agent.brokerage || '';
    }

    // Listing Agent fields
    if (listingAgentLink?.contact) {
      const la = listingAgentLink.contact;
      mergeData.listing_agent_first_name = la.first_name || '';
      mergeData.listing_agent_last_name = la.last_name || '';
      mergeData.listing_agent_name = `${la.first_name || ''} ${la.last_name || ''}`.trim();
      mergeData.listing_agent_email = la.email || '';
      mergeData.listing_agent_phone = la.phone || '';
      mergeData.listing_agent_company = la.company || '';
    }

    // Lender fields
    if (lead.approved_lender) {
      mergeData.lender_name = lead.approved_lender.lender_name || '';
      mergeData.account_executive_first_name = lead.approved_lender.ae_first_name || '';
      mergeData.account_executive_last_name = lead.approved_lender.ae_last_name || '';
      mergeData.account_executive_name = `${lead.approved_lender.ae_first_name || ''} ${lead.approved_lender.ae_last_name || ''}`.trim();
      mergeData.account_executive_email = lead.approved_lender.ae_email || '';
      mergeData.account_executive_phone = lead.approved_lender.ae_phone || '';
    }

    // Check which merge tags have empty values
    const missingFields: { tag: string; label: string }[] = [];

    for (const tag of foundTags) {
      const value = mergeData[tag];
      const isEmpty = value === null || value === undefined || value === '' || 
                     (typeof value === 'string' && value.trim() === '');
      
      if (isEmpty) {
        const label = MERGE_TAG_LABELS[tag] || tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        missingFields.push({ tag, label });
      }
    }

    console.log("Missing fields:", missingFields);

    return new Response(
      JSON.stringify({ 
        valid: missingFields.length === 0, 
        missingFields 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error validating merge tags:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
