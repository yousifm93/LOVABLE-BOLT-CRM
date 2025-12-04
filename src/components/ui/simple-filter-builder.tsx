import * as React from "react";
import { useState, useEffect } from "react";
import { CalendarIcon, X, Save } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string | Date;
  endValue?: string | Date;
}

interface SimpleFilterBuilderProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  columns: Array<{ value: string; label: string; type?: 'date' | 'text' | 'select' | 'number'; options?: string[] }>;
  onSaveAsView?: (viewName: string) => void;
  showSaveAsView?: boolean;
}

const textOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'text_is', label: 'text is' },
  { value: 'text_is_not', label: 'text is not' },
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: "doesn't contain" },
  { value: 'starts_with', label: 'starts with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const numberOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'greater_or_equal', label: 'greater or equal' },
  { value: 'less_or_equal', label: 'less or equal' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const dateOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'is_after', label: 'is after' },
  { value: 'is_before', label: 'is before' },
  { value: 'is_in_last', label: 'is in last' },
  { value: 'is_between', label: 'is between' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const selectOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const relativeValues = [
  { value: '7_days', label: '7 days' },
  { value: '14_days', label: '14 days' },
  { value: '30_days', label: '30 days' },
  { value: '60_days', label: '60 days' },
  { value: '90_days', label: '90 days' },
];

// Pure inline styles - matching the working test select
const selectStyle: React.CSSProperties = {
  height: '40px',
  fontSize: '14px',
  cursor: 'pointer',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '0 12px',
  color: '#1a1a1a',
};

const inputStyle: React.CSSProperties = {
  height: '40px',
  fontSize: '14px',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '0 12px',
  color: '#1a1a1a',
  width: '160px',
};

export function SimpleFilterBuilder({ filters, onFiltersChange, columns, onSaveAsView, showSaveAsView = true }: SimpleFilterBuilderProps) {
  const [viewName, setViewName] = useState("");

  // Auto-add first filter row when component mounts with empty filters
  useEffect(() => {
    if (filters.length === 0) {
      const newFilter: FilterCondition = {
        id: Date.now().toString(),
        column: '',
        operator: 'is',
        value: '',
      };
      onFiltersChange([newFilter]);
    }
  }, []); // Only run on mount

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      column: '',
      operator: 'is',
      value: '',
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, field: keyof FilterCondition, value: any) => {
    const updatedFilters = filters.map(filter =>
      filter.id === id ? { ...filter, [field]: value } : filter
    );
    onFiltersChange(updatedFilters);
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(filter => filter.id !== id));
  };

  const getColumnType = (columnValue: string) => {
    return columns.find(col => col.value === columnValue)?.type || 'text';
  };

  const getColumnOptions = (columnValue: string) => {
    return columns.find(col => col.value === columnValue)?.options || [];
  };

  const getOperators = (columnValue: string) => {
    const type = getColumnType(columnValue);
    if (type === 'date') return dateOperators;
    if (type === 'select') return selectOperators;
    if (type === 'number') return numberOperators;
    return textOperators;
  };

  const handleSaveAsView = () => {
    if (viewName.trim() && onSaveAsView) {
      onSaveAsView(viewName.trim());
      setViewName("");
    }
  };

  const handleColumnChange = (filterId: string, newColumn: string) => {
    updateFilter(filterId, 'column', newColumn);
    const ops = getOperators(newColumn);
    updateFilter(filterId, 'operator', ops[0]?.value || 'is');
    updateFilter(filterId, 'value', '');
  };

  const handleOperatorChange = (filterId: string, newOperator: string) => {
    updateFilter(filterId, 'operator', newOperator);
    updateFilter(filterId, 'value', '');
    updateFilter(filterId, 'endValue', undefined);
  };

  const renderValueInput = (filter: FilterCondition) => {
    if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
      return null;
    }

    if (!filter.column) {
      return (
        <input
          placeholder="Select field first"
          disabled
          style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
        />
      );
    }

    const columnType = getColumnType(filter.column);
    const options = getColumnOptions(filter.column);

    // Select type
    if (columnType === 'select' && options.length > 0) {
      return (
        <select
          value={filter.value as string}
          onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
          style={{ ...selectStyle, width: '160px' }}
        >
          <option value="">Select value</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // Date type
    if (columnType === 'date') {
      if (filter.operator === 'is_in_last') {
        return (
          <select
            value={filter.value as string}
            onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
            style={{ ...selectStyle, width: '160px' }}
          >
            <option value="">Select period</option>
            {relativeValues.map((rv) => (
              <option key={rv.value} value={rv.value}>
                {rv.label}
              </option>
            ))}
          </select>
        );
      }

      if (filter.operator === 'is_between') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  style={{ width: '120px', justifyContent: 'flex-start', textAlign: 'left', fontWeight: 'normal' }}
                >
                  <CalendarIcon style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                  {filter.value instanceof Date
                    ? format(filter.value, "MMM dd")
                    : filter.value
                    ? format(new Date(filter.value), "MMM dd")
                    : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={filter.value instanceof Date ? filter.value : filter.value ? new Date(filter.value) : undefined}
                  onSelect={(date) => updateFilter(filter.id, 'value', date?.toISOString().split('T')[0] || '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span style={{ color: '#6b7280' }}>and</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  style={{ width: '120px', justifyContent: 'flex-start', textAlign: 'left', fontWeight: 'normal' }}
                >
                  <CalendarIcon style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                  {filter.endValue instanceof Date
                    ? format(filter.endValue, "MMM dd")
                    : filter.endValue
                    ? format(new Date(filter.endValue as string), "MMM dd")
                    : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={filter.endValue instanceof Date ? filter.endValue : filter.endValue ? new Date(filter.endValue as string) : undefined}
                  onSelect={(date) => updateFilter(filter.id, 'endValue', date?.toISOString().split('T')[0] || '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              style={{ width: '160px', justifyContent: 'flex-start', textAlign: 'left', fontWeight: 'normal' }}
            >
              <CalendarIcon style={{ marginRight: '8px', height: '16px', width: '16px' }} />
              {filter.value instanceof Date
                ? format(filter.value, "MMM dd, yyyy")
                : filter.value
                ? format(new Date(filter.value), "MMM dd, yyyy")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[100]" align="start">
            <Calendar
              mode="single"
              selected={filter.value instanceof Date ? filter.value : filter.value ? new Date(filter.value) : undefined}
              onSelect={(date) => updateFilter(filter.id, 'value', date?.toISOString().split('T')[0] || '')}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    // Number type
    if (columnType === 'number') {
      return (
        <input
          type="number"
          placeholder="Enter number"
          value={filter.value as string}
          onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
          style={inputStyle}
        />
      );
    }

    // Text type
    return (
      <input
        placeholder="Enter value"
        value={filter.value as string}
        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
        style={inputStyle}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {filters.map((filter) => (
        <div 
          key={filter.id} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px', 
            background: '#f4f4f5', 
            borderRadius: '8px',
            flexWrap: 'wrap'
          }}
        >
          {/* Column Select */}
          <select
            value={filter.column}
            onChange={(e) => handleColumnChange(filter.id, e.target.value)}
            style={{ ...selectStyle, width: '200px' }}
          >
            <option value="">Select field</option>
            {columns.map((column) => (
              <option key={column.value} value={column.value}>
                {column.label}
              </option>
            ))}
          </select>

          {/* Operator Select */}
          <select
            value={filter.operator}
            onChange={(e) => handleOperatorChange(filter.id, e.target.value)}
            style={{ ...selectStyle, width: '140px' }}
          >
            {getOperators(filter.column).map((operator) => (
              <option key={operator.value} value={operator.value}>
                {operator.label}
              </option>
            ))}
          </select>

          {/* Value Input */}
          {renderValueInput(filter)}

          {/* Remove Filter */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeFilter(filter.id)}
            style={{ height: '32px', width: '32px', flexShrink: 0 }}
          >
            <X style={{ height: '16px', width: '16px' }} />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={addFilter}
        style={{ width: '100%' }}
      >
        Add Filter
      </Button>

      {/* Save as New View Section */}
      {showSaveAsView && onSaveAsView && filters.length > 0 && (
        <>
          <Separator style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Save filters as a new view</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="View name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveAsView();
                  }
                }}
                style={{ ...inputStyle, flex: 1, width: 'auto' }}
              />
              <Button
                onClick={handleSaveAsView}
                disabled={!viewName.trim()}
                size="sm"
                style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
              >
                <Save style={{ height: '16px', width: '16px' }} />
                Save View
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Re-export FilterCondition type for backward compatibility
export type { FilterCondition as FilterBuilderCondition };
