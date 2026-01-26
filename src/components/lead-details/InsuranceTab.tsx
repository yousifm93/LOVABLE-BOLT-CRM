import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, FileText, ClipboardCheck, MessageSquare, Mail, Calendar } from "lucide-react";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { MentionableInlineEditNotes } from "@/components/ui/mentionable-inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { useToast } from "@/hooks/use-toast";

interface InsuranceTabProps {
  leadId: string;
  data: {
    hoi_status: string | null;
    insurance_quoted_date: string | null;
    insurance_ordered_date: string | null;
    insurance_received_date: string | null;
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Row 1: HOI Status */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Status
        </Label>
        <InlineEditSelect
          value={data.hoi_status}
          onValueChange={(value) => {
            onUpdate('hoi_status', value);
            // Auto-populate ordered date when status changes to "Ordered"
            if (value === 'Ordered' && !data.insurance_ordered_date) {
              onUpdate('insurance_ordered_date', new Date().toISOString().split('T')[0]);
            }
          }}
          options={hoiStatusOptions}
          placeholder="Select status"
          showAsStatusBadge={false}
          className="text-sm"
        />
      </div>
      <div />

      {/* Row 2: Quoted On, Ordered On, Received On - all in one row */}
      <div className="md:col-span-2 grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Quoted
          </Label>
          <InlineEditDate
            value={data.insurance_quoted_date}
            onValueChange={(value) => onUpdate('insurance_quoted_date', value)}
            placeholder="-"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Ordered
          </Label>
          <InlineEditDate
            value={data.insurance_ordered_date}
            onValueChange={(value) => onUpdate('insurance_ordered_date', value)}
            placeholder="-"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Received
          </Label>
          <InlineEditDate
            value={data.insurance_received_date}
            onValueChange={(value) => onUpdate('insurance_received_date', value)}
            placeholder="-"
          />
        </div>
      </div>

      {/* Row 4: Notes (spanning both columns) */}
      <div className="md:col-span-2 space-y-2 bg-muted/30 p-3 rounded-md">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Insurance Notes
        </Label>
        <MentionableInlineEditNotes
          value={data.insurance_notes}
          onValueChange={(value) => onUpdate('insurance_notes', value)}
          placeholder="Add notes about insurance..."
          contextType="lead"
          contextId={leadId}
        />
      </div>

      {/* Row 5: Document Uploads */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          HOI Policy
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
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Inspection Report
        </Label>
        <FileUploadButton
          leadId={leadId}
          fieldName="insurance_inspection_file"
          currentFile={data.insurance_inspection_file}
          onUpload={(url) => onUpdate('insurance_inspection_file', url)}
          config={{
            storage_path: 'files/{lead_id}/insurance/',
            allowed_types: ['.pdf']
          }}
        />
      </div>
    </div>
  );
}
