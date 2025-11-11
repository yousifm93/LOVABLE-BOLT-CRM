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
  forceGrayBadge?: boolean;
  fixedWidth?: string;
  fillCell?: boolean;
}

export function InlineEditSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select...",
  className,
  showAsStatusBadge = false,
  disabled = false,
  forceGrayBadge = false,
  fixedWidth,
  fillCell = false
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
      <StatusBadge 
        status={displayValue} 
        forceGray={forceGrayBadge}
        fillCell={fillCell}
        className={cn(fixedWidth, "justify-center", className)}
      />
    ) : (
      <span className={cn("text-sm", className)}>{displayValue}</span>
    );
  }

  if (showAsStatusBadge) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <StatusBadge 
              status={displayValue} 
              forceGray={forceGrayBadge}
              fillCell={fillCell}
              className={cn(fixedWidth, "justify-center", className)}
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className={cn("bg-background border border-border shadow-lg z-50", fixedWidth)}
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "cursor-pointer text-center justify-center h-8 text-sm hover:bg-accent hover:text-accent-foreground",
                fixedWidth
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 justify-start font-normal hover:bg-muted/50",
            fixedWidth || "min-w-[100px]",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm">{displayValue}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px] max-h-60 overflow-y-auto bg-popover border z-50">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className="cursor-pointer"
          >
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}