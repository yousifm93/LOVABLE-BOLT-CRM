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
  
  const dateValue = value ? (typeof value === 'string' ? new Date(value + 'T00:00:00') : value) : undefined;
  const displayValue = dateValue ? dateValue.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }) : placeholder;

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