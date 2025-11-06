import { Label } from "@/components/ui/label";
import { Shield, FileText, ClipboardCheck, MessageSquare } from "lucide-react";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";

interface InsuranceTabProps {
  leadId: string;
  data: {
    hoi_status: string | null;
    insurance_policy_file: string | null;
    insurance_inspection_file: string | null;
    insurance_notes: string | null;
  };
  onUpdate: (field: string, value: any) => void;
}

const hoiStatusOptions = [
  { value: "Quoted", label: "Quoted" },
  { value: "Ordered", label: "Ordered" },
  { value: "Received", label: "Received" }
];

export function InsuranceTab({ leadId, data, onUpdate }: InsuranceTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              HOI Status
            </Label>
            <InlineEditSelect
              value={data.hoi_status}
              onValueChange={(value) => onUpdate('hoi_status', value)}
              options={hoiStatusOptions}
              placeholder="Select status"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Policy Document
            </Label>
            <FileUploadButton
              leadId={leadId}
              fieldName="insurance_policy_file"
              currentFile={data.insurance_policy_file}
              onUpload={(url) => onUpdate('insurance_policy_file', url)}
              config={{
                storage_path: 'files/{lead_id}/insurance/',
                allowed_types: ['.pdf']
              }}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ClipboardCheck className="h-3 w-3" />
              Inspection Report
            </Label>
            <FileUploadButton
              leadId={leadId}
              fieldName="insurance_inspection_file"
              currentFile={data.insurance_inspection_file}
              onUpload={(url) => onUpdate('insurance_inspection_file', url)}
              config={{
                storage_path: 'files/{lead_id}/insurance/',
                allowed_types: ['.pdf', '.jpg', '.jpeg', '.png']
              }}
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="pt-4 border-t">
        <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Insurance Notes
        </Label>
        <InlineEditNotes
          value={data.insurance_notes}
          onValueChange={(value) => onUpdate('insurance_notes', value)}
          placeholder="Add notes about insurance..."
        />
      </div>
    </div>
  );
}
