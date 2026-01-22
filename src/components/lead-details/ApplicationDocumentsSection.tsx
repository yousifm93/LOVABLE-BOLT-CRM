import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  FileText, 
  Eye, 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { formatDistance, format } from "date-fns";
import { AddBorrowerTaskModal } from "@/components/modals/AddBorrowerTaskModal";
import { supabase } from "@/integrations/supabase/client";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DocumentRejectionModal } from "@/components/modals/DocumentRejectionModal";

interface BorrowerTask {
  id: string;
  task_name: string;
  task_description: string | null;
  status: string;
  priority: number | null;
  due_date: string | null;
  lead_id: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  rejection_notes: string | null;
  reviewed_at: string | null;
}

interface BorrowerDocument {
  id: string;
  task_id: string | null;
  lead_id: string | null;
  file_name: string;
  document_url: string;
  document_type: string | null;
  status: string | null;
  uploaded_at: string | null;
  file_size: number | null;
  approved_at: string | null;
  reviewed_at: string | null;
  rejection_notes: string | null;
}

interface ApplicationDocumentsSectionProps {
  leadId: string;
  onDocumentsChange?: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case 'in_review':
    case 'in review':
    case 'pending_review':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          In Review
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
};

export function ApplicationDocumentsSection({ leadId, onDocumentsChange }: ApplicationDocumentsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [tasks, setTasks] = useState<BorrowerTask[]>([]);
  const [documents, setDocuments] = useState<BorrowerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [sendingRequests, setSendingRequests] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    url: string | null;
    mimeType: string;
    pdfData?: ArrayBuffer;
  }>({ name: '', url: null, mimeType: '' });
  
  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [documentToReject, setDocumentToReject] = useState<BorrowerDocument | null>(null);
  
  const { toast } = useToast();

  const loadData = async () => {
    if (!leadId) return;
    
    try {
      setLoading(true);
      
      // Fetch borrower tasks for this lead
      const { data: tasksData, error: tasksError } = await supabase
        .from('borrower_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
      
      // Get task IDs to fetch documents linked to those tasks
      const taskIds = (tasksData || []).map(t => t.id);
      
      // Fetch borrower documents linked to tasks (documents are connected via task_id, not lead_id)
      if (taskIds.length > 0) {
        const { data: docsData, error: docsError } = await supabase
          .from('borrower_documents')
          .select('*')
          .in('task_id', taskIds)
          .order('uploaded_at', { ascending: false });
        
        if (docsError) throw docsError;
        setDocuments(docsData || []);
      } else {
        setDocuments([]);
      }
    } catch (error: any) {
      console.error('Error loading application documents:', error);
      toast({
        title: "Error",
        description: "Failed to load application documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [leadId]);

  const handleAddTask = async (taskData: { task_name: string; task_description: string; priority: number }) => {
    try {
      const { error } = await supabase
        .from('borrower_tasks')
        .insert({
          lead_id: leadId,
          task_name: taskData.task_name,
          task_description: taskData.task_description,
          priority: taskData.priority,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast({
        title: "Document Request Created",
        description: `"${taskData.task_name}" request has been created`
      });
      
      await loadData();
      onDocumentsChange?.();
    } catch (error: any) {
      console.error('Error creating borrower task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document request",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this document request?')) return;
    
    try {
      setDeletingTaskId(taskId);
      
      const { error } = await supabase
        .from('borrower_tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast({
        title: "Deleted",
        description: "Document request deleted"
      });
      
      await loadData();
      onDocumentsChange?.();
    } catch (error: any) {
      console.error('Error deleting borrower task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete document request",
        variant: "destructive"
      });
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleViewDocument = async (doc: BorrowerDocument) => {
    if (!doc.document_url) {
      toast({
        title: "Error",
        description: "Document URL not found",
        variant: "destructive"
      });
      return;
    }

    try {
      setPreviewLoading(true);
      
      let documentUrl = doc.document_url;
      
      // If it's a relative path (not starting with http), generate signed URL
      if (!documentUrl.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(documentUrl, 3600);
        if (error) throw error;
        documentUrl = data.signedUrl;
      }
      
      // Fetch the document
      const res = await fetch(documentUrl);
      if (!res.ok) throw new Error('Failed to fetch document');
      
      const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        const arrayBuffer = await res.arrayBuffer();
        setPreviewDoc({
          name: doc.file_name,
          url: null,
          mimeType: 'application/pdf',
          pdfData: arrayBuffer
        });
      } else {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewDoc({
          name: doc.file_name,
          url: blobUrl,
          mimeType: doc.document_type || 'image/jpeg'
        });
      }
      
      setPreviewOpen(true);
    } catch (error: any) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to load document preview",
        variant: "destructive"
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: BorrowerDocument) => {
    if (!doc.document_url) {
      toast({
        title: "Error",
        description: "Document URL not found",
        variant: "destructive"
      });
      return;
    }

    try {
      let documentUrl = doc.document_url;
      
      // If it's a relative path (not starting with http), generate signed URL
      if (!documentUrl.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(documentUrl, 3600);
        if (error) throw error;
        documentUrl = data.signedUrl;
      }
      
      // Fetch and download
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${doc.file_name}`
      });
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const handleApproveDocument = async (doc: BorrowerDocument) => {
    try {
      const now = new Date().toISOString();
      
      // Update document status
      const { error: docError } = await supabase
        .from('borrower_documents')
        .update({ 
          status: 'approved',
          approved_at: now,
          reviewed_at: now
        })
        .eq('id', doc.id);
      
      if (docError) throw docError;
      
      // Update task status to completed
      if (doc.task_id) {
        await supabase
          .from('borrower_tasks')
          .update({ 
            status: 'completed',
            reviewed_at: now
          })
          .eq('id', doc.task_id);
      }
      
      toast({
        title: "Document Approved",
        description: `${doc.file_name} has been approved`
      });
      
      await loadData();
      onDocumentsChange?.();
    } catch (error: any) {
      console.error('Error approving document:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve document",
        variant: "destructive"
      });
    }
  };

  const handleRejectClick = (doc: BorrowerDocument) => {
    setDocumentToReject(doc);
    setRejectionModalOpen(true);
  };

  const handleRejectDocument = async (rejectionNotes: string) => {
    if (!documentToReject) return;
    
    try {
      const now = new Date().toISOString();
      
      // Update document status with rejection notes
      const { error: docError } = await supabase
        .from('borrower_documents')
        .update({ 
          status: 'rejected',
          rejection_notes: rejectionNotes,
          reviewed_at: now
        })
        .eq('id', documentToReject.id);
      
      if (docError) throw docError;
      
      // Update task status back to pending (re-requested) with rejection notes
      if (documentToReject.task_id) {
        await supabase
          .from('borrower_tasks')
          .update({ 
            status: 'pending', // Back to pending so borrower can re-upload
            rejection_notes: rejectionNotes,
            reviewed_at: now
          })
          .eq('id', documentToReject.task_id);
      }
      
      toast({
        title: "Document Rejected",
        description: "The borrower will be notified to upload a revised document"
      });
      
      setDocumentToReject(null);
      await loadData();
      onDocumentsChange?.();
    } catch (error: any) {
      console.error('Error rejecting document:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject document",
        variant: "destructive"
      });
    }
  };

  // Send document requests email to borrower
  const handleSendRequests = async () => {
    const pendingItems = tasks.filter(t => t.status === 'pending');
    
    if (pendingItems.length === 0) {
      toast({
        title: "No Pending Requests",
        description: "There are no pending document requests to send",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSendingRequests(true);
      
      // Fetch the lead to get borrower email
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('first_name, last_name, email')
        .eq('id', leadId)
        .single();
      
      if (leadError) throw leadError;
      if (!leadData?.email) {
        throw new Error("Borrower email not found");
      }
      
      // Call edge function to send the email
      const { error: emailError } = await supabase.functions.invoke('send-document-requests', {
        body: {
          borrowerEmail: leadData.email,
          borrowerName: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim(),
          pendingTasks: pendingItems.map(t => ({
            name: t.task_name,
            description: t.task_description,
            rejectionNotes: t.rejection_notes // Include rejection notes if re-requesting
          })),
          portalUrl: 'https://mortgagebolt.org/apply'
        }
      });
      
      if (emailError) throw emailError;
      
      toast({
        title: "Email Sent",
        description: `Document request email sent to ${leadData.email}`
      });
    } catch (error: any) {
      console.error('Error sending document requests:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send document request email",
        variant: "destructive"
      });
    } finally {
      setSendingRequests(false);
    }
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inReviewTasks = tasks.filter(t => t.status === 'in_review' || t.status === 'in review');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');

  // Get documents for a task
  const getTaskDocuments = (taskId: string) => documents.filter(d => d.task_id === taskId);

  const renderTask = (task: BorrowerTask) => {
    const taskDocs = getTaskDocuments(task.id);
    
    return (
      <div key={task.id} className="border rounded-lg p-3 bg-background hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm truncate">{task.task_name}</span>
              {getStatusBadge(task.status)}
            </div>
            {task.task_description && (
              <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                {task.task_description}
              </p>
            )}
            {task.created_at && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Requested {formatDistance(new Date(task.created_at), new Date(), { addSuffix: true })}
              </p>
            )}
            {/* Show rejection notes if task was previously rejected */}
            {task.rejection_notes && task.status === 'pending' && (
              <div className="mt-2 ml-6 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <span className="font-medium">Revision requested:</span> {task.rejection_notes}
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive flex-shrink-0"
            onClick={() => handleDeleteTask(task.id)}
            disabled={deletingTaskId === task.id}
          >
            {deletingTaskId === task.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        
        {/* Show uploaded documents for this task */}
        {taskDocs.length > 0 && (
          <div className="mt-2 ml-6 space-y-1">
            {taskDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{doc.file_name}</span>
                  {/* Upload timestamp */}
                  {doc.uploaded_at && (
                    <span className="text-[10px] text-muted-foreground">
                      Uploaded {formatDistance(new Date(doc.uploaded_at), new Date(), { addSuffix: true })}
                    </span>
                  )}
                  {/* Approval timestamp */}
                  {doc.status === 'approved' && doc.approved_at && (
                    <span className="text-[10px] text-green-600 ml-2">
                      • Approved {formatDistance(new Date(doc.approved_at), new Date(), { addSuffix: true })}
                    </span>
                  )}
                  {/* Rejection notes */}
                  {doc.status === 'rejected' && doc.rejection_notes && (
                    <p className="text-[10px] text-red-600 mt-0.5">
                      Rejected: {doc.rejection_notes}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                  {doc.status === 'approved' ? 'Approved' : 
                   doc.status === 'rejected' ? 'Rejected' : 
                   doc.status === 'pending_review' ? 'In Review' :
                   'Uploaded'}
                </Badge>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleViewDocument(doc)}
                    title="View"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDownloadDocument(doc)}
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {doc.status !== 'approved' && doc.status !== 'rejected' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                        onClick={() => handleApproveDocument(doc)}
                        title="Approve"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleRejectClick(doc)}
                        title="Reject"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {taskDocs.length === 0 && task.status === 'pending' && (
          <p className="text-xs text-muted-foreground mt-2 ml-6 italic">
            No document uploaded yet
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="shadow-sm border border-orange-200 bg-orange-50/30">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 text-left"
            >
              <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-orange-100 transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-orange-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                )}
              </div>
              <span className="font-semibold text-sm text-orange-900">
                Application Documents ({tasks.length})
              </span>
            </button>
            
            <div className="flex items-center gap-2">
              {pendingTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-blue-300 hover:bg-blue-100 text-blue-700"
                  onClick={handleSendRequests}
                  disabled={sendingRequests}
                >
                  {sendingRequests ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 mr-1" />
                  )}
                  Send Requests
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-orange-300 hover:bg-orange-100"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Request
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isOpen && (
          <CardContent className="pt-0 px-3 pb-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No document requests yet</p>
                <p className="text-xs">Click "Add Request" to create one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pending Section */}
                {pendingTasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
                      Pending ({pendingTasks.length})
                    </h4>
                    {pendingTasks.map(renderTask)}
                  </div>
                )}
                
                {/* In Review Section */}
                {inReviewTasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      In Review ({inReviewTasks.length})
                    </h4>
                    {inReviewTasks.map(renderTask)}
                  </div>
                )}
                
                {/* Completed Section */}
                {completedTasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Completed ({completedTasks.length})
                    </h4>
                    {completedTasks.map(renderTask)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      <AddBorrowerTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={handleAddTask}
      />
      
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentName={previewDoc.name}
        documentUrl={previewDoc.url}
        mimeType={previewDoc.mimeType}
        pdfData={previewDoc.pdfData}
      />
      
      <DocumentRejectionModal
        open={rejectionModalOpen}
        onOpenChange={setRejectionModalOpen}
        documentName={documentToReject?.file_name || ''}
        onConfirm={handleRejectDocument}
      />
    </>
  );
}
