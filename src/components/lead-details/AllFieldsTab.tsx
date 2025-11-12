import React, { useState, useMemo } from "react";
import { useFields } from "@/contexts/FieldsContext";
import { FIELD_NAME_MAP, getDatabaseFieldName } from "@/types/crm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

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
      const dbFieldName = getDatabaseFieldName(fieldName);
      await databaseService.updateLead(leadId, { [dbFieldName]: value });
      
      if (onClientPatched) {
        onClientPatched({ [fieldName]: value });
      }
      
      if (onLeadUpdated) {
        onLeadUpdated();
      }
      
      toast({
        title: "Field Updated",
        description: "Field has been updated successfully.",
      });
    } catch (error) {
      console.error(`Error updating ${fieldName}:`, error);
      toast({
        title: "Error",
        description: `Failed to update field.`,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

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
          />
        );
      
      case 'phone':
        return (
          <InlineEditPhone
            value={value || ''}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'number':
        return (
          <InlineEditNumber
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'currency':
        return (
          <InlineEditCurrency
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'percentage':
        return (
          <InlineEditPercentage
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'date':
        return (
          <InlineEditDate
            value={value || null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'datetime':
        return (
          <InlineEditDateTime
            value={value || null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'boolean':
        return (
          <InlineEditBoolean
            value={value ?? null}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      case 'select':
        return (
          <InlineEditSelect
            value={value || null}
            options={(field.dropdown_options || []).map((opt: string) => ({ value: opt, label: opt }))}
            onValueChange={(newValue) => handleFieldUpdate(frontendFieldName, newValue)}
          />
        );
      
      default:
        return <span className="text-sm text-muted-foreground">{value || '—'}</span>;
    }
  };

  const activeFields = useMemo(() => {
    return allFields
      .filter(f => f.is_in_use)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allFields]);

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return activeFields;
    
    const query = searchQuery.toLowerCase();
    return activeFields.filter(field => 
      field.display_name.toLowerCase().includes(query) ||
      field.field_name.toLowerCase().includes(query) ||
      field.section.toLowerCase().includes(query)
    );
  }, [activeFields, searchQuery]);

  const groupedFields = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredFields.forEach(field => {
      if (!groups[field.section]) {
        groups[field.section] = [];
      }
      groups[field.section].push(field);
    });
    return groups;
  }, [filteredFields]);

  const sectionOrder = [
    'LEAD',
    'BORROWER',
    'LOAN_PROPERTY',
    'MONTHLY_PAYMENT',
    'OPERATIONS',
    'TITLE',
    'INSURANCE',
    'CONDO',
    'ACTIVE',
    'PENDING APP',
    'APP COMPLETE',
    'PRE-APPROVED',
    'SCREENING',
    'PAST CLIENTS',
    'SYSTEM',
    'META'
  ];

  const sortedSections = Object.keys(groupedFields).sort((a, b) => {
    const aIndex = sectionOrder.indexOf(a);
    const bIndex = sectionOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search fields by name, section, or database field..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredFields.length} of {activeFields.length} fields
        </div>
      </div>

      <div className="space-y-3">
        {sortedSections.map((section) => {
          const fields = groupedFields[section];
          const isOpen = openSections[section] ?? false;
          
          return (
            <Card key={section} className="overflow-hidden">
              <Collapsible open={isOpen} onOpenChange={() => toggleSection(section)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="text-sm font-semibold text-foreground">
                      {section.replace(/_/g, ' ')}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                  </span>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-4 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {fields.map((field) => {
                        const frontendFieldName = FIELD_NAME_MAP[field.field_name] || field.field_name;
                        const isSaving = saving === frontendFieldName;
                        
                        return (
                          <div key={field.id} className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">
                              {field.display_name}
                              {field.is_required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <div className="flex items-center gap-2">
                              {renderFieldEditor(field)}
                              {isSaving && (
                                <span className="text-xs text-muted-foreground">...</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {filteredFields.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No fields match your search.</p>
        </div>
      )}
    </div>
  );
}
