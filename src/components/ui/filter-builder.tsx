import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string | Date;
}

interface FilterBuilderProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  columns: Array<{ value: string; label: string; type?: 'date' | 'text' | 'select'; options?: string[] }>;
}

const operators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'is_after', label: 'is after' },
  { value: 'is_before', label: 'is before' },
  { value: 'is_in_last', label: 'is in last' },
  { value: 'is_between', label: 'is between' },
];

const dateValues = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'next_week', label: 'Next Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Date' },
];

export function FilterBuilder({ filters, onFiltersChange, columns }: FilterBuilderProps) {
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

  const isDateColumn = (columnValue: string) => {
    return getColumnType(columnValue) === 'date';
  };

  const renderValueInput = (filter: FilterCondition) => {
    const columnType = getColumnType(filter.column);
    const options = getColumnOptions(filter.column);

    if (columnType === 'select' && options.length > 0) {
      return (
        <Select
          value={filter.value as string}
          onValueChange={(value) => updateFilter(filter.id, 'value', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (isDateColumn(filter.column)) {
      return (
        <Select
          value={filter.value as string}
          onValueChange={(value) => updateFilter(filter.id, 'value', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select date" />
          </SelectTrigger>
          <SelectContent>
            {dateValues.map((dateValue) => (
              <SelectItem key={dateValue.value} value={dateValue.value}>
                {dateValue.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        placeholder="Enter value"
        value={filter.value as string}
        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
        className="w-48"
      />
    );
  };

  return (
    <div className="space-y-3">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          {/* Column Select */}
          <Select
            value={filter.column}
            onValueChange={(value) => updateFilter(filter.id, 'column', value)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.value} value={column.value}>
                  {column.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator Select */}
          <Select
            value={filter.operator}
            onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((operator) => (
                <SelectItem key={operator.value} value={operator.value}>
                  {operator.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value Input */}
          {renderValueInput(filter)}

          {/* Remove Filter */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeFilter(filter.id)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={addFilter}
        className="w-full"
      >
        Add Filter
      </Button>
    </div>
  );
}