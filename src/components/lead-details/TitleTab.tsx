import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, CheckCircle, FileCheck, MessageSquare, Mail } from "lucide-react";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditNotes } from "@/components/ui/inline-edit-notes";
import { FileUploadButton } from "@/components/ui/file-upload-button";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleFollowUp = () => {
    toast({
      title: "Follow Up",
      description: "Email template functionality coming soon",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Row 1: Status */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileCheck className="h-3 w-3" />
          Status
        </Label>
        <InlineEditSelect
          value={data.title_status}
          onValueChange={(value) => onUpdate('title_status', value)}
          options={titleStatusOptions}
          placeholder="Select status"
          showAsStatusBadge={false}
          className="text-sm"
        />
      </div>
      <div />

      {/* Row 2: Title Ordered Date / Title ETA */}
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

      {/* Row 3: Notes (spanning both columns) */}
      <div className="md:col-span-2 space-y-2 bg-muted/30 p-3 rounded-md">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          Title Notes
        </Label>
        <InlineEditNotes
          value={data.title_notes}
          onValueChange={(value) => onUpdate('title_notes', value)}
          placeholder="Add notes about title work..."
        />
      </div>

      {/* Row 4: Document Upload / Follow Up Button */}
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
      <div className="flex items-end justify-start">
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
    </div>
  );
}
