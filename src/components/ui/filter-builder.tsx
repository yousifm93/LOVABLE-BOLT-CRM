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
  endValue?: string | Date; // For "is between" operator
}

interface FilterBuilderProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  columns: Array<{ value: string; label: string; type?: 'date' | 'text' | 'select'; options?: string[] }>;
}

const textOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
];

const dateOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_after', label: 'is after' },
  { value: 'is_before', label: 'is before' },
  { value: 'is_in_last', label: 'is in last' },
  { value: 'is_between', label: 'is between' },
];

const selectOperators = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
];

const relativeValues = [
  { value: '7_days', label: '7 days' },
  { value: '14_days', label: '14 days' },
  { value: '30_days', label: '30 days' },
  { value: '60_days', label: '60 days' },
  { value: '90_days', label: '90 days' },
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

  const getOperators = (columnValue: string) => {
    const type = getColumnType(columnValue);
    if (type === 'date') return dateOperators;
    if (type === 'select') return selectOperators;
    return textOperators;
  };

  const renderValueInput = (filter: FilterCondition) => {
    const columnType = getColumnType(filter.column);
    const options = getColumnOptions(filter.column);

    // Select type - show dropdown with options
    if (columnType === 'select' && options.length > 0) {
      return (
        <Select
          value={filter.value as string}
          onValueChange={(value) => updateFilter(filter.id, 'value', value)}
        >
          <SelectTrigger className="w-44">
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

    // Date type - show calendar picker or relative values
    if (columnType === 'date') {
      // For "is in last" operator, show relative options
      if (filter.operator === 'is_in_last') {
        return (
          <Select
            value={filter.value as string}
            onValueChange={(value) => updateFilter(filter.id, 'value', value)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {relativeValues.map((rv) => (
                <SelectItem key={rv.value} value={rv.value}>
                  {rv.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      // For "is between", show two date pickers
      if (filter.operator === 'is_between') {
        return (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-32 justify-start text-left font-normal",
                    !filter.value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.value instanceof Date
                    ? format(filter.value, "MMM dd")
                    : filter.value
                    ? format(new Date(filter.value), "MMM dd")
                    : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filter.value instanceof Date ? filter.value : filter.value ? new Date(filter.value) : undefined}
                  onSelect={(date) => updateFilter(filter.id, 'value', date?.toISOString().split('T')[0] || '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">and</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-32 justify-start text-left font-normal",
                    !filter.endValue && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.endValue instanceof Date
                    ? format(filter.endValue, "MMM dd")
                    : filter.endValue
                    ? format(new Date(filter.endValue as string), "MMM dd")
                    : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

      // Default: show calendar picker
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-44 justify-start text-left font-normal",
                !filter.value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filter.value instanceof Date
                ? format(filter.value, "MMM dd, yyyy")
                : filter.value
                ? format(new Date(filter.value), "MMM dd, yyyy")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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

    // Text type - show text input
    return (
      <Input
        placeholder="Enter value"
        value={filter.value as string}
        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
        className="w-44"
      />
    );
  };

  return (
    <div className="space-y-3">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg flex-wrap">
          {/* Column Select */}
          <Select
            value={filter.column}
            onValueChange={(value) => {
              updateFilter(filter.id, 'column', value);
              // Reset operator to first valid one for new column type
              const ops = getOperators(value);
              updateFilter(filter.id, 'operator', ops[0]?.value || 'is');
              updateFilter(filter.id, 'value', '');
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.value} value={column.value}>
                  {column.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator Select - Dynamic based on column type */}
          <Select
            value={filter.operator}
            onValueChange={(value) => {
              updateFilter(filter.id, 'operator', value);
              // Clear value when switching operators
              updateFilter(filter.id, 'value', '');
              updateFilter(filter.id, 'endValue', undefined);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getOperators(filter.column).map((operator) => (
                <SelectItem key={operator.value} value={operator.value}>
                  {operator.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value Input - Dynamic based on column type */}
          {filter.column && renderValueInput(filter)}

          {/* Remove Filter */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeFilter(filter.id)}
            className="h-8 w-8 shrink-0"
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