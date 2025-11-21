import { AlertCircle, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaskCompletionRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement: {
    message: string;
    missingRequirement: string;
    contactInfo?: {
      name: string;
      phone?: string;
      type: 'buyer_agent' | 'listing_agent' | 'borrower';
      id?: string;
    };
  };
  onLogCall: () => void;
}

export function TaskCompletionRequirementModal({
  open,
  onOpenChange,
  requirement,
  onLogCall,
}: TaskCompletionRequirementModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Cannot Complete Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {requirement.message}
          </p>

          {requirement.contactInfo && (
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">{requirement.contactInfo.name}</span>
              </div>
              {requirement.contactInfo.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="font-mono">{requirement.contactInfo.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onLogCall}>
            <Phone className="h-4 w-4 mr-2" />
            Log Call Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
