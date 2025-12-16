import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { ImapFlow } from "npm:imapflow@1.0.162";
import PostalMime from "npm:postal-mime";

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

// Parse email using PostalMime library - handles all MIME complexity automatically
async function parseEmailWithPostalMime(rawEmail: string): Promise<{ textBody: string; htmlBody: string }> {
  try {
    console.log('[parseEmailWithPostalMime] Starting parse, raw email length:', rawEmail.length);
    
    const parser = new PostalMime();
    const parsed = await parser.parse(rawEmail);
    
    console.log('[parseEmailWithPostalMime] Parse complete - text:', parsed.text?.length || 0, 'html:', parsed.html?.length || 0);
    
    return {
      textBody: parsed.text || '',
      htmlBody: parsed.html || '',
    };
  } catch (error) {
    console.error('[parseEmailWithPostalMime] Error:', error);
    return { textBody: '', htmlBody: '' };
  }
}

// Strip forward prefixes from subject lines
function cleanSubject(subject: string): string {
  return subject.replace(/^(Fwd:|FWD:|Fw:|FW:)\s*/i, '').trim();
}

// Extract original sender from forwarded email body
function extractOriginalSender(body: string, envelopeFrom: { name?: string; address?: string }): { from: string; fromEmail: string } {
  // Default fallback to envelope data
  const fallback = {
    from: envelopeFrom?.name || envelopeFrom?.address?.split("@")[0] || "Unknown",
    fromEmail: envelopeFrom?.address || ""
  };

  if (!body) return fallback;

  // Look for forwarded message patterns
  const forwardedPatterns = [
    // Gmail style: "---------- Forwarded message ----------\nFrom: Name <email@domain.com>"
    /[-]+\s*Forwarded message\s*[-]+[\s\S]*?From:\s*([^\n<]+)?<?([^>\n]+@[^>\n]+)>?/i,
    // Outlook style: "-------- Original Message --------\nFrom: Name <email@domain.com>"
    /[-]+\s*Original Message\s*[-]+[\s\S]*?From:\s*([^\n<]+)?<?([^>\n]+@[^>\n]+)>?/i,
    // Simple "From:" after forwarded header
    /From:\s*([^\n<]+)?<?([^>\n]+@[^>\n]+)>?/i,
  ];

  for (const pattern of forwardedPatterns) {
    const match = body.match(pattern);
    if (match && match[2]) {
      const email = match[2].trim();
      // Don't extract if it's our own forwarding address
      if (email.toLowerCase().includes('mortgagebolt.org') || email.toLowerCase().includes('mortgagebolt.com')) {
        continue;
      }
      const name = match[1]?.trim() || email.split('@')[0] || 'Unknown';
      return { from: name, fromEmail: email };
    }
  }

  return fallback;
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
          
          // Use PostalMime for proper MIME parsing
          const { textBody, htmlBody } = await parseEmailWithPostalMime(source);

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
          source: { start: 0, maxLength: 4000 }, // Fetch partial source for sender extraction
        })) {
          const envelope = message.envelope;
          const flags = message.flags || new Set();
          
          // Extract from address from envelope
          const fromAddr = envelope?.from?.[0];
          const envelopeFrom = { name: fromAddr?.name, address: fromAddr?.address };

          // Try to extract original sender from forwarded email body
          // Use PostalMime to decode the body first (handles MIME encoding)
          const sourcePreview = message.source?.toString() || "";
          let decodedBody = "";
          try {
            const parsed = await parseEmailWithPostalMime(sourcePreview);
            decodedBody = parsed.text || parsed.html || "";
          } catch (e) {
            console.log("PostalMime parse failed for sender extraction, using raw source");
            decodedBody = sourcePreview;
          }
          const { from: fromName, fromEmail } = extractOriginalSender(decodedBody, envelopeFrom);

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

          // Clean subject - strip Fwd: prefix
          const cleanedSubject = cleanSubject(envelope?.subject || "(No Subject)");

          emails.push({
            uid: message.uid,
            from: fromName,
            fromEmail: fromEmail,
            to: toEmail,
            subject: cleanedSubject,
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
