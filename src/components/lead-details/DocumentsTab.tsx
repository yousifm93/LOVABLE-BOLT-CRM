import React, { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, File, Upload, Trash2, X, Sparkles, Loader2, ChevronDown, ChevronRight, Image, FileIcon } from "lucide-react";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { Button } from "@/components/ui/button";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";
import { cn } from "@/lib/utils";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { ActiveFileDocuments } from "./ActiveFileDocuments";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
  source?: string;
}

interface Condition {
  id: string;
  document_id: string | null;
  description: string;
}

interface DocumentsTabProps {
  leadId: string | null;
  documents: Document[];
  onDocumentsChange: () => void;
  onLeadUpdated?: () => void;
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

export function DocumentsTab({ leadId, documents, onDocumentsChange, onLeadUpdated, lead }: DocumentsTabProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [isConditionDocsOpen, setIsConditionDocsOpen] = useState(true);
  const [isEmailDocsOpen, setIsEmailDocsOpen] = useState(true);
  const [isOtherDocsOpen, setIsOtherDocsOpen] = useState(true);
  const [isImagesOpen, setIsImagesOpen] = useState(true);
  const [isPdfsOpen, setIsPdfsOpen] = useState(true);
  const [isOtherFilesOpen, setIsOtherFilesOpen] = useState(true);
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

  // Load conditions to identify condition documents
  useEffect(() => {
    const loadConditions = async () => {
      if (!leadId) return;
      try {
        const data = await databaseService.getLeadConditions(leadId);
        setConditions(data || []);
      } catch (error) {
        console.error("Error loading conditions:", error);
      }
    };
    loadConditions();
  }, [leadId, documents]); // Reload when documents change

  // Group documents by source type and file type
  const { conditionDocs, emailDocs, imageDocs, pdfDocs, otherFiles, conditionDocMap } = useMemo(() => {
    const conditionDocIds = new Set(conditions.filter(c => c.document_id).map(c => c.document_id!));
    
    // Build map of document ID to condition description
    const docToCondition: Record<string, string> = {};
    conditions.forEach(c => {
      if (c.document_id) {
        docToCondition[c.document_id] = c.description;
      }
    });
    
    const conditionDocsList: Document[] = [];
    const emailDocsList: Document[] = [];
    const otherDocsList: Document[] = [];
    
    documents.forEach(doc => {
      if (conditionDocIds.has(doc.id) || doc.source === 'condition') {
        conditionDocsList.push(doc);
      } else if (doc.source === 'email_attachment') {
        emailDocsList.push(doc);
      } else {
        otherDocsList.push(doc);
      }
    });
    
    // Further split otherDocs into Images, PDFs, and Other Files
    const imageDocsList: Document[] = [];
    const pdfDocsList: Document[] = [];
    const otherFilesList: Document[] = [];
    
    otherDocsList.forEach(doc => {
      if (doc.mime_type?.includes('image')) {
        imageDocsList.push(doc);
      } else if (doc.mime_type?.includes('pdf') || doc.file_name.toLowerCase().endsWith('.pdf')) {
        pdfDocsList.push(doc);
      } else {
        otherFilesList.push(doc);
      }
    });
    
    return { 
      conditionDocs: conditionDocsList, 
      emailDocs: emailDocsList, 
      imageDocs: imageDocsList,
      pdfDocs: pdfDocsList,
      otherFiles: otherFilesList,
      conditionDocMap: docToCondition
    };
  }, [documents, conditions]);

  const handleAIRename = async (doc: Document) => {
    setRenamingDocId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-document-content', {
        body: {
          fileName: doc.file_name,
          mimeType: doc.mime_type,
          borrowerLastName: lead?.last_name
        }
      });

      if (error) throw error;

