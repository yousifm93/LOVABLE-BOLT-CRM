import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateModern } from "@/utils/dateUtils";

interface InlineEditDateProps {
  value?: Date | string | null;
  onValueChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditDate({
  value,
  onValueChange,
  placeholder = "Select date",
  className,
  disabled = false
}: InlineEditDateProps) {
  const [open, setOpen] = React.useState(false);
  
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    
    if (typeof value === 'string') {
      // If the string already contains a time component (has 'T' in it), parse it directly
      if (value.includes('T')) {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? undefined : parsed;
      }
      // For date-only strings like "2024-01-15", parse as UTC to avoid timezone shift
      // This fixes the off-by-one day issue
      const [year, month, day] = value.split('-').map(Number);
      const parsed = new Date(year, month - 1, day);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    
    // If it's already a Date object, validate it
    return isNaN(value.getTime()) ? undefined : value;
  }, [value]);

  const displayValue = React.useMemo(() => {
    if (!dateValue || isNaN(dateValue.getTime())) return placeholder;
    
    const currentYear = new Date().getFullYear();
    const dateYear = dateValue.getFullYear();
    
    // Only show year if it's different from current year
    if (dateYear === currentYear) {
      return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [dateValue, placeholder]);

  const handleSelect = (date: Date | undefined) => {
    onValueChange(date);
    setOpen(false);
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {displayValue}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 justify-start text-left font-normal hover:bg-muted/50",
            !dateValue && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          <span className="text-sm">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}