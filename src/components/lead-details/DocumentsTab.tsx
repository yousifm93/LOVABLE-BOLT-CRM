import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistance } from "date-fns";

interface Document {
  id: number;
  name: string;
  size: number;
  uploadDate: string;
  type: string;
}

interface DocumentsTabProps {
  documents: Document[];
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
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const getFileTypeBadge = (type: string) => {
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('image')) return 'IMAGE';
  if (type.includes('word') || type.includes('document')) return 'DOC';
  return 'FILE';
};

export function DocumentsTab({ documents }: DocumentsTabProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
        <p>No documents uploaded yet</p>
        <p className="text-sm mt-1">Documents will appear here when uploaded</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="shrink-0">
              {getFileTypeIcon(doc.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {doc.name}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {getFileTypeBadge(doc.type)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatFileSize(doc.size)}</span>
                <span>•</span>
                <span>
                  Uploaded {formatDistance(new Date(doc.uploadDate), new Date(), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  // TODO: Implement view functionality
                  console.log('View document:', doc.id);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  // TODO: Implement download functionality
                  console.log('Download document:', doc.id);
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}