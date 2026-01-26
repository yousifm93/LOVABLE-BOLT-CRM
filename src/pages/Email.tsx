import { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { Mail, Inbox, Send, Star, Trash2, Archive, RefreshCw, Search, Plus, Loader2, AlertCircle, CheckCircle, Paperclip, FileText, Download, GripVertical, Square, CheckSquare, X, AtSign, Smile, Maximize2, ArrowRight, Tag, Pencil, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { EmailTagPopover } from "@/components/email/EmailTagPopover";
import { LenderMarketingPopover } from "@/components/email/LenderMarketingPopover";
import { NewContactsPopover } from "@/components/email/NewContactsPopover";
import { CalendarPanel } from "@/components/email/CalendarPanel";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, DragStartEvent } from '@dnd-kit/core';
import { format } from "date-fns";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}
interface EmailComment {
  id: string;
  email_uid: number;
  email_folder: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    email: string;
    initials: string;
  };
}
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
  category: string;
}
interface CustomCategory {
  id: string;
  name: string;
  key: string;
  icon_name: string;
  color: string;
  sort_order: number;
}

const folders = [{
  name: "Inbox",
  icon: Inbox
}, {
  name: "Starred",
  icon: Star
}, {
  name: "Sent",
  icon: Send
}, {
  name: "Archive",
  icon: Archive
}, {
  name: "Trash",
  icon: Trash2
}];

// Icon mapping for dynamic icons
const iconMap: Record<string, any> = {
  AlertCircle,
  CheckCircle,
  Tag,
  Star,
  FileText
};

// Strip forward prefixes from subject lines (belt-and-suspenders with backend)
const cleanSubject = (subject: string) => subject.replace(/^(Fwd:|FWD:|Fw:|FW:)\s*/i, '').trim();

// Normalize subject for matching - removes all forward/reply prefixes and lowercases
const cleanSubjectForMatching = (subject: string) => {
  return subject.replace(/^(Fwd:|FWD:|Fw:|FW:|Re:|RE:)\s*/gi, '').toLowerCase().trim();
};

// Create composite key from timestamp (to minute) + cleaned subject for reliable matching
const getMatchKey = (date: Date, subject: string) => {
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  return `${dateKey}|${cleanSubjectForMatching(subject)}`;
};

// Draggable email item component
function DraggableEmailItem({
  email,
  isSelected,
  onClick,
  children,
  showCheckbox,
  isChecked,
  onCheckChange
}: {
  email: EmailMessage;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean, shiftKey: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `email-${email.uid}`,
    data: {
      email
    }
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined;
  return <div ref={setNodeRef} style={style} className={cn("w-full max-w-full min-w-0 text-left p-3 hover:bg-muted/50 transition-colors overflow-hidden cursor-pointer relative group", isSelected && "bg-primary/10 border-l-2 border-primary", isDragging && "opacity-50 z-50")} onClick={onClick}>
      {showCheckbox && <div className="absolute left-1 top-3 z-10" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isChecked} onClick={e => {
        e.stopPropagation();
        onCheckChange?.(!isChecked, e.shiftKey);
      }} className="h-4 w-4" />
        </div>}
      <div {...listeners} {...attributes} className={cn("absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing", showCheckbox ? "left-6" : "left-1")}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>;
}

