import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Phone, Mail, User, MapPin, FileText, Trash2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Contact } from "@/types/crm";
import { CreateContactModal } from "@/components/modals/CreateContactModal";
import { AgentDetailDialog } from "@/components/AgentDetailDialog";
import { LenderDetailDialog } from "@/components/LenderDetailDialog";
import { ContactDetailDialog } from "@/components/ContactDetailDialog";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// Format phone number as (XXX) XXX-XXXX
const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone; // Return original if format doesn't match
};

// Map source to display name
const getSourceDisplayName = (source: string, type?: string, sourceType?: string): string => {
  // Prioritize email_import source type - show as "Email"
  if (sourceType === 'email_import') return 'Email';
  const sourceMap: Record<string, string> = {
    'buyer_agents': 'Real Estate Agent',
    'lenders': 'Approved Lenders',
    'leads': 'Pipeline',
    'contacts': type || 'Other'
  };
  return sourceMap[source] || 'Other';
};

// Duplicate detection function - only flags as duplicate if existing contact has complete info
const checkIsDuplicate = (contact: any, allContacts: any[]): boolean => {
  return allContacts.some(other => {
    // Don't compare to self
    if ((other.source_id || other.id) === (contact.source_id || contact.id)) return false;
    
    // Only check against non-email-import contacts
    if (other.source === 'contacts' && other.source_type === 'email_import') return false;
    
    // Check exact first+last name match (both must match together)
    const contactFirstName = contact.first_name?.toLowerCase().trim();
    const contactLastName = contact.last_name?.toLowerCase().trim();
    const otherFirstName = other.first_name?.toLowerCase().trim();
    const otherLastName = other.last_name?.toLowerCase().trim();
    
    const nameMatch = 
      contactFirstName && contactLastName &&
      otherFirstName && otherLastName &&
      contactFirstName === otherFirstName &&
      contactLastName === otherLastName;
    
    // If names don't match, not a duplicate
    if (!nameMatch) return false;
    
    // Check if existing contact has BOTH email and phone
    // If missing either, allow adding new contact to fill in missing data
    const otherHasEmail = !!other.email?.trim();
    const otherHasPhone = !!(other.phone?.replace(/\D/g, '') || '').length;
    
    if (!otherHasEmail || !otherHasPhone) {
      // Existing contact is incomplete - NOT a duplicate (allow adding)
      return false;
    }
    
    // Existing contact is complete - check if new contact matches both email AND phone
    const contactEmail = contact.email?.toLowerCase().trim();
    const otherEmail = other.email?.toLowerCase().trim();
    const emailMatch = contactEmail && otherEmail && contactEmail === otherEmail;
    
    const normalizePhone = (p: string | null | undefined) => p?.replace(/\D/g, '') || '';
    const contactPhone = normalizePhone(contact.phone);
    const otherPhone = normalizePhone(other.phone);
    const phoneMatch = contactPhone.length >= 10 && otherPhone.length >= 10 && contactPhone === otherPhone;
    
    // Only duplicate if name + email + phone all match
    return nameMatch && emailMatch && phoneMatch;
  });
};

// Check if a contact has a valid phone number (10+ digits)
const hasValidPhone = (contact: any): boolean => {
  const phone = contact.phone?.replace(/\D/g, '') || '';
  return phone.length >= 10;
};

