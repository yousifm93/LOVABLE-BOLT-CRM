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

interface InlineEditApprovalTypeProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  className?: string;
  disabled?: boolean;
}

const approvalTypeOptions = [
  { value: "Full", label: "Full" },
  { value: "Limited", label: "Limited" },
  { value: "Non-QM", label: "Non-QM" },
  { value: "Hard Money", label: "Hard Money" }
];

export function InlineEditApprovalType({
  value,
  onValueChange,
  className,
  disabled = false
}: InlineEditApprovalTypeProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = approvalTypeOptions.find(option => option.value === value);

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
            <span className="text-sm">Select type</span>
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
        {approvalTypeOptions.map((option) => (
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