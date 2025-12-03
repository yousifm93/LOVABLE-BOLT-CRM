import * as React from "react";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { StatusChangeRequirementModal } from "@/components/modals/StatusChangeRequirementModal";
import { useStatusValidation } from "@/hooks/useStatusValidation";

interface ValidatedInlineSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
  fieldName: string; // e.g., 'disclosure_status', 'appraisal_status'
  lead: any;
  placeholder?: string;
  className?: string;
  showAsStatusBadge?: boolean;
  disabled?: boolean;
  forceGrayBadge?: boolean;
  fixedWidth?: string;
  fillCell?: boolean;
  onUploadAction?: () => void; // Called when user clicks upload in modal
}

export function ValidatedInlineSelect({
  value,
  options,
  onValueChange,
  fieldName,
  lead,
  placeholder,
  className,
  showAsStatusBadge,
  disabled,
  forceGrayBadge,
  fixedWidth,
  fillCell,
  onUploadAction
}: ValidatedInlineSelectProps) {
  const {
    validateAndChange,
    showModal,
    setShowModal,
    rule,
    fieldLabel,
    newValue: pendingValue
  } = useStatusValidation({ lead });

  const handleValueChange = (newValue: string) => {
    validateAndChange(fieldName, newValue, onValueChange);
  };

  const handleModalAction = () => {
    setShowModal(false);
    onUploadAction?.();
  };

  return (
    <>
      <InlineEditSelect
        value={value}
        options={options}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        className={className}
        showAsStatusBadge={showAsStatusBadge}
        disabled={disabled}
        forceGrayBadge={forceGrayBadge}
        fixedWidth={fixedWidth}
        fillCell={fillCell}
      />
      
      <StatusChangeRequirementModal
        open={showModal}
        onOpenChange={setShowModal}
        rule={rule}
        fieldLabel={fieldLabel}
        newValue={pendingValue}
        onAction={handleModalAction}
      />
    </>
  );
}