// Build columns dynamically based on activeFilter
const getColumns = (
  activeFilter: string, 
  allContacts: any[], 
  onApprove?: (contact: any) => void, 
  onDeny?: (contact: any) => void
): ColumnDef<any>[] => {
  // For Pending Approval tab, use specific column order
  if (activeFilter === 'Pending Approval') {
    const columns: ColumnDef<any>[] = [];
    
    // Action column first (approve/deny)
    if (onApprove && onDeny) {
      columns.push({
        accessorKey: "actions",
        header: "Action",
        cell: ({ row }) => {
          const contact = row.original;
          if (contact.source_type !== 'email_import' || contact.approval_status !== 'pending') {
            return <span className="text-xs text-green-600 font-medium">✓ Approved</span>;
          }
          return (
            <div className="flex gap-1">
              <button 
                className="h-6 w-6 p-0 inline-flex items-center justify-center rounded text-green-600 hover:bg-green-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onApprove(contact); }}
                title="Approve contact"
              >
                <Check className="h-4 w-4" />
              </button>
              <button 
                className="h-6 w-6 p-0 inline-flex items-center justify-center rounded text-red-600 hover:bg-red-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDeny(contact); }}
                title="Remove contact"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        },
      });
    }
    
    // Contact Name (centered header)
    columns.push({
      accessorKey: "name",
      header: "Contact Name",
      headerClassName: "text-center",
      cell: ({ row }) => {
        const contact = row.original;
        const fullName = contact.person ? 
          `${contact.person.firstName} ${contact.person.lastName}` :
          `${contact.first_name} ${contact.last_name}`;
        const subtitle = contact.company || 
          (contact.source_type === 'email_import' ? 'Email' : contact.type);
        
        return (
          <div className="pl-2">
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          </div>
        );
      },
      sortable: true,
    });
    
    // Created On
    columns.push({
      accessorKey: "created_at",
      header: "Created On",
      cell: ({ row }) => {
        const date = row.original.created_at;
        if (!date) return <span className="text-sm">—</span>;
        const d = new Date(date);
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        return (
          <div className="text-sm">
            <div>{month} {day}</div>
            <div className="text-muted-foreground text-xs">{time}</div>
          </div>
        );
      },
      sortable: true,
    });
    
    // Email
    columns.push({
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.original.person?.email || row.original.email;
        return (
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Mail className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{email || "—"}</span>
          </div>
        );
      },
    });
    
    // Phone
    columns.push({
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.original.person?.phoneMobile || row.original.phone;
        return (
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Phone className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{formatPhoneNumber(phone)}</span>
          </div>
        );
      },
    });
    
    // Company
    columns.push({
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.company || "—"}</span>
      ),
      sortable: true,
    });
    
    // Job Title
    columns.push({
      accessorKey: "job_title",
      header: "Job Title",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.job_title || "—"}</span>
      ),
      sortable: true,
    });
    
    // Duplicate?
    columns.push({
      accessorKey: "is_duplicate",
      header: "Duplicate?",
      cell: ({ row }) => {
        const isDuplicate = checkIsDuplicate(row.original, allContacts);
        return (
          <span className={`text-sm font-medium ${isDuplicate ? "text-destructive" : "text-muted-foreground"}`}>
            {isDuplicate ? "Yes" : "No"}
          </span>
        );
      },
    });
    
    // Last Associated File
    columns.push({
      accessorKey: "associated_lead",
      header: "Last Associated File",
      cell: ({ row }) => {
        const leadName = row.original.associated_lead_name;
        return (
          <span className="text-sm">{leadName || "—"}</span>
        );
      },
    });
    
    // Tags
    columns.push({
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags?.slice(0, 2).map((tag: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent-foreground"
            >
              {tag}
            </span>
          ))}
          {(row.original.tags?.length || 0) > 2 && (
            <span className="text-xs text-muted-foreground">
              +{(row.original.tags?.length || 0) - 2} more
            </span>
          )}
        </div>
      ),
    });
    
    // Description
    columns.push({
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground truncate max-w-[250px]">
          {row.original.description || "—"}
        </div>
      ),
    });
    
    // Notes (user_notes)
    columns.push({
      accessorKey: "user_notes",
      header: "Notes",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
          {row.original.user_notes ? (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{row.original.user_notes}</span>
            </span>
          ) : "—"}
        </div>
      ),
    });
    
    // Source Email (at end)
    columns.push({
      accessorKey: "source",
      header: "Source Email",
      cell: ({ row }) => (
        <span className="text-sm">{getSourceDisplayName(row.original.source, row.original.type, row.original.source_type)}</span>
      ),
      sortable: true,
    });
    
    return columns;
  }

  const baseColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Contact Name",
      headerClassName: "text-left",
      cell: ({ row }) => {
        const contact = row.original;
        const fullName = contact.person ? 
          `${contact.person.firstName} ${contact.person.lastName}` : 
          `${contact.first_name} ${contact.last_name}`;
        // Show company underneath the name (fall back to source type if no company)
        const subtitle = contact.company || 
          (contact.source_type === 'email_import' ? 'Email' : contact.type);
        
        return (
          <div className="pl-2">
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          </div>
        );
      },
      sortable: true,
    },
    {
      accessorKey: "created_at",
      header: "Created On",
      cell: ({ row }) => {
        // Use created_at for accurate timestamp
        const date = row.original.created_at;
        if (!date) return <span className="text-sm">—</span>;
        
        // Parse the UTC timestamp - Date() automatically converts to local timezone
        const d = new Date(date);
        
        // Format for local timezone
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        return (
          <div className="text-sm">
            <div>{month} {day}</div>
            <div className="text-muted-foreground text-xs">{time}</div>
          </div>
        );
      },
      sortable: true,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.original.person?.email || row.original.email;
        return (
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Mail className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{email || "—"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.original.person?.phoneMobile || row.original.phone;
        return (
          <div className="flex items-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            <Phone className="h-3 w-3 mr-2 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{formatPhoneNumber(phone)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.company || "—"}</span>
      ),
      sortable: true,
    },
    {
      accessorKey: "job_title",
      header: "Job Title",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.job_title || "—"}</span>
      ),
      sortable: true,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-sm">{getSourceDisplayName(row.original.source, row.original.type, row.original.source_type)}</span>
      ),
      sortable: true,
    },
    {
      accessorKey: "associated_lead",
      header: "Last Associated File",
      cell: ({ row }) => {
        const leadName = row.original.associated_lead_name;
        return (
          <span className="text-sm">{leadName || "—"}</span>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground truncate max-w-[250px]">
          {row.original.description || "—"}
        </div>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags?.slice(0, 2).map((tag: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent-foreground"
            >
              {tag}
            </span>
          ))}
          {(row.original.tags?.length || 0) > 2 && (
            <span className="text-xs text-muted-foreground">
              +{(row.original.tags?.length || 0) - 2} more
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
          {row.original.notes ? (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{row.original.notes}</span>
            </span>
          ) : "—"}
        </div>
      ),
    },
  ];

  // Add "Duplicate?" column for "Other" tab
  if (activeFilter === 'Other') {
    const duplicateColumn: ColumnDef<any> = {
      accessorKey: "is_duplicate",
      header: "Duplicate?",
      cell: ({ row }) => {
        const isDuplicate = checkIsDuplicate(row.original, allContacts);
        return (
          <span className={`text-sm font-medium ${isDuplicate ? "text-destructive" : "text-muted-foreground"}`}>
            {isDuplicate ? "Yes" : "No"}
          </span>
        );
      },
    };
    // Find index of notes column and insert after it
    const notesIndex = baseColumns.findIndex(col => col.accessorKey === 'notes');
    return notesIndex !== -1 
      ? [...baseColumns.slice(0, notesIndex + 1), duplicateColumn, ...baseColumns.slice(notesIndex + 1)]
      : [...baseColumns.slice(0, 4), duplicateColumn, ...baseColumns.slice(4)];
  }

  return baseColumns;
};

