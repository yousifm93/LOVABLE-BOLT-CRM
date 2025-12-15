import { useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InlineEditProductProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
}

const options = [
  { value: "Y", label: "Yes", icon: Check, color: "text-green-600 bg-green-500/20" },
  { value: "N", label: "No", icon: X, color: "text-red-600 bg-red-500/20" },
  { value: "TBD", label: "TBD", icon: HelpCircle, color: "text-amber-600 bg-amber-500/20" },
];

export function InlineEditProduct({ value, onValueChange, disabled, className }: InlineEditProductProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = options.find(o => o.value === value);

  const handleSelect = (newValue: string | null) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {currentOption?.label || "—"}
      </span>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors",
            "hover:ring-1 hover:ring-primary/30 focus:outline-none focus:ring-1 focus:ring-primary",
            currentOption?.color || "text-muted-foreground bg-muted",
            className
          )}
        >
          {currentOption ? (
            <>
              <currentOption.icon className="h-3 w-3" />
              {currentOption.label}
            </>
          ) : (
            "—"
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[100px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              value === option.value && "bg-accent"
            )}
          >
            <option.icon className={cn("h-4 w-4", option.color.split(" ")[0])} />
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => handleSelect(null)}
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
        >
          Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
