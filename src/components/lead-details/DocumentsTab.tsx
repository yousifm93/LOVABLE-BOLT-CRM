import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, File, Upload, Trash2, X } from "lucide-react";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { Button } from "@/components/ui/button";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { cn } from "@/lib/utils";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { ActiveFileDocuments } from "./ActiveFileDocuments";

interface Document {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  title?: string;
  notes?: string;
}

interface DocumentsTabProps {
  leadId: string | null;
  documents: Document[];
  onDocumentsChange: () => void;
  lead?: any;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes('image')) return <File className="h-4 w-4 text-blue-500" />;
  if (type.includes('word') || type.includes('document')) return <FileText className="h-4 w-4 text-blue-600" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileText className="h-4 w-4 text-green-600" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const getFileTypeBadge = (type: string) => {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('image')) return 'IMAGE';
  if (type.includes('word') || type.includes('document')) return 'DOC';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'XLSX';
  return 'FILE';
};

export function DocumentsTab({ leadId, documents, onDocumentsChange, lead }: DocumentsTabProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ 
    name: string; 
    url: string | null; 
    mimeType: string;
    pdfData?: ArrayBuffer;
    originalDoc?: Document;
  }>({ 
    name: '', 
    url: null, 
    mimeType: '' 
  });
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (!leadId || uploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files.slice(0, 10));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files.slice(0, 10));
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!leadId || selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        await databaseService.uploadLeadDocument(leadId, file);
      }
      
      toast({
        title: "Success",
        description: `${selectedFiles.length} document(s) uploaded successfully`
      });
      
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onDocumentsChange();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const signedUrl = await databaseService.getDocumentSignedUrl(doc.file_url);
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error('Failed to fetch file');
      
      // Handle PDFs differently - fetch as ArrayBuffer
      if (doc.mime_type === 'application/pdf') {
        const arrayBuffer = await res.arrayBuffer();
        setPreviewDoc({
          name: doc.title || doc.file_name,
          url: null,
          mimeType: doc.mime_type,
          pdfData: arrayBuffer,
          originalDoc: doc,
        });
      } else {
        // For images and other files, use blob URL
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(new Blob([blob], { type: doc.mime_type }));
        setPreviewDoc({
          name: doc.title || doc.file_name,
          url: blobUrl,
          mimeType: doc.mime_type,
          originalDoc: doc,
        });
      }
      
      setPreviewOpen(true);
    } catch (error: any) {
      toast({
        title: "Preview Failed",
        description: error.message || "Could not load document",
        variant: "destructive"
      });
    }
  };

  const handlePreviewClose = (open: boolean) => {
    if (!open) {
      // Clean up blob URL when modal closes (for non-PDFs)
      if (previewDoc.url) {
        URL.revokeObjectURL(previewDoc.url);
      }
      setPreviewDoc({ name: '', url: null, mimeType: '' });
    }
    setPreviewOpen(open);
  };

  const handlePreviewDownload = () => {
    if (previewDoc.originalDoc) {
      handleDownload(previewDoc.originalDoc);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const signedUrl = await databaseService.getDocumentSignedUrl(doc.file_url);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${doc.file_name}`
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Could not download document",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;
    
    try {
      await databaseService.deleteLeadDocument(doc.id, doc.file_url);
      toast({
        title: "Deleted",
        description: "Document deleted successfully"
      });
      onDocumentsChange();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete document",
        variant: "destructive"
      });
    }
  };

  const handleRename = async (doc: Document, newTitle: string) => {
    try {
      await databaseService.updateLeadDocument(doc.id, { 
        title: newTitle.trim() || null 
      });
      
      toast({
        title: "Renamed",
        description: "Document name updated successfully"
      });
      
      onDocumentsChange();
    } catch (error: any) {
      toast({
        title: "Rename Failed",
        description: error.message || "Could not rename document",
        variant: "destructive"
      });
    }
  };

  if (!leadId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
        <p>No lead selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          dragActive && "border-primary bg-primary/5",
          uploading && "opacity-50 pointer-events-none",
          !dragActive && "hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {selectedFiles.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {selectedFiles.length} file(s) selected
              </span>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                size="sm"
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
            
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedFile(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drag & drop documents here
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              or click to browse (PDF, DOC, XLSX, Images)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Files
            </Button>
          </div>
        )}
      </div>

      {/* Active File Documents Section - Below Drag & Drop */}
      {leadId && lead && (
        <ActiveFileDocuments 
          leadId={leadId} 
          lead={lead} 
          onLeadUpdate={onDocumentsChange} 
        />
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>No documents uploaded yet</p>
          <p className="text-sm mt-1">Upload documents to get started</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="shrink-0">
                  {getFileTypeIcon(doc.mime_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <InlineEditText
                      value={doc.title || doc.file_name}
                      onValueChange={(newValue) => handleRename(doc, newValue)}
                      placeholder="Enter document name"
                      className="flex-1"
                    />
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeBadge(doc.mime_type)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.size_bytes)}</span>
                    <span>•</span>
                    <span>
                      Uploaded {formatDistance(new Date(doc.created_at), new Date(), { addSuffix: true })}
                    </span>
                    {doc.title && (
                      <>
                        <span>•</span>
                        <span className="truncate" title={doc.file_name}>
                          Original: {doc.file_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handlePreview(doc)}
                    title="Preview"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDownload(doc)}
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={handlePreviewClose}
        documentName={previewDoc.name}
        documentUrl={previewDoc.url}
        mimeType={previewDoc.mimeType}
        pdfData={previewDoc.pdfData}
        onDownload={handlePreviewDownload}
      />
    </div>
  );
}
