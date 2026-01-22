import { useState } from "react";
import { Upload, Eye, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface CondoDocumentUploadProps {
  condoId: string;
  fieldName: "budget_doc" | "mip_doc" | "cq_doc";
  currentFile: string | null;
  uploadedAt?: string | null;
  uploadedBy?: string | null;
  onUpload: (path: string | null, uploadedAt?: string, uploadedBy?: string) => void;
  onPreview?: (url: string, fileName: string) => void;
  compact?: boolean;
}

const BUCKET_NAME = "condo-documents";
const ALLOWED_TYPES = ["application/pdf"];

export function CondoDocumentUpload({
  condoId,
  fieldName,
  currentFile,
  uploadedAt,
  uploadedBy,
  onUpload,
  onPreview,
  compact = false,
}: CondoDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create storage path: condoId/fieldName/timestamp_filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${condoId}/${fieldName}/${timestamp}_${sanitizedFileName}`;

      // Delete old file if exists
      if (currentFile) {
        await supabase.storage.from(BUCKET_NAME).remove([currentFile]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const now = new Date().toISOString();
      onUpload(storagePath, now, user?.id);
      toast({
        title: "Uploaded",
        description: "Document uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([currentFile]);

      if (error) throw error;

      onUpload(null);
      toast({
        title: "Deleted",
        description: "Document removed successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleView = async () => {
    if (!currentFile) return;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(currentFile, 3600); // 1 hour

      if (error) throw error;
      if (data?.signedUrl) {
        // Extract filename from path
        const fileName = currentFile.split('/').pop() || 'document.pdf';
        
        if (onPreview) {
          onPreview(data.signedUrl, fileName);
        } else {
          // Fallback to new tab
          window.open(data.signedUrl, "_blank");
        }
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive",
      });
    }
  };

  // Format the upload date
  const formatUploadDate = () => {
    if (!uploadedAt) return null;
    try {
      const date = new Date(uploadedAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      return format(date, 'MMM d');
    } catch {
      return null;
    }
  };

  if (uploading) {
    return (
      <div className="flex items-center justify-center h-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (currentFile) {
    const uploadDateStr = formatUploadDate();
    
    return (
      <div className="flex flex-col">
        <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={compact ? "icon" : "sm"}
                  onClick={handleView}
                  className={compact ? "h-7 w-7" : "h-8"}
                >
                  {compact ? (
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View document</p>
                {uploadDateStr && <p className="text-xs text-muted-foreground">Uploaded {uploadDateStr}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size={compact ? "icon" : "sm"}
            onClick={handleDelete}
            className={compact ? "h-7 w-7 text-destructive hover:text-destructive" : "h-8 text-destructive hover:text-destructive"}
          >
            {compact ? (
              <Trash2 className="h-3.5 w-3.5" />
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </>
            )}
          </Button>
        </div>
        {uploadDateStr && !compact && (
          <span className="text-[10px] text-muted-foreground mt-0.5">{uploadDateStr}</span>
        )}
      </div>
    );
  }

  return (
    <label className="cursor-pointer">
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        className={compact ? "h-7 w-7" : "h-8"}
        asChild
      >
        <span>
          {compact ? (
            <Upload className="h-3.5 w-3.5" />
          ) : (
            <>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload
            </>
          )}
        </span>
      </Button>
    </label>
  );
}
