import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Check, X } from "lucide-react";

interface FieldUpdate {
  field: string;
  fieldLabel: string;
  currentValue: string | number | null;
  newValue: string | number;
}

interface FieldUpdateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedUpdates: FieldUpdate[];
  onApply: (selectedUpdates: FieldUpdate[]) => void;
}

export function FieldUpdateConfirmationModal({
  isOpen,
  onClose,
  detectedUpdates,
  onApply,
}: FieldUpdateConfirmationModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      detectedUpdates.forEach((update) => {
        initial[update.field] = true;
      });
      return initial;
    }
  );

  const handleToggle = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleApply = () => {
    const selected = detectedUpdates.filter(
      (update) => selectedFields[update.field]
    );
    onApply(selected);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const formatValue = (value: string | number | null): string => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    return String(value);
  };

  const selectedCount = Object.values(selectedFields).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Field Updates Detected
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            The following field updates were detected from your voice recording.
            Select which updates to apply:
          </p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {detectedUpdates.map((update) => (
              <div
                key={update.field}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  selectedFields[update.field]
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={selectedFields[update.field]}
                  onCheckedChange={() => handleToggle(update.field)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{update.fieldLabel}</div>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span className="text-muted-foreground truncate">
                      {formatValue(update.currentValue)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-primary font-medium truncate">
                      {formatValue(update.newValue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Apply {selectedCount > 0 ? `(${selectedCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
