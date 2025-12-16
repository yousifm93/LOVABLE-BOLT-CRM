import { useState, useEffect, useCallback } from "react";
import { Mail, Inbox, Send, Star, Trash2, Archive, RefreshCw, Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailTagPopover } from "@/components/email/EmailTagPopover";

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

interface EmailTagData {
  leadId: string;
  leadName: string;
  emailLogId: string;
  aiSummary: string | null;
  subject: string;
}

const folders = [
  { name: "Inbox", icon: Inbox },
  { name: "Starred", icon: Star },
  { name: "Sent", icon: Send },
  { name: "Archive", icon: Archive },
  { name: "Trash", icon: Trash2 },
];

// Strip forward prefixes from subject lines (belt-and-suspenders with backend)
const cleanSubject = (subject: string) => subject.replace(/^(Fwd:|FWD:|Fw:|FW:)\s*/i, '').trim();

// Normalize subject for matching - removes all forward/reply prefixes and lowercases
const cleanSubjectForMatching = (subject: string) => {
  return subject
    .replace(/^(Fwd:|FWD:|Fw:|FW:|Re:|RE:)\s*/gi, '')
    .toLowerCase()
    .trim();
};

// Create composite key from timestamp (to minute) + cleaned subject for reliable matching
const getMatchKey = (date: Date, subject: string) => {
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  return `${dateKey}|${cleanSubjectForMatching(subject)}`;
};

