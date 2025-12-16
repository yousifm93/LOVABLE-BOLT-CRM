import { useState } from "react";
import { Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ExtractedCondition {
  category: string;
  description: string;
  underwriter?: string;
  phase?: string;
}

interface InitialApprovalConditionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditions: ExtractedCondition[];
  loanInfo?: {
    lender?: string;
    note_rate?: number;
    loan_amount?: number;
    term?: number;
    approved_date?: string;
  };
  onConfirm: (selectedConditions: ExtractedCondition[]) => void;
  onCancel: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  credit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  title: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  income: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  property: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  insurance: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  borrower: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  submission: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  credit: "Credit",
  title: "Title",
  income: "Income",
  property: "Property",
  insurance: "Insurance",
  borrower: "Borrower",
  submission: "Submission",
  other: "Other",
};

export function InitialApprovalConditionsModal({
  open,
  onOpenChange,
  conditions,
  loanInfo,
  onConfirm,
  onCancel,
}: InitialApprovalConditionsModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(conditions.map((_, i) => i))
  );

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(conditions.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleConfirm = () => {
    const selected = conditions.filter((_, i) => selectedIndices.has(i));
    onConfirm(selected);
  };

  // Group conditions by category
  const groupedConditions = conditions.reduce((acc, condition, index) => {
    const category = condition.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ condition, index });
    return acc;
  }, {} as Record<string, { condition: ExtractedCondition; index: number }[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Conditions from Initial Approval
          </DialogTitle>
          <DialogDescription>
            Found {conditions.length} conditions to import. Select which conditions to add.
          </DialogDescription>
        </DialogHeader>

        {/* Loan Info Summary */}
        {loanInfo && (loanInfo.lender || loanInfo.note_rate || loanInfo.loan_amount) && (
          <div className="bg-muted/50 rounded-lg p-3 flex flex-wrap gap-4 text-sm">
            {loanInfo.lender && (
              <div>
                <span className="text-muted-foreground">Lender:</span>{" "}
                <span className="font-medium">{loanInfo.lender}</span>
              </div>
            )}
            {loanInfo.note_rate && (
              <div>
                <span className="text-muted-foreground">Rate:</span>{" "}
                <span className="font-medium">{loanInfo.note_rate}%</span>
              </div>
            )}
            {loanInfo.loan_amount && (
              <div>
                <span className="text-muted-foreground">Loan Amount:</span>{" "}
                <span className="font-medium">
                  ${loanInfo.loan_amount.toLocaleString()}
                </span>
              </div>
            )}
            {loanInfo.term && (
              <div>
                <span className="text-muted-foreground">Term:</span>{" "}
                <span className="font-medium">{loanInfo.term} months</span>
              </div>
            )}
          </div>
        )}

        {/* Selection Controls */}
        <div className="flex items-center gap-2 border-b pb-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            <Check className="h-3 w-3 mr-1" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            <X className="h-3 w-3 mr-1" />
            Deselect All
          </Button>
          <span className="text-sm text-muted-foreground ml-auto">
            {selectedIndices.size} of {conditions.length} selected
          </span>
        </div>

        {/* Conditions List */}
        <ScrollArea className="flex-1 max-h-[50vh] -mx-6 px-6">
          <div className="space-y-4 py-2">
            {Object.entries(groupedConditions).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", CATEGORY_COLORS[category])}
                  >
                    {CATEGORY_LABELS[category] || category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({items.length} conditions)
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map(({ condition, index }) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-2 rounded-lg border transition-colors cursor-pointer",
                        selectedIndices.has(index)
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background hover:bg-muted/50"
                      )}
                      onClick={() => handleToggle(index)}
                    >
                      <Checkbox
                        checked={selectedIndices.has(index)}
                        onCheckedChange={() => handleToggle(index)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{condition.description}</p>
                        {(condition.phase || condition.underwriter) && (
                          <div className="flex items-center gap-2 mt-1">
                            {condition.phase && (
                              <span className="text-xs text-muted-foreground">
                                Phase: {condition.phase}
                              </span>
                            )}
                            {condition.underwriter && condition.underwriter !== "Unknown" && (
                              <span className="text-xs text-muted-foreground">
                                • {condition.underwriter}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIndices.size === 0}>
            Import {selectedIndices.size} Conditions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
