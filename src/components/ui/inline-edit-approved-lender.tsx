import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Lender {
  id: string;
  lender_name: string;
  lender_type?: string;
  account_executive?: string;
}

interface InlineEditApprovedLenderProps {
  value?: Lender | null;
  lenders: Lender[];
  onValueChange: (lender: Lender | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditApprovedLender({
  value,
  lenders,
  onValueChange,
  placeholder = "Select lender",
  className,
  disabled = false
}: InlineEditApprovedLenderProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const filteredLenders = React.useMemo(() => {
    if (!searchTerm) return lenders;
    return lenders.filter(lender => 
      lender.lender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lender.lender_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lenders, searchTerm]);

  const handleSelect = (lender: Lender) => {
    onValueChange(lender);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
    setSearchTerm("");
  };

  const displayValue = value ? value.lender_name : placeholder;

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {displayValue}
      </span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto p-2 justify-start font-normal hover:bg-muted/50 min-w-[140px]",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm truncate">{displayValue}</span>
          <ChevronDown className="ml-1 h-3 w-3 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 bg-popover border z-50">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lenders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {value && (
            <DropdownMenuItem
              onClick={handleClear}
              className="cursor-pointer text-muted-foreground"
            >
              Clear selection
            </DropdownMenuItem>
          )}
          {filteredLenders.map((lender) => (
            <DropdownMenuItem
              key={lender.id}
              onClick={() => handleSelect(lender)}
              className="cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{lender.lender_name}</span>
                {lender.lender_type && (
                  <span className="text-xs text-muted-foreground">{lender.lender_type}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          {filteredLenders.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No lenders found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
