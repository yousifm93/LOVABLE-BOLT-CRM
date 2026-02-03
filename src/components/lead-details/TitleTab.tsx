import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, CheckCircle, FileCheck, MessageSquare, Mail } from "lucide-react";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { ValidatedInlineSelect } from "@/components/ui/validated-inline-select";
import { MentionableInlineEditNotes } from "@/components/ui/mentionable-inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { useToast } from "@/hooks/use-toast";

interface TitleTabProps {
  leadId: string;
  lead: any; // Full lead object for validation
  data: {
    title_ordered_date: string | null;
    title_eta: string | null;
    title_file: string | null;
    title_status: string | null;
    title_notes: string | null;
  };
  onUpdate: (field: string, value: any) => void;
}

const titleStatusOptions = [
  { value: "Requested", label: "Requested" },
  { value: "Received", label: "Received" },
  { value: "On Hold", label: "On Hold" }
];

export function TitleTab({ leadId, lead, data, onUpdate }: TitleTabProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Status, Ordered, ETA - all in one row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileCheck className="h-3 w-3" />
            Status
          </Label>
          <ValidatedInlineSelect
            value={data.title_status || ''}
            onValueChange={(value) => {
              onUpdate('title_status', value);
              // Auto-populate ordered date when status changes to "Ordered"
              if (value === 'Ordered' && !data.title_ordered_date) {
                onUpdate('title_ordered_date', new Date().toISOString().split('T')[0]);
              }
            }}
            options={titleStatusOptions}
            fieldName="title_status"
            lead={lead}
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
            value={data.title_ordered_date}
            onValueChange={(value) => onUpdate('title_ordered_date', value)}
            placeholder="-"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            ETA
          </Label>
          <InlineEditDate
            value={data.title_eta}
            onValueChange={(value) => onUpdate('title_eta', value)}
            placeholder="-"
          />
        </div>
      </div>

      {/* Title Notes */}
      <div className="md:col-span-2 space-y-2 bg-muted/30 p-3 rounded-md">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Title Notes
        </Label>
        <MentionableInlineEditNotes
          value={data.title_notes}
          onValueChange={(value) => onUpdate('title_notes', value)}
          placeholder="Add notes about title work..."
          contextType="lead"
          contextId={leadId}
        />
      </div>

      {/* Document Upload */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Title Work
        </Label>
        <FileUploadButton
          leadId={leadId}
          fieldName="title_file"
          currentFile={data.title_file}
          onUpload={(url) => onUpdate('title_file', url)}
          config={{
            storage_path: 'files/{lead_id}/title/',
            allowed_types: ['.pdf']
          }}
        />
      </div>
    </div>
  );
}
