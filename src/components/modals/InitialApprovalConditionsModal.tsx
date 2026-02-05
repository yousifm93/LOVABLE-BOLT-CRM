import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ExtractedCondition {
  category: string;
  name?: string;
  description: string;
  underwriter?: string;
  phase?: string;
  eta?: string;
  responsible?: string;
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
    decision?: string;
    case_id?: string;
    risk_class?: string;
  };
  onConfirm: (selectedConditions: ExtractedCondition[]) => void;
  onCancel: () => void;
  documentType?: 'initial_approval' | 'aus_approval';
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
  documentType = 'initial_approval',
}: InitialApprovalConditionsModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(conditions.map((_, i) => i))
  );
  const [editedNames, setEditedNames] = useState<Map<number, string>>(new Map());
  const [editedResponsibles, setEditedResponsibles] = useState<Map<number, string>>(new Map());

  // Reset edited values when conditions change
  useEffect(() => {
    setEditedNames(new Map());
    setEditedResponsibles(new Map());
    setSelectedIndices(new Set(conditions.map((_, i) => i)));
  }, [conditions]);

  const handleNameChange = (index: number, value: string) => {
    setEditedNames(prev => new Map(prev).set(index, value));
  };

  const handleResponsibleChange = (index: number, value: string) => {
    setEditedResponsibles(prev => new Map(prev).set(index, value));
  };

  const getFinalName = (index: number, condition: ExtractedCondition) => {
    return editedNames.get(index) ?? condition.name ?? condition.description;
  };

  const getFinalResponsible = (index: number, original?: string) => {
    return editedResponsibles.get(index) ?? original ?? '';
  };

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
    const selected = conditions
      .map((c, i) => ({ 
        ...c, 
        description: getFinalName(i, c),
        responsible: getFinalResponsible(i, c.responsible) || undefined
      }))
      .filter((_, i) => selectedIndices.has(i));
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
      <DialogContent className="max-w-7xl h-[90vh] !flex !flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {documentType === 'aus_approval' 
              ? 'Import Conditions from AUS Findings' 
              : 'Import Conditions from Initial Approval'}
          </DialogTitle>
          <DialogDescription>
            Found {conditions.length} conditions to import. Select which conditions to add.
          </DialogDescription>
        </DialogHeader>

        {/* Loan Info Summary */}
        {loanInfo && (loanInfo.lender || loanInfo.note_rate || loanInfo.loan_amount || loanInfo.decision) && (
          <div className="shrink-0 bg-muted/50 rounded-lg p-3 flex flex-wrap gap-4 text-sm">
            {loanInfo.lender && (
              <div>
                <span className="text-muted-foreground">Lender:</span>{" "}
                <span className="font-medium">{loanInfo.lender}</span>
              </div>
            )}
            {loanInfo.decision && (
              <div>
                <span className="text-muted-foreground">Decision:</span>{" "}
                <span className="font-medium">{loanInfo.decision}</span>
              </div>
            )}
            {loanInfo.case_id && (
              <div>
                <span className="text-muted-foreground">Case ID:</span>{" "}
                <span className="font-medium">{loanInfo.case_id}</span>
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
            {loanInfo.risk_class && (
              <div>
                <span className="text-muted-foreground">Risk Class:</span>{" "}
                <span className="font-medium">{loanInfo.risk_class}</span>
              </div>
            )}
          </div>
        )}

        {/* Selection Controls */}
        <div className="shrink-0 flex items-center gap-2 border-b pb-2">
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
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6" onWheelCapture={(e) => e.stopPropagation()}>
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
                        "grid grid-cols-12 gap-2 p-3 rounded-lg border transition-colors",
                        selectedIndices.has(index)
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1 flex items-start pt-2">
                        <Checkbox
                          checked={selectedIndices.has(index)}
                          onCheckedChange={() => handleToggle(index)}
                        />
                      </div>
                      
                      {/* Name + Description */}
                      <div className="col-span-7 space-y-1">
                        <Input
                          value={getFinalName(index, condition)}
                          onChange={(e) => handleNameChange(index, e.target.value)}
                          className="text-sm font-medium"
                          placeholder="Condition name..."
                        />
                        <p className="text-xs text-muted-foreground line-clamp-3 px-1">
                          {condition.description}
                        </p>
                      </div>
                      
                      {/* Responsible */}
                      <div className="col-span-2">
                        <Select 
                          value={getFinalResponsible(index, condition.responsible)} 
                          onValueChange={(value) => handleResponsibleChange(index, value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Responsible" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Borrower">Borrower</SelectItem>
                            <SelectItem value="Lender">Lender</SelectItem>
                            <SelectItem value="Broker">Broker</SelectItem>
                            <SelectItem value="Title">Title</SelectItem>
                            <SelectItem value="Appraiser">Appraiser</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Phase/Info */}
                      <div className="col-span-2 flex items-center">
                        {condition.phase && (
                          <span className="text-xs text-muted-foreground truncate">
                            {condition.phase}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t pt-4">
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
