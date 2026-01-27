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
  value: string | null | undefined;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  showAsStatusBadge?: boolean;
  disabled?: boolean;
  forceGrayBadge?: boolean;
  fixedWidth?: string;
  fillCell?: boolean;
  showClearOption?: boolean;
}

export function InlineEditSelect({
  value,
  options,
  onValueChange,
  placeholder = "",
  className,
  showAsStatusBadge = false,
  disabled = false,
  forceGrayBadge = false,
  fixedWidth,
  fillCell = false,
  showClearOption = true
}: InlineEditSelectProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedOption = options.find(option => option.value === value);
  // Show empty/gray when no value selected
  const displayValue = selectedOption?.label || value || "";
  const hasValue = Boolean(value && selectedOption);

  const handleSelect = (optionValue: string | null) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
  };

  if (disabled) {
    return showAsStatusBadge ? (
      hasValue ? (
        <StatusBadge 
          status={displayValue} 
          forceGray={forceGrayBadge}
          fillCell={fillCell}
          className={cn(fixedWidth, "justify-center", className)}
        />
      ) : (
        <div className={cn("h-6 bg-muted/30 rounded", fixedWidth, className)} />
      )
    ) : (
      hasValue ? (
        <span className={cn("text-sm", className)}>{displayValue}</span>
      ) : (
        <div className={cn("h-6 bg-muted/30 rounded min-w-[60px]", className)} />
      )
    );
  }

  if (showAsStatusBadge) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
            {hasValue ? (
              <StatusBadge 
                status={displayValue} 
                forceGray={forceGrayBadge}
                fillCell={fillCell}
                className={cn(fixedWidth, "justify-center", className)}
              />
            ) : (
              <div className={cn("h-6 bg-muted/40 rounded min-w-[60px] hover:bg-muted/60 transition-colors", fixedWidth, className)} />
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className={cn("bg-background border border-border shadow-lg z-[100]", fixedWidth)}
        >
          {/* Clear option at top */}
          {showClearOption && hasValue && (
            <DropdownMenuItem
              onClick={handleClear}
              className={cn(
                "cursor-pointer text-center justify-center h-8 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                fixedWidth
              )}
            >
              — Clear —
            </DropdownMenuItem>
          )}
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
            !hasValue && "text-muted-foreground bg-muted/30",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {hasValue ? (
            <span className="text-sm">{displayValue}</span>
          ) : (
            <span className="text-sm opacity-0">—</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px] max-h-60 overflow-y-auto bg-popover border z-[100]">
        {/* Clear option at top */}
        {showClearOption && hasValue && (
          <DropdownMenuItem
            onClick={handleClear}
            className="cursor-pointer text-muted-foreground"
          >
            <span>— Clear —</span>
          </DropdownMenuItem>
        )}
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