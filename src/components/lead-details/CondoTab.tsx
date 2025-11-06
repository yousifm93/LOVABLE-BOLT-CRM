import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Home, User, Phone, DollarSign, Calendar } from "lucide-react";

interface CondoTabProps {
  leadId: string;
}

export function CondoTab({ leadId }: CondoTabProps) {
  return (
    <>
      {/* Left Column */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">HOA Name</Label>
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Enter HOA name" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">HOA Contact</Label>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Enter contact name" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">HOA Phone</Label>
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
          <Label className="text-xs text-muted-foreground">Monthly HOA Fee</Label>
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
          <Label className="text-xs text-muted-foreground">Questionnaire Sent</Label>
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
          <Label className="text-xs text-muted-foreground">Questionnaire Received</Label>
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
          <Label className="text-xs text-muted-foreground">Documents Ordered</Label>
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
          <Label className="text-xs text-muted-foreground">Documents Received</Label>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Select date" 
              className="h-8"
              disabled
            />
          </div>
        </div>
      </div>
    </>
  );
}
