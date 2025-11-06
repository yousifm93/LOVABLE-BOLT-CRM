import { Label } from "@/components/ui/label";
import { Building2, FileText, CheckCircle, Award, MessageSquare } from "lucide-react";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";

interface CondoTabProps {
  leadId: string;
  data: {
    condo_name: string | null;
    condo_docs_file: string | null;
    condo_status: string | null;
    condo_approval_type: string | null;
    condo_notes: string | null;
  };
  onUpdate: (field: string, value: any) => void;
}

const condoStatusOptions = [
  { value: "Ordered", label: "Ordered" },
  { value: "Received", label: "Received" },
  { value: "Approved", label: "Approved" }
];

export function CondoTab({ leadId, data, onUpdate }: CondoTabProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Top Section: Status Left, Documents Right */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <InlineEditSelect
            value={data.condo_status}
            onValueChange={(value) => onUpdate('condo_status', value)}
            options={condoStatusOptions}
            placeholder="Select status"
            showAsStatusBadge={true}
            className="text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Documents</Label>
          <FileUploadButton
            leadId={leadId}
            fieldName="condo_docs_file"
            currentFile={data.condo_docs_file}
            onUpload={(url) => onUpdate('condo_docs_file', url)}
            config={{
              storage_path: 'files/{lead_id}/condo/',
              allowed_types: ['.pdf', '.zip']
            }}
          />
        </div>
      </div>

      {/* Middle Section: Details in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            Condo Name
          </Label>
          <InlineEditText
            value={data.condo_name}
            onValueChange={(value) => onUpdate('condo_name', value)}
            placeholder="Enter condo name"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Award className="h-3 w-3" />
            Approval Type
          </Label>
          <InlineEditText
            value={data.condo_approval_type}
            onValueChange={(value) => onUpdate('condo_approval_type', value)}
            placeholder="Limited Review, Full Review, etc."
          />
        </div>
      </div>

      {/* Bottom Section: Notes */}
      <div className="pt-6 border-t space-y-3">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Notes
        </Label>
        <InlineEditNotes
          value={data.condo_notes}
          onValueChange={(value) => onUpdate('condo_notes', value)}
          placeholder="Add notes about condo approval..."
        />
      </div>
    </div>
  );
}
