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

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface InlineEditBorrowerProps {
  value?: string;
  borrowerId?: string;
  leads: Lead[];
  onValueChange: (leadId: string | null, leadName: string) => void;
  onBorrowerClick?: (borrowerId: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditBorrower({
  value,
  borrowerId,
  leads,
  onValueChange,
  onBorrowerClick,
  placeholder = "Select borrower",
  className,
  disabled = false
}: InlineEditBorrowerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const filteredLeads = React.useMemo(() => {
    if (!searchTerm) return leads;
    return leads.filter(lead => 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const handleSelect = (lead: Lead) => {
    onValueChange(lead.id, `${lead.first_name} ${lead.last_name}`);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onValueChange(null, "");
    setOpen(false);
    setSearchTerm("");
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {value || placeholder}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 min-w-0 max-w-full", className)}>
      {/* Clickable name to open lead details */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          if (borrowerId && onBorrowerClick) {
            onBorrowerClick(borrowerId);
          } else if (!borrowerId) {
            // If no borrower, clicking placeholder opens dropdown
            setOpen(true);
          }
        }}
        className={cn(
          "text-sm px-1 py-1 rounded cursor-pointer transition-colors truncate min-w-0 max-w-full",
          borrowerId ? "hover:text-primary hover:bg-muted/50" : "text-muted-foreground hover:bg-muted/50"
        )}
        title={value || placeholder}
      >
        {value || placeholder}
      </span>

      {/* Dropdown trigger for chevron only */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted/50"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 bg-popover border z-50">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search borrowers..."
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
          {filteredLeads.map((lead) => (
            <DropdownMenuItem
              key={lead.id}
              onClick={() => handleSelect(lead)}
              className="cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                {lead.email && (
                  <span className="text-xs text-muted-foreground">{lead.email}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          {filteredLeads.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No borrowers found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}