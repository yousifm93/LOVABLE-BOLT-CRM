import { useMemo } from "react";
import { useFields } from "@/contexts/FieldsContext";

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * Hook to generate dynamic column configurations from the fields database
 * Uses DATABASE field names directly for maximum consistency
 * @param sections - Array of NEW section names (e.g., ['LEAD INFO', 'BORROWER INFO', 'CONTACT INFO'])
 * @param storageKey - LocalStorage key for column visibility state
 * @returns Array of column configurations with database field names
 */
export function useDynamicColumns(sections: string[], storageKey: string) {
  const { allFields } = useFields();

  const columns = useMemo(() => {
    // Get all fields that match the specified sections
    const relevantFields = allFields.filter(field => 
      sections.includes(field.section) && field.is_in_use
    );

    // Sort by sort_order for consistent display
    const sortedFields = [...relevantFields].sort((a, b) => a.sort_order - b.sort_order);

    // Map fields to column config using DATABASE field names
    const dynamicColumns: ColumnConfig[] = sortedFields.map(field => ({
      id: field.field_name, // DATABASE NAME (not mapped to frontend)
      label: field.display_name,
      visible: field.is_visible // default from admin config
    }));

    return dynamicColumns;
  }, [allFields, sections]);

  return columns;
}
