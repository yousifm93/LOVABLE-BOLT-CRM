import { useState, useCallback } from "react";
import { validateStatusChange, validateCondoDocsReceived, ValidationResult, StatusChangeRule } from "@/services/statusChangeValidation";

interface UseStatusValidationProps {
  lead: any;
  onValidationFailed?: (result: ValidationResult) => void;
}

interface UseStatusValidationReturn {
  validateAndChange: (fieldName: string, newValue: string, onChange: (value: string) => void) => void;
  validationResult: ValidationResult | null;
  clearValidation: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  rule: StatusChangeRule | null;
  fieldLabel: string;
  newValue: string;
  isValidating: boolean;
}

export function useStatusValidation({ lead, onValidationFailed }: UseStatusValidationProps): UseStatusValidationReturn {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rule, setRule] = useState<StatusChangeRule | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setShowModal(false);
    setRule(null);
    setFieldLabel("");
    setNewValue("");
    setIsValidating(false);
  }, []);

  const validateAndChange = useCallback(async (
    fieldName: string,
    value: string,
    onChange: (value: string) => void
  ) => {
    // Special handling for condo_status "Received" - requires async validation
    if (fieldName === 'condo_status' && value === 'Received') {
      setIsValidating(true);
      try {
        const asyncResult = await validateCondoDocsReceived(lead);
        if (asyncResult.isValid) {
          onChange(value);
          clearValidation();
        } else {
          setValidationResult(asyncResult);
          setRule(asyncResult.rule || null);
          setFieldLabel(formatFieldLabel(fieldName));
          setNewValue(value);
          setShowModal(true);
          onValidationFailed?.(asyncResult);
        }
      } catch (error) {
        console.error('Condo validation error:', error);
        // Allow change on error to not block user
        onChange(value);
        clearValidation();
      } finally {
        setIsValidating(false);
      }
      return;
    }

    // Standard sync validation for other fields
    const result = validateStatusChange(fieldName, value, lead);
    
    if (result.isValid) {
      // Validation passed, proceed with change
      onChange(value);
      clearValidation();
    } else {
      // Validation failed, show modal
      setValidationResult(result);
      setRule(result.rule || null);
      setFieldLabel(formatFieldLabel(fieldName));
      setNewValue(value);
      setShowModal(true);
      onValidationFailed?.(result);
    }
  }, [lead, clearValidation, onValidationFailed]);

  return {
    validateAndChange,
    validationResult,
    clearValidation,
    showModal,
    setShowModal,
    rule,
    fieldLabel,
    newValue,
    isValidating
  };
}

// Helper to format field name to label
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
