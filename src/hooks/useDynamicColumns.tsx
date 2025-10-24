import { useMemo } from "react";
import { useFields } from "@/contexts/FieldsContext";

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * Hook to generate dynamic column configurations from the fields database
 * @param sections - Array of section names to include (e.g., ['LEAD', 'APP COMPLETE'])
 * @param storageKey - LocalStorage key for column visibility state
 * @returns Array of column configurations
 */
export function useDynamicColumns(sections: string[], storageKey: string) {
  const { allFields } = useFields();

  const columns = useMemo(() => {
    // Get all fields that match the specified sections
    const relevantFields = allFields.filter(field => 
      sections.includes(field.section) && field.is_in_use
    );

    // Map fields to column config
    const dynamicColumns: ColumnConfig[] = relevantFields.map(field => ({
      id: field.field_name,
      label: field.display_name,
      visible: field.is_visible // default from admin config
    }));

    return dynamicColumns;
  }, [allFields, sections]);

  return columns;
}
