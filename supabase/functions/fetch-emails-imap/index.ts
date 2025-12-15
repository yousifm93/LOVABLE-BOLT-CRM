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

// Decode quoted-printable content
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Decode base64 content
function decodeBase64(str: string): string {
  try {
    return atob(str.replace(/\s/g, ''));
  } catch {
    return str;
  }
}

// Extract and decode body from MIME part
function extractBodyFromPart(part: string, isHtml: boolean = false): string {
  const transferEncodingMatch = part.match(/Content-Transfer-Encoding:\s*(\S+)/i);
  const encoding = transferEncodingMatch?.[1]?.toLowerCase() || '7bit';
  
  // Find body content after headers (double newline)
  const bodyStart = part.indexOf("\r\n\r\n");
  if (bodyStart === -1) {
    const altBodyStart = part.indexOf("\n\n");
    if (altBodyStart === -1) return "";
    let body = part.substring(altBodyStart + 2);
    body = body.replace(/--[^\r\n]+--?\s*$/g, '').trim();
    if (encoding === 'quoted-printable') {
      body = decodeQuotedPrintable(body);
    } else if (encoding === 'base64') {
      body = decodeBase64(body);
    }
    return body;
  }
  
  let body = part.substring(bodyStart + 4);
  
  // Remove trailing boundary markers
  body = body.replace(/--[^\r\n]+--?\s*$/g, '').trim();
  
  // Decode based on transfer encoding
  if (encoding === 'quoted-printable') {
    body = decodeQuotedPrintable(body);
  } else if (encoding === 'base64') {
    body = decodeBase64(body);
  }
  
  return body;
}

// Recursively parse multipart content to find text/plain and text/html parts
function parseMultipartContent(source: string, depth: number = 0): { textBody: string; htmlBody: string } {
  let textBody = "";
  let htmlBody = "";
  
  // Prevent infinite recursion
  if (depth > 5) {
    return { textBody, htmlBody };
  }
  
  // Find the boundary - only look in first 2000 chars to avoid matching in body
  const headerSection = source.substring(0, 2000);
  const boundaryMatch = headerSection.match(/boundary="([^"]+)"/i) || headerSection.match(/boundary=([^\s;\r\n]+)/i);
  
  if (!boundaryMatch) {
    // Not multipart, treat as single part
    const contentTypeMatch = source.match(/Content-Type:\s*([^;\r\n]+)/i);
    const contentType = contentTypeMatch?.[1]?.toLowerCase() || 'text/plain';
    
    if (contentType.includes("text/html")) {
      htmlBody = extractBodyFromPart(source, true);
    } else if (contentType.includes("text/plain")) {
      textBody = extractBodyFromPart(source, false);
    }
    return { textBody, htmlBody };
  }
  
  const boundary = boundaryMatch[1];
  const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = source.split(new RegExp(`--${escapedBoundary}`));
  
  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--' || part.length < 10) continue;
    
    const contentTypeMatch = part.match(/Content-Type:\s*([^;\r\n]+)/i);
    const contentType = contentTypeMatch?.[1]?.toLowerCase() || '';
    
    // Check if this part is itself multipart (nested)
    if (contentType.includes("multipart/") && depth < 5) {
      const nestedResult = parseMultipartContent(part, depth + 1);
      if (nestedResult.textBody && !textBody) textBody = nestedResult.textBody;
      if (nestedResult.htmlBody && !htmlBody) htmlBody = nestedResult.htmlBody;
    } else if (contentType.includes("text/plain") && !textBody) {
      // Skip if it looks like an attachment
      const dispositionMatch = part.match(/Content-Disposition:\s*(\S+)/i);
      if (!dispositionMatch || !dispositionMatch[1].toLowerCase().includes("attachment")) {
        textBody = extractBodyFromPart(part, false);
      }
    } else if (contentType.includes("text/html") && !htmlBody) {
      // Skip if it looks like an attachment
      const dispositionMatch = part.match(/Content-Disposition:\s*(\S+)/i);
      if (!dispositionMatch || !dispositionMatch[1].toLowerCase().includes("attachment")) {
        htmlBody = extractBodyFromPart(part, true);
      }
    }
  }
  
  return { textBody, htmlBody };
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
          
          // Use recursive multipart parser
          const { textBody, htmlBody } = parseMultipartContent(source);

          return new Response(
            JSON.stringify({
              success: true,
              email: {
                uid: messageUid,
                body: textBody,
                htmlBody: htmlBody,
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

          // Format date with America/New_York timezone
          const emailDate = envelope?.date ? new Date(envelope.date) : new Date();
          const now = new Date();
          
          // Convert to Eastern time for comparison
          const emailDateET = new Date(emailDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
          const nowET = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
          
          const isToday = emailDateET.toDateString() === nowET.toDateString();
          const yesterdayET = new Date(nowET);
          yesterdayET.setDate(yesterdayET.getDate() - 1);
          const isYesterday = emailDateET.toDateString() === yesterdayET.toDateString();
          
          let dateStr: string;
          if (isToday) {
            dateStr = emailDate.toLocaleTimeString("en-US", { 
              hour: "numeric", 
              minute: "2-digit",
              timeZone: "America/New_York"
            });
          } else if (isYesterday) {
            dateStr = "Yesterday";
          } else {
            dateStr = emailDate.toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric",
              timeZone: "America/New_York"
            });
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