export default function Email() {
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState("Inbox");
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [emailContent, setEmailContent] = useState<{ body?: string; htmlBody?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [emailTagsMap, setEmailTagsMap] = useState<Map<string, EmailTagData>>(new Map());
  
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  // Fetch email_logs to match with IMAP emails for tagging
  const fetchEmailTags = useCallback(async (imapEmails: EmailMessage[]) => {
    try {
      // Get all recent email_logs with lead associations (no exact filtering)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: emailLogs, error } = await supabase
        .from('email_logs')
        .select(`
          id,
          from_email,
          subject,
          ai_summary,
          lead_id,
          timestamp,
          lead:leads(first_name, last_name)
        `)
        .not('lead_id', 'is', null)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching email logs for tags:', error);
        return;
      }

      // Create a map for quick lookup using composite keys (timestamp + subject)
      const tagsMap = new Map<string, EmailTagData>();
      
      for (const log of emailLogs || []) {
        if (log.lead_id && log.lead) {
          const lead = log.lead as { first_name: string; last_name: string };
          const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
          
          if (leadName) {
            const tagData: EmailTagData = {
              leadId: log.lead_id,
              leadName,
              emailLogId: log.id,
              aiSummary: log.ai_summary,
              subject: log.subject || '',
            };
            
            // Primary key: timestamp (to minute) + cleaned subject
            const timestamp = new Date(log.timestamp);
            const compositeKey = getMatchKey(timestamp, log.subject || '');
            tagsMap.set(compositeKey, tagData);
            
            // Fallback key: cleaned subject only (for when timestamps don't align)
            const subjectKey = cleanSubjectForMatching(log.subject || '');
            if (subjectKey && !tagsMap.has(subjectKey)) {
              tagsMap.set(subjectKey, tagData);
            }
          }
        }
      }
      
      setEmailTagsMap(tagsMap);
    } catch (error) {
      console.error('Error fetching email tags:', error);
    }
  }, []);

  const fetchEmails = useCallback(async (folder: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-emails-imap", {
        body: { folder, limit: 50 },
      });

      if (error) throw error;

      if (data?.success) {
        const fetchedEmails = data.emails || [];
        setEmails(fetchedEmails);
        setFolderCounts(prev => ({
          ...prev,
          [folder]: fetchedEmails.filter((e: EmailMessage) => e.unread).length || 0,
        }));
        
        // Fetch email tags for matching
        fetchEmailTags(fetchedEmails);
      } else {
        throw new Error(data?.error || "Failed to fetch emails");
      }
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Failed to fetch emails",
        description: error.message || "Could not connect to email server.",
        variant: "destructive",
      });
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchEmailTags]);

  const fetchEmailContent = async (uid: number) => {
    setIsLoadingContent(true);
    setEmailContent(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-emails-imap", {
        body: { folder: selectedFolder, fetchContent: true, messageUid: uid },
      });

      if (error) throw error;

      if (data?.success && data.email) {
        setEmailContent({
          body: data.email.body,
          htmlBody: data.email.htmlBody,
        });
      }
    } catch (error: any) {
      console.error("Error fetching email content:", error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    fetchEmails(selectedFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder]);

  const handleSelectEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
    fetchEmailContent(email.uid);
  };

  const handleCompose = () => {
    setComposeData({ to: "", subject: "", body: "" });
    setIsComposeOpen(true);
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setComposeData({
      to: selectedEmail.fromEmail,
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.from} wrote:\n${emailContent?.body || selectedEmail.snippet}`,
    });
    setIsComposeOpen(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setComposeData({
      to: "",
      subject: `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${selectedEmail.from} <${selectedEmail.fromEmail}>\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${emailContent?.body || selectedEmail.snippet}`,
    });
    setIsComposeOpen(true);
  };

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      toast({
        title: "Missing fields",
        description: "Please fill in the recipient and subject.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-ionos", {
        body: {
          to: composeData.to,
          subject: composeData.subject,
          body: composeData.body,
          html: `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${composeData.body.replace(/\n/g, '<br>')}</div>`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: `Email sent to ${composeData.to}`,
      });
      setIsComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "" });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send",
        description: error.message || "Could not send the email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = () => {
    fetchEmails(selectedFolder);
  };

  const [emailView, setEmailView] = useState<'main' | 'file'>('main');

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.fromEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (emailView === 'file') {
      const emailDate = new Date(email.date);
      const compositeKey = getMatchKey(emailDate, email.subject || '');
      let hasTag = emailTagsMap.has(compositeKey);
      if (!hasTag) {
        const subjectKey = cleanSubjectForMatching(email.subject || '');
        hasTag = emailTagsMap.has(subjectKey);
      }
      return matchesSearch && hasTag;
    }
    
    return matchesSearch;
  });

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email</h1>
            <p className="text-xs italic text-muted-foreground/70">yousif@mortgagebolt.org</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleCompose}
              className="h-8 w-8"
              title="Compose"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh} 
              disabled={isLoading}
              className="h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100%-60px)] gap-2">
        {/* Folder Sidebar - Fixed width */}
        <div className="w-[220px] flex-shrink-0 pr-2">
          <div className="h-full flex flex-col">
            <div className="space-y-1 flex-1">
              {folders.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => setSelectedFolder(folder.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    selectedFolder === folder.name
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <folder.icon className="h-4 w-4" />
                    {folder.name}
                  </div>
                  {(folderCounts[folder.name] || 0) > 0 && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      selectedFolder === folder.name
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {folderCounts[folder.name]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Email List - Fixed width */}
        <div className="w-[450px] flex-shrink-0 h-full border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-2 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={emailView === 'main' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailView('main')}
                className="h-7 text-xs px-3"
              >
                Main View
              </Button>
              <Button
                variant={emailView === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEmailView('file')}
                className="h-7 text-xs px-3"
              >
                File View
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No emails found
              </div>
            ) : (
              <div
                className="divide-y w-full max-w-full"
                style={{ width: "100%", maxWidth: "100%" }}
              >
                {filteredEmails.map((email) => (
                  <button
                    key={email.uid}
                    onClick={() => handleSelectEmail(email)}
                    className={cn(
                      "w-full max-w-full min-w-0 text-left p-3 hover:bg-muted/50 transition-colors overflow-hidden",
                      selectedEmail?.uid === email.uid && "bg-primary/10 border-l-2 border-primary"
                    )}
                  >
                    {(() => {
                      // Try composite key first (timestamp + subject), then fallback to subject-only
                      const emailDate = new Date(email.date);
                      const compositeKey = getMatchKey(emailDate, email.subject || '');
                      let tagData = emailTagsMap.get(compositeKey);
                      
                      // Fallback to subject-only matching
                      if (!tagData) {
                        const subjectKey = cleanSubjectForMatching(email.subject || '');
                        tagData = emailTagsMap.get(subjectKey);
                      }
                      return (
                        <div
                          className="flex items-center justify-between gap-2 mb-1 w-full min-w-0"
                          style={{ maxWidth: "calc(450px - 24px)" }}
                        >
                          <span
                            className={cn(
                              "text-sm truncate min-w-0",
                              tagData ? "flex-shrink" : "flex-1",
                              email.unread ? "font-semibold" : "font-medium"
                            )}
                            style={{ maxWidth: tagData ? '140px' : undefined }}
                          >
                            {email.from}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {tagData && (
                              <EmailTagPopover tagData={tagData} />
                            )}
                            {email.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{email.date}</span>
                          </div>
                        </div>
                      );
                    })()}
                    <p
                      className={cn(
                        "text-sm truncate min-w-0 mb-1 overflow-hidden",
                        email.unread ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {cleanSubject(email.subject)}
                    </p>
                    {email.snippet && (
                      <p className="text-xs text-muted-foreground truncate min-w-0 overflow-hidden">
                        {email.snippet}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Email Content - Takes remaining space */}
        <div className="flex-1 h-full border rounded-lg bg-card overflow-hidden flex flex-col mr-4">
          {selectedEmail ? (
            <>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold mb-2 truncate" title={selectedEmail.subject}>
                  {cleanSubject(selectedEmail.subject)}
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedEmail.from}</p>
                    <p className="text-xs text-muted-foreground">{selectedEmail.fromEmail}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{selectedEmail.date}</span>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {isLoadingContent ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : emailContent?.htmlBody ? (
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: emailContent.htmlBody }}
                  />
                ) : emailContent?.body ? (
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {emailContent.body}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-sm">
                    No content available
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 pb-6 border-t flex gap-2">
                <Button size="sm" variant="outline" onClick={handleReply}>
                  Reply
                </Button>
                <Button size="sm" variant="outline" onClick={handleForward}>
                  Forward
                </Button>
                <Button size="sm" variant="outline">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                placeholder="recipient@example.com"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Write your message..."
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                className="min-h-[200px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isSending}>
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
