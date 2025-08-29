import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";

interface InlineEditSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showAsStatusBadge?: boolean;
  disabled?: boolean;
}

export function InlineEditSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select...",
  className,
  showAsStatusBadge = false,
  disabled = false
}: InlineEditSelectProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption?.label || value || placeholder;

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  if (disabled) {
    return showAsStatusBadge ? (
      <StatusBadge status={displayValue} />
    ) : (
      <span className={cn("text-sm", className)}>{displayValue}</span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 justify-start font-normal hover:bg-muted/50 min-w-[120px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          {showAsStatusBadge && value ? (
            <StatusBadge status={displayValue} />
          ) : (
            <span className="text-sm">{displayValue}</span>
          )}
          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px] max-h-60 overflow-y-auto bg-popover border z-50">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}