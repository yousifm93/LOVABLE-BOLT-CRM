import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Upload, ArrowRight } from "lucide-react";
import { StatusChangeRule } from "@/services/statusChangeValidation";

interface StatusChangeRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: StatusChangeRule | null;
  fieldLabel: string;
  newValue: string;
  onAction?: () => void;
}

export function StatusChangeRequirementModal({
  open,
  onOpenChange,
  rule,
  fieldLabel,
  newValue,
  onAction
}: StatusChangeRequirementModalProps) {
  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Action Required</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Cannot change <span className="font-medium text-foreground">{fieldLabel}</span> to{" "}
            <span className="font-medium text-foreground">"{newValue}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">{rule.message}</p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {rule.actionType === 'upload_file' && onAction && (
            <Button onClick={onAction}>
              <Upload className="h-4 w-4 mr-2" />
              {rule.actionLabel || 'Upload File'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
