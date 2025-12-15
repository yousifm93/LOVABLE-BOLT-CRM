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
  try {
    return str
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } catch {
    return str;
  }
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
function extractBodyFromPart(part: string): string {
  // Find the blank line that separates headers from body
  let bodyStart = part.indexOf('\r\n\r\n');
  if (bodyStart === -1) bodyStart = part.indexOf('\n\n');
  if (bodyStart === -1) return '';
  
  const headerEnd = bodyStart;
  bodyStart = part.indexOf('\r\n\r\n') !== -1 ? bodyStart + 4 : bodyStart + 2;
  
  const headers = part.substring(0, headerEnd).toLowerCase();
  let body = part.substring(bodyStart).trim();
  
  // Remove trailing boundary markers
  body = body.replace(/--[^\r\n]+--?\s*$/g, '').trim();
  
  // Decode based on transfer encoding
  if (headers.includes('content-transfer-encoding: quoted-printable')) {
    body = decodeQuotedPrintable(body);
  } else if (headers.includes('content-transfer-encoding: base64')) {
    body = decodeBase64(body);
  }
  
  return body;
}

// Parse email content with multiple fallback strategies
function parseEmailContent(source: string): { textBody: string; htmlBody: string } {
  console.log('[parseEmailContent] Starting parse, source length:', source.length);
  
  let textBody = '';
  let htmlBody = '';
  
  // Strategy 1: Look for boundary in headers (first 2000 chars for long headers)
  const headerArea = source.substring(0, 2000);
  const boundaryMatch = headerArea.match(/boundary=["']?([^"'\s;\r\n]+)["']?/i);
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    console.log('[parseEmailContent] Found boundary:', boundary);
    
    // Split by boundary
    const parts = source.split('--' + boundary);
    console.log('[parseEmailContent] Split into', parts.length, 'parts');
    
    for (let i = 1; i < parts.length && i < 20; i++) {
      const part = parts[i];
      if (part.startsWith('--')) continue; // End boundary
      
      // Find header/body separator
      let partHeaderEnd = part.indexOf('\r\n\r\n');
      if (partHeaderEnd === -1) partHeaderEnd = part.indexOf('\n\n');
      if (partHeaderEnd === -1) continue;
      
      const partHeaders = part.substring(0, partHeaderEnd).toLowerCase();
      
      // Skip attachments and embedded messages
      if (partHeaders.includes('attachment') || 
          partHeaders.includes('message/rfc822') ||
          partHeaders.includes('application/')) {
        continue;
      }
      
      // Check for nested multipart - process one level deep
      const nestedBoundaryMatch = partHeaders.match(/boundary=["']?([^"'\s;\r\n]+)["']?/i);
      if (nestedBoundaryMatch) {
        const nestedBoundary = nestedBoundaryMatch[1];
        const nestedParts = part.split('--' + nestedBoundary);
        
        for (let j = 1; j < nestedParts.length && j < 10; j++) {
          const nestedPart = nestedParts[j];
          if (nestedPart.startsWith('--')) continue;
          
          let nestedHeaderEnd = nestedPart.indexOf('\r\n\r\n');
          if (nestedHeaderEnd === -1) nestedHeaderEnd = nestedPart.indexOf('\n\n');
          if (nestedHeaderEnd === -1) continue;
          
          const nestedHeaders = nestedPart.substring(0, nestedHeaderEnd).toLowerCase();
          
          if (nestedHeaders.includes('text/html') && !htmlBody) {
            htmlBody = extractBodyFromPart(nestedPart);
            console.log('[parseEmailContent] Found HTML in nested part, length:', htmlBody.length);
          } else if (nestedHeaders.includes('text/plain') && !textBody) {
            textBody = extractBodyFromPart(nestedPart);
            console.log('[parseEmailContent] Found text in nested part, length:', textBody.length);
          }
        }
        continue;
      }
      
      // Direct content type check
      if (partHeaders.includes('text/html') && !htmlBody) {
        htmlBody = extractBodyFromPart(part);
        console.log('[parseEmailContent] Found HTML part, length:', htmlBody.length);
      } else if (partHeaders.includes('text/plain') && !textBody) {
        textBody = extractBodyFromPart(part);
        console.log('[parseEmailContent] Found text part, length:', textBody.length);
      }
    }
  }
  
  // Strategy 2: No boundary found or no content extracted - try direct extraction
  if (!textBody && !htmlBody) {
    console.log('[parseEmailContent] No multipart content found, trying direct extraction');
    
    // Find body after headers
    let headerEnd = source.indexOf('\r\n\r\n');
    if (headerEnd === -1) headerEnd = source.indexOf('\n\n');
    
    if (headerEnd > 0) {
      const headers = source.substring(0, headerEnd).toLowerCase();
      let body = source.substring(headerEnd + (source.indexOf('\r\n\r\n') !== -1 ? 4 : 2)).trim();
      
      // Decode if needed
      if (headers.includes('content-transfer-encoding: quoted-printable')) {
        body = decodeQuotedPrintable(body);
      } else if (headers.includes('content-transfer-encoding: base64')) {
        body = decodeBase64(body);
      }
      
      // Detect if HTML by looking for tags
      if (body.includes('<html') || body.includes('<body') || body.includes('<!DOCTYPE') || body.includes('<div') || body.includes('<table')) {
        htmlBody = body;
        console.log('[parseEmailContent] Direct extraction: detected HTML, length:', htmlBody.length);
      } else if (body.length > 0) {
        textBody = body;
        console.log('[parseEmailContent] Direct extraction: plain text, length:', textBody.length);
      }
    }
  }
  
  // Strategy 3: Last resort - grab anything after double newline
  if (!textBody && !htmlBody) {
    console.log('[parseEmailContent] Last resort extraction');
    let doubleNewline = source.indexOf('\r\n\r\n');
    if (doubleNewline === -1) doubleNewline = source.indexOf('\n\n');
    
    if (doubleNewline !== -1) {
      const content = source.substring(doubleNewline + 4).trim();
      if (content.length > 0) {
        // Check if looks like HTML
        if (content.includes('<') && content.includes('>') && (content.includes('<html') || content.includes('<body') || content.includes('<div') || content.includes('<p'))) {
          htmlBody = content;
        } else {
          textBody = content;
        }
        console.log('[parseEmailContent] Last resort got content, type:', htmlBody ? 'HTML' : 'text', 'length:', (htmlBody || textBody).length);
      }
    }
  }
  
  console.log('[parseEmailContent] Final result - text:', textBody.length, 'html:', htmlBody.length);
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
          
          // Use iterative parser (avoids stack overflow)
          const { textBody, htmlBody } = parseEmailContent(source);

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
