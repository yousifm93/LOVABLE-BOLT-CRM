import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingTask {
  name: string;
  description: string | null;
}

interface SendDocumentRequestsPayload {
  borrowerEmail: string;
  borrowerName: string;
  pendingTasks: PendingTask[];
  portalUrl?: string; // Optional - will default to production URL
}

// Production portal URL - always use this for the email button
const PRODUCTION_PORTAL_URL = 'https://mortgagebolt.org/apply';

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SendDocumentRequestsPayload = await req.json();
    const { borrowerEmail, borrowerName, pendingTasks, portalUrl } = payload;

    if (!borrowerEmail || !pendingTasks || pendingTasks.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build the task list HTML
    const taskListHtml = pendingTasks
      .map(
        (task) => `
          <tr>
            <td style="padding: 12px 16px; background-color: #fefce8; border-left: 4px solid #EAB308; border-radius: 4px; margin-bottom: 8px;">
              <strong style="color: #1e293b; font-size: 15px;">${task.name}</strong>
              ${task.description ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">${task.description}</p>` : ''}
            </td>
          </tr>
          <tr><td style="height: 8px;"></td></tr>
        `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Yellow Header with Lightning Bolt -->
                <tr>
                  <td style="background-color: #EAB308; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <span style="font-size: 28px;">⚡</span>
                    <span style="color: #1e293b; font-size: 24px; font-weight: 700; margin-left: 8px; vertical-align: middle;">
                      Mortgage Bolt
                    </span>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">
                      Document Request
                    </h2>
                    
                    <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                      Hi ${borrowerName || 'there'},
                    </p>
                    
                    <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                      To continue processing your mortgage application, we need the following documents:
                    </p>
                    
                    <!-- Document List -->
                    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                      ${taskListHtml}
                    </table>
                    
                    <!-- CTA Button (Yellow) -->
                    <table role="presentation" style="width: 100%; margin: 24px 0;">
                      <tr>
                        <td align="center">
                          <a href="${PRODUCTION_PORTAL_URL}" 
                             style="display: inline-block; padding: 16px 48px; background-color: #EAB308; color: #1e293b; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                            Upload Documents
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 0; color: #64748b; font-size: 14px;">
                      If you have any questions, please don't hesitate to reach out.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 600;">
                      Mortgage Bolt
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                      848 Brickell Avenue, Suite 840, Miami, FL 33131<br>
                      (352) 328-9828
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send via SendGrid
    const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: borrowerEmail }] }],
        from: {
          email: "noreply@mortgagebolt.com",
          name: "Mortgage Bolt",
        },
        subject: `Document Request - ${pendingTasks.length} item${pendingTasks.length > 1 ? 's' : ''} needed`,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", errorText);
      throw new Error(`SendGrid error: ${sendGridResponse.status}`);
    }

    console.log(`Document requests email sent to ${borrowerEmail} for ${pendingTasks.length} items`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending document requests email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
