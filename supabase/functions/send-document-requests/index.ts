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
  portalUrl: string;
}

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
          <li style="margin-bottom: 12px; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff8c00;">
            <strong style="color: #333;">${task.name}</strong>
            ${task.description ? `<p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">${task.description}</p>` : ''}
          </li>
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
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Document Request</h1>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hi ${borrowerName || 'there'},</p>
          
          <p style="font-size: 16px;">To continue processing your mortgage application, we need the following documents:</p>
          
          <ul style="list-style: none; padding: 0; margin: 20px 0;">
            ${taskListHtml}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" style="background-color: #ff8c00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Upload Documents
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            If you have any questions, please don't hesitate to reach out to us.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <div style="text-align: center;">
            <p style="font-size: 14px; color: #666; margin: 0;">
              <strong>Mortgage Bolt</strong><br>
              848 Brickell Avenue, Suite 840<br>
              Miami, Florida 33131<br>
              (352) 328-9828
            </p>
          </div>
        </div>
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
