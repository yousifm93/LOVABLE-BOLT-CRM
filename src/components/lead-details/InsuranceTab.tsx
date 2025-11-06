import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, FileText, ClipboardCheck, MessageSquare, Mail } from "lucide-react";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleFollowUp = () => {
    toast({
      title: "Follow Up",
      description: "Email template functionality coming soon",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Row 1: Status / Documents */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <InlineEditSelect
          value={data.hoi_status}
          onValueChange={(value) => onUpdate('hoi_status', value)}
          options={hoiStatusOptions}
          placeholder="Select status"
          showAsStatusBadge={true}
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">Documents</Label>
        <div className="flex gap-2">
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

      {/* Row 2: Empty / Follow Up Button */}
      <div className="hidden md:block" />
      <div className="flex items-end md:items-center justify-start md:justify-end">
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

      {/* Row 3: Notes (spanning both columns) */}
      <div className="md:col-span-2 space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Notes
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
