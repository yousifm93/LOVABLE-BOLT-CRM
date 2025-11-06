import { Label } from "@/components/ui/label";
import { Calendar, Clock, FileText, CheckCircle, MessageSquare } from "lucide-react";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";

interface TitleTabProps {
  leadId: string;
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

export function TitleTab({ leadId, data, onUpdate }: TitleTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Ordered Date
            </Label>
            <InlineEditDate
              value={data.title_ordered_date}
              onValueChange={(value) => onUpdate('title_ordered_date', value)}
              placeholder="Select date"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Title ETA
            </Label>
            <InlineEditDate
              value={data.title_eta}
              onValueChange={(value) => onUpdate('title_eta', value)}
              placeholder="Select ETA date"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Title File
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

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3" />
              Title Status
            </Label>
            <InlineEditSelect
              value={data.title_status}
              onValueChange={(value) => onUpdate('title_status', value)}
              options={titleStatusOptions}
              placeholder="Select status"
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="pt-4 border-t">
        <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Title Notes
        </Label>
        <InlineEditNotes
          value={data.title_notes}
          onValueChange={(value) => onUpdate('title_notes', value)}
          placeholder="Add notes about title work..."
        />
      </div>
    </div>
  );
}
