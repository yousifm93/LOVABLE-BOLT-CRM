import { useFields } from "@/contexts/FieldsContext";
import { InlineEditText } from "./inline-edit-text";
import { InlineEditCurrency } from "./inline-edit-currency";
import { InlineEditDate } from "./inline-edit-date";
import { InlineEditDateTime } from "./inline-edit-datetime";
import { InlineEditSelect } from "./inline-edit-select";
import { InlineEditNumber } from "./inline-edit-number";
import { InlineEditPercentage } from "./inline-edit-percentage";
import { InlineEditPhone } from "./inline-edit-phone";
import { InlineEditBoolean } from "./inline-edit-boolean";
import { FileUploadButton } from "./file-upload-button";

interface DynamicInlineEditProps {
  fieldName: string;
  value: any;
  leadId: string;
  onUpdate: (field: string, value: any) => void;
  className?: string;
}

export function DynamicInlineEdit({ 
  fieldName, 
  value, 
  leadId, 
  onUpdate,
  className 
}: DynamicInlineEditProps) {
  const { getFieldConfig } = useFields();
  const field = getFieldConfig(fieldName);

  if (!field) return <span className={className}>{value || '-'}</span>;

  // Render appropriate inline editor based on field type
  switch (field.field_type) {
    case 'text':
      return (
        <InlineEditText
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'email':
      return (
        <InlineEditText
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'phone':
      return (
        <InlineEditPhone
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'currency':
      return (
        <InlineEditCurrency
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'date':
      return (
        <InlineEditDate
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'datetime':
      return (
        <InlineEditDateTime
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'select':
      const selectOptions = (field.dropdown_options || []).map(opt => ({
        value: opt,
        label: opt
      }));
      return (
        <InlineEditSelect
          value={value}
          options={selectOptions}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'file':
      return (
        <FileUploadButton
          leadId={leadId}
          fieldName={fieldName}
          currentFile={value}
          config={field.file_config}
          onUpload={(fileUrl) => onUpdate(fieldName, fileUrl)}
        />
      );
    
    case 'percentage':
      return (
        <InlineEditPercentage
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'number':
      return (
        <InlineEditNumber
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    case 'boolean':
      return (
        <InlineEditBoolean
          value={value}
          onValueChange={(newValue) => onUpdate(fieldName, newValue)}
          className={className}
        />
      );
    
    default:
      return <span className={className}>{value || '-'}</span>;
  }
}
