import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Upload, ArrowRight } from "lucide-react";
import { StatusChangeRule, PipelineStageRule } from "@/services/statusChangeValidation";

interface StatusChangeRequirementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: StatusChangeRule | PipelineStageRule | null;
  fieldLabel: string;
  newValue: string;
  onAction?: () => void;
  // For refinance bypass
  showRefinanceBypass?: boolean;
  onRefinanceBypass?: () => void;
}

export function StatusChangeRequirementModal({
  open,
  onOpenChange,
  rule,
  fieldLabel,
  newValue,
  onAction,
  showRefinanceBypass = false,
  onRefinanceBypass
}: StatusChangeRequirementModalProps) {
  const [isRefinance, setIsRefinance] = useState(false);

  if (!rule) return null;

  const handleRefinanceConfirm = () => {
    if (isRefinance && onRefinanceBypass) {
      onRefinanceBypass();
      onOpenChange(false);
      setIsRefinance(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsRefinance(false);
  };

  // Check if this rule has actionType (StatusChangeRule) or not (PipelineStageRule)
  const isStatusChangeRule = (r: StatusChangeRule | PipelineStageRule): r is StatusChangeRule => {
    return 'actionType' in r;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{rule.message}</p>
          
          {showRefinanceBypass && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
              <Checkbox
                id="refinance-bypass"
                checked={isRefinance}
                onCheckedChange={(checked) => setIsRefinance(checked as boolean)}
              />
              <Label htmlFor="refinance-bypass" className="text-sm cursor-pointer">
                This is a refinance or HELOC (no contract needed)
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {showRefinanceBypass && isRefinance ? (
            <Button onClick={handleRefinanceConfirm}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue Without Contract
            </Button>
          ) : (
            isStatusChangeRule(rule) && rule.actionType === 'upload_file' && onAction && (
              <Button onClick={onAction}>
                <Upload className="h-4 w-4 mr-2" />
                {rule.actionLabel || 'Upload File'}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