      if (data?.suggestedName) {
        const newName = data.suggestedNameWithBorrower || data.suggestedName;
        await databaseService.updateLeadDocument(doc.id, { title: newName });
        
        toast({
          title: "Document Renamed",
          description: `Renamed to "${newName}"`,
        });
        
        onDocumentsChange();
      } else {
        toast({
          title: "Could not determine name",
          description: "AI couldn't suggest a better name for this document",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('AI rename error:', error);
      toast({
        title: "Rename Failed",
        description: error.message || "Could not rename document with AI",
        variant: "destructive",
      });
    } finally {
      setRenamingDocId(null);
    }
  };

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

  // Helper to get actual MIME type from file extension
  const getActualMimeType = (fileName: string, storedMimeType: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'doc') return 'application/msword';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'xls') return 'application/vnd.ms-excel';
    if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    // If stored type looks valid (starts with valid prefix), use it
    if (storedMimeType && (storedMimeType.startsWith('application/') || storedMimeType.startsWith('image/') || storedMimeType.startsWith('text/'))) {
      return storedMimeType;
    }
    return 'application/octet-stream';
  };

  const handlePreview = async (doc: Document) => {
    try {
      const signedUrl = await databaseService.getDocumentSignedUrl(doc.file_url);
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error('Failed to fetch file');
      
      // Get actual MIME type from file extension (fallback for incorrect DB values)
      const actualMimeType = getActualMimeType(doc.file_name, doc.mime_type);
      const isPdf = actualMimeType === 'application/pdf' || 
                    doc.file_name.toLowerCase().endsWith('.pdf') ||
                    doc.file_url.toLowerCase().includes('.pdf');
      
      // Handle PDFs differently - fetch as ArrayBuffer
      if (isPdf) {
        const arrayBuffer = await res.arrayBuffer();
        setPreviewDoc({
          name: doc.title || doc.file_name,
          url: null,
          mimeType: 'application/pdf',
          pdfData: arrayBuffer,
          originalDoc: doc,
        });
      } else {
        // For images and other files, use blob URL with correct MIME type
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(new Blob([blob], { type: actualMimeType }));
        setPreviewDoc({
          name: doc.title || doc.file_name,
          url: blobUrl,
          mimeType: actualMimeType,
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
      
      // Fetch as blob to bypass Chrome's cross-origin download blocking
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.title || doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
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

  // Render a single document row
  const renderDocumentRow = (doc: Document, conditionName?: string) => (
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
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs",
              doc.source === 'email_attachment' && "bg-blue-100 text-blue-700",
              doc.source === 'borrower_upload' && "bg-orange-100 text-orange-700",
              doc.source === 'application' && "bg-green-100 text-green-700",
              doc.source === 'condition' && "bg-purple-100 text-purple-700",
              (!doc.source || doc.source === 'manual') && "bg-gray-100 text-gray-600"
            )}
          >
            {doc.source === 'email_attachment' ? 'Email' :
             doc.source === 'borrower_upload' ? 'Borrower' :
             doc.source === 'application' ? 'App' :
             doc.source === 'condition' ? 'Condition' : 'Manual'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatFileSize(doc.size_bytes)}</span>
          <span>•</span>
          <span>
            Uploaded {formatDistance(new Date(doc.created_at), new Date(), { addSuffix: true })}
          </span>
          {conditionName && (
            <>
              <span>•</span>
              <span className="truncate text-purple-600" title={conditionName}>
                Condition: {conditionName}
              </span>
            </>
          )}
          {doc.title && !conditionName && (
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
          onClick={() => handleAIRename(doc)}
          disabled={renamingDocId === doc.id}
          title="AI Rename"
        >
          {renamingDocId === doc.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
        </Button>
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
  );

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
          onLeadUpdate={() => {
            onDocumentsChange();
            onLeadUpdated?.();
          }} 
        />
      )}

      {/* Document Sections */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>No documents uploaded yet</p>
          <p className="text-sm mt-1">Upload documents to get started</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-500px)] min-h-[360px]">
          <div className="space-y-3">
            {/* Condition Documents Section */}
            {conditionDocs.length > 0 && (
              <Card className="shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-3">
                  <button
                    onClick={() => setIsConditionDocsOpen(!isConditionDocsOpen)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-purple-100 transition-colors">
                      {isConditionDocsOpen ? (
                        <ChevronDown className="h-4 w-4 text-purple-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <span className="font-semibold text-sm text-purple-900">
                      Condition Documents ({conditionDocs.length})
                    </span>
                  </button>
                </CardHeader>
                {isConditionDocsOpen && (
                  <CardContent className="pt-0 px-3 pb-3 space-y-2">
                    {conditionDocs.map((doc) => renderDocumentRow(doc, conditionDocMap[doc.id]))}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Email Documents Section */}
            {emailDocs.length > 0 && (
              <Card className="shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-3">
                  <button
                    onClick={() => setIsEmailDocsOpen(!isEmailDocsOpen)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-blue-100 transition-colors">
                      {isEmailDocsOpen ? (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <span className="font-semibold text-sm text-blue-900">
                      Email Documents ({emailDocs.length})
                    </span>
                  </button>
                </CardHeader>
                {isEmailDocsOpen && (
                  <CardContent className="pt-0 px-3 pb-3 space-y-2">
                    {emailDocs.map((doc) => renderDocumentRow(doc))}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Other Documents Section */}
            {(imageDocs.length > 0 || pdfDocs.length > 0 || otherFiles.length > 0) && (
              <Card className="shadow-sm border">
                <CardHeader className="pb-2 pt-3 px-3">
                  <button
                    onClick={() => setIsOtherDocsOpen(!isOtherDocsOpen)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <div className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
                      {isOtherDocsOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-semibold text-sm">
                      Other Documents ({imageDocs.length + pdfDocs.length + otherFiles.length})
                    </span>
                  </button>
                </CardHeader>
                {isOtherDocsOpen && (
                  <CardContent className="pt-0 px-3 pb-3 space-y-3">
                    {/* Images Subcategory */}
                    {imageDocs.length > 0 && (
                      <Collapsible open={isImagesOpen} onOpenChange={setIsImagesOpen}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {isImagesOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Image className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-medium text-xs">
                            Images ({imageDocs.length})
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2 pl-2">
                          {imageDocs.map((doc) => renderDocumentRow(doc))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* PDFs Subcategory */}
                    {pdfDocs.length > 0 && (
                      <Collapsible open={isPdfsOpen} onOpenChange={setIsPdfsOpen}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {isPdfsOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <FileText className="h-3.5 w-3.5 text-red-500" />
                          <span className="font-medium text-xs">
                            PDFs ({pdfDocs.length})
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2 pl-2">
                          {pdfDocs.map((doc) => renderDocumentRow(doc))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Other Files Subcategory */}
                    {otherFiles.length > 0 && (
                      <Collapsible open={isOtherFilesOpen} onOpenChange={setIsOtherFilesOpen}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {isOtherFilesOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-xs">
                            Other Files ({otherFiles.length})
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2 pl-2">
                          {otherFiles.map((doc) => renderDocumentRow(doc))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
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
