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
      .replace(/=\r?\n/g, '') // Remove soft line breaks
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

// Clean MIME artifacts from content
function cleanMimeArtifacts(content: string): string {
  // Remove any remaining boundary markers
  content = content.replace(/^--+[^\r\n]*-*\s*$/gm, '');
  // Remove Content-Type headers that leaked in
  content = content.replace(/^Content-Type:[^\r\n]*\r?\n/gim, '');
  content = content.replace(/^Content-Transfer-Encoding:[^\r\n]*\r?\n/gim, '');
  content = content.replace(/^Content-Disposition:[^\r\n]*\r?\n/gim, '');
  // Clean up multiple newlines
  content = content.replace(/(\r?\n){3,}/g, '\n\n');
  return content.trim();
}

// Extract body content from a MIME part, stripping headers
function extractPartBody(part: string, decode: boolean = true): { content: string; isHtml: boolean; encoding: string } {
  // Find the double newline that separates headers from body
  let headerEnd = part.indexOf('\r\n\r\n');
  let separator = '\r\n\r\n';
  if (headerEnd === -1) {
    headerEnd = part.indexOf('\n\n');
    separator = '\n\n';
  }
  
  if (headerEnd === -1) {
    // No headers found, treat entire thing as body
    return { content: part.trim(), isHtml: part.includes('<html') || part.includes('<body'), encoding: '' };
  }
  
  const headers = part.substring(0, headerEnd);
  let body = part.substring(headerEnd + separator.length);
  
  // Determine content type and encoding from headers
  const headersLower = headers.toLowerCase();
  const isHtml = headersLower.includes('text/html');
  const isQuotedPrintable = headersLower.includes('quoted-printable');
  const isBase64 = headersLower.includes('base64');
  
  // Remove trailing boundary markers from body
  body = body.replace(/\r?\n--[^\r\n]+--?\s*$/g, '').trim();
  
  // Decode if requested
  if (decode) {
    if (isQuotedPrintable) {
      body = decodeQuotedPrintable(body);
    } else if (isBase64) {
      body = decodeBase64(body);
    }
  }
  
  return { 
    content: body.trim(), 
    isHtml, 
    encoding: isQuotedPrintable ? 'qp' : (isBase64 ? 'base64' : '') 
  };
}

// Parse email content with robust MIME handling
function parseEmailContent(source: string): { textBody: string; htmlBody: string } {
  console.log('[parseEmailContent] Starting parse, source length:', source.length);
  
  let textBody = '';
  let htmlBody = '';
  
  // Find boundary - check first 3000 chars (some emails have very long headers)
  const headerArea = source.substring(0, 3000);
  const boundaryMatch = headerArea.match(/boundary=["']?([^"'\s;\r\n]+)["']?/i);
  
  if (boundaryMatch) {
    // Get boundary and ensure we handle the actual delimiter format
    let boundary = boundaryMatch[1];
    console.log('[parseEmailContent] Found boundary:', boundary);
    
    // The actual boundary in the email body is prefixed with --
    const boundaryDelimiter = '--' + boundary;
    
    // Split by boundary delimiter
    const parts = source.split(boundaryDelimiter);
    console.log('[parseEmailContent] Split into', parts.length, 'parts');
    
    // Skip first part (preamble before first boundary)
    for (let i = 1; i < parts.length; i++) {
      let part = parts[i];
      
      // Check if this is the closing boundary
      if (part.startsWith('--')) continue;
      
      // Remove leading newline if present
      if (part.startsWith('\r\n')) part = part.substring(2);
      else if (part.startsWith('\n')) part = part.substring(1);
      
      // Get headers for this part
      let partHeaderEnd = part.indexOf('\r\n\r\n');
      if (partHeaderEnd === -1) partHeaderEnd = part.indexOf('\n\n');
      if (partHeaderEnd === -1) continue;
      
      const partHeaders = part.substring(0, partHeaderEnd).toLowerCase();
      
      // Skip attachments
      if (partHeaders.includes('attachment') || 
          partHeaders.includes('message/rfc822') ||
          partHeaders.includes('application/') ||
          partHeaders.includes('image/')) {
        continue;
      }
      
      // Check for nested multipart (alternative or related)
      const nestedBoundaryMatch = part.match(/boundary=["']?([^"'\s;\r\n]+)["']?/i);
      if (nestedBoundaryMatch && partHeaders.includes('multipart/')) {
        const nestedBoundary = nestedBoundaryMatch[1];
        const nestedDelimiter = '--' + nestedBoundary;
        const nestedParts = part.split(nestedDelimiter);
        
        console.log('[parseEmailContent] Found nested multipart with', nestedParts.length, 'parts');
        
        for (let j = 1; j < nestedParts.length; j++) {
          let nestedPart = nestedParts[j];
          if (nestedPart.startsWith('--')) continue;
          if (nestedPart.startsWith('\r\n')) nestedPart = nestedPart.substring(2);
          else if (nestedPart.startsWith('\n')) nestedPart = nestedPart.substring(1);
          
          const { content, isHtml } = extractPartBody(nestedPart);
          
          if (isHtml && content && !htmlBody) {
            htmlBody = cleanMimeArtifacts(content);
            console.log('[parseEmailContent] Found HTML in nested part, length:', htmlBody.length);
          } else if (!isHtml && content && !textBody) {
            textBody = cleanMimeArtifacts(content);
            console.log('[parseEmailContent] Found text in nested part, length:', textBody.length);
          }
        }
        continue;
      }
      
      // Direct text/html or text/plain part
      const { content, isHtml } = extractPartBody(part);
      
      if (isHtml && content && !htmlBody) {
        htmlBody = cleanMimeArtifacts(content);
        console.log('[parseEmailContent] Found HTML part, length:', htmlBody.length);
      } else if (!isHtml && content && !textBody && partHeaders.includes('text/plain')) {
        textBody = cleanMimeArtifacts(content);
        console.log('[parseEmailContent] Found text part, length:', textBody.length);
      }
    }
  }
  
  // Fallback: No multipart boundary or no content found
  if (!textBody && !htmlBody) {
    console.log('[parseEmailContent] No multipart content, trying direct extraction');
    
    // Find where headers end
    let headerEnd = source.indexOf('\r\n\r\n');
    let sepLen = 4;
    if (headerEnd === -1) {
      headerEnd = source.indexOf('\n\n');
      sepLen = 2;
    }
    
    if (headerEnd > 0) {
      const headers = source.substring(0, headerEnd).toLowerCase();
      let body = source.substring(headerEnd + sepLen).trim();
      
      // Decode if needed
      if (headers.includes('quoted-printable')) {
        body = decodeQuotedPrintable(body);
      } else if (headers.includes('base64')) {
        body = decodeBase64(body);
      }
      
      // Clean any MIME artifacts
      body = cleanMimeArtifacts(body);
      
      // Detect HTML
      if (body.includes('<html') || body.includes('<body') || body.includes('<!DOCTYPE') || 
          (body.includes('<div') && body.includes('</div>')) ||
          (body.includes('<table') && body.includes('</table>'))) {
        htmlBody = body;
        console.log('[parseEmailContent] Direct extraction: HTML, length:', htmlBody.length);
      } else if (body.length > 0) {
        textBody = body;
        console.log('[parseEmailContent] Direct extraction: text, length:', textBody.length);
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
