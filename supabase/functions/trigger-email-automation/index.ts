import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerRequest {
  // For manual/test triggers
  automationId?: string;
  testMode?: boolean;
  useRandomLead?: boolean;
  leadId?: string;
  
  // For automatic triggers (from status changes)
  triggerType?: string;
  fieldName?: string;
  fieldValue?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody: TriggerRequest = await req.json();
    console.log("Trigger email automation request:", requestBody);

    // Fetch test mode settings
    const { data: settings } = await supabase
      .from('email_automation_settings')
      .select('*')
      .limit(1)
      .single();

    const isTestMode = requestBody.testMode || settings?.test_mode_enabled || false;
    console.log("Test mode:", isTestMode);

    let automation;
    let lead;

    // If automationId is provided, use that specific automation
    if (requestBody.automationId) {
      const { data: automationData, error: automationError } = await supabase
        .from('email_automations')
        .select('*, template:email_templates(*)')
        .eq('id', requestBody.automationId)
        .single();

      if (automationError || !automationData) {
        throw new Error(`Automation not found: ${automationError?.message}`);
      }
      automation = automationData;

      // Get a lead to use for the email
      if (requestBody.leadId) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('*, buyer_agent:buyer_agents!buyer_agent_id(*), approved_lender:lenders!approved_lender_id(*)')
          .eq('id', requestBody.leadId)
          .single();
        lead = leadData;
      } else if (requestBody.useRandomLead) {
        // Get a random active lead for testing
        const { data: leads } = await supabase
          .from('leads')
          .select('*, buyer_agent:buyer_agents!buyer_agent_id(*), approved_lender:lenders!approved_lender_id(*)')
          .not('email', 'is', null)
          .limit(1);
        lead = leads?.[0];
      }

      if (!lead) {
        throw new Error("No lead found for email automation");
      }
    } 
    // Otherwise, find matching automations based on trigger
    else if (requestBody.triggerType && requestBody.fieldName && requestBody.fieldValue && requestBody.leadId) {
      // Find automations that match this trigger
      const { data: matchingAutomations } = await supabase
        .from('email_automations')
        .select('*, template:email_templates(*)')
        .eq('is_active', true)
        .eq('trigger_type', requestBody.triggerType);

      // Filter to automations that match the specific field and value
      const relevantAutomations = (matchingAutomations || []).filter(a => {
        const config = a.trigger_config || {};
        return config.field === requestBody.fieldName && config.target_status === requestBody.fieldValue;
      });

      if (relevantAutomations.length === 0) {
        console.log("No matching automations found for trigger");
        return new Response(
          JSON.stringify({ success: true, message: "No matching automations", emailsSent: 0 }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get the lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('*, buyer_agent:buyer_agents!buyer_agent_id(*), approved_lender:lenders!approved_lender_id(*)')
        .eq('id', requestBody.leadId)
        .single();
      
      if (!leadData) {
        throw new Error("Lead not found");
      }
      lead = leadData;

      // Send emails for all matching automations
      const results = [];
      for (const auto of relevantAutomations) {
        try {
          const result = await sendAutomatedEmail(supabase, auto, lead, settings, isTestMode);
          if (result) {
            results.push(result);
          }
        } catch (err: any) {
          console.error(`Error sending email for automation ${auto.id}:`, err);
          results.push({ automationId: auto.id, error: err.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results, emailsSent: results.filter(r => !r.error).length }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      throw new Error("Invalid request: must provide automationId or trigger details");
    }

    // Send the email for the specific automation
    // Skip conditions in test mode so all automations can be tested regardless of lead data
    const result = await sendAutomatedEmail(supabase, automation, lead, settings, isTestMode, isTestMode);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in trigger-email-automation:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Evaluate conditions for conditional email sending
function evaluateConditions(conditions: any, lead: any): { shouldSend: boolean; skipEquity?: boolean } {
  if (!conditions) {
    return { shouldSend: true };
  }

  const { field, operator, compare_field, compare_value } = conditions;
  
  // Handle is_not_null operator for checking if a field has a value
  if (operator === 'is_not_null') {
    const fieldValue = lead[field];
    const hasValue = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    console.log(`Evaluating condition: ${field} is_not_null = ${hasValue}`);
    return { shouldSend: hasValue };
  }
  
  // Handle string equality for property_type, status fields, etc.
  if (operator === '=' || operator === '==') {
    const fieldValue = lead[field];
    const targetValue = compare_value || '';
    
    // String comparison (case-insensitive)
    if (typeof fieldValue === 'string' || typeof targetValue === 'string') {
      const matches = String(fieldValue || '').toLowerCase() === String(targetValue).toLowerCase();
      console.log(`Evaluating condition: ${field}("${fieldValue}") = "${targetValue}" → ${matches}`);
      return { shouldSend: matches };
    }
    
    // Numeric comparison
    const numFieldValue = parseFloat(fieldValue) || 0;
    const numCompareValue = parseFloat(targetValue) || 0;
    return { shouldSend: numFieldValue === numCompareValue };
  }
  
  // Numeric comparisons
  const fieldValue = parseFloat(lead[field]) || 0;
  const compareValue = compare_field ? (parseFloat(lead[compare_field]) || 0) : (parseFloat(compare_value) || 0);

  console.log(`Evaluating condition: ${field}(${fieldValue}) ${operator} ${compare_field || compare_value}(${compareValue})`);

  switch (operator) {
    case '>=':
      if (fieldValue < compareValue) {
        // Appraisal value less than sales price - skip email
        return { shouldSend: false };
      }
      // If equal, send but skip equity line
      return { shouldSend: true, skipEquity: fieldValue === compareValue };
    case '>':
      return { shouldSend: fieldValue > compareValue };
    case '<=':
      return { shouldSend: fieldValue <= compareValue };
    case '<':
      return { shouldSend: fieldValue < compareValue };
    case '!=':
      return { shouldSend: fieldValue !== compareValue };
    default:
      return { shouldSend: true };
  }
}

async function sendAutomatedEmail(
  supabase: any,
  automation: any,
  lead: any,
  settings: any,
  isTestMode: boolean,
  skipConditions: boolean = false
): Promise<any> {
  const template = automation.template;
  if (!template) {
    throw new Error("No template linked to automation");
  }

  // Evaluate conditions before sending - skip in test mode
  let skipEquity = false;
  if (!skipConditions) {
    const conditions = evaluateConditions(automation.conditions, lead);
    if (!conditions.shouldSend) {
      console.log(`Skipping email for automation ${automation.id} - conditions not met`);
      return { automationId: automation.id, skipped: true, reason: 'Conditions not met' };
    }
    skipEquity = conditions.skipEquity || false;
  } else {
    console.log(`Test mode: Skipping condition evaluation for automation ${automation.id}`);
  }

  // Fetch listing agent if needed
  let listingAgent = null;
  if (automation.recipient_type === 'listing_agent' || automation.cc_recipient_type === 'listing_agent') {
    const { data: listingAgentLink } = await supabase
      .from('lead_external_contacts')
      .select('contact:contacts(*)')
      .eq('lead_id', lead.id)
      .eq('type', 'listing_agent')
      .maybeSingle();
    listingAgent = listingAgentLink?.contact;
  }

  // Get the sender (default to Yousif)
  const { data: sender } = await supabase
    .from('users')
    .select('first_name, last_name, email, email_signature, phone')
    .eq('email', 'yousif@mortgagebolt.org')
    .single();

  if (!sender) {
    throw new Error("Default sender not found");
  }

  // Fetch title contact if available
  let titleContact = null;
  const { data: titleContactLink } = await supabase
    .from('lead_external_contacts')
    .select('contact:contacts(*)')
    .eq('lead_id', lead.id)
    .eq('type', 'title')
    .maybeSingle();
  titleContact = titleContactLink?.contact;

  // Calculate equity amount
  const appraisalValue = parseFloat(lead.appraisal_value) || 0;
  const salesPrice = parseFloat(lead.sales_price) || 0;
  const equityAmount = appraisalValue - salesPrice;

  // Build merge data
  const mergeData: Record<string, any> = {
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    borrower_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    email: lead.email || '',
    phone: lead.phone || '',
    lender_name: lead.approved_lender?.lender_name || '',
    lender_loan_number: lead.lender_loan_number || '',
    close_date: lead.close_date ? new Date(lead.close_date).toLocaleDateString() : '',
    closing_date: lead.close_date ? new Date(lead.close_date).toLocaleDateString() : '',
    loan_amount: lead.loan_amount ? `$${Number(lead.loan_amount).toLocaleString()}` : '',
    sales_price: lead.sales_price ? `$${Number(lead.sales_price).toLocaleString()}` : '',
    interest_rate: lead.interest_rate ? `${lead.interest_rate}%` : '',
    subject_property_address: [lead.subject_address_1, lead.subject_city, lead.subject_state, lead.subject_zip].filter(Boolean).join(', '),
    property_address: [lead.subject_address_1, lead.subject_city, lead.subject_state, lead.subject_zip].filter(Boolean).join(', '),
    subject_address: lead.subject_address_1 || '',
    city: lead.subject_city || '',
    state: lead.subject_state || '',
    zip: lead.subject_zip || '',
    loan_program: lead.loan_program || '',
    lock_expiration_date: lead.lock_expiration_date ? new Date(lead.lock_expiration_date).toLocaleDateString() : '',
  // Appraisal fields
    appraisal_value: appraisalValue ? `$${appraisalValue.toLocaleString()}` : '',
    equity_amount: (!skipEquity && equityAmount > 0) ? `$${equityAmount.toLocaleString()}` : '',
    // Appraisal date/time - format nicely if available
    appr_date_time: lead.appr_date_time ? new Date(lead.appr_date_time).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) : '',
    // Loan officer fields
    loan_officer_name: `${sender.first_name} ${sender.last_name}`.trim(),
    loan_officer_phone: sender.phone || '',
  };

  // Add buyer agent info
  if (lead.buyer_agent) {
    mergeData.buyer_agent_first_name = lead.buyer_agent.first_name || '';
    mergeData.buyer_agent_name = `${lead.buyer_agent.first_name || ''} ${lead.buyer_agent.last_name || ''}`.trim();
    mergeData.buyer_agent_email = lead.buyer_agent.email || '';
    mergeData.buyer_agent_phone = lead.buyer_agent.phone || '';
  }

  // Add listing agent info
  if (listingAgent) {
    mergeData.listing_agent_first_name = listingAgent.first_name || '';
    mergeData.listing_agent_name = `${listingAgent.first_name || ''} ${listingAgent.last_name || ''}`.trim();
    mergeData.listing_agent_email = listingAgent.email || '';
    mergeData.listing_agent_phone = listingAgent.phone || '';
  }

  // Add title contact info
  if (titleContact) {
    mergeData.title_contact_name = `${titleContact.first_name || ''} ${titleContact.last_name || ''}`.trim();
    mergeData.title_contact_email = titleContact.email || '';
    mergeData.title_contact_phone = titleContact.phone || '';
  }

  // Replace merge tags in template
  let htmlContent = template.html || "";
  let subject = template.name || "Automated Email";

  // Get subject from json_blocks if available
  const jsonBlocks = template.json_blocks as any;
  if (jsonBlocks?.subject) {
    subject = jsonBlocks.subject;
  }

  Object.entries(mergeData).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    htmlContent = htmlContent.replace(regex, String(value ?? ''));
    subject = subject.replace(regex, String(value ?? ''));
  });

  // Handle conditional equity section - remove if skipEquity is true
  if (skipEquity) {
    // Remove lines containing equity_amount if value is 0
    htmlContent = htmlContent.replace(/.*\$\{\{equity_amount\}\}.*\n?/g, '');
    htmlContent = htmlContent.replace(/.*instant equity.*\n?/gi, '');
  }

  // Append "Best," and email signature
  if (sender.email_signature) {
    const signatureHtml = `<br><br>Best,<br><br>${sender.email_signature}`;
    if (htmlContent.includes('</div>')) {
      // Insert before the last closing div
      const lastDivIndex = htmlContent.lastIndexOf('</div>');
      htmlContent = htmlContent.slice(0, lastDivIndex) + signatureHtml + htmlContent.slice(lastDivIndex);
    } else {
      htmlContent += signatureHtml;
    }
  }

  // Determine recipient email
  let recipientEmail: string;
  let ccEmail: string | null = null;

  if (isTestMode) {
    // Use test email based on recipient type
    switch (automation.recipient_type) {
      case 'borrower':
        recipientEmail = settings?.test_borrower_email || 'mbborrower@gmail.com';
        break;
      case 'buyer_agent':
        recipientEmail = settings?.test_buyer_agent_email || 'mbbuyersagent@gmail.com';
        break;
      case 'listing_agent':
        recipientEmail = settings?.test_listing_agent_email || 'mblistingagent@gmail.com';
        break;
      default:
        recipientEmail = settings?.test_borrower_email || 'mbborrower@gmail.com';
    }

    // CC in test mode also goes to test address
    if (automation.cc_recipient_type) {
      switch (automation.cc_recipient_type) {
        case 'borrower':
          ccEmail = settings?.test_borrower_email || 'mbborrower@gmail.com';
          break;
        case 'buyer_agent':
          ccEmail = settings?.test_buyer_agent_email || 'mbbuyersagent@gmail.com';
          break;
        case 'listing_agent':
          ccEmail = settings?.test_listing_agent_email || 'mblistingagent@gmail.com';
          break;
      }
    }
  } else {
    // Use actual recipient email
    switch (automation.recipient_type) {
      case 'borrower':
        recipientEmail = lead.email;
        break;
      case 'buyer_agent':
        recipientEmail = lead.buyer_agent?.email;
        break;
      case 'listing_agent':
        recipientEmail = listingAgent?.email;
        break;
      default:
        recipientEmail = lead.email;
    }

    // Get CC email
    if (automation.cc_recipient_type) {
      switch (automation.cc_recipient_type) {
        case 'borrower':
          ccEmail = lead.email;
          break;
        case 'buyer_agent':
          ccEmail = lead.buyer_agent?.email;
          break;
        case 'listing_agent':
          ccEmail = listingAgent?.email;
          break;
      }
    }
  }

  if (!recipientEmail) {
    throw new Error(`No email address for recipient type: ${automation.recipient_type}`);
  }

  console.log(`Sending email to ${recipientEmail}${ccEmail ? ` (CC: ${ccEmail})` : ''} (test mode: ${isTestMode})`);

  // Send via SendGrid
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid API key not configured");
  }

  // Build personalization with optional CC
  const personalizations: any[] = [{
    to: [{ email: recipientEmail }],
  }];

  if (ccEmail && ccEmail !== recipientEmail) {
    personalizations[0].cc = [{ email: ccEmail }];
  }

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

  let success = true;
  let errorMessage: string | null = null;
  let messageId: string | null = null;

  if (!sendGridResponse.ok) {
    const errorText = await sendGridResponse.text();
    success = false;
    errorMessage = `SendGrid API error: ${sendGridResponse.status} - ${errorText}`;
    console.error(errorMessage);
  } else {
    messageId = sendGridResponse.headers.get('X-Message-Id') || `auto-${Date.now()}`;
  }

  // Log the email (only if successful)
  if (success) {
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
  }

  // Log the execution to email_automation_executions
  await supabase.from("email_automation_executions").insert({
    automation_id: automation.id,
    lead_id: lead.id,
    recipient_email: recipientEmail,
    recipient_type: automation.recipient_type,
    cc_email: ccEmail,
    success: success,
    error_message: errorMessage,
    template_name: template.name,
    subject_sent: subject,
    is_test_mode: isTestMode,
    message_id: messageId,
  });

  // Update the automation's last_run_at and execution_count
  await supabase
    .from('email_automations')
    .update({ 
      last_run_at: new Date().toISOString(),
      execution_count: automation.execution_count ? automation.execution_count + 1 : 1
    })
    .eq('id', automation.id);

  if (!success) {
    throw new Error(errorMessage || 'Email send failed');
  }

  console.log(`Email sent successfully. Message ID: ${messageId}`);

  return {
    automationId: automation.id,
    recipientEmail,
    ccEmail,
    messageId,
    isTestMode
  };
}

serve(handler);