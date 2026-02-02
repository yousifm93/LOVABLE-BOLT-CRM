import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, X, ChevronLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string | Date;
  endValue?: string | Date;
}

export interface FilterColumn {
  label: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  optionLabels?: Record<string, string>;
}

interface ButtonFilterBuilderProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  columns: FilterColumn[];
  onSaveAsView?: (viewName: string) => void;
  showSaveAsView?: boolean;
}

export function ButtonFilterBuilder({ 
  filters, 
  onFiltersChange, 
  columns,
  onSaveAsView,
  showSaveAsView = true
}: ButtonFilterBuilderProps) {
  const [step, setStep] = useState<'field' | 'operator' | 'value' | null>(null);
  const [currentFilter, setCurrentFilter] = useState<Partial<FilterCondition>>({});
  const [inputValue, setInputValue] = useState('');
  const [dateValue, setDateValue] = useState<Date>();
  const [viewName, setViewName] = useState('');

  const selectedColumn = columns.find(c => c.value === currentFilter.column);

  const getOperatorsForType = (type: string) => {
    switch (type) {
      case 'text':
        return [
          { label: 'Contains', value: 'contains' },
          { label: 'Does not contain', value: 'does_not_contain' },
          { label: 'Is', value: 'is' },
          { label: 'Is not', value: 'is_not' },
          { label: 'Starts with', value: 'starts_with' },
          { label: 'Is empty', value: 'is_empty' },
          { label: 'Is not empty', value: 'is_not_empty' },
        ];
      case 'number':
        return [
          { label: 'Equals', value: 'equals' },
          { label: 'Not equals', value: 'not_equals' },
          { label: 'Greater than', value: 'greater_than' },
          { label: 'Less than', value: 'less_than' },
          { label: 'Greater or equal', value: 'greater_or_equal' },
          { label: 'Less or equal', value: 'less_or_equal' },
          { label: 'Is empty', value: 'is_empty' },
          { label: 'Is not empty', value: 'is_not_empty' },
        ];
      case 'date':
        return [
          { label: 'Is', value: 'is' },
          { label: 'Is before', value: 'is_before' },
          { label: 'Is after', value: 'is_after' },
          { label: 'Is in last 7 days', value: 'is_in_last_7' },
          { label: 'Is in last 30 days', value: 'is_in_last_30' },
          { label: 'Is empty', value: 'is_empty' },
          { label: 'Is not empty', value: 'is_not_empty' },
        ];
      case 'select':
        return [
          { label: 'Is', value: 'is' },
          { label: 'Is not', value: 'is_not' },
          { label: 'Is empty', value: 'is_empty' },
          { label: 'Is not empty', value: 'is_not_empty' },
        ];
      default:
        return [{ label: 'Is', value: 'is' }];
    }
  };

  const needsValueInput = (operator: string) => {
    return !['is_empty', 'is_not_empty', 'is_in_last_7', 'is_in_last_30'].includes(operator);
  };

  const handleAddFilter = () => {
    if (currentFilter.column && currentFilter.operator) {
      const newFilter: FilterCondition = {
        id: Date.now().toString(),
        column: currentFilter.column,
        operator: currentFilter.operator,
        value: needsValueInput(currentFilter.operator) ? inputValue : '',
      };
      onFiltersChange([...filters, newFilter]);
      resetBuilder();
    }
  };

  const handleAddFilterWithValue = (value: string) => {
    if (currentFilter.column && currentFilter.operator) {
      const newFilter: FilterCondition = {
        id: Date.now().toString(),
        column: currentFilter.column,
        operator: currentFilter.operator,
        value: value,
      };
      onFiltersChange([...filters, newFilter]);
      resetBuilder();
    }
  };

  const resetBuilder = () => {
    setStep(null);
    setCurrentFilter({});
    setInputValue('');
    setDateValue(undefined);
  };

  const removeFilter = (filterId: string) => {
    onFiltersChange(filters.filter(f => f.id !== filterId));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
    resetBuilder();
  };

  const handleSaveAsView = () => {
    if (viewName.trim() && onSaveAsView) {
      onSaveAsView(viewName.trim());
      setViewName('');
    }
  };

  // Count active filters
  const activeFilterCount = filters.filter(f => 
    f.column && (f.value || f.operator === 'is_empty' || f.operator === 'is_not_empty' || f.operator === 'is_in_last_7' || f.operator === 'is_in_last_30')
  ).length;

  return (
    <div className="space-y-4 p-4 bg-muted/50 border rounded-lg max-w-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</h3>
        {filters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs h-7"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => {
            const column = columns.find(c => c.value === filter.column);
            const operatorLabel = filter.operator.replace(/_/g, ' ');
            return (
              <div
                key={filter.id}
                className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md text-sm"
              >
                <span className="font-medium text-foreground">{column?.label || filter.column}</span>
                <span className="text-muted-foreground">{operatorLabel}</span>
                {filter.value && <span className="text-foreground">"{column?.optionLabels?.[String(filter.value)] || String(filter.value)}"</span>}
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t pt-4">
        {/* Step 1: Add filter button */}
        {!step && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep('field')}
            className="w-full"
          >
            + Add filter
          </Button>
        )}

        {/* Step 2: Select field */}
        {step === 'field' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Select field</p>
              <Button variant="ghost" size="sm" onClick={resetBuilder} className="h-7">
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
              {columns.map(column => (
                <Button
                  key={column.value}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentFilter({ column: column.value });
                    setStep('operator');
                  }}
                  className="justify-start text-left h-8 text-xs"
                >
                  {column.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select operator */}
        {step === 'operator' && selectedColumn && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep('field')} className="h-7 px-2">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium">
                  {selectedColumn.label} - Select condition
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetBuilder} className="h-7">
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {getOperatorsForType(selectedColumn.type).map(op => (
                <Button
                  key={op.value}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentFilter(prev => ({ ...prev, operator: op.value }));
                    if (needsValueInput(op.value)) {
                      setStep('value');
                    } else {
                      // For operators that don't need value, add filter immediately
                      const newFilter: FilterCondition = {
                        id: Date.now().toString(),
                        column: currentFilter.column!,
                        operator: op.value,
                        value: '',
                      };
                      onFiltersChange([...filters, newFilter]);
                      resetBuilder();
                    }
                  }}
                  className="justify-start h-8 text-xs"
                >
                  {op.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Enter value */}
        {step === 'value' && selectedColumn && currentFilter.operator && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep('operator')} className="h-7 px-2">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium">
                  {selectedColumn.label} {currentFilter.operator.replace(/_/g, ' ')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetBuilder} className="h-7">
                Cancel
              </Button>
            </div>
            
            {/* Date picker */}
            {selectedColumn.type === 'date' ? (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateValue && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateValue ? format(dateValue, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={dateValue}
                      onSelect={(date) => {
                        setDateValue(date);
                        if (date) {
                          setInputValue(format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  onClick={handleAddFilter}
                  disabled={!dateValue}
                  className="w-full"
                >
                  Apply filter
                </Button>
              </div>
            ) : selectedColumn.type === 'select' && selectedColumn.options ? (
              /* Select options as buttons */
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {selectedColumn.options.map(option => (
                  <Button
                    key={option}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddFilterWithValue(option)}
                    className="justify-start h-8 text-xs"
                  >
                    {selectedColumn.optionLabels?.[option] || option}
                  </Button>
                ))}
              </div>
            ) : (
              /* Text/Number input */
              <div className="space-y-2">
                <Input
                  type={selectedColumn.type === 'number' ? 'number' : 'text'}
                  placeholder={`Enter ${selectedColumn.type === 'number' ? 'number' : 'text'}...`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue) {
                      handleAddFilter();
                    }
                  }}
                  autoFocus
                  className="h-9"
                />
                <Button
                  size="sm"
                  onClick={handleAddFilter}
                  disabled={!inputValue}
                  className="w-full"
                >
                  Apply filter
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save as New View Section */}
      {showSaveAsView && onSaveAsView && filters.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Save filters as a new view</label>
            <div className="flex gap-2">
              <Input
                placeholder="View name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveAsView();
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                onClick={handleSaveAsView}
                disabled={!viewName.trim()}
                size="sm"
                className="h-8 gap-1"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to count active filters (exported for use in pages)
export function countActiveFilters(filters: FilterCondition[]): number {
  return filters.filter(f => 
    f.column && (f.value || f.operator === 'is_empty' || f.operator === 'is_not_empty' || f.operator === 'is_in_last_7' || f.operator === 'is_in_last_30')
  ).length;
}
