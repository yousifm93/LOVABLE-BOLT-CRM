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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
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

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Condo Documents
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
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3" />
              Condo Status
            </Label>
            <InlineEditSelect
              value={data.condo_status}
              onValueChange={(value) => onUpdate('condo_status', value)}
              options={condoStatusOptions}
              placeholder="Select status"
            />
          </div>

          <div className="flex flex-col gap-1">
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
      </div>

      {/* Notes Section */}
      <div className="pt-4 border-t">
        <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Condo Notes
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
