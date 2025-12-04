import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Upload, Eye, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { databaseService } from "@/services/database";
import { cn } from "@/lib/utils";

interface ActiveFileDocumentsProps {
  leadId: string;
  lead: any;
  onLeadUpdate: () => void;
}

// Define all active file document fields
const FILE_FIELDS = [
  { key: 'le_file', label: 'Loan Estimate' },
  { key: 'contract_file', label: 'Contract' },
  { key: 'initial_approval_file', label: 'Initial Approval' },
  { key: 'disc_file', label: 'Disclosures' },
  { key: 'appraisal_file', label: 'Appraisal Report' },
  { key: 'insurance_file', label: 'HOI Policy' },
  { key: 'icd_file', label: 'Initial Closing Disclosure' },
  { key: 'fcp_file', label: 'Final Closing Package' },
  { key: 'inspection_file', label: 'Inspection Report' },
  { key: 'title_file', label: 'Title Work' },
  { key: 'condo_file', label: 'Condo Documents' },
];

export function ActiveFileDocuments({ leadId, lead, onLeadUpdate }: ActiveFileDocumentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [parsing, setParsing] = useState<string | null>(null);
  const { toast } = useToast();

  const parseContract = async (filePath: string) => {
    try {
      setParsing('contract_file');
      
      // Get signed URL for the file
      const { data: signedUrlData } = await supabase.storage
        .from('lead-documents')
        .createSignedUrl(filePath, 3600);

      if (!signedUrlData?.signedUrl) {
        throw new Error('Could not get file URL');
      }

      toast({
        title: "Parsing Contract",
        description: "Extracting information from contract..."
      });

      // Call the parse-contract edge function
      const { data, error } = await supabase.functions.invoke('parse-contract', {
        body: { 
          file_url: signedUrlData.signedUrl,
          lead_id: leadId 
        }
      });

      if (error) throw error;

      if (data?.success) {
        const fieldsUpdated = data.fields_updated?.length || 0;
        const extractedData = data.extracted_data;
        
        let description = `Extracted ${fieldsUpdated} fields from contract.`;
        if (extractedData?.sales_price) {
          description += ` Sales Price: $${extractedData.sales_price.toLocaleString()}.`;
        }
        if (data.buyer_agent_id) {
          description += ' Buyer agent linked.';
        }
        if (data.listing_agent_id) {
          description += ' Listing agent linked.';
        }

        toast({
          title: "Contract Parsed Successfully",
          description
        });
        
        onLeadUpdate();
      } else {
        throw new Error(data?.error || 'Failed to parse contract');
      }
    } catch (error: any) {
      console.error('Contract parsing error:', error);
      toast({
        title: "Parsing Failed",
        description: error.message || "Could not extract contract data",
        variant: "destructive"
      });
    } finally {
      setParsing(null);
    }
  };

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileUpload = async (fieldKey: string, file: File) => {
    if (!leadId) return;
    
    // File size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File Too Large",
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Please compress the PDF or reduce pages.`,
        variant: "destructive"
      });
      return;
    }
    
    setUploading(fieldKey);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${fieldKey}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update lead with file path
      await databaseService.updateLead(leadId, {
        [fieldKey]: uploadData.path
      });

      toast({
        title: "File Uploaded",
        description: `${FILE_FIELDS.find(f => f.key === fieldKey)?.label} uploaded successfully`
      });
      
      onLeadUpdate();

      // If this is a contract upload, automatically parse it
      if (fieldKey === 'contract_file') {
        await parseContract(uploadData.path);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileView = async (fieldKey: string) => {
    const filePath = lead[fieldKey];
    if (!filePath) return;

    try {
      const { data } = await supabase.storage
        .from('lead-documents')
        .createSignedUrl(filePath, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not open file",
        variant: "destructive"
      });
    }
  };

  const handleFileDelete = async (fieldKey: string) => {
    const filePath = lead[fieldKey];
    if (!filePath || !confirm('Are you sure you want to delete this file?')) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('lead-documents')
        .remove([filePath]);

      // Clear the field in the lead
      await databaseService.updateLead(leadId, {
        [fieldKey]: null
      });

      toast({
        title: "File Deleted",
        description: "File removed successfully"
      });
      
      onLeadUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not delete file",
        variant: "destructive"
      });
    }
  };

  const getFileName = (filePath: string) => {
    if (!filePath) return '';
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  return (
    <Card className="bg-gradient-card shadow-soft border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <h3 className="text-sm font-semibold text-foreground">Active File Documents</h3>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-4 gap-3">
            {FILE_FIELDS.map((field) => {
              const hasFile = !!lead[field.key];
              const isUploading = uploading === field.key;
              const isParsing = parsing === field.key;

              return (
                <div
                  key={field.key}
                  className="flex flex-col items-center p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <FileText className={cn(
                      "h-3 w-3 flex-shrink-0",
                      hasFile ? "text-green-500" : "text-muted-foreground"
                    )} />
                    <span className="text-xs font-medium text-center">{field.label}</span>
                  </div>
                  
                  {isParsing && (
                    <span className="flex items-center gap-1 text-xs text-blue-500 mb-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Parsing...
                    </span>
                  )}

                  {hasFile ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleFileView(field.key)}
                        title="View"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleFileDelete(field.key)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field.key, file);
                          e.target.value = '';
                        }}
                        disabled={isUploading || isParsing}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        disabled={isUploading || isParsing}
                        asChild
                      >
                        <span>
                          <Upload className="h-3 w-3 mr-1" />
                          {isUploading ? '...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
