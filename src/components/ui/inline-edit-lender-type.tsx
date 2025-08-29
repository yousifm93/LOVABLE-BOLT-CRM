import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface InlineEditLenderTypeProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const lenderTypes = [
  { value: "Conventional", label: "Conventional" },
  { value: "Non-QM", label: "Non-QM" },
  { value: "Private", label: "Private" },
];

export function InlineEditLenderType({
  value,
  onValueChange,
  placeholder = "Select type",
  className,
  disabled = false
}: InlineEditLenderTypeProps) {
  const [open, setOpen] = React.useState(false);
  
  const handleSelect = (newValue: string) => {
    onValueChange(newValue);
    setOpen(false);
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {value || placeholder}
      </span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-1 justify-between text-left font-normal hover:bg-muted/50",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center">
            {value ? (
              <StatusBadge status={value} />
            ) : (
              <span className="text-sm">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {lenderTypes.map((type) => (
          <DropdownMenuItem
            key={type.value}
            onSelect={() => handleSelect(type.value)}
          >
            <div className="flex items-center justify-between w-full">
              <span>{type.label}</span>
              {value === type.value && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}