import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, Inbox, Send, Star, Trash2, Archive, RefreshCw, Search, Plus, Loader2, AlertCircle, CheckCircle, Paperclip, FileText, Download, GripVertical, Square, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailTagPopover } from "@/components/email/EmailTagPopover";
import { LenderMarketingPopover } from "@/components/email/LenderMarketingPopover";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, DragStartEvent } from '@dnd-kit/core';

interface EmailAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
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
  attachments?: EmailAttachment[];
}

interface EmailTagData {
  leadId: string;
  leadName: string;
  emailLogId: string;
  aiSummary: string | null;
  subject: string;
}

interface LenderMarketingData {
  emailLogId: string;
  category: string | null;
}

interface EmailCategory {
  id: string;
  email_uid: number;
  email_folder: string;
  category: 'needs_attention' | 'reviewed_file' | 'reviewed_lender_marketing' | 'reviewed_na';
}

const folders = [
  { name: "Inbox", icon: Inbox },
  { name: "Starred", icon: Star },
  { name: "Sent", icon: Send },
  { name: "Archive", icon: Archive },
  { name: "Trash", icon: Trash2 },
];

const customCategories = [
  { name: "Needs Attention", icon: AlertCircle, key: 'needs_attention' as const, color: 'text-amber-500' },
  { name: "Reviewed - File", icon: CheckCircle, key: 'reviewed_file' as const, color: 'text-green-500' },
  { name: "Reviewed - Lender Mktg", icon: CheckCircle, key: 'reviewed_lender_marketing' as const, color: 'text-blue-500' },
  { name: "Reviewed - N/A", icon: CheckCircle, key: 'reviewed_na' as const, color: 'text-gray-500' },
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

// Draggable email item component
function DraggableEmailItem({ email, isSelected, onClick, children, showCheckbox, isChecked, onCheckChange }: {
  email: EmailMessage;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean, shiftKey: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `email-${email.uid}`,
    data: { email },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full max-w-full min-w-0 text-left p-3 hover:bg-muted/50 transition-colors overflow-hidden cursor-pointer relative group",
        isSelected && "bg-primary/10 border-l-2 border-primary",
        isDragging && "opacity-50 z-50"
      )}
      onClick={onClick}
    >
      {showCheckbox && (
        <div 
          className="absolute left-1 top-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => onCheckChange?.(!!checked, false)}
            onClick={(e) => {
              e.stopPropagation();
              onCheckChange?.(!isChecked, e.shiftKey);
            }}
            className="h-4 w-4"
          />
        </div>
      )}
      <div 
        {...listeners} 
        {...attributes}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing",
          showCheckbox ? "left-6" : "left-1"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

// Droppable folder/category component
function DroppableFolder({ id, isActive, children }: {
  id: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "transition-colors rounded-md",
        isOver && "ring-2 ring-primary bg-primary/10"
      )}
    >
      {children}
    </div>
  );
}

