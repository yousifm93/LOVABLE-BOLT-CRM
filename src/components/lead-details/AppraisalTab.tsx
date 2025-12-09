import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, FileText, ClipboardCheck, MessageSquare, Mail } from "lucide-react";
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { databaseService } from "@/services/database";

interface AppraisalTabProps {
  leadId: string;
  borrowerLastName: string;
  data: {
    appraisal_status: string | null;
    appraisal_ordered_date: string | null;
    appraisal_scheduled_date: string | null;
    appr_date_time: string | null;
    appr_eta: string | null;
    appraisal_value: number | null;
    appraisal_file: string | null;
    appraisal_notes: string | null;
    sales_price: number | null;
    appraisal_received_on: string | null;
  };
  onUpdate: (field: string, value: any) => void;
}

const appraisalStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Inspected", label: "Inspected" },
  { value: "Received", label: "Received" },
  { value: "Waiver", label: "Waiver" }
];

export function AppraisalTab({ leadId, borrowerLastName, data, onUpdate }: AppraisalTabProps) {
  const { toast } = useToast();
  const [isParsing, setIsParsing] = useState(false);

  const handleAppraisalUpload = async (storagePath: string | null, fileSize?: number) => {
    if (!storagePath) {
      onUpdate('appraisal_file', null);
      return;
    }
    
    // Generate custom filename: "Appraisal Report-{LastName}-{MM.DD.YY}.pdf"
    const today = new Date();
    const formattedDate = `${today.getMonth() + 1}.${today.getDate()}.${String(today.getFullYear()).slice(-2)}`;
    const customTitle = `Appraisal Report-${borrowerLastName}-${formattedDate}`;
    
    try {
      // Update the file field with storage path
      onUpdate('appraisal_file', storagePath);
      
      // Delete any existing appraisal documents for this lead to prevent duplicates
      await supabase
        .from('documents')
        .delete()
        .eq('lead_id', leadId)
        .ilike('file_name', 'Appraisal Report%');
      
      // Add new document to documents table
      const { data: userData } = await supabase.auth.getUser();
      await databaseService.createDocumentFromStoragePath(
        leadId,
        storagePath,
        {
          title: customTitle,
          mime_type: 'application/pdf',
          size_bytes: fileSize || 0
        }
      );
      
      // Generate signed URL for AI parsing
      setIsParsing(true);
      toast({
        title: "Processing Appraisal",
        description: "Extracting appraised value from PDF...",
      });
      
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 300); // 5 minute expiry
      
      if (signedUrlError) throw signedUrlError;
      
      // Call edge function with signed URL
      const { data: functionData, error: functionError } = await supabase.functions.invoke('parse-appraisal', {
        body: { file_url: signedUrlData.signedUrl }
      });
      
      if (functionError) throw functionError;
      
      if (functionData?.success && functionData?.appraised_value) {
        // Auto-fill appraised value
        await onUpdate('appraisal_value', functionData.appraised_value);
        // Set status to Received
        await onUpdate('appraisal_status', 'Received');
        // Set received date to today
        await onUpdate('appraisal_received_on', new Date().toISOString().split('T')[0]);
        
        toast({
          title: "Appraisal Parsed Successfully",
          description: `Appraised value extracted: $${functionData.appraised_value.toLocaleString()}`,
        });
      } else {
        throw new Error('Failed to extract value');
      }
    } catch (error) {
      console.error('Failed to parse appraisal:', error);
      toast({
        title: "Manual Entry Required",
        description: "Uploaded successfully but couldn't auto-extract value. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Status, Ordered, ETA */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ClipboardCheck className="h-3 w-3" />
            Status
          </Label>
          <InlineEditSelect
            value={data.appraisal_status}
            onValueChange={(value) => onUpdate('appraisal_status', value)}
            options={appraisalStatusOptions}
            placeholder="Select status"
            showAsStatusBadge={false}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Ordered
          </Label>
          <InlineEditDate
            value={data.appraisal_ordered_date}
            onValueChange={(value) => onUpdate('appraisal_ordered_date', value)}
            placeholder="-"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            ETA
          </Label>
          <InlineEditDate
            value={data.appr_eta}
            onValueChange={(value) => onUpdate('appr_eta', value)}
            placeholder="-"
          />
        </div>
      </div>

      {/* Row 2: Notes (spanning both columns) */}
      <div className="md:col-span-2 space-y-2 bg-muted/30 p-3 rounded-md">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Appraisal Notes
        </Label>
        <InlineEditNotes
          value={data.appraisal_notes}
          onValueChange={(value) => onUpdate('appraisal_notes', value)}
          placeholder="Add notes about the appraisal..."
        />
      </div>

      {/* Row 3: Appraised Value, Date/Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            Appraised Value
          </Label>
          <InlineEditCurrency
            value={data.appraisal_value}
            onValueChange={(value) => onUpdate('appraisal_value', value)}
            placeholder="-"
            compareValue={data.sales_price}
            showDifference={true}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Appraisal Date and Time
          </Label>
          <InlineEditDateTime
            value={data.appr_date_time}
            onValueChange={(value) => onUpdate('appr_date_time', value)}
          />
        </div>
      </div>

      {/* Row 4: Document Upload and Received On Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Appraisal Report
          </Label>
          <FileUploadButton
            leadId={leadId}
            fieldName="appraisal_file"
            currentFile={data.appraisal_file}
            onUpload={handleAppraisalUpload}
            config={{
              storage_path: 'files/{lead_id}/appraisal/',
              allowed_types: ['.pdf', '.jpg', '.jpeg', '.png']
            }}
          />
          {isParsing && (
            <p className="text-xs text-muted-foreground mt-1">
              Extracting appraised value...
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Received On
          </Label>
          <InlineEditDate
            value={data.appraisal_received_on}
            onValueChange={(value) => onUpdate('appraisal_received_on', value)}
            placeholder="-"
          />
        </div>
      </div>
    </div>
  );
}
