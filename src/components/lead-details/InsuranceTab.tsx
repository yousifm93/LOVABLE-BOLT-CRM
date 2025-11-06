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
    <div className="space-y-4">
      {/* Top Section: Status Left, Documents Right */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b">
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
      </div>

      {/* Bottom Section: Notes + Follow Up Button */}
      <div className="space-y-2">
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
          value={data.insurance_notes}
          onValueChange={(value) => onUpdate('insurance_notes', value)}
          placeholder="Add notes about insurance..."
        />
      </div>
    </div>
  );
}