export default function BorrowerList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const { toast } = useToast();

  // Detail dialogs state
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [selectedLender, setSelectedLender] = useState<any>(null);
  const [isLenderDialogOpen, setIsLenderDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  // Delete dialog state
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selection state for bulk operations
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Collapsible section states
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  
  // Sub-section states for pending approval
  const [pendingWithPhoneExpanded, setPendingWithPhoneExpanded] = useState(true);
  const [pendingEmailOnlyExpanded, setPendingEmailOnlyExpanded] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const allContacts = await databaseService.getAllUnifiedContacts();
      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts.",
        variant: "destructive"
      });
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactCreated = (newContact: any) => {
    loadContacts(); // Reload all contacts to include the new one
  };

  const handleRowClick = (contact: any) => {
    handleViewDetails(contact);
  };

  const handleViewDetails = async (contact: any) => {
    if (contact.source === 'buyer_agents') {
      // Fetch full agent data
      const { data: agentData, error } = await supabase
        .from('buyer_agents')
        .select('*')
        .eq('id', contact.source_id)
        .single();
      
      if (!error && agentData) {
        setSelectedAgent(agentData);
        setIsAgentDialogOpen(true);
      }
    } else if (contact.source === 'lenders') {
      // Fetch full lender data
      const { data: lenderData, error } = await supabase
        .from('lenders')
        .select('*')
        .eq('id', contact.source_id)
        .single();
      
      if (!error && lenderData) {
        setSelectedLender(lenderData);
        setIsLenderDialogOpen(true);
      }
    } else if (contact.source === 'leads') {
      // Navigate to lead details page
      navigate(`/active?leadId=${contact.source_id}`);
    } else {
      // For contacts table entries, open contact dialog
      const { data: contactData, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact.source_id)
        .single();
      
      if (!error && contactData) {
        setSelectedContact(contactData);
        setIsContactDialogOpen(true);
      }
    }
  };

  const handleEdit = (contact: any) => {
    // Same as view details for now - opens the appropriate dialog
    handleViewDetails(contact);
  };

  const handleDelete = (contact: any) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    setIsDeleting(true);
    try {
      if (contactToDelete.source === 'buyer_agents') {
        // Soft delete agent
        await supabase
          .from('buyer_agents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', contactToDelete.source_id);
      } else if (contactToDelete.source === 'lenders') {
        // Delete lender
        await supabase
          .from('lenders')
          .delete()
          .eq('id', contactToDelete.source_id);
      } else if (contactToDelete.source === 'contacts') {
        // Delete contact
        await supabase
          .from('contacts')
          .delete()
          .eq('id', contactToDelete.source_id);
      } else if (contactToDelete.source === 'leads') {
        // Don't allow deleting leads from here
        toast({
          title: "Cannot delete",
          description: "Borrowers cannot be deleted from the Master Contact List. Please use the pipeline view.",
          variant: "destructive"
        });
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        return;
      }

      toast({
        title: "Deleted",
        description: "Contact deleted successfully.",
      });
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      for (const contactId of selectedContactIds) {
        const contact = contacts.find(c => (c.source_id || c.id) === contactId);
        if (!contact) continue;
        
        if (contact.source === 'buyer_agents') {
          await supabase.from('buyer_agents')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', contact.source_id);
        } else if (contact.source === 'lenders') {
          await supabase.from('lenders').delete().eq('id', contact.source_id);
        } else if (contact.source === 'contacts') {
          await supabase.from('contacts').delete().eq('id', contact.source_id);
        }
        // Skip leads - they can't be bulk deleted from here
      }
      toast({ 
        title: "Deleted", 
        description: `${selectedContactIds.length} contact(s) deleted successfully.` 
      });
      setSelectedContactIds([]);
      loadContacts();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete some contacts.", 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  // Approve email-imported contact
  const handleApproveContact = async (contact: any) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ approval_status: 'approved' })
        .eq('id', contact.source_id);

      if (error) throw error;

      toast({
        title: "Contact Approved",
        description: `${contact.first_name} ${contact.last_name} has been approved.`,
      });
      loadContacts();
    } catch (error) {
      console.error('Error approving contact:', error);
      toast({
        title: "Error",
        description: "Failed to approve contact.",
        variant: "destructive"
      });
    }
  };

  // Deny/remove email-imported contact
  const handleDenyContact = async (contact: any) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.source_id);

      if (error) throw error;

      toast({
        title: "Contact Removed",
        description: `${contact.first_name} ${contact.last_name} has been removed.`,
      });
      loadContacts();
    } catch (error) {
      console.error('Error removing contact:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact.",
        variant: "destructive"
      });
    }
  };

  const getFilteredContacts = () => {
    if (activeFilter === 'All') return contacts;
    if (activeFilter === 'Pending Approval') {
      return contacts.filter(c => c.approval_status === 'pending');
    }
    return contacts.filter(c => c.type === activeFilter);
  };

  const filteredContacts = getFilteredContacts();
  
  // Split contacts into categories for collapsible sections
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Pending approval contacts (from email imports)
  const pendingContacts = filteredContacts.filter(c => c.approval_status === 'pending');
  
  // Split pending into two groups: with phone and email only
  const pendingWithPhone = pendingContacts.filter(hasValidPhone);
  const pendingEmailOnly = pendingContacts.filter(c => !hasValidPhone(c));
  
  // Recently added (approved contacts from last 7 days)
  const recentContacts = filteredContacts.filter(c => {
    if (c.approval_status === 'pending') return false;
    const date = new Date(c.created_at || c.lead_created_date);
    return date >= sevenDaysAgo;
  });
  
  // All others (approved contacts older than 7 days)
  const olderContacts = filteredContacts.filter(c => {
    if (c.approval_status === 'pending') return false;
    const date = new Date(c.created_at || c.lead_created_date);
    return date < sevenDaysAgo;
  });
  
  const borrowerCount = contacts.filter((c: any) => c.type === 'Borrower').length;
  const agentCount = contacts.filter((c: any) => c.type === 'Agent').length;
  const lenderCount = contacts.filter((c: any) => c.type === 'Lender').length;
  const pendingApprovalCount = contacts.filter((c: any) => c.approval_status === 'pending').length;
  const otherCount = contacts.filter((c: any) => !['Borrower', 'Agent', 'Lender'].includes(c.type) && c.approval_status !== 'pending').length;

  return (
    <div className="pl-4 pr-0 pt-2 pb-0 space-y-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Contact List</h1>
        <p className="text-xs italic text-muted-foreground/70">
          {contacts.length} total contacts • {borrowerCount} borrowers • {agentCount} agents • {lenderCount} lenders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-success">{borrowerCount}</p>
                <p className="text-sm text-muted-foreground">Borrowers</p>
              </div>
              <User className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-info">{agentCount}</p>
                <p className="text-sm text-muted-foreground">Agents</p>
              </div>
              <Phone className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-warning">{lenderCount}</p>
                <p className="text-sm text-muted-foreground">Lenders</p>
              </div>
              <MapPin className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['All', 'Borrower', 'Agent', 'Lender', 'Pending Approval', 'Other'].map(filter => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
                {filter === 'All' && ` (${contacts.length})`}
                {filter === 'Borrower' && ` (${borrowerCount})`}
                {filter === 'Agent' && ` (${agentCount})`}
                {filter === 'Lender' && ` (${lenderCount})`}
                {filter === 'Pending Approval' && ` (${pendingApprovalCount})`}
                {filter === 'Other' && ` (${otherCount})`}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contacts
            </Button>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedContactIds.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedContactIds.length} contact(s) selected
              </span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContactIds([])}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Pending Approval Section with sub-groups */}
          {pendingContacts.length > 0 && (
            <Collapsible open={pendingExpanded} onOpenChange={setPendingExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                  {pendingExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold">Pending Approval</span>
                  <Badge variant="destructive" className="ml-1">
                    {pendingContacts.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 ml-4 space-y-3">
                {/* With Phone Number - Priority group */}
                {pendingWithPhone.length > 0 && (
                  <Collapsible open={pendingWithPhoneExpanded} onOpenChange={setPendingWithPhoneExpanded}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                        {pendingWithPhoneExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">With Phone Number</span>
                        <Badge variant="default" className="ml-1 bg-green-600">
                          {pendingWithPhone.length}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          Priority
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <DataTable
                        columns={getColumns('Pending Approval', contacts, handleApproveContact, handleDenyContact)}
                        data={pendingWithPhone}
                        searchTerm={searchTerm}
                        onRowClick={handleRowClick}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selectable={true}
                        selectedIds={selectedContactIds}
                        onSelectionChange={setSelectedContactIds}
                        getRowId={(row) => row.source_id || row.id}
                        showRowNumbers={true}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}
                
                {/* Email Only - Secondary group */}
                {pendingEmailOnly.length > 0 && (
                  <Collapsible open={pendingEmailOnlyExpanded} onOpenChange={setPendingEmailOnlyExpanded}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                        {pendingEmailOnlyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">Email Only</span>
                        <Badge variant="secondary" className="ml-1">
                          {pendingEmailOnly.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <DataTable
                        columns={getColumns('Pending Approval', contacts, handleApproveContact, handleDenyContact)}
                        data={pendingEmailOnly}
                        searchTerm={searchTerm}
                        onRowClick={handleRowClick}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        selectable={true}
                        selectedIds={selectedContactIds}
                        onSelectionChange={setSelectedContactIds}
                        getRowId={(row) => row.source_id || row.id}
                        showRowNumbers={true}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Recently Added Section */}
          {recentContacts.length > 0 && (
            <Collapsible open={recentExpanded} onOpenChange={setRecentExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                  {recentExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold">Recently Added</span>
                  <Badge variant="secondary" className="ml-1">
                    {recentContacts.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground">(Last 7 days)</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <DataTable
                  columns={getColumns(activeFilter, contacts, handleApproveContact, handleDenyContact)}
                  data={recentContacts}
                  searchTerm={searchTerm}
                  onRowClick={handleRowClick}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  selectable={true}
                  selectedIds={selectedContactIds}
                  onSelectionChange={setSelectedContactIds}
                  getRowId={(row) => row.source_id || row.id}
                  showRowNumbers={true}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* All Section */}
          {olderContacts.length > 0 && (
            <Collapsible open={allExpanded} onOpenChange={setAllExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                  {allExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold">All</span>
                  <Badge variant="outline" className="ml-1">
                    {olderContacts.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <DataTable
                  columns={getColumns(activeFilter, contacts, handleApproveContact, handleDenyContact)}
                  data={olderContacts}
                  searchTerm={searchTerm}
                  onRowClick={handleRowClick}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  selectable={true}
                  selectedIds={selectedContactIds}
                  onSelectionChange={setSelectedContactIds}
                  getRowId={(row) => row.source_id || row.id}
                  showRowNumbers={true}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Empty state */}
          {pendingContacts.length === 0 && recentContacts.length === 0 && olderContacts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          )}
        </CardContent>
      </Card>
      
      <CreateContactModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onContactCreated={handleContactCreated}
      />

      <AgentDetailDialog
        agent={selectedAgent}
        isOpen={isAgentDialogOpen}
        onClose={() => {
          setIsAgentDialogOpen(false);
          setSelectedAgent(null);
        }}
        onAgentUpdated={loadContacts}
      />

      <LenderDetailDialog
        lender={selectedLender}
        isOpen={isLenderDialogOpen}
        onClose={() => {
          setIsLenderDialogOpen(false);
          setSelectedLender(null);
        }}
        onLenderUpdated={loadContacts}
      />

      <ContactDetailDialog
        contact={selectedContact}
        isOpen={isContactDialogOpen}
        onClose={() => {
          setIsContactDialogOpen(false);
          setSelectedContact(null);
        }}
        onContactUpdated={loadContacts}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Delete Contact"
        description={`Are you sure you want to delete ${contactToDelete?.first_name} ${contactToDelete?.last_name}? This action cannot be undone.`}
      />

      <DeleteConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={confirmBulkDelete}
        isLoading={isDeleting}
        title="Delete Selected Contacts"
        description={`Are you sure you want to delete ${selectedContactIds.length} selected contact(s)? This action cannot be undone.`}
      />
    </div>
  );
}