// Droppable folder/category component
function DroppableFolder({
  id,
  isActive,
  children
}: {
  id: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id
  });
  return <div ref={setNodeRef} className={cn("transition-colors rounded-md", isOver && "ring-2 ring-primary bg-primary/10")}>
      {children}
    </div>;
}
export default function Email() {
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState("Inbox");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [emailContent, setEmailContent] = useState<{
    body?: string;
    htmlBody?: string;
    attachments?: EmailAttachment[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [emailOffset, setEmailOffset] = useState(0);
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [emailTagsMap, setEmailTagsMap] = useState<Map<string, EmailTagData>>(new Map());
  const [lenderMarketingMap, setLenderMarketingMap] = useState<Map<string, LenderMarketingData>>(new Map());
  const [emailCategories, setEmailCategories] = useState<EmailCategory[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [draggedEmail, setDraggedEmail] = useState<EmailMessage | null>(null);
  
  // Suggestion counts for badges (emailLogId -> pending count)
  const [emailFieldSuggestionsCount, setEmailFieldSuggestionsCount] = useState<Map<string, number>>(new Map());
  const [lenderFieldSuggestionsCount, setLenderFieldSuggestionsCount] = useState<Map<string, number>>(new Map());

  // Category editing state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // Multi-select state
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);

  // Comments state
  const [emailComments, setEmailComments] = useState<EmailComment[]>([]);
  const [commentText, setCommentText] = useState("");

  // @ mention state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: ""
  });
  const [showCalendar, setShowCalendar] = useState(true);

  // Fetch custom categories from database
  const fetchCustomCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('custom_email_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setCustomCategories(data || []);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    }
  }, []);

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const key = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const maxSortOrder = Math.max(...customCategories.map(c => c.sort_order), 0);
      
      const { error } = await supabase
        .from('custom_email_categories')
        .insert({
          name: newCategoryName.trim(),
          key,
          icon_name: 'CheckCircle',
          color: 'text-purple-500',
          sort_order: maxSortOrder + 1
        });
      
      if (error) throw error;
      
      toast({ title: "Category created", description: `"${newCategoryName}" added` });
      setNewCategoryName("");
      setIsAddingCategory(false);
      fetchCustomCategories();
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast({ title: "Failed to create category", description: error.message, variant: "destructive" });
    }
  };

  // Update category name
  const handleUpdateCategoryName = async (categoryId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingCategoryId(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('custom_email_categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId);
      
      if (error) throw error;
      
      toast({ title: "Category updated" });
      setEditingCategoryId(null);
      fetchCustomCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({ title: "Failed to update category", description: error.message, variant: "destructive" });
    }
  };

  // Initial fetch of custom categories
  useEffect(() => {
    fetchCustomCategories();
  }, [fetchCustomCategories]);

  // Keyboard shortcut: 'e' to smart archive selected email
  // - If email has file tag → assign to "Reviewed - File"
  // - If email has lender marketing tag → assign to "Reviewed - Lender Mktg"
  // - Otherwise → move to Archive folder (IMAP)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea or if no email selected
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() !== 'e') return;
      if (!selectedEmail || isArchiving) return;
      if (selectedFolder === 'Archive') return; // Already in archive
      
      setIsArchiving(true);
      try {
        // Check for tags to determine destination
        const isFileTagged = hasFileTag(selectedEmail);
        const isMarketingTagged = hasMarketingTag(selectedEmail);
        
        if (isFileTagged) {
          // Move to "Reviewed - File" category
          await assignEmailToCategory(selectedEmail, 'reviewed_file');
          // Remove from current list
          setEmails(prev => prev.filter(em => em.uid !== selectedEmail.uid));
          setSelectedEmail(null);
          setEmailContent(null);
        } else if (isMarketingTagged) {
          // Move to "Reviewed - Lender Mktg" category
          await assignEmailToCategory(selectedEmail, 'reviewed_lender_marketing');
          // Remove from current list
          setEmails(prev => prev.filter(em => em.uid !== selectedEmail.uid));
          setSelectedEmail(null);
          setEmailContent(null);
        } else {
          // No tags - move to Archive via IMAP
          const { data, error } = await supabase.functions.invoke('fetch-emails-imap', {
            body: {
              action: 'move',
              folder: selectedFolder,
              messageUid: selectedEmail.uid,
              targetFolder: 'Archive'
            }
          });
          
          if (error) throw error;
          
          toast({
            title: "Email archived",
            description: `"${selectedEmail.subject.substring(0, 30)}..." moved to Archive`,
          });
          
          // Remove email from current list
          setEmails(prev => prev.filter(em => em.uid !== selectedEmail.uid));
          setSelectedEmail(null);
          setEmailContent(null);
          
          // Update folder counts
          setFolderCounts(prev => ({
            ...prev,
            [selectedFolder]: Math.max(0, (prev[selectedFolder] || 0) - 1),
            Archive: (prev.Archive || 0) + 1
          }));
        }
      } catch (error: any) {
        console.error('Error archiving email:', error);
        toast({
          title: "Archive failed",
          description: error.message || "Could not move email",
          variant: "destructive"
        });
      } finally {
        setIsArchiving(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmail, selectedFolder, isArchiving, toast, emailTagsMap, lenderMarketingMap]);
  const [emailView, setEmailView] = useState<'main' | 'file' | 'lender-marketing' | 'new-contacts'>('main');
  const [contactSuggestionsCount, setContactSuggestionsCount] = useState<Map<string, number>>(new Map());

  // Fetch email categories from database
  const fetchEmailCategories = useCallback(async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('email_categories').select('*');
      if (error) throw error;
      setEmailCategories((data || []) as EmailCategory[]);

      // Calculate counts for all categories dynamically
      const counts: Record<string, number> = {};
      for (const cat of data || []) {
        counts[cat.category] = (counts[cat.category] || 0) + 1;
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
      const {
        data: emailLogs,
        error
      } = await supabase.from('email_logs').select(`
          id,
          from_email,
          subject,
          ai_summary,
          lead_id,
          timestamp,
          is_lender_marketing,
          lender_marketing_category,
          lead:leads(first_name, last_name)
        `).gte('timestamp', thirtyDaysAgo.toISOString()).order('timestamp', {
        ascending: false
      }).limit(500);
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
          const lead = log.lead as {
            first_name: string;
            last_name: string;
          };
          const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
          if (leadName) {
            const tagData: EmailTagData = {
              leadId: log.lead_id,
              leadName,
              emailLogId: log.id,
              aiSummary: log.ai_summary,
              subject: log.subject || ''
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
            category: log.lender_marketing_category
          };
          marketingMap.set(compositeKey, marketingData);
          if (subjectKey && !marketingMap.has(subjectKey)) {
            marketingMap.set(subjectKey, marketingData);
          }
        }
      }
      setEmailTagsMap(tagsMap);
      setLenderMarketingMap(marketingMap);

      // Fetch pending suggestion counts for File View badges
      const emailLogIds = (emailLogs || []).filter(l => l.lead_id).map(l => l.id);
      const lenderEmailLogIds = (emailLogs || []).filter(l => l.is_lender_marketing).map(l => l.id);
      const allEmailLogIds = (emailLogs || []).map(l => l.id);
      
      // Fetch email field suggestions counts
      if (emailLogIds.length > 0) {
        const { data: fieldSuggestions } = await supabase
          .from('email_field_suggestions')
          .select('email_log_id')
          .in('email_log_id', emailLogIds)
          .eq('status', 'pending');
        
        const countsMap = new Map<string, number>();
        for (const s of fieldSuggestions || []) {
          countsMap.set(s.email_log_id, (countsMap.get(s.email_log_id) || 0) + 1);
        }
        setEmailFieldSuggestionsCount(countsMap);
      }
      
      // Fetch lender field suggestions counts
      if (lenderEmailLogIds.length > 0) {
        const { data: lenderSuggestions } = await supabase
          .from('lender_field_suggestions')
          .select('email_log_id')
          .in('email_log_id', lenderEmailLogIds)
          .eq('status', 'pending');
        
        const lenderCountsMap = new Map<string, number>();
        for (const s of lenderSuggestions || []) {
          lenderCountsMap.set(s.email_log_id, (lenderCountsMap.get(s.email_log_id) || 0) + 1);
        }
        setLenderFieldSuggestionsCount(lenderCountsMap);
      }
      
      // Fetch contact suggestion counts for New Contacts view (from contacts table, not email_contact_suggestions)
      if (allEmailLogIds.length > 0) {
        const { data: pendingContacts } = await supabase
          .from('contacts')
          .select('email_log_id')
          .in('email_log_id', allEmailLogIds)
          .eq('approval_status', 'pending');
        
        const contactCountsMap = new Map<string, number>();
        for (const c of pendingContacts || []) {
          if (c.email_log_id) {
            contactCountsMap.set(c.email_log_id, (contactCountsMap.get(c.email_log_id) || 0) + 1);
          }
        }
        setContactSuggestionsCount(contactCountsMap);
      }
    } catch (error) {
      console.error('Error fetching email tags:', error);
    }
  }, []);
  const fetchEmails = useCallback(async (folder: string, offset: number = 0, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setEmailOffset(0);
      setHasMoreEmails(true);
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("fetch-emails-imap", {
        body: {
          folder,
          limit: 50,
          offset
        }
      });
      if (error) throw error;
      if (data?.success) {
        const fetchedEmails = data.emails || [];
        
        if (append) {
          // Append to existing emails, avoiding duplicates
          setEmails(prev => {
            const existingUids = new Set(prev.map(e => e.uid));
            const newEmails = fetchedEmails.filter((e: EmailMessage) => !existingUids.has(e.uid));
            return [...prev, ...newEmails];
          });
        } else {
          setEmails(fetchedEmails);
        }
        
        // Update offset and hasMore
        setEmailOffset(offset + fetchedEmails.length);
        setHasMoreEmails(fetchedEmails.length === 50); // If we got a full page, there might be more
        
        setFolderCounts(prev => ({
          ...prev,
          [folder]: (append ? prev[folder] : 0) + fetchedEmails.filter((e: EmailMessage) => e.unread).length || 0
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
        variant: "destructive"
      });
      if (!append) {
        setEmails([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [toast, fetchEmailTags]);

  // Load more emails
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreEmails) {
      fetchEmails(selectedFolder, emailOffset, true);
    }
  };

  // Fetch attachments from documents table (primary) or email_logs (fallback)
  // Uses subject-only matching since email.date is a display string (e.g., "10:47 AM")
  const fetchAttachments = useCallback(async (email: EmailMessage) => {
    try {
      const cleanedSubject = cleanSubjectForMatching(email.subject);
      if (!cleanedSubject) {
        return [];
      }

      // Search within last 30 days by subject match
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // First get email_log to find lead_id
      const {
        data: emailLog,
        error: logError
      } = await supabase.from('email_logs').select('id, lead_id, attachments_json').ilike('subject', `%${cleanedSubject}%`).gte('timestamp', thirtyDaysAgo.toISOString()).order('timestamp', {
        ascending: false
      }).limit(1).single();
      if (logError && logError.code !== 'PGRST116') {
        console.error('Error fetching email log:', logError);
      }

      // If we have a lead_id, fetch documents with actual URLs
      if (emailLog?.lead_id) {
        const {
          data: documents,
          error: docsError
        } = await supabase.from('documents').select('file_name, file_url, mime_type, size_bytes').eq('lead_id', emailLog.lead_id).eq('source', 'Email');
        if (!docsError && documents && documents.length > 0) {
          return documents.map(doc => ({
            name: doc.file_name,
            type: doc.mime_type || 'application/octet-stream',
            size: doc.size_bytes || 0,
            url: doc.file_url
          }));
        }
      }

      // Fallback to attachments_json - try to generate signed URLs from storage paths
      if (emailLog?.attachments_json) {
        const attachments = emailLog.attachments_json as any[];
        return await Promise.all(attachments.map(async (att: any) => {
          let url = att.url || null;

          // If we have a storage path but no URL, try to generate signed URL
          if (!url && att.path) {
            try {
              const {
                data: signedUrlData
              } = await supabase.storage.from('lead-documents').createSignedUrl(att.path, 60 * 60 * 24 * 365); // 1 year
              url = signedUrlData?.signedUrl || null;
            } catch (e) {
              console.error('Failed to generate signed URL:', e);
            }
          }
          return {
            name: att.filename || att.name || 'Unknown',
            type: att.contentType || att.type || 'application/octet-stream',
            size: att.size || 0,
            url
          };
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }
  }, []);

  // Fixed: Pass email object directly to avoid timing bug
  // Returns the content so callers can use it immediately without waiting for state
  const fetchEmailContent = async (email: EmailMessage): Promise<{ body?: string; htmlBody?: string; attachments?: EmailAttachment[] } | null> => {
    setIsLoadingContent(true);
    setEmailContent(null);
    try {
      // Default to 'Inbox' if selectedFolder is empty (e.g., when in category view)
      const folder = selectedFolder || 'Inbox';
      const {
        data,
        error
      } = await supabase.functions.invoke("fetch-emails-imap", {
        body: {
          folder,
          fetchContent: true,
          messageUid: email.uid
        }
      });
      if (error) throw error;
      if (data?.success && data.email) {
        // Pass the email directly - no timing issue!
        const attachments = await fetchAttachments(email);
        const content = {
          body: data.email.body,
          htmlBody: data.email.htmlBody,
          attachments
        };
        setEmailContent(content);
        return content;
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching email content:", error);
      return null;
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Fetch team members for @ mentions
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('users').select('id, first_name, last_name, email').eq('is_active', true);
        if (error) throw error;
        setTeamMembers((data || []) as TeamMember[]);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };
    fetchTeamMembers();
  }, []);
  useEffect(() => {
    fetchEmailCategories();
  }, [fetchEmailCategories]);
  useEffect(() => {
    if (!selectedCategory) {
      fetchEmails(selectedFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder, selectedCategory]);

  // Fetch comments for selected email
  const fetchComments = useCallback(async (email: EmailMessage) => {
    try {
      const folder = selectedFolder || 'Inbox';
      const {
        data,
        error
      } = await supabase.from('email_comments').select('*').eq('email_uid', email.uid).eq('email_folder', folder).order('created_at', {
        ascending: true
      });
      if (error) throw error;

      // Map user IDs to user info (just using initials for now)
      const comments: EmailComment[] = (data || []).map(c => ({
        ...c,
        user: {
          email: 'User',
          initials: 'U'
        }
      }));
      setEmailComments(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setEmailComments([]);
    }
  }, [selectedFolder]);

  // Add a new comment
  const handleAddComment = async () => {
    if (!selectedEmail || !commentText.trim() || !user) return;
    setIsAddingComment(true);
    try {
      const folder = selectedFolder || 'Inbox';
      const {
        error
      } = await supabase.from('email_comments').insert({
        email_uid: selectedEmail.uid,
        email_folder: folder,
        user_id: user.id,
        content: commentText.trim()
      });
      if (error) throw error;
      setCommentText("");
      // Refresh comments
      fetchComments(selectedEmail);
      toast({
        title: "Comment added",
        description: "Your internal comment has been saved."
      });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: "Failed to add comment",
        description: error.message || "Could not save your comment.",
        variant: "destructive"
      });
    } finally {
      setIsAddingComment(false);
    }
  };
  const handleSelectEmail = async (email: EmailMessage) => {
    setSelectedEmail(email);
    setEmailComments([]); // Clear previous comments
    setCommentText("");
    
    // Await email content load so we have the full body for contact parsing
    const content = await fetchEmailContent(email);
    fetchComments(email);
    
    // Trigger contact parsing if in "new-contacts" view - pass the loaded body content
    if (emailView === 'new-contacts' && content) {
      triggerContactParsing(email, content.body || content.htmlBody);
    }
  };
  
  // Trigger contact parsing for an email - accepts loaded body content directly
  const triggerContactParsing = async (email: EmailMessage, loadedBody?: string) => {
    try {
      // First, try to find an existing email_log record to get emailLogId
      const cleanedSubject = cleanSubjectForMatching(email.subject);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: emailLog, error: logError } = await supabase
        .from('email_logs')
        .select('id')
        .ilike('subject', `%${cleanedSubject}%`)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (logError) {
        console.error('Error finding email log:', logError);
        return;
      }
      
      if (!emailLog) {
        console.log('No email log found for contact parsing');
        return;
      }
      
      // Use the passed body content, or fall back to state/snippet
      const bodyContent = loadedBody || emailContent?.body || emailContent?.htmlBody || email.snippet || '';
      
      // Call the parse-email-contacts edge function
      const { data, error } = await supabase.functions.invoke('parse-email-contacts', {
        body: {
          emailLogId: emailLog.id,
          emailContent: {
            from: email.from,
            fromEmail: email.fromEmail,
            subject: email.subject,
            body: bodyContent,
            date: email.date
          }
        }
      });
      
      if (error) {
        console.error('Error parsing email for contacts:', error);
        return;
      }
      
      // Refresh contact suggestion counts if new suggestions were found
      if (data?.newSuggestionsCount > 0) {
        // Update the contact suggestions count for this email
        setContactSuggestionsCount(prev => {
          const updated = new Map(prev);
          updated.set(emailLog.id, (updated.get(emailLog.id) || 0) + data.newSuggestionsCount);
          return updated;
        });
        
        toast({
          title: "Contacts Found",
          description: `Found ${data.newSuggestionsCount} potential new contact(s)`,
        });
      }
    } catch (error) {
      console.error('Error triggering contact parsing:', error);
    }
  };
  const handleCompose = () => {
    setComposeData({
      to: "",
      subject: "",
      body: ""
    });
    setIsComposeOpen(true);
  };
  const handleReply = () => {
    if (!selectedEmail) return;
    setComposeData({
      to: selectedEmail.fromEmail,
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.from} wrote:\n${emailContent?.body || selectedEmail.snippet}`
    });
    setIsComposeOpen(true);
  };
  const handleForward = () => {
    if (!selectedEmail) return;
    setComposeData({
      to: "",
      subject: `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${selectedEmail.from} <${selectedEmail.fromEmail}>\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${emailContent?.body || selectedEmail.snippet}`
    });
    setIsComposeOpen(true);
  };
  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      toast({
        title: "Missing fields",
        description: "Please fill in the recipient and subject.",
        variant: "destructive"
      });
      return;
    }
    setIsSending(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("send-email-ionos", {
        body: {
          to: composeData.to,
          subject: composeData.subject,
          body: composeData.body,
          html: `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${composeData.body.replace(/\n/g, '<br>')}</div>`
        }
      });
      if (error) throw error;
      toast({
        title: "Email sent",
        description: `Email sent to ${composeData.to}`
      });
      setIsComposeOpen(false);
      setComposeData({
        to: "",
        subject: "",
        body: ""
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send",
        description: error.message || "Could not send the email. Please try again.",
        variant: "destructive"
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
    const {
      active,
      over
    } = event;
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

    // Check if dropping on a custom category (use dynamic list)
    const validCategoryKeys = customCategories.map(c => c.key);
    if (validCategoryKeys.includes(dropTarget)) {
      await assignEmailToCategory(email, dropTarget);
    } else if (['Archive', 'Trash', 'Starred'].includes(dropTarget)) {
      toast({
        title: "IMAP folder move",
        description: "Moving emails between IMAP folders is not yet supported."
      });
    }
  };

  // Assign email to category
  const assignEmailToCategory = async (email: EmailMessage, category: string) => {
    try {
      const existing = emailCategories.find(c => c.email_uid === email.uid && c.email_folder === (selectedFolder || 'Inbox'));
      if (existing) {
        const {
          error
        } = await supabase.from('email_categories').update({
          category,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('email_categories').insert({
          email_uid: email.uid,
          email_folder: selectedFolder || 'Inbox',
          category
        });
        if (error) throw error;
      }
      const categoryName = customCategories.find(c => c.key === category)?.name || category;
      toast({
        title: "Email categorized",
        description: `Moved to ${categoryName}`
      });
      fetchEmailCategories();
    } catch (error: any) {
      console.error('Error categorizing email:', error);
      toast({
        title: "Failed to categorize",
        description: error.message || "Could not move the email.",
        variant: "destructive"
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
        const existing = emailCategories.find(c => c.email_uid === email.uid && c.email_folder === (selectedFolder || 'Inbox'));
        if (existing) {
          await supabase.from('email_categories').update({
            category: targetCategory,
            updated_at: new Date().toISOString()
          }).eq('id', existing.id);
        } else {
          await supabase.from('email_categories').insert({
            email_uid: email.uid,
            email_folder: selectedFolder || 'Inbox',
            category: targetCategory
          });
        }
      }
      const categoryName = customCategories.find(c => c.key === targetCategory)?.name || targetCategory;
      toast({
        title: `Moved ${selectedEmails.size} emails`,
        description: `Moved to ${categoryName}`
      });
      setSelectedEmails(new Set());
      fetchEmailCategories();
    } catch (error: any) {
      console.error('Error bulk moving emails:', error);
      toast({
        title: "Failed to move emails",
        description: error.message || "Could not move the emails.",
        variant: "destructive"
      });
    }
  };

  // Handle bulk IMAP folder actions (not yet supported)
  const handleBulkImapMove = (target: string) => {
    toast({
      title: "IMAP folder move",
      description: "Moving emails between IMAP folders is not yet supported."
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
    const categoryEmailUids = emailCategories.filter(c => c.category === selectedCategory).map(c => c.email_uid);
    return emails.filter(e => categoryEmailUids.includes(e.uid));
  };

  // Create sets for quick lookup
  const categorizedUids = new Set(emailCategories.map(c => c.email_uid));
  const reviewedUids = new Set(emailCategories.filter(c => c.category.startsWith('reviewed')).map(c => c.email_uid));

  // Helper to get review status category for an email
  const getEmailCategory = (email: EmailMessage) => {
    return emailCategories.find(c => c.email_uid === email.uid)?.category;
  };
  const filteredEmails = selectedCategory ? getCategoryEmails() : emails.filter(email => {
    const matchesSearch = email.from.toLowerCase().includes(searchTerm.toLowerCase()) || email.subject.toLowerCase().includes(searchTerm.toLowerCase()) || email.fromEmail.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (emailView === 'new-contacts') {
      // NEW CONTACTS VIEW: Show only emails with pending contact suggestions
      const emailDate = new Date(email.date);
      const compositeKey = getMatchKey(emailDate, email.subject || '');
      let tagData = emailTagsMap.get(compositeKey);
      if (!tagData) {
        const subjectKey = cleanSubjectForMatching(email.subject || '');
        tagData = emailTagsMap.get(subjectKey);
      }
      const marketingData = getLenderMarketingData(email);
      const emailLogId = tagData?.emailLogId || marketingData?.emailLogId;
      const hasPendingContacts = emailLogId && (contactSuggestionsCount.get(emailLogId) || 0) > 0;
      return matchesSearch && hasPendingContacts;
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

  return <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="pl-4 pr-0 pt-2 pb-0 h-[calc(100vh-60px)]">
        <div className="flex h-full gap-2">
          {/* Folder Sidebar - Fixed width */}
          <div className="w-[220px] flex-shrink-0 pr-2">
            <div className="h-full flex flex-col">
              <div className="space-y-1 flex-1 py-0">
                {folders.map(folder => <DroppableFolder key={folder.name} id={folder.name} isActive={selectedFolder === folder.name}>
                    <button onClick={() => handleFolderClick(folder.name)} className={cn("w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors", selectedFolder === folder.name && !selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                      <div className="flex items-center gap-2">
                        <folder.icon className="h-4 w-4" />
                        {folder.name}
                      </div>
                      {(folderCounts[folder.name] || 0) > 0 && <span className={cn("text-xs px-1.5 py-0.5 rounded-full flex-shrink-0", selectedFolder === folder.name && !selectedCategory ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground")}>
                          {folderCounts[folder.name]}
                        </span>}
                    </button>
                  </DroppableFolder>)}

                {/* Separator and Categories */}
                <Separator className="mt-8 mb-3" />
                <div className="flex items-center justify-between pl-2 pr-3 mb-2 pt-4">
                  <p className="text-xs font-medium text-muted-foreground">CATEGORIES</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setIsAddingCategory(true)}
                    title="Add category"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Add category input */}
                {isAddingCategory && (
                  <div className="px-2 mb-2 flex gap-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name..."
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                        if (e.key === 'Escape') { setIsAddingCategory(false); setNewCategoryName(""); }
                      }}
                    />
                    <Button size="sm" className="h-7 px-2" onClick={handleAddCategory}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {customCategories.map(category => {
                  const IconComponent = iconMap[category.icon_name] || CheckCircle;
                  return (
                    <DroppableFolder key={category.key} id={category.key} isActive={selectedCategory === category.key}>
                      <button onClick={() => handleCategoryClick(category.key)} className={cn("w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors group", selectedCategory === category.key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <IconComponent className={cn("h-4 w-4 flex-shrink-0", selectedCategory !== category.key && category.color)} />
                          {editingCategoryId === category.id ? (
                            <Input
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="h-6 text-xs px-1"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleUpdateCategoryName(category.id, editingCategoryName);
                                if (e.key === 'Escape') setEditingCategoryId(null);
                              }}
                              onBlur={() => handleUpdateCategoryName(category.id, editingCategoryName)}
                            />
                          ) : (
                            <span className="truncate">{category.name}</span>
                          )}
                          {!editingCategoryId && (
                            <Pencil 
                              className="h-3 w-3 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer flex-shrink-0" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                              }}
                            />
                          )}
                        </div>
                        {(categoryCounts[category.key] || 0) > 0 && <span className={cn("text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1", selectedCategory === category.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground")}>
                            {categoryCounts[category.key]}
                          </span>}
                      </button>
                    </DroppableFolder>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Email List - Fixed width */}
          <div className="w-[560px] flex-shrink-0 h-full border rounded-lg bg-card overflow-hidden flex flex-col">
            <div className="p-2 border-b space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search emails..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <Button variant="ghost" size="icon" onClick={handleCompose} className="h-8 w-8 flex-shrink-0" title="Compose">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8 flex-shrink-0" title="Refresh">
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
              {!selectedCategory && <div className="flex gap-1 flex-wrap">
                  <Button variant={emailView === 'main' ? 'default' : 'outline'} size="sm" onClick={() => setEmailView('main')} className="h-7 text-xs px-3">
                    Main View
                  </Button>
                  <Button variant={emailView === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setEmailView('file')} className="h-7 text-xs px-3">
                    File View
                  </Button>
                  <Button variant={emailView === 'lender-marketing' ? 'default' : 'outline'} size="sm" onClick={() => setEmailView('lender-marketing')} className="h-7 text-xs px-3">
                    Lender Marketing
                  </Button>
                  <Button variant={emailView === 'new-contacts' ? 'default' : 'outline'} size="sm" onClick={() => setEmailView('new-contacts')} className="h-7 text-xs px-3">
                    New Contacts
                  </Button>
                </div>}
            </div>

            {/* Bulk Action Toolbar */}
            {selectedEmails.size > 0 && <div className="p-2 bg-muted/50 border-b flex items-center gap-2 flex-wrap">
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
              </div>}

            <ScrollArea className="flex-1 w-full">
              {isLoading ? <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div> : filteredEmails.length === 0 ? <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  {selectedCategory ? `No emails in ${customCategories.find(c => c.key === selectedCategory)?.name || selectedCategory}` : 'No emails found'}
                </div> : <div className="divide-y w-full max-w-full" style={{
              width: "100%",
              maxWidth: "100%"
            }}>
                  {filteredEmails.map((email, index) => <DraggableEmailItem key={email.uid} email={email} isSelected={selectedEmail?.uid === email.uid} onClick={() => handleSelectEmail(email)} showCheckbox={showMultiSelect} isChecked={selectedEmails.has(email.uid)} onCheckChange={(checked, shiftKey) => toggleEmailSelection(email.uid, shiftKey, index)}>
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
                  
                  // Get pending suggestion counts
                  const pendingFieldCount = tagData ? (emailFieldSuggestionsCount.get(tagData.emailLogId) || 0) : 0;
                  const pendingLenderCount = marketingData ? (lenderFieldSuggestionsCount.get(marketingData.emailLogId) || 0) : 0;
                  
                  // Get email log ID for NewContacts popover (use any matching tag or marketing data)
                  const emailLogId = tagData?.emailLogId || marketingData?.emailLogId;
                  const pendingContactCount = emailLogId ? (contactSuggestionsCount.get(emailLogId) || 0) : 0;
                  
                  return <div className={cn("flex items-center gap-2 mb-1 w-full", showMultiSelect ? "pl-6" : "pl-4")}>
                            <span className={cn("text-sm truncate min-w-0 flex-1", email.unread ? "font-semibold" : "font-medium")}>
                              {email.from}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0 max-w-[180px]">
                              {/* Reviewed indicator in File View / Lender Marketing View */}
                              {(emailView === 'file' || emailView === 'lender-marketing') && isReviewed && <span title={`Reviewed: ${customCategories.find(c => c.key === emailCategory)?.name || ''}`}>
                                  <CheckCircle className={cn("h-3 w-3", emailCategory === 'reviewed_file' && "text-green-500", emailCategory === 'reviewed_lender_marketing' && "text-blue-500", emailCategory === 'reviewed_na' && "text-gray-500")} />
                                </span>}
                              {tagData && <EmailTagPopover tagData={tagData} pendingSuggestionCount={pendingFieldCount} />}
                              {marketingData && <LenderMarketingPopover emailLogId={marketingData.emailLogId} category={marketingData.category} subject={email.subject} pendingSuggestionCount={pendingLenderCount} />}
                              {/* Show NewContactsPopover when email has pending contacts (in any view) */}
                              {emailLogId && pendingContactCount > 0 && (
                                <NewContactsPopover 
                                  emailLogId={emailLogId} 
                                  subject={email.subject} 
                                  fromEmail={email.fromEmail}
                                  pendingSuggestionCount={pendingContactCount}
                                />
                              )}
                              {email.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                              {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-1.5 min-w-[58px] text-right">{email.date}</span>
                          </div>;
                })()}
                      <p className={cn("text-sm truncate min-w-0 mb-1 overflow-hidden", showMultiSelect ? "pl-6" : "pl-4", email.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {(() => {
                          const subject = cleanSubject(email.subject) || '';
                          return subject.length > 50 ? subject.slice(0, 50) + '...' : subject;
                        })()}
                      </p>
                      {email.snippet && <p className={cn("text-xs text-muted-foreground truncate min-w-0 overflow-hidden", showMultiSelect ? "pl-6" : "pl-4")}>
                          {email.snippet}
                        </p>}
                    </DraggableEmailItem>)}
                  
                  {/* Load More button */}
                  {!selectedCategory && hasMoreEmails && filteredEmails.length > 0 && (
                    <div className="p-4 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading more...
                          </>
                        ) : (
                          <>Load More Emails</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>}
            </ScrollArea>
          </div>

          {/* Email Content - Takes remaining space */}
          <div className="flex-1 h-full border rounded-lg bg-card overflow-hidden flex flex-col mr-4">
            {/* Show bulk selection UI when emails are selected */}
            {selectedEmails.size > 0 ? <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Mail className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium mb-2">
                  {selectedEmails.size} conversation{selectedEmails.size > 1 ? 's' : ''} selected
                </p>
                <button className="text-primary text-sm hover:underline mb-8" onClick={() => setSelectedEmails(new Set())}>
                  Clear selection
                </button>
                
                {/* Action buttons - 8 buttons in row */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Button variant="outline" size="sm" onClick={() => handleBulkImapMove('archive')}>
                    <Archive className="h-4 w-4 mr-2" /> Archive
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkImapMove('trash')}>
                    <Trash2 className="h-4 w-4 mr-2" /> Trash
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkImapMove('starred')}>
                    <Star className="h-4 w-4 mr-2" /> Star
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkMove('needs_attention')}>
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-500" /> Needs Attention
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkMove('reviewed_file')}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Reviewed - File
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkMove('reviewed_lender_marketing')}>
                    <CheckCircle className="h-4 w-4 mr-2 text-blue-500" /> Lender Mktg
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkMove('reviewed_na')}>
                    <CheckCircle className="h-4 w-4 mr-2 text-gray-500" /> N/A
                  </Button>
                </div>
              </div> : selectedEmail ? <>
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
                  {isLoadingContent ? <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div> : <>
                      {emailContent?.htmlBody ? <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(emailContent.htmlBody)
                }} /> : emailContent?.body ? <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                          {emailContent.body}
                        </div> : <div className="text-muted-foreground italic text-sm">
                          No content available
                        </div>}
                      
                      {/* Attachments Section */}
                      {emailContent?.attachments && emailContent.attachments.length > 0 && <div className="border-t mt-6 pt-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Paperclip className="h-4 w-4" /> 
                            Attachments ({emailContent.attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {emailContent.attachments.map((att, idx) => <div key={idx} className="border rounded-md p-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{att.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                                </div>
                                {att.url ? <Button size="sm" variant="ghost" className="flex-shrink-0" onClick={() => window.open(att.url, '_blank')}>
                                    <Download className="h-4 w-4" />
                                  </Button> : <span className="text-xs text-muted-foreground">No link</span>}
                              </div>)}
                          </div>
                        </div>}
                    </>}
                </ScrollArea>
                
                {/* Actions and Comments Section */}
                <div className="border-t">
                  <div className="p-3 flex gap-2">
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
                  
                  {/* Internal Comments Section */}
                  <div className="px-3 pb-3 border-t pt-3">
                    {/* Existing comments */}
                    {emailComments.length > 0 && <div className="mb-3 space-y-2 max-h-[150px] overflow-y-auto">
                        {emailComments.map(comment => <div key={comment.id} className="flex gap-2 items-start">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarFallback className="text-xs">{comment.user?.initials || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm bg-muted px-2 py-1 rounded inline-block">{comment.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>)}
                      </div>}
                    
                    {/* Comment input with @ mention support */}
                    <div className="relative">
                      <Popover open={showMentionPopover} onOpenChange={setShowMentionPopover}>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <Input ref={commentInputRef} value={commentText} onChange={e => {
                          const value = e.target.value;
                          const cursorPos = e.target.selectionStart || 0;
                          setCommentText(value);
                          setMentionCursorPosition(cursorPos);

                          // Check if user just typed @
                          const lastAtIndex = value.lastIndexOf('@', cursorPos);
                          if (lastAtIndex !== -1) {
                            const textAfterAt = value.substring(lastAtIndex + 1, cursorPos);
                            // Show popover if there's no space after @
                            if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
                              setMentionSearch(textAfterAt.toLowerCase());
                              setShowMentionPopover(true);
                            } else {
                              setShowMentionPopover(false);
                            }
                          } else {
                            setShowMentionPopover(false);
                          }
                        }} placeholder="Add internal comment... (type @ to mention)" className="pr-24" onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && !showMentionPopover) {
                            e.preventDefault();
                            handleAddComment();
                          }
                          if (e.key === 'Escape') {
                            setShowMentionPopover(false);
                          }
                        }} disabled={isAddingComment} />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="start" side="top">
                          <Command>
                            <CommandInput placeholder="Search teammates..." value={mentionSearch} onValueChange={setMentionSearch} />
                            <CommandList>
                              <CommandEmpty>No teammates found.</CommandEmpty>
                              <CommandGroup heading="Team Members">
                                {teamMembers.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(mentionSearch) || m.email?.toLowerCase().includes(mentionSearch)).slice(0, 6).map(member => <CommandItem key={member.id} value={`${member.first_name} ${member.last_name}`} onSelect={() => {
                              // Insert mention into comment text
                              const lastAtIndex = commentText.lastIndexOf('@', mentionCursorPosition);
                              const beforeAt = commentText.substring(0, lastAtIndex);
                              const afterCursor = commentText.substring(mentionCursorPosition);
                              const mentionText = `@${member.first_name}`;
                              setCommentText(`${beforeAt}${mentionText} ${afterCursor}`);
                              setShowMentionPopover(false);
                              setMentionSearch("");
                              // Focus back on input
                              setTimeout(() => commentInputRef.current?.focus(), 0);
                            }}>
                                      <Avatar className="h-6 w-6 mr-2">
                                        <AvatarFallback className="text-xs">
                                          {member.first_name?.[0]}{member.last_name?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {member.first_name} {member.last_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                      </div>
                                    </CommandItem>)}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Attach file">
                          <Paperclip className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Mention teammate" onClick={() => {
                      const newText = commentText + '@';
                      setCommentText(newText);
                      setMentionCursorPosition(newText.length);
                      setShowMentionPopover(true);
                      setMentionSearch("");
                      commentInputRef.current?.focus();
                    }}>
                          <AtSign className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Emoji">
                          <Smile className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Internal comments visible to team only • Type @ to mention
                    </p>
                  </div>
                </div>
              </> : <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select an email to read</p>
                </div>
              </div>}
          </div>
          
          {/* Calendar Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 self-start mt-2"
            onClick={() => setShowCalendar(!showCalendar)}
            title={showCalendar ? "Hide Calendar" : "Show Calendar"}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          
          {/* Calendar Panel */}
          {showCalendar && (
            <div className="w-[320px] flex-shrink-0 h-full border-l pl-2">
              <CalendarPanel />
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedEmail && <div className="bg-card border rounded-lg shadow-lg p-3 w-[300px] opacity-90">
              <p className="text-sm font-medium truncate">{draggedEmail.from}</p>
              <p className="text-xs text-muted-foreground truncate">{cleanSubject(draggedEmail.subject)}</p>
            </div>}
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
                <Input id="to" placeholder="recipient@example.com" value={composeData.to} onChange={e => setComposeData({
                ...composeData,
                to: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Email subject" value={composeData.subject} onChange={e => setComposeData({
                ...composeData,
                subject: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" placeholder="Write your message..." value={composeData.body} onChange={e => setComposeData({
                ...composeData,
                body: e.target.value
              })} className="min-h-[200px]" />
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
    </DndContext>;
}