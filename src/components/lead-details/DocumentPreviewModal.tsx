import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { PdfPreview } from './PdfPreview';

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  documentUrl: string | null;
  mimeType: string;
  pdfData?: ArrayBuffer;
  onDownload?: () => void;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentName,
  documentUrl,
  mimeType,
  pdfData,
  onDownload,
}: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && documentUrl) {
      setIsLoading(true);
    }
  }, [open, documentUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
  };

  // Detect PDF by MIME type OR file extension OR URL (fallback for incorrectly stored MIME types)
  const isPdf = mimeType === 'application/pdf' || 
                documentName.toLowerCase().endsWith('.pdf') ||
                (documentUrl && documentUrl.toLowerCase().includes('.pdf'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{documentName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative overflow-hidden">
          {isPdf && pdfData ? (
            <PdfPreview 
              data={pdfData} 
              fileName={documentName}
              onDownload={onDownload}
            />
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {documentUrl && (
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0"
                  title={documentName}
                  onLoad={handleLoad}
                  onError={handleError}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
