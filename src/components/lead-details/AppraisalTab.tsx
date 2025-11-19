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

interface AppraisalTabProps {
  leadId: string;
  data: {
    appraisal_status: string | null;
    appraisal_ordered_date: string | null;
    appraisal_scheduled_date: string | null;
    appr_date_time: string | null;
    appr_eta: string | null;
    appraisal_value: number | null;
    appraisal_file: string | null;
    appraisal_notes: string | null;
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

export function AppraisalTab({ leadId, data, onUpdate }: AppraisalTabProps) {
  const { toast } = useToast();

  const handleFollowUp = () => {
    toast({
      title: "Follow Up",
      description: "Email template functionality coming soon",
    });
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

      {/* Row 2: Appraised Value, Date/Time, Scheduled */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            Appraised Value
          </Label>
          <InlineEditCurrency
            value={data.appraisal_value}
            onValueChange={(value) => onUpdate('appraisal_value', value)}
            placeholder="-"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Date/Time
          </Label>
          <InlineEditDateTime
            value={data.appr_date_time}
            onValueChange={(value) => onUpdate('appr_date_time', value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Scheduled
          </Label>
          <InlineEditDate
            value={data.appraisal_scheduled_date}
            onValueChange={(value) => onUpdate('appraisal_scheduled_date', value)}
            placeholder="-"
          />
        </div>
      </div>

      {/* Row 4: Notes (spanning both columns) */}
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

      {/* Document Upload and Follow Up */}
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
            onUpload={(url) => onUpdate('appraisal_file', url)}
            config={{
              storage_path: 'files/{lead_id}/appraisal/',
              allowed_types: ['.pdf', '.jpg', '.jpeg', '.png']
            }}
          />
        </div>
        <div className="flex items-end justify-start">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFollowUp}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Follow Up
          </Button>
        </div>
      </div>
    </div>
  );
}
