import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X } from "lucide-react";

interface InlineEditApprovalSourceProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  className?: string;
  disabled?: boolean;
}

const approvalSourceOptions = [
  { value: "PennyMac", label: "PennyMac" },
  { value: "A&D", label: "A&D" },
  { value: "UWM", label: "UWM" }
];

export function InlineEditApprovalSource({
  value,
  onValueChange,
  className,
  disabled = false
}: InlineEditApprovalSourceProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = approvalSourceOptions.find(option => option.value === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {selectedOption?.label || "None"}
      </span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 justify-start text-left font-normal hover:bg-muted/50",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedOption ? (
            <Badge variant="secondary" className="text-xs">
              {selectedOption.label}
            </Badge>
          ) : (
            <span className="text-sm">Select source</span>
          )}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {value && (
          <DropdownMenuItem onClick={handleClear} className="text-destructive">
            <X className="mr-2 h-3 w-3" />
            Clear
          </DropdownMenuItem>
        )}
        {approvalSourceOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={value === option.value ? "bg-muted" : ""}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}