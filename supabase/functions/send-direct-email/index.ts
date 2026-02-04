import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDirectEmailRequest {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  lender_id?: string; // Add lender_id for tracking
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type: string;
  }>;
}

// Sanitize TipTap HTML to convert task lists to email-friendly format
function sanitizeHtmlForEmail(html: string): string {
  let sanitized = html;
  
  // Convert TipTap task list items to Unicode checkboxes
  // Unchecked: <li data-type="taskItem" data-checked="false">
  sanitized = sanitized.replace(
    /<li[^>]*data-type="taskItem"[^>]*data-checked="false"[^>]*>(.*?)<\/li>/gi,
    '<li style="list-style-type: none;">☐ $1</li>'
  );
  
  // Checked: <li data-type="taskItem" data-checked="true">
  sanitized = sanitized.replace(
    /<li[^>]*data-type="taskItem"[^>]*data-checked="true"[^>]*>(.*?)<\/li>/gi,
    '<li style="list-style-type: none;">☑ $1</li>'
  );
  
  // Handle task items without explicit data-checked (default unchecked)
  sanitized = sanitized.replace(
    /<li[^>]*data-type="taskItem"[^>]*>(.*?)<\/li>/gi,
    '<li style="list-style-type: none;">☐ $1</li>'
  );
  
  // Convert task list container to regular ul without bullets
  sanitized = sanitized.replace(
    /<ul[^>]*data-type="taskList"[^>]*>/gi,
    '<ul style="list-style-type: none; padding-left: 0;">'
  );
  
  // Remove any nested label/checkbox elements inside task items
  sanitized = sanitized.replace(/<label[^>]*>[\s\S]*?<\/label>/gi, '');
  sanitized = sanitized.replace(/<input[^>]*type="checkbox"[^>]*>/gi, '');
  
  // Clean up empty paragraphs that might cause extra spacing
  sanitized = sanitized.replace(/<p><br><\/p>/g, '<br>');
  sanitized = sanitized.replace(/<p>\s*<\/p>/g, '');
  
  return sanitized;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, cc, subject, html, from_email, from_name, reply_to, lender_id, attachments }: SendDirectEmailRequest = await req.json();

    console.log(`Sending email to: ${to}, from: ${from_email}, subject: ${subject}`);

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase environment variables missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Sanitize HTML for email compatibility
    const sanitizedHtml = sanitizeHtmlForEmail(html);

    // Build recipient list
    const personalizations: any = {
      to: [{ email: to }],
    };

    if (cc) {
      personalizations.cc = cc.split(',').map((email: string) => ({ email: email.trim() }));
    }

    const emailPayload: any = {
      personalizations: [personalizations],
      from: {
        email: from_email,
        name: from_name,
      },
      subject: subject,
      content: [
        {
          type: "text/html",
          value: sanitizedHtml,
        },
      ],
      custom_args: {
        lender_id: lender_id || "",
        email_type: lender_id ? "lender_outreach" : "direct_email"
      }
    };

    if (reply_to) {
      emailPayload.reply_to = { email: reply_to };
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments.map((att: { content: string; filename: string; type: string }) => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: 'attachment'
      }));
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid error:", errorText);
      throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
    }

    const providerMessageId = response.headers.get("X-Message-Id") || "";
    console.log("Email sent successfully, provider ID:", providerMessageId);

    // Atomic logging to email_logs and lender record
    if (lender_id) {
      try {
        // 1. Log the email with correct column names
        const { error: logError } = await supabase.from('email_logs').insert({
          lender_id: lender_id,
          to_email: to,
          from_email: from_email,
          subject: subject,
          html_body: sanitizedHtml,
          direction: 'Out',
          provider_message_id: providerMessageId,
          delivery_status: 'sent'
        });

        if (logError) {
          console.error("Error logging email to email_logs:", logError);
          throw logError;
        }

        console.log("Email logged successfully for lender:", lender_id);

        // 2. Update lender record
        const { error: updateError } = await supabase.from('lenders').update({
          last_email_sent_at: new Date().toISOString(),
          last_email_subject: subject,
          last_email_opened: false,        // Reset tracking for new email
          last_email_opened_at: null,      // Clear timestamp
          last_email_replied: false,       // Reset tracking for new email
          last_email_replied_at: null      // Clear timestamp
        }).eq('id', lender_id);

        if (updateError) {
          console.error("Error updating lender record:", updateError);
          throw updateError;
        }

        console.log("Lender record updated successfully");
      } catch (loggingError: any) {
        console.error("Error during email logging process:", loggingError);
        // Don't throw - email was sent successfully, just log the tracking error
        console.warn("Email sent but tracking failed. Please check email_logs table.");
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-direct-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});