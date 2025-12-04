import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExtractedField {
  key: string;
  label: string;
  value: any;
  displayValue: string;
}

interface DocumentExtractionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedFields: Record<string, any>) => void;
  documentType: 'contract' | 'rate_lock';
  extractedFields: ExtractedField[];
  agentInfo?: {
    buyerAgent?: { name: string; id?: string; isNew?: boolean };
    listingAgent?: { name: string; id?: string; isNew?: boolean };
  };
}

const FIELD_LABELS: Record<string, string> = {
  // Contract fields
  property_type: 'Property Type',
  sales_price: 'Sales Price',
  loan_amount: 'Loan Amount',
  down_pmt: 'Down Payment',
  subject_address_1: 'Street Address',
  subject_address_2: 'Address Line 2',
  subject_city: 'City',
  subject_state: 'State',
  subject_zip: 'ZIP Code',
  close_date: 'Closing Date',
  finance_contingency: 'Finance Contingency',
  buyer_agent_id: 'Buyer\'s Agent',
  listing_agent_id: 'Listing Agent',
  // Rate lock fields
  interest_rate: 'Interest Rate',
  lock_expiration_date: 'Lock Expiration',
  term: 'Loan Term',
  prepayment_penalty: 'Prepayment Penalty',
  dscr_ratio: 'DSCR Ratio',
  escrows: 'Escrows',
};

export function DocumentExtractionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  documentType,
  extractedFields,
  agentInfo,
}: DocumentExtractionConfirmationModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(extractedFields.map(f => f.key))
  );
  const [editedValues, setEditedValues] = useState<Record<string, any>>(
    Object.fromEntries(extractedFields.map(f => [f.key, f.value]))
  );

  const handleToggle = (fieldKey: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldKey)) {
      newSelected.delete(fieldKey);
    } else {
      newSelected.add(fieldKey);
    }
    setSelectedFields(newSelected);
  };

  const handleValueChange = (fieldKey: string, newValue: any) => {
    setEditedValues(prev => ({ ...prev, [fieldKey]: newValue }));
  };

  const handleConfirm = () => {
    const fieldsToSave: Record<string, any> = {};
    selectedFields.forEach(key => {
      fieldsToSave[key] = editedValues[key];
    });
    onConfirm(fieldsToSave);
  };

  const formatDisplayValue = (field: ExtractedField): string => {
    if (field.value === null || field.value === undefined) return '—';
    
    if (field.key === 'sales_price' || field.key === 'loan_amount' || field.key === 'down_pmt') {
      const num = typeof field.value === 'string' ? parseFloat(field.value) : field.value;
      return `$${num.toLocaleString()}`;
    }
    
    if (field.key === 'interest_rate') {
      return `${field.value}%`;
    }
    
    if (field.key === 'term') {
      return `${field.value} months`;
    }
    
    if (field.key === 'prepayment_penalty') {
      return `${field.value} years`;
    }
    
    return String(field.value);
  };

  const title = documentType === 'contract' 
    ? 'Contract Data Extracted' 
    : 'Rate Lock Data Extracted';

  const description = documentType === 'contract'
    ? 'Review the extracted contract information. Select fields to save and adjust values if needed.'
    : 'Review the extracted rate lock information. Select fields to save and adjust values if needed.';

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {extractedFields.map((field) => (
              <div
                key={field.key}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  id={field.key}
                  checked={selectedFields.has(field.key)}
                  onCheckedChange={() => handleToggle(field.key)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label 
                    htmlFor={field.key} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    {FIELD_LABELS[field.key] || field.label}
                  </Label>
                  <div className="mt-1">
                    {field.key === 'buyer_agent_id' || field.key === 'listing_agent_id' ? (
                      <div className="text-sm text-muted-foreground">
                        {field.key === 'buyer_agent_id' && agentInfo?.buyerAgent ? (
                          <span>
                            {agentInfo.buyerAgent.name}
                            {agentInfo.buyerAgent.isNew && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                New agent created
                              </span>
                            )}
                          </span>
                        ) : field.key === 'listing_agent_id' && agentInfo?.listingAgent ? (
                          <span>
                            {agentInfo.listingAgent.name}
                            {agentInfo.listingAgent.isNew && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                New agent created
                              </span>
                            )}
                          </span>
                        ) : (
                          formatDisplayValue(field)
                        )}
                      </div>
                    ) : (
                      <Input
                        value={editedValues[field.key] ?? ''}
                        onChange={(e) => handleValueChange(field.key, e.target.value)}
                        className="h-8 text-sm"
                        disabled={!selectedFields.has(field.key)}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedFields.size === 0}
          >
            Save {selectedFields.size} Field{selectedFields.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
