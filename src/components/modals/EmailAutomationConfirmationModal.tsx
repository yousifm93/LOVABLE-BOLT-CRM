import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, SkipForward, X } from "lucide-react";

interface EmailAutomation {
  id: string;
  name: string;
  recipient_type: string;
  template_id: string | null;
}

interface EmailAutomationConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automations: EmailAutomation[];
  fieldLabel: string;
  newValue: string;
  onConfirmWithEmail: () => void;
  onConfirmWithoutEmail: () => void;
  onCancel: () => void;
}

const RECIPIENT_LABELS: Record<string, string> = {
  borrower: 'Borrower',
  buyer_agent: "Buyer's Agent",
  listing_agent: 'Listing Agent',
  lender: 'Lender AE',
  team_member: 'Team Member',
};

export function EmailAutomationConfirmationModal({
  open,
  onOpenChange,
  automations,
  fieldLabel,
  newValue,
  onConfirmWithEmail,
  onConfirmWithoutEmail,
  onCancel,
}: EmailAutomationConfirmationModalProps) {
  const [loading, setLoading] = useState<'email' | 'skip' | null>(null);

  const handleConfirmWithEmail = async () => {
    setLoading('email');
    await onConfirmWithEmail();
    setLoading(null);
  };

  const handleConfirmWithoutEmail = async () => {
    setLoading('skip');
    await onConfirmWithoutEmail();
    setLoading(null);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Automation Triggered
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Changing <strong>{fieldLabel}</strong> to{" "}
              <Badge variant="secondary" className="mx-1">{newValue}</Badge>{" "}
              will trigger the following email automation{automations.length > 1 ? 's' : ''}:
            </p>
            
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              {automations.map((automation) => (
                <div key={automation.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{automation.name}</span>
                  <Badge variant="outline" className="text-xs">
                    To: {RECIPIENT_LABELS[automation.recipient_type] || automation.recipient_type}
                  </Badge>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground">
              Would you like to send the email(s) or just update the status?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleConfirmWithoutEmail}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === 'skip' ? (
              'Updating...'
            ) : (
              <>
                <SkipForward className="h-4 w-4 mr-2" />
                Update Only
              </>
            )}
          </Button>
          <Button
            onClick={handleConfirmWithEmail}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === 'email' ? (
              'Sending...'
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email & Update
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
