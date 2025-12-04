import { FilterCondition } from "@/components/ui/button-filter-builder";

/**
 * Count only active/complete filters (those with column AND value set)
 */
export function countActiveFilters(filters: FilterCondition[]): number {
  return filters.filter(f => 
    f.column && (f.value || f.operator === 'is_empty' || f.operator === 'is_not_empty' || f.operator === 'is_in_last_7' || f.operator === 'is_in_last_30')
  ).length;
}

/**
 * Shared utility function to apply advanced filters to any data array
 * Supports all filter operators defined in ButtonFilterBuilder
 */
export function applyAdvancedFilters<T extends Record<string, any>>(
  items: T[],
  filters: FilterCondition[],
  fieldAccessor?: (item: T, column: string) => any
): T[] {
  if (filters.length === 0) return items;

  return items.filter(item => {
    return filters.every(filter => {
      if (!filter.column || !filter.operator) return true;
      
      // Operators that don't need a value
      const noValueOperators = ['is_empty', 'is_not_empty', 'is_in_last_7', 'is_in_last_30'];
      if (!noValueOperators.includes(filter.operator)) {
        if (filter.value === undefined || filter.value === '') return true;
      }

      // Get field value - use custom accessor if provided, otherwise direct access
      const fieldValue = fieldAccessor 
        ? fieldAccessor(item, filter.column)
        : item[filter.column];

      const filterValue = filter.value;
      const strFieldValue = String(fieldValue ?? '').toLowerCase();
      const strFilterValue = String(filterValue ?? '').toLowerCase();

      switch (filter.operator) {
        // Text/Select operators
        case 'is':
          if (typeof fieldValue === 'string') {
            return strFieldValue === strFilterValue;
          }
          return fieldValue === filterValue;
          
        case 'is_not':
          if (typeof fieldValue === 'string') {
            return strFieldValue !== strFilterValue;
          }
          return fieldValue !== filterValue;
          
        case 'text_is':
          return strFieldValue === strFilterValue;
          
        case 'text_is_not':
          return strFieldValue !== strFilterValue;
          
        case 'contains':
          return strFieldValue.includes(strFilterValue);
          
        case 'does_not_contain':
          return !strFieldValue.includes(strFilterValue);
          
        case 'starts_with':
          return strFieldValue.startsWith(strFilterValue);
          
        case 'is_empty':
          return fieldValue === null || fieldValue === undefined || fieldValue === '';
          
        case 'is_not_empty':
          return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

        // Number operators
        case 'equals':
          return Number(fieldValue) === Number(filterValue);
          
        case 'not_equals':
          return Number(fieldValue) !== Number(filterValue);
          
        case 'greater_than':
          return Number(fieldValue) > Number(filterValue);
          
        case 'less_than':
          return Number(fieldValue) < Number(filterValue);
          
        case 'greater_or_equal':
          return Number(fieldValue) >= Number(filterValue);
          
        case 'less_or_equal':
          return Number(fieldValue) <= Number(filterValue);

        // Date operators
        case 'is_after':
          if (!fieldValue) return false;
          return new Date(fieldValue) > new Date(filterValue as string);
          
        case 'is_before':
          if (!fieldValue) return false;
          return new Date(fieldValue) < new Date(filterValue as string);
          
        case 'is_in_last_7': {
          if (!fieldValue) return false;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          cutoff.setHours(0, 0, 0, 0);
          return new Date(fieldValue) >= cutoff;
        }

        case 'is_in_last_30': {
          if (!fieldValue) return false;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          cutoff.setHours(0, 0, 0, 0);
          return new Date(fieldValue) >= cutoff;
        }
          
        case 'is_in_last': {
          if (!fieldValue) return false;
          const daysMatch = String(filterValue).match(/^(\d+)_days$/);
          if (!daysMatch) return true;
          const days = parseInt(daysMatch[1]);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          cutoff.setHours(0, 0, 0, 0);
          return new Date(fieldValue) >= cutoff;
        }
        
        case 'is_between': {
          if (!fieldValue) return false;
          const startDate = new Date(filterValue as string);
          const endDate = filter.endValue ? new Date(filter.endValue as string) : new Date();
          const fieldDate = new Date(fieldValue);
          return fieldDate >= startDate && fieldDate <= endDate;
        }

        default:
          return true;
      }
    });
  });
}
