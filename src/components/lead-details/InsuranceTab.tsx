import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, User, Phone, Mail, FileText, DollarSign, Calendar } from "lucide-react";

interface InsuranceTabProps {
  leadId: string;
}

export function InsuranceTab({ leadId }: InsuranceTabProps) {
  return (
    <>
      {/* Left Column */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Insurance Company</Label>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Enter company" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Agent Name</Label>
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
          <Label className="text-xs text-muted-foreground">Agent Phone</Label>
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
          <Label className="text-xs text-muted-foreground">Agent Email</Label>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="email@example.com" 
              className="h-8"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Policy Number</Label>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Enter policy number" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Coverage Amount</Label>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="$0" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Annual Premium</Label>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="$0" 
              className="h-8"
              disabled
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Effective Date</Label>
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
