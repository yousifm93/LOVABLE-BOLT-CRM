import React, { useState } from "react";
import { useFields } from "@/contexts/FieldsContext";
import { FIELD_NAME_MAP, getDatabaseFieldName } from "@/types/crm";
import { Label } from "@/components/ui/label";
import { InlineEditText } from "@/components/ui/inline-edit-text";
import { InlineEditNumber } from "@/components/ui/inline-edit-number";
import { InlineEditCurrency } from "@/components/ui/inline-edit-currency";
import { InlineEditPercentage } from "@/components/ui/inline-edit-percentage";
import { InlineEditDate } from "@/components/ui/inline-edit-date";
import { InlineEditDateTime } from "@/components/ui/inline-edit-datetime";
import { InlineEditSelect } from "@/components/ui/inline-edit-select";
import { InlineEditBoolean } from "@/components/ui/inline-edit-boolean";
import { InlineEditPhone } from "@/components/ui/inline-edit-phone";
import { databaseService } from "@/services/database";
import { useToast } from "@/hooks/use-toast";

interface AllFieldsTabProps {
  client: any;
  leadId: string | null;
  onLeadUpdated?: () => void;
  onClientPatched?: (patch: any) => void;
}

export function AllFieldsTab({ client, leadId, onLeadUpdated, onClientPatched }: AllFieldsTabProps) {
  const { allFields } = useFields();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const handleFieldUpdate = async (fieldName: string, value: any) => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing. Cannot save field.",
        variant: "destructive",
      });
      return;
    }

    setSaving(fieldName);
    try {
      // Get database field name
      const dbFieldName = getDatabaseFieldName(fieldName);
      
      // Update in database
      await databaseService.updateLead(leadId, { [dbFieldName]: value });
      
      // Update local client state
      if (onClientPatched) {
        onClientPatched({ [fieldName]: value });
      }
      
      // Refresh parent
      if (onLeadUpdated) {
        onLeadUpdated();
      }
      
      toast({
        title: "Field Updated",
        description: `${fieldName} has been updated successfully.`,
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${fieldName}.`,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Render appropriate editor based on field type
  const renderFieldEditor = (field: any) => {
    const frontendFieldName = FIELD_NAME_MAP[field.field_name] || field.field_name;
    const value = client[frontendFieldName];

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'link':
        return (
          <InlineEditText
            value={value || ''}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'phone':
        return (
          <InlineEditPhone
            value={value || ''}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'number':
        return (
          <InlineEditNumber
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'currency':
        return (
          <InlineEditCurrency
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'percentage':
        return (
          <InlineEditPercentage
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'date':
        return (
          <InlineEditDate
            value={value || null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'datetime':
        return (
          <InlineEditDateTime
            value={value || null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'boolean':
        return (
          <InlineEditBoolean
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      case 'select':
        return (
          <InlineEditSelect
            value={value || null}
            options={(field.dropdown_options || []).map((opt: string) => ({ value: opt, label: opt }))}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
            className="w-full"
          />
        );
      
      default:
        return <span className="text-sm text-muted-foreground">{value || '—'}</span>;
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm text-muted-foreground mb-4">
        All {allFields.filter(f => f.is_in_use).length} fields for this lead. Edit any field to save changes.
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {allFields
          .filter(f => f.is_in_use)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((field) => {
            const frontendFieldName = FIELD_NAME_MAP[field.field_name] || field.field_name;
            const isSaving = saving === frontendFieldName;
            
            return (
              <div key={field.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">
                    {field.display_name}
                    {field.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {field.section}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {renderFieldEditor(field)}
                  {isSaving && (
                    <span className="text-xs text-muted-foreground">Saving...</span>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-1">
                  Field: {frontendFieldName} | DB: {field.field_name} | Type: {field.field_type}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
