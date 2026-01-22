import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Download,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';

interface BorrowerTask {
  id: string;
  task_name: string;
  task_description: string | null;
  status: string;
  priority: number | null;
  due_date: string | null;
  lead_id: string | null;
  created_at: string | null;
  rejection_notes: string | null;
  reviewed_at: string | null;
}

interface BorrowerDocument {
  id: string;
  task_id: string | null;
  file_name: string;
  document_url: string;
  status: string | null;
  uploaded_at: string | null;
  approved_at: string | null;
  rejection_notes: string | null;
}

interface BorrowerDocumentTasksProps {
  userId: string;
  leadId?: string;
}

const getStatusBadge = (status: string, hasRejectionNotes?: boolean) => {
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
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Revision
        </Badge>
      );
    case 'pending':
      // If pending but has rejection notes, it's a re-request
      if (hasRejectionNotes) {
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Re-Requested
          </Badge>
        );
      }
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
};

export function BorrowerDocumentTasks({ userId, leadId }: BorrowerDocumentTasksProps) {
  const [tasks, setTasks] = useState<BorrowerTask[]>([]);
  const [documents, setDocuments] = useState<BorrowerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
      
      // Get task IDs to fetch documents
      const taskIds = (tasksData || []).map(t => t.id);
      
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
      console.error('Error loading borrower tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load document requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [leadId]);

  const handleUploadClick = (taskId: string) => {
    setUploadingTaskId(taskId);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTaskId) return;
    
    try {
      // Upload file to storage - use 'documents' bucket (public)
      const fileExt = file.name.split('.').pop();
      const fileName = `borrower-uploads/${userId}/${uploadingTaskId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get the full public URL to store in database
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);
      
      // Create document record with full public URL
      const { error: docError } = await supabase
        .from('borrower_documents')
        .insert({
          task_id: uploadingTaskId,
          lead_id: leadId,
          user_id: userId,
          file_name: file.name,
          document_url: publicUrl,
          file_size: file.size,
          status: 'pending_review',
          source: 'borrower_upload'
        });
      
      if (docError) throw docError;
      
      // Update task status to in_review and clear rejection notes
      await supabase
        .from('borrower_tasks')
        .update({ 
          status: 'in_review',
          rejection_notes: null // Clear old rejection notes on re-upload
        })
        .eq('id', uploadingTaskId);
      
      toast({
        title: "Document Uploaded",
        description: "Your document has been submitted for review"
      });
      
      await loadData();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploadingTaskId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadDocument = async (doc: BorrowerDocument) => {
    if (!doc.document_url) return;
    
    try {
      const response = await fetch(doc.document_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the document",
        variant: "destructive"
      });
    }
  };

  const getTaskDocuments = (taskId: string) => documents.filter(d => d.task_id === taskId);

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inReviewTasks = tasks.filter(t => t.status === 'in_review' || t.status === 'in review');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');
  const rejectedTasks = tasks.filter(t => t.status === 'rejected');

  // Active tasks = pending + rejected (need action from borrower)
  const activeTasks = [...pendingTasks, ...rejectedTasks];

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return null; // Don't show if no tasks
  }

  const renderTaskCard = (task: BorrowerTask, showUploadButton: boolean = true) => {
    const taskDocs = getTaskDocuments(task.id);
    const needsUpload = task.status === 'pending' || task.status === 'rejected';
    const hasRejectionNotes = !!task.rejection_notes;
    
    return (
      <div key={task.id} className="border rounded-lg p-4 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">{task.task_name}</span>
              {getStatusBadge(task.status, hasRejectionNotes)}
            </div>
            {task.task_description && (
              <p className="text-sm text-muted-foreground mb-2">
                {task.task_description}
              </p>
            )}
            {task.created_at && (
              <p className="text-xs text-muted-foreground">
                Requested {formatDistance(new Date(task.created_at), new Date(), { addSuffix: true })}
              </p>
            )}
          </div>
          
          {showUploadButton && needsUpload && (
            <Button
              size="sm"
              onClick={() => handleUploadClick(task.id)}
              disabled={uploadingTaskId === task.id}
            >
              {uploadingTaskId === task.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  {hasRejectionNotes ? 'Re-Upload' : 'Upload'}
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Show rejection notes prominently if present */}
        {hasRejectionNotes && task.status === 'pending' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">Revision Requested</p>
                <p className="text-sm text-red-700">{task.rejection_notes}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Show uploaded documents */}
        {taskDocs.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {taskDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{doc.file_name}</span>
                  {doc.uploaded_at && (
                    <span className="text-xs text-muted-foreground">
                      Uploaded {formatDistance(new Date(doc.uploaded_at), new Date(), { addSuffix: true })}
                    </span>
                  )}
                  {doc.status === 'approved' && doc.approved_at && (
                    <span className="text-xs text-green-600 ml-2">
                      • Approved {formatDistance(new Date(doc.approved_at), new Date(), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <Badge variant={
                  doc.status === 'approved' ? 'default' : 
                  doc.status === 'rejected' ? 'destructive' : 
                  'secondary'
                } className="text-xs flex-shrink-0">
                  {doc.status === 'approved' ? 'Approved' : 
                   doc.status === 'rejected' ? 'Needs Revision' : 
                   'In Review'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleDownloadDocument(doc)}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">
              Task List
              {activeTasks.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {documents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="mt-4 space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No pending document requests</p>
              </div>
            ) : (
              <>
                {/* Needs Action - Pending + Rejected (with rejection notes shown) */}
                {activeTasks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Needs Your Action ({activeTasks.length})
                    </h4>
                    {activeTasks.map(task => renderTaskCard(task, true))}
                  </div>
                )}
                
                {/* In Review */}
                {inReviewTasks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      In Review ({inReviewTasks.length})
                    </h4>
                    {inReviewTasks.map(task => renderTaskCard(task, false))}
                  </div>
                )}
                
                {/* Completed - NOW VISIBLE */}
                {completedTasks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed ({completedTasks.length})
                    </h4>
                    {completedTasks.map(task => renderTaskCard(task, false))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="documents" className="mt-4">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => {
                  const task = tasks.find(t => t.id === doc.task_id);
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task && <span>{task.task_name}</span>}
                          {doc.uploaded_at && (
                            <span>
                              • Uploaded {formatDistance(new Date(doc.uploaded_at), new Date(), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {doc.status === 'approved' && doc.approved_at && (
                          <p className="text-xs text-green-600">
                            Approved {formatDistance(new Date(doc.approved_at), new Date(), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <Badge variant={
                        doc.status === 'approved' ? 'default' : 
                        doc.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }>
                        {doc.status === 'approved' ? 'Approved' : 
                         doc.status === 'rejected' ? 'Needs Revision' : 
                         'In Review'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadDocument(doc)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
