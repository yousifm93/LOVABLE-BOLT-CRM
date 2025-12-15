import { useState } from "react";
import { Mail, Inbox, Send, Star, Trash2, Archive, RefreshCw, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Placeholder email data
const placeholderEmails = [
  {
    id: "1",
    from: "John Smith",
    email: "john.smith@realestate.com",
    subject: "Re: Pre-approval for 123 Main St",
    preview: "Hi Yousif, I wanted to follow up on the pre-approval letter for my client...",
    date: "2:34 PM",
    unread: true,
    starred: false,
  },
  {
    id: "2",
    from: "Sarah Johnson",
    email: "sarah.j@mortgage.com",
    subject: "Rate Lock Confirmation - Martinez File",
    preview: "Please find attached the rate lock confirmation for the Martinez file...",
    date: "11:22 AM",
    unread: true,
    starred: true,
  },
  {
    id: "3",
    from: "Title Company",
    email: "closing@titleco.com",
    subject: "Clear to Close - Wilson Property",
    preview: "We have received all necessary documents and the file is now clear to close...",
    date: "Yesterday",
    unread: false,
    starred: false,
  },
  {
    id: "4",
    from: "Appraiser",
    email: "appraisals@valuepro.com",
    subject: "Appraisal Report - 456 Oak Ave",
    preview: "The appraisal report for the property at 456 Oak Avenue has been completed...",
    date: "Yesterday",
    unread: false,
    starred: false,
  },
  {
    id: "5",
    from: "Insurance Agent",
    email: "quotes@insureco.com",
    subject: "HOI Quote - Thompson Purchase",
    preview: "Attached is the homeowner's insurance quote for the Thompson purchase...",
    date: "Dec 13",
    unread: false,
    starred: true,
  },
];

const folders = [
  { name: "Inbox", icon: Inbox, count: 12 },
  { name: "Starred", icon: Star, count: 3 },
  { name: "Sent", icon: Send, count: 0 },
  { name: "Archive", icon: Archive, count: 0 },
  { name: "Trash", icon: Trash2, count: 0 },
];

export default function Email() {
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState("Inbox");
  const [selectedEmail, setSelectedEmail] = useState<typeof placeholderEmails[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const handleCompose = () => {
    setComposeData({ to: "", subject: "", body: "" });
    setIsComposeOpen(true);
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setComposeData({
      to: selectedEmail.email,
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.from} wrote:\n${selectedEmail.preview}`,
    });
    setIsComposeOpen(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setComposeData({
      to: "",
      subject: `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${selectedEmail.from} <${selectedEmail.email}>\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.preview}`,
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
    toast({
      title: "Inbox sync",
      description: "Full inbox synchronization requires IMAP integration. Outgoing emails via SMTP are working.",
    });
  };

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 h-[calc(100vh-60px)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email</h1>
          <p className="text-xs italic text-muted-foreground/70">yousif@mortgagebolt.org</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCompose}>
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100%-60px)]">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <div className="space-y-1">
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
                {folder.count > 0 && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    selectedFolder === folder.name
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        <div className="w-80 flex-shrink-0 border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {placeholderEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                    selectedEmail?.id === email.id && "bg-muted",
                    email.unread && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={cn(
                      "text-sm truncate",
                      email.unread ? "font-semibold" : "font-medium"
                    )}>
                      {email.from}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {email.date}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm truncate mb-1",
                    email.unread ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {email.preview}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Email Content */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col mr-4">
          {selectedEmail ? (
            <>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold mb-2">{selectedEmail.subject}</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedEmail.from}</p>
                    <p className="text-xs text-muted-foreground">{selectedEmail.email}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{selectedEmail.date}</span>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="prose prose-sm max-w-none text-foreground">
                  <p>{selectedEmail.preview}</p>
                  <p className="mt-4 text-muted-foreground italic">
                    [Full email content would be displayed here when connected to email server]
                  </p>
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
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
