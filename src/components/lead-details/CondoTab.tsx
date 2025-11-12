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

const condoApprovalTypeOptions = [
  { value: "Limited", label: "Limited" },
  { value: "Full", label: "Full" },
  { value: "Non-Warrantable Full", label: "Non-Warrantable Full" },
  { value: "Non-Warrantable Limited", label: "Non-Warrantable Limited" }
];

export function CondoTab({ leadId, data, onUpdate }: CondoTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Row 1: Status / Approval Type */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Condo Status
        </Label>
        <InlineEditSelect
          value={data.condo_status}
          onValueChange={(value) => onUpdate('condo_status', value)}
          options={condoStatusOptions}
          placeholder="Select status"
          showAsStatusBadge={false}
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Award className="h-3 w-3" />
          Approval Type
        </Label>
        <InlineEditSelect
          value={data.condo_approval_type}
          onValueChange={(value) => onUpdate('condo_approval_type', value)}
          options={condoApprovalTypeOptions}
          placeholder="Select approval type"
          showAsStatusBadge={false}
          className="text-sm"
        />
      </div>

      {/* Row 2: Condo Name */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Condo Name
        </Label>
        <InlineEditText
          value={data.condo_name}
          onValueChange={(value) => onUpdate('condo_name', value)}
          placeholder="-"
        />
      </div>
      <div />

      {/* Row 3: Notes (spanning both columns) */}
      <div className="md:col-span-2 space-y-2 bg-muted/30 p-3 rounded-md">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Condo Notes
        </Label>
        <InlineEditNotes
          value={data.condo_notes}
          onValueChange={(value) => onUpdate('condo_notes', value)}
          placeholder="Add notes about condo approval..."
        />
      </div>

      {/* Row 4: Document Upload */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Documents
        </Label>
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
      <div />
    </div>
  );
}
