import { Label } from "@/components/ui/label";
import { Calendar, Clock, DollarSign, FileText, ClipboardCheck, MessageSquare } from "lucide-react";
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";

interface AppraisalTabProps {
  leadId: string;
  data: {
    appr_date_time: string | null;
    appr_eta: string | null;
    appraisal_value: number | null;
    appraisal_file: string | null;
    appraisal_status: string | null;
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Appraisal Date/Time
            </Label>
            <InlineEditDateTime
              value={data.appr_date_time}
              onValueChange={(value) => onUpdate('appr_date_time', value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Appraisal ETA
            </Label>
            <InlineEditDate
              value={data.appr_eta}
              onValueChange={(value) => onUpdate('appr_eta', value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              Appraisal Value
            </Label>
            <InlineEditCurrency
              value={data.appraisal_value}
              onValueChange={(value) => onUpdate('appraisal_value', value)}
              placeholder="$0"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Appraisal File
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

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ClipboardCheck className="h-3 w-3" />
              Appraisal Status
            </Label>
            <InlineEditSelect
              value={data.appraisal_status}
              onValueChange={(value) => onUpdate('appraisal_status', value)}
              options={appraisalStatusOptions}
              placeholder="Select status"
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="pt-4 border-t">
        <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Appraisal Notes
        </Label>
        <InlineEditNotes
          value={data.appraisal_notes}
          onValueChange={(value) => onUpdate('appraisal_notes', value)}
          placeholder="Add notes about the appraisal..."
        />
      </div>
    </div>
  );
}
