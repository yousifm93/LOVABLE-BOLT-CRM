import { useState } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadButtonProps {
  leadId: string;
  fieldName: string;
  currentFile?: string | null;
  config?: {
    storage_path: string;
    allowed_types: string[];
  };
  onUpload: (fileUrl: string | null) => void;
}

export function FileUploadButton({ 
  leadId, 
  fieldName, 
  currentFile, 
  config = { storage_path: 'files/{lead_id}/', allowed_types: ['.pdf', '.doc', '.docx'] },
  onUpload 
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.allowed_types.includes(fileExt)) {
      toast({
        title: "Invalid File Type",
        description: `Only ${config.allowed_types.join(', ')} files are allowed`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Generate storage path
      const storagePath = config.storage_path
        .replace('{lead_id}', leadId)
        .replace('{field_name}', fieldName);
      
      const timestamp = Date.now();
      const filePath = `${storagePath}${timestamp}_${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Call the onUpload callback with the file URL
      onUpload(publicUrl);

      toast({ title: "Success", description: "File uploaded successfully" });
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

  const handleDelete = async () => {
    if (!currentFile) return;

    try {
      // Extract file path from URL
      const urlParts = currentFile.split('/');
      const bucketIndex = urlParts.indexOf('documents');
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        await supabase.storage.from('documents').remove([filePath]);
      }
      
      onUpload(null);
      toast({ title: "Success", description: "File deleted" });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ 
        title: "Delete Failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {currentFile ? (
        <>
          <a href={currentFile} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <File className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
          </a>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 px-2">
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <label>
          <input
            type="file"
            accept={config.allowed_types.join(',')}
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm" 
            disabled={uploading} 
            className="h-7 px-2"
            asChild
          >
            <span className="cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Upload
                </>
              )}
            </span>
          </Button>
        </label>
      )}
    </div>
  );
}
