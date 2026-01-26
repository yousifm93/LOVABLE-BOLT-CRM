import { useState, useEffect, useCallback } from "react";
import { Upload, File, X, Trash2, Download, Eye, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

interface LenderDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

interface LenderFilesSectionProps {
  lenderId: string;
  onFilesChange?: () => void;
}

export function LenderFilesSection({ lenderId, onFilesChange }: LenderFilesSectionProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<LenderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lender_documents')
        .select('*')
        .eq('lender_id', lenderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching lender documents:', error);
    } finally {
      setLoading(false);
    }
  }, [lenderId]);

  useEffect(() => {
    if (lenderId) {
      fetchDocuments();
    }
  }, [lenderId, fetchDocuments]);

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const filePath = `lender-docs/${lenderId}/${timestamp}_${file.name}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        const { data: crmUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user?.id)
          .maybeSingle();

        // Insert document record
        const { error: insertError } = await supabase
          .from('lender_documents')
          .insert({
            lender_id: lenderId,
            file_name: file.name,
            file_url: filePath,
            file_type: file.type || null,
            file_size: file.size,
            uploaded_by: crmUser?.id || null,
          });

        if (insertError) throw insertError;
      }

      toast({ title: "Success", description: `${files.length} file(s) uploaded` });
      fetchDocuments();
      onFilesChange?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([fileUrl]);
      
      // Delete from database
      const { error } = await supabase
        .from('lender_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast({ title: "Success", description: "File deleted" });
      fetchDocuments();
      onFilesChange?.();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteDocId(null);
    }
  };

  const handleView = async (fileUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, 300);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('View error:', error);
      toast({
        title: "Failed to open file",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(fileUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    return '📎';
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading files...</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
        `}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        ) : (
          <div className="space-y-2">
            <Paperclip className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or{' '}
              <label className="text-primary cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
              </label>
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {documents.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base">{getFileIcon(doc.file_name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleView(doc.file_url)}
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleDownload(doc.file_url, doc.file_name)}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteDocId(doc.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No files uploaded yet.</p>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const doc = documents.find(d => d.id === deleteDocId);
                if (doc) handleDelete(doc.id, doc.file_url);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
