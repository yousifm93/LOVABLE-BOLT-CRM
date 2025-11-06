import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeadAttachmentUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ACCEPTED_TYPES = ['.png', '.jpg', '.jpeg', '.pdf'];

export function LeadAttachmentUpload({ files, onFilesChange, disabled }: LeadAttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File Too Large',
          description: `${file.name} exceeds 10MB limit.`,
          variant: 'destructive',
        });
        continue;
      }

      // Check file type
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(extension)) {
        toast({
          title: 'Invalid File Type',
          description: `${file.name} must be PNG, JPG, JPEG, or PDF.`,
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    // Check total file count
    const newFiles = [...files, ...validFiles].slice(0, MAX_FILES);
    if (files.length + validFiles.length > MAX_FILES) {
      toast({
        title: 'Too Many Files',
        description: `Maximum ${MAX_FILES} files allowed.`,
        variant: 'destructive',
      });
    }

    onFilesChange(newFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
          className="w-10 h-10 rounded-full"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2 bg-muted/30 rounded-md p-3">
          <p className="text-xs text-muted-foreground font-medium">Attachments ({files.length})</p>
          <div className="grid grid-cols-1 gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 bg-background rounded-md p-2 border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getFileIcon(file)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
