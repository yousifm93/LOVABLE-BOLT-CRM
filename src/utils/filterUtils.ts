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
          // For dates, compare day only (ignore time)
          if (fieldValue && typeof filterValue === 'string' && filterValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            const fieldDate = new Date(fieldValue).toISOString().split('T')[0];
            const filterDate = new Date(filterValue).toISOString().split('T')[0];
            return fieldDate === filterDate;
          }
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

        // Date operators - normalize to start of day for proper comparison
        case 'is_after': {
          if (!fieldValue) return false;
          const fieldDateAfter = new Date(fieldValue);
          fieldDateAfter.setHours(0, 0, 0, 0);
          const filterDateAfter = new Date(filterValue as string);
          filterDateAfter.setHours(0, 0, 0, 0);
          return fieldDateAfter > filterDateAfter;
        }
          
        case 'is_before': {
          if (!fieldValue) return false;
          const fieldDateBefore = new Date(fieldValue);
          fieldDateBefore.setHours(0, 0, 0, 0);
          const filterDateBefore = new Date(filterValue as string);
          filterDateBefore.setHours(0, 0, 0, 0);
          return fieldDateBefore < filterDateBefore;
        }

        case 'is_on_or_before': {
          if (!fieldValue) return false;
          const fieldDateOnOrBefore = new Date(fieldValue);
          fieldDateOnOrBefore.setHours(0, 0, 0, 0);
          const filterDateOnOrBefore = new Date(filterValue as string);
          filterDateOnOrBefore.setHours(0, 0, 0, 0);
          return fieldDateOnOrBefore <= filterDateOnOrBefore;
        }

        // Special operator: field is empty OR field date is before today
        case 'is_empty_or_before_today': {
          if (!fieldValue) return true; // Empty passes
          const fieldDateForReview = new Date(fieldValue);
          fieldDateForReview.setHours(0, 0, 0, 0);
          const todayForReview = new Date();
          todayForReview.setHours(0, 0, 0, 0);
          return fieldDateForReview < todayForReview;
        }
          
        case 'is_in_last_7': {
          if (!fieldValue) return false;
          const fieldDate7 = new Date(fieldValue);
          fieldDate7.setHours(0, 0, 0, 0);
          const cutoff7 = new Date();
          cutoff7.setDate(cutoff7.getDate() - 7);
          cutoff7.setHours(0, 0, 0, 0);
          return fieldDate7 >= cutoff7;
        }

        case 'is_in_last_30': {
          if (!fieldValue) return false;
          const fieldDate30 = new Date(fieldValue);
          fieldDate30.setHours(0, 0, 0, 0);
          const cutoff30 = new Date();
          cutoff30.setDate(cutoff30.getDate() - 30);
          cutoff30.setHours(0, 0, 0, 0);
          return fieldDate30 >= cutoff30;
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
