import * as React from "react";
import { Search, Building2 } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredLenders = React.useMemo(() => {
    if (!searchTerm) return lenders;
    return lenders.filter(lender =>
      `${lender.first_name} ${lender.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lender.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lender.email?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {value ? `${value.first_name} ${value.last_name}` : placeholder}
      </span>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
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
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search lenders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-auto">
          {value && (
            <DropdownMenuItem
              onClick={handleClear}
              className="text-muted-foreground"
            >
              Clear selection
            </DropdownMenuItem>
          )}
          {filteredLenders.map((lender) => (
            <DropdownMenuItem
              key={lender.id}
              onClick={() => handleSelect(lender)}
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
            </DropdownMenuItem>
          ))}
          {filteredLenders.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No lenders found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}