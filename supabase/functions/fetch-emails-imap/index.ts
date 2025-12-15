import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { ImapFlow } from "npm:imapflow@1.0.162";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAP_HOST = "imap.ionos.com";
const IMAP_PORT = 993;
const EMAIL_USER = "yousif@mortgagebolt.org";

interface FetchEmailsRequest {
  folder?: string;
  limit?: number;
  fetchContent?: boolean;
  messageUid?: number;
}

interface EmailMessage {
  uid: number;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
  hasAttachments: boolean;
  body?: string;
  htmlBody?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const password = Deno.env.get("IONOS_EMAIL_PASSWORD");
    if (!password) {
      throw new Error("IONOS_EMAIL_PASSWORD not configured");
    }

    const { folder = "INBOX", limit = 50, fetchContent = false, messageUid }: FetchEmailsRequest = await req.json().catch(() => ({}));
    
    console.log(`Connecting to IMAP: ${IMAP_HOST}:${IMAP_PORT} as ${EMAIL_USER}`);
    console.log(`Folder: ${folder}, Limit: ${limit}, FetchContent: ${fetchContent}, MessageUid: ${messageUid}`);

    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: {
        user: EMAIL_USER,
        pass: password,
      },
      logger: false,
    });

    await client.connect();
    console.log("Connected to IMAP server");

    // Map folder names to IMAP folder paths
    const folderMap: Record<string, string> = {
      "Inbox": "INBOX",
      "Sent": "Sent",
      "Starred": "INBOX", // Will filter by flag
      "Archive": "Archive",
      "Trash": "Trash",
    };

    const imapFolder = folderMap[folder] || folder;
    
    let lock;
    try {
      lock = await client.getMailboxLock(imapFolder);
    } catch (e) {
      // Try common variations
      if (imapFolder === "Sent") {
        lock = await client.getMailboxLock("INBOX.Sent").catch(() => client.getMailboxLock("Sent Items"));
      } else if (imapFolder === "Trash") {
        lock = await client.getMailboxLock("INBOX.Trash").catch(() => client.getMailboxLock("Deleted Items"));
      } else {
        throw e;
      }
    }

    const emails: EmailMessage[] = [];

    try {
      // If fetching specific message content
      if (fetchContent && messageUid) {
        console.log(`Fetching full content for UID: ${messageUid}`);
        const message = await client.fetchOne(String(messageUid), {
          source: true,
          envelope: true,
          flags: true,
        }, { uid: true });

        if (message) {
          const source = message.source?.toString() || "";
          
          // Extract body from source (basic parsing)
          let textBody = "";
          let htmlBody = "";
          
          // Simple extraction - look for body content
          const boundaryMatch = source.match(/boundary="([^"]+)"/);
          if (boundaryMatch) {
            const boundary = boundaryMatch[1];
            const parts = source.split(`--${boundary}`);
            for (const part of parts) {
              if (part.includes("Content-Type: text/plain")) {
                const bodyStart = part.indexOf("\r\n\r\n");
                if (bodyStart > -1) {
                  textBody = part.substring(bodyStart + 4).replace(/--$/, "").trim();
                }
              } else if (part.includes("Content-Type: text/html")) {
                const bodyStart = part.indexOf("\r\n\r\n");
                if (bodyStart > -1) {
                  htmlBody = part.substring(bodyStart + 4).replace(/--$/, "").trim();
                }
              }
            }
          } else {
            // Single part message
            const bodyStart = source.indexOf("\r\n\r\n");
            if (bodyStart > -1) {
              textBody = source.substring(bodyStart + 4);
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              email: {
                uid: messageUid,
                body: textBody,
                htmlBody: htmlBody,
                source: source.substring(0, 50000), // Limit source size
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fetch email list
      console.log(`Fetching up to ${limit} emails from ${imapFolder}`);
      
      // Get total messages in folder
      const status = client.mailbox;
      const totalMessages = status?.exists || 0;
      console.log(`Total messages in folder: ${totalMessages}`);

      if (totalMessages > 0) {
        // Calculate range for most recent emails
        const startSeq = Math.max(1, totalMessages - limit + 1);
        const range = `${startSeq}:${totalMessages}`;
        
        console.log(`Fetching sequence range: ${range}`);

        for await (const message of client.fetch(range, {
          envelope: true,
          flags: true,
          bodyStructure: true,
        })) {
          const envelope = message.envelope;
          const flags = message.flags || new Set();
          
          // Extract from address
          const fromAddr = envelope?.from?.[0];
          const fromName = fromAddr?.name || fromAddr?.address?.split("@")[0] || "Unknown";
          const fromEmail = fromAddr?.address || "";

          // Extract to address
          const toAddr = envelope?.to?.[0];
          const toEmail = toAddr?.address || "";

          // Check for attachments (simplified check)
          const hasAttachments = message.bodyStructure?.childNodes?.some(
            (node: any) => node.disposition === "attachment"
          ) || false;

          // Format date
          const emailDate = envelope?.date ? new Date(envelope.date) : new Date();
          const now = new Date();
          const isToday = emailDate.toDateString() === now.toDateString();
          const isYesterday = emailDate.toDateString() === new Date(now.getTime() - 86400000).toDateString();
          
          let dateStr: string;
          if (isToday) {
            dateStr = emailDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          } else if (isYesterday) {
            dateStr = "Yesterday";
          } else {
            dateStr = emailDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }

          emails.push({
            uid: message.uid,
            from: fromName,
            fromEmail: fromEmail,
            to: toEmail,
            subject: envelope?.subject || "(No Subject)",
            date: dateStr,
            snippet: "", // Would need to fetch body for snippet
            unread: !flags.has("\\Seen"),
            starred: flags.has("\\Flagged"),
            hasAttachments,
          });
        }
      }

      // Reverse to show newest first
      emails.reverse();

      // If starred folder, filter to only starred
      const filteredEmails = folder === "Starred" 
        ? emails.filter(e => e.starred)
        : emails;

      console.log(`Fetched ${filteredEmails.length} emails`);

      return new Response(
        JSON.stringify({
          success: true,
          folder: imapFolder,
          total: totalMessages,
          emails: filteredEmails,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } finally {
      lock.release();
      await client.logout();
      console.log("Disconnected from IMAP server");
    }

  } catch (error: any) {
    console.error("Error in fetch-emails-imap:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
