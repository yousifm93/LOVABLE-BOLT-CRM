import * as React from "react";
import { Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Lender {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  email?: string;
}

interface InlineEditLenderProps {
  value?: Lender | null;
  lenders: Lender[];
  onValueChange: (lender: Lender | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditLender({
  value,
  lenders,
  onValueChange,
  placeholder = "Select lender",
  className,
  disabled = false
}: InlineEditLenderProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (lender: Lender) => {
    onValueChange(lender);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
  };

  // Build searchable value for Command filtering
  const getSearchValue = (lender: Lender) => {
    return [
      lender.first_name || '',
      lender.last_name || '',
      lender.company || '',
      lender.email || ''
    ].join(' ').toLowerCase();
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {value ? `${value.first_name} ${value.last_name}` : placeholder}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto p-1 justify-start text-left font-normal hover:bg-muted/50 max-w-[200px]",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Building2 className="mr-1 h-3 w-3 flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm truncate">
              {value ? `${value.first_name} ${value.last_name}` : placeholder}
            </span>
            {value?.company && (
              <span className="text-xs text-muted-foreground truncate">
                {value.company}
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search lenders..." />
          <CommandList>
            <CommandEmpty>No lenders found</CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleClear}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-3 w-3" />
                  Clear selection
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Lenders">
              {lenders.map((lender) => (
                <CommandItem
                  key={lender.id}
                  value={getSearchValue(lender)}
                  onSelect={() => handleSelect(lender)}
                  className="flex flex-col items-start p-3"
                >
                  <div className="font-medium">
                    {lender.first_name} {lender.last_name}
                  </div>
                  {lender.company && (
                    <div className="text-xs text-muted-foreground">
                      {lender.company}
                    </div>
                  )}
                  {lender.email && (
                    <div className="text-xs text-muted-foreground">
                      {lender.email}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