export default function Email() {
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState("Inbox");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [emailContent, setEmailContent] = useState<{ body?: string; htmlBody?: string; attachments?: EmailAttachment[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [emailTagsMap, setEmailTagsMap] = useState<Map<string, EmailTagData>>(new Map());
  const [lenderMarketingMap, setLenderMarketingMap] = useState<Map<string, LenderMarketingData>>(new Map());
  const [emailCategories, setEmailCategories] = useState<EmailCategory[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({ 
    needs_attention: 0, 
    reviewed_file: 0, 
    reviewed_lender_marketing: 0, 
    reviewed_na: 0 
  });
  const [draggedEmail, setDraggedEmail] = useState<EmailMessage | null>(null);
  
  // Multi-select state
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);
  
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const [emailView, setEmailView] = useState<'main' | 'file' | 'lender-marketing'>('main');

  // Fetch email categories from database
  const fetchEmailCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('email_categories')
        .select('*');
      
      if (error) throw error;
      
      setEmailCategories((data || []) as EmailCategory[]);
      
      // Calculate counts for all 4 categories
      const counts = { 
        needs_attention: 0, 
        reviewed_file: 0, 
        reviewed_lender_marketing: 0, 
        reviewed_na: 0 
      };
      for (const cat of (data || [])) {
        if (counts.hasOwnProperty(cat.category)) {
          counts[cat.category as keyof typeof counts]++;
        }
      }
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching email categories:', error);
    }
  }, []);

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
          is_lender_marketing,
          lender_marketing_category,
          lead:leads(first_name, last_name)
        `)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching email logs for tags:', error);
        return;
      }

      // Create maps for quick lookup using composite keys (timestamp + subject)
      const tagsMap = new Map<string, EmailTagData>();
      const marketingMap = new Map<string, LenderMarketingData>();
      
      for (const log of emailLogs || []) {
        // Primary key: timestamp (to minute) + cleaned subject
        const timestamp = new Date(log.timestamp);
        const compositeKey = getMatchKey(timestamp, log.subject || '');
        const subjectKey = cleanSubjectForMatching(log.subject || '');
        
        // Handle lead tags
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
            
            tagsMap.set(compositeKey, tagData);
            if (subjectKey && !tagsMap.has(subjectKey)) {
              tagsMap.set(subjectKey, tagData);
            }
          }
        }
        
        // Handle lender marketing tags
        if (log.is_lender_marketing) {
          const marketingData: LenderMarketingData = {
            emailLogId: log.id,
            category: log.lender_marketing_category,
          };
          marketingMap.set(compositeKey, marketingData);
          if (subjectKey && !marketingMap.has(subjectKey)) {
            marketingMap.set(subjectKey, marketingData);
          }
        }
      }
      
      setEmailTagsMap(tagsMap);
      setLenderMarketingMap(marketingMap);
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

  // Fetch attachments from documents table (primary) or email_logs (fallback)
  const fetchAttachments = useCallback(async (email: EmailMessage) => {
    try {
      const emailDate = new Date(email.date);
      if (isNaN(emailDate.getTime())) {
        console.error('Invalid email date:', email.date);
        return [];
      }
      
      const startDate = new Date(emailDate.getTime() - 5 * 60 * 1000); // 5 minutes before
      const endDate = new Date(emailDate.getTime() + 5 * 60 * 1000); // 5 minutes after
      
      // First get email_log to find lead_id
      const { data: emailLog, error: logError } = await supabase
        .from('email_logs')
        .select('id, lead_id, attachments_json')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .ilike('subject', `%${cleanSubjectForMatching(email.subject)}%`)
        .limit(1)
        .single();

      if (logError && logError.code !== 'PGRST116') {
        console.error('Error fetching email log:', logError);
      }

      // If we have a lead_id, fetch documents with actual URLs
      if (emailLog?.lead_id) {
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select('file_name, file_url, mime_type, size_bytes')
          .eq('lead_id', emailLog.lead_id)
          .eq('source', 'Email')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        
        if (!docsError && documents && documents.length > 0) {
          return documents.map(doc => ({
            name: doc.file_name,
            type: doc.mime_type || 'application/octet-stream',
            size: doc.size_bytes || 0,
            url: doc.file_url,
          }));
        }
      }
      
      // Fallback to attachments_json (without URLs for download)
      if (emailLog?.attachments_json) {
        const attachments = emailLog.attachments_json as any[];
        return attachments.map((att: any) => ({
          name: att.filename || att.name || 'Unknown',
          type: att.contentType || att.type || 'application/octet-stream',
          size: att.size || 0,
          url: att.url || null,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }
  }, []);

  // Fixed: Pass email object directly to avoid timing bug
  const fetchEmailContent = async (email: EmailMessage) => {
    setIsLoadingContent(true);
    setEmailContent(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-emails-imap", {
        body: { folder: selectedFolder, fetchContent: true, messageUid: email.uid },
      });

      if (error) throw error;

      if (data?.success && data.email) {
        // Pass the email directly - no timing issue!
        const attachments = await fetchAttachments(email);
        
        setEmailContent({
          body: data.email.body,
          htmlBody: data.email.htmlBody,
          attachments,
        });
      }
    } catch (error: any) {
      console.error("Error fetching email content:", error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    fetchEmailCategories();
  }, [fetchEmailCategories]);

  useEffect(() => {
    if (!selectedCategory) {
      fetchEmails(selectedFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, selectedCategory]);

  const handleSelectEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
    fetchEmailContent(email); // Pass email directly
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
    if (selectedCategory) {
      fetchEmailCategories();
    } else {
      fetchEmails(selectedFolder);
    }
  };

  // Handle category selection
  const handleCategoryClick = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    setSelectedFolder(""); // Deselect folder
  };

  // Handle folder selection
  const handleFolderClick = (folderName: string) => {
    setSelectedFolder(folderName);
    setSelectedCategory(null); // Deselect category
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const email = (event.active.data.current as any)?.email;
    setDraggedEmail(email || null);
  };

  // Helper to check if email has file tag
  const hasFileTag = (email: EmailMessage) => {
    const emailDate = new Date(email.date);
    const compositeKey = getMatchKey(emailDate, email.subject || '');
    if (emailTagsMap.has(compositeKey)) return true;
    const subjectKey = cleanSubjectForMatching(email.subject || '');
    return emailTagsMap.has(subjectKey);
  };

  // Helper to check if email has lender marketing tag
  const hasMarketingTag = (email: EmailMessage) => {
    return !!getLenderMarketingData(email);
  };

  // Handle drag end - add email to category with smart detection
  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedEmail(null);
    
    const { active, over } = event;
    if (!over) return;

    const email = (active.data.current as any)?.email as EmailMessage;
    if (!email) return;

    let dropTarget = over.id as string;
    
    // Smart auto-detection for generic "reviewed" drops
    if (dropTarget.startsWith('reviewed') && !dropTarget.includes('_')) {
      // Auto-detect based on tags
      if (hasFileTag(email)) {
        dropTarget = 'reviewed_file';
      } else if (hasMarketingTag(email)) {
        dropTarget = 'reviewed_lender_marketing';
      } else {
        dropTarget = 'reviewed_na';
      }
    }
    
    // Check if dropping on a custom category
    if (['needs_attention', 'reviewed_file', 'reviewed_lender_marketing', 'reviewed_na'].includes(dropTarget)) {
      await assignEmailToCategory(email, dropTarget as EmailCategory['category']);
    } else if (['Archive', 'Trash', 'Starred'].includes(dropTarget)) {
      toast({
        title: "IMAP folder move",
        description: "Moving emails between IMAP folders is not yet supported.",
      });
    }
  };

  // Assign email to category
  const assignEmailToCategory = async (email: EmailMessage, category: EmailCategory['category']) => {
    try {
      const existing = emailCategories.find(
        c => c.email_uid === email.uid && c.email_folder === (selectedFolder || 'Inbox')
      );

      if (existing) {
        const { error } = await supabase
          .from('email_categories')
          .update({ category, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_categories')
          .insert({
            email_uid: email.uid,
            email_folder: selectedFolder || 'Inbox',
            category,
          });
        if (error) throw error;
      }

      const categoryName = customCategories.find(c => c.key === category)?.name || category;
      toast({
        title: "Email categorized",
        description: `Moved to ${categoryName}`,
      });

      fetchEmailCategories();
    } catch (error: any) {
      console.error('Error categorizing email:', error);
      toast({
        title: "Failed to categorize",
        description: error.message || "Could not move the email.",
        variant: "destructive",
      });
    }
  };

  // Multi-select: Toggle email selection with shift support
  const toggleEmailSelection = (uid: number, shiftKey: boolean, emailIndex: number) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      
      if (shiftKey && lastSelectedIndex.current !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex.current, emailIndex);
        const end = Math.max(lastSelectedIndex.current, emailIndex);
        for (let i = start; i <= end; i++) {
          if (filteredEmails[i]) {
            newSet.add(filteredEmails[i].uid);
          }
        }
      } else {
        // Single toggle
        if (newSet.has(uid)) {
          newSet.delete(uid);
        } else {
          newSet.add(uid);
        }
      }
      
      lastSelectedIndex.current = emailIndex;
      return newSet;
    });
  };

  // Bulk move handler
  const handleBulkMove = async (targetCategory: EmailCategory['category']) => {
    if (selectedEmails.size === 0) return;
    
    try {
      const emailsToMove = emails.filter(e => selectedEmails.has(e.uid));
      
      for (const email of emailsToMove) {
        const existing = emailCategories.find(
          c => c.email_uid === email.uid && c.email_folder === (selectedFolder || 'Inbox')
        );

        if (existing) {
          await supabase
            .from('email_categories')
            .update({ category: targetCategory, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('email_categories')
            .insert({
              email_uid: email.uid,
              email_folder: selectedFolder || 'Inbox',
              category: targetCategory,
            });
        }
      }
      
      const categoryName = customCategories.find(c => c.key === targetCategory)?.name || targetCategory;
      toast({
        title: `Moved ${selectedEmails.size} emails`,
        description: `Moved to ${categoryName}`,
      });
      
      setSelectedEmails(new Set());
      fetchEmailCategories();
    } catch (error: any) {
      console.error('Error bulk moving emails:', error);
      toast({
        title: "Failed to move emails",
        description: error.message || "Could not move the emails.",
        variant: "destructive",
      });
    }
  };

  // Handle bulk IMAP folder actions (not yet supported)
  const handleBulkImapMove = (target: string) => {
    toast({
      title: "IMAP folder move",
      description: "Moving emails between IMAP folders is not yet supported.",
    });
  };

  // Helper to get lender marketing data for an email
  const getLenderMarketingData = (email: EmailMessage) => {
    const emailDate = new Date(email.date);
    const compositeKey = getMatchKey(emailDate, email.subject || '');
    let data = lenderMarketingMap.get(compositeKey);
    if (!data) {
      const subjectKey = cleanSubjectForMatching(email.subject || '');
      data = lenderMarketingMap.get(subjectKey);
    }
    return data;
  };

  // Get emails for selected category
  const getCategoryEmails = () => {
    if (!selectedCategory) return [];
    
    const categoryEmailUids = emailCategories
      .filter(c => c.category === selectedCategory)
      .map(c => c.email_uid);
    
    return emails.filter(e => categoryEmailUids.includes(e.uid));
  };

  // Create sets for quick lookup
  const categorizedUids = new Set(emailCategories.map(c => c.email_uid));
  const reviewedUids = new Set(
    emailCategories
      .filter(c => c.category.startsWith('reviewed'))
      .map(c => c.email_uid)
  );

  // Helper to get review status category for an email
  const getEmailCategory = (email: EmailMessage) => {
    return emailCategories.find(c => c.email_uid === email.uid)?.category;
  };

  const filteredEmails = selectedCategory 
    ? getCategoryEmails()
    : emails.filter(email => {
        const matchesSearch = email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.fromEmail.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (emailView === 'file') {
          // FILE VIEW: Show tagged emails regardless of category status
          const emailDate = new Date(email.date);
          const compositeKey = getMatchKey(emailDate, email.subject || '');
          let hasTag = emailTagsMap.has(compositeKey);
          if (!hasTag) {
            const subjectKey = cleanSubjectForMatching(email.subject || '');
            hasTag = emailTagsMap.has(subjectKey);
          }
          return matchesSearch && hasTag; // Remove isNotCategorized check
        }
        
        if (emailView === 'lender-marketing') {
          // LENDER MARKETING VIEW: Show tagged emails regardless of category status
          return matchesSearch && !!getLenderMarketingData(email); // Remove isNotCategorized check
        }
        
        // MAIN VIEW: Exclude categorized emails
        const isNotCategorized = !categorizedUids.has(email.uid);
        return matchesSearch && isNotCategorized;
      });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const showMultiSelect = !selectedCategory; // Show checkboxes when not in a category view

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                  <DroppableFolder key={folder.name} id={folder.name} isActive={selectedFolder === folder.name}>
                    <button
                      onClick={() => handleFolderClick(folder.name)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                        selectedFolder === folder.name && !selectedCategory
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
                          selectedFolder === folder.name && !selectedCategory
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted-foreground/20 text-muted-foreground"
                        )}>
                          {folderCounts[folder.name]}
                        </span>
                      )}
                    </button>
                  </DroppableFolder>
                ))}

                {/* Separator and Categories */}
                <Separator className="my-3" />
                <p className="text-xs font-medium text-muted-foreground px-3 mb-2">CATEGORIES</p>
                
                {customCategories.map((category) => (
                  <DroppableFolder key={category.key} id={category.key} isActive={selectedCategory === category.key}>
                    <button
                      onClick={() => handleCategoryClick(category.key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                        selectedCategory === category.key
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <category.icon className={cn(
                          "h-4 w-4",
                          selectedCategory !== category.key && category.color
                        )} />
                        <span className="truncate">{category.name}</span>
                      </div>
                      {(categoryCounts[category.key] || 0) > 0 && (
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full",
                          selectedCategory === category.key
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted-foreground/20 text-muted-foreground"
                        )}>
                          {categoryCounts[category.key]}
                        </span>
                      )}
                    </button>
                  </DroppableFolder>
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
              {!selectedCategory && (
                <div className="flex gap-1 flex-wrap">
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
                  <Button
                    variant={emailView === 'lender-marketing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEmailView('lender-marketing')}
                    className="h-7 text-xs px-3"
                  >
                    Lender Marketing
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Action Toolbar */}
            {selectedEmails.size > 0 && (
              <div className="p-2 bg-muted/50 border-b flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{selectedEmails.size} selected</span>
                <Separator orientation="vertical" className="h-5" />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkImapMove('starred')}>
                  <Star className="h-3 w-3 mr-1" /> Star
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkImapMove('archive')}>
                  <Archive className="h-3 w-3 mr-1" /> Archive
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkImapMove('trash')}>
                  <Trash2 className="h-3 w-3 mr-1" /> Trash
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkMove('needs_attention')}>
                  <AlertCircle className="h-3 w-3 mr-1 text-amber-500" /> Needs Attention
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkMove('reviewed_file')}>
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> File
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkMove('reviewed_lender_marketing')}>
                  <CheckCircle className="h-3 w-3 mr-1 text-blue-500" /> Lender Mktg
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBulkMove('reviewed_na')}>
                  <CheckCircle className="h-3 w-3 mr-1 text-gray-500" /> N/A
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedEmails(new Set())}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <ScrollArea className="flex-1 w-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  {selectedCategory 
                    ? `No emails in ${customCategories.find(c => c.key === selectedCategory)?.name || selectedCategory}` 
                    : 'No emails found'}
                </div>
              ) : (
                <div
                  className="divide-y w-full max-w-full"
                  style={{ width: "100%", maxWidth: "100%" }}
                >
                  {filteredEmails.map((email, index) => (
                    <DraggableEmailItem
                      key={email.uid}
                      email={email}
                      isSelected={selectedEmail?.uid === email.uid}
                      onClick={() => handleSelectEmail(email)}
                      showCheckbox={showMultiSelect}
                      isChecked={selectedEmails.has(email.uid)}
                      onCheckChange={(checked, shiftKey) => toggleEmailSelection(email.uid, shiftKey, index)}
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
                        
                        // Check for lender marketing
                        const marketingData = getLenderMarketingData(email);
                        const hasAnyTag = tagData || marketingData;
                        
                        // Check if reviewed (for visual indicator in tag views)
                        const isReviewed = reviewedUids.has(email.uid);
                        const emailCategory = getEmailCategory(email);
                        
                        return (
                          <div
                            className={cn(
                              "flex items-center justify-between gap-2 mb-1 w-full min-w-0",
                              showMultiSelect ? "pl-6" : "pl-4"
                            )}
                            style={{ maxWidth: "calc(450px - 24px)" }}
                          >
                            <span
                              className={cn(
                                "text-sm truncate min-w-0",
                                hasAnyTag ? "flex-shrink" : "flex-1",
                                email.unread ? "font-semibold" : "font-medium"
                              )}
                              style={{ maxWidth: hasAnyTag ? '120px' : undefined }}
                            >
                              {email.from}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Reviewed indicator in File View / Lender Marketing View */}
                              {(emailView === 'file' || emailView === 'lender-marketing') && isReviewed && (
                                <span title={`Reviewed: ${customCategories.find(c => c.key === emailCategory)?.name || ''}`}>
                                  <CheckCircle className={cn(
                                    "h-3 w-3",
                                    emailCategory === 'reviewed_file' && "text-green-500",
                                    emailCategory === 'reviewed_lender_marketing' && "text-blue-500",
                                    emailCategory === 'reviewed_na' && "text-gray-500"
                                  )} />
                                </span>
                              )}
                              {tagData && (
                                <EmailTagPopover tagData={tagData} />
                              )}
                              {marketingData && (
                                <LenderMarketingPopover 
                                  emailLogId={marketingData.emailLogId}
                                  category={marketingData.category}
                                  subject={email.subject}
                                />
                              )}
                              {email.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                              {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{email.date}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p
                        className={cn(
                          "text-sm truncate min-w-0 mb-1 overflow-hidden",
                          showMultiSelect ? "pl-6" : "pl-4",
                          email.unread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {cleanSubject(email.subject)}
                      </p>
                      {email.snippet && (
                        <p className={cn(
                          "text-xs text-muted-foreground truncate min-w-0 overflow-hidden",
                          showMultiSelect ? "pl-6" : "pl-4"
                        )}>
                          {email.snippet}
                        </p>
                      )}
                    </DraggableEmailItem>
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
                  ) : (
                    <>
                      {emailContent?.htmlBody ? (
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
                      
                      {/* Attachments Section */}
                      {emailContent?.attachments && emailContent.attachments.length > 0 && (
                        <div className="border-t mt-6 pt-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Paperclip className="h-4 w-4" /> 
                            Attachments ({emailContent.attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {emailContent.attachments.map((att, idx) => (
                              <div 
                                key={idx}
                                className="border rounded-md p-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{att.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                                </div>
                                {att.url ? (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="flex-shrink-0"
                                    onClick={() => window.open(att.url, '_blank')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No link</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedEmail && (
            <div className="bg-card border rounded-lg shadow-lg p-3 w-[300px] opacity-90">
              <p className="text-sm font-medium truncate">{draggedEmail.from}</p>
              <p className="text-xs text-muted-foreground truncate">{cleanSubject(draggedEmail.subject)}</p>
            </div>
          )}
        </DragOverlay>

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
    </DndContext>
  );
}
