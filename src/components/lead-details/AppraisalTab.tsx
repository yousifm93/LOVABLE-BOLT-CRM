import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, DollarSign, User, Phone, Link, ClipboardCheck } from "lucide-react";

interface AppraisalTabProps {
  leadId: string;
}

export function AppraisalTab({ leadId }: AppraisalTabProps) {
  return (
    <>
      {/* Left Column */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Ordered Date</Label>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Select date" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Select date" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Completed Date</Label>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Select date" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Appraisal Value</Label>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="$0" 
              className="h-8"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Appraiser Name</Label>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Enter name" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Appraiser Company</Label>
          <div className="flex items-center gap-2 text-sm">
            <ClipboardCheck className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Enter company" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Appraiser Phone</Label>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="(555) 555-5555" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Report Link</Label>
          <div className="flex items-center gap-2 text-sm">
            <Link className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="https://" 
              className="h-8"
              disabled
            />
          </div>
        </div>
      </div>
    </>
  );
}
