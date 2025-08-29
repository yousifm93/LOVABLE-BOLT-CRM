import * as React from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  value?: string | null;
  onValueChange: (url: string | null) => void;
  bucket: string;
  accept?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function FileUpload({
  value,
  onValueChange,
  bucket,
  accept = ".pdf,.xlsx,.xls",
  className,
  disabled = false,
  placeholder = "Upload file"
}: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onValueChange(data.publicUrl);
      
      toast({
        title: "File uploaded",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled || uploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClear = () => {
    onValueChange(null);
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'Unknown file';
  };

  if (disabled) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        {value ? getFileName(value) : "No file"}
      </div>
    );
  }

  if (value) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1 text-sm">
          <File className="h-3 w-3" />
          <span className="truncate">{getFileName(value)}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors",
        dragActive && "border-primary bg-muted/50",
        uploading && "opacity-50 pointer-events-none",
        className
      )}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled || uploading}
      />
      
      <div className="flex flex-col items-center justify-center text-center">
        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
        <div className="text-sm text-muted-foreground">
          {uploading ? "Uploading..." : placeholder}
        </div>
      </div>
    </div>
  );
}