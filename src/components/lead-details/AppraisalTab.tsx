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
  const { toast } = useToast();

  const handleFollowUp = () => {
    toast({
      title: "Follow Up",
      description: "Email template functionality coming soon",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Section: Status Left, Documents Right */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <InlineEditSelect
            value={data.appraisal_status}
            onValueChange={(value) => onUpdate('appraisal_status', value)}
            options={appraisalStatusOptions}
            placeholder="Select status"
            showAsStatusBadge={true}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Document</Label>
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
      </div>

      {/* Middle Section: Details in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Clock className="h-3 w-3" />
            ETA
          </Label>
          <InlineEditDate
            value={data.appr_eta}
            onValueChange={(value) => onUpdate('appr_eta', value)}
            placeholder="Select ETA date"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            Value
          </Label>
          <InlineEditCurrency
            value={data.appraisal_value}
            onValueChange={(value) => onUpdate('appraisal_value', value)}
            placeholder="$0"
          />
        </div>
      </div>

      {/* Bottom Section: Notes + Follow Up Button */}
      <div className="pt-6 border-t space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Notes
          </Label>
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
        <InlineEditNotes
          value={data.appraisal_notes}
          onValueChange={(value) => onUpdate('appraisal_notes', value)}
          placeholder="Add notes about the appraisal..."
        />
      </div>
    </div>
  );
}
