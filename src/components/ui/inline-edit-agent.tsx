import * as React from "react";
import { Search, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  brokerage?: string;
  email?: string;
  phone?: string;
}

interface InlineEditAgentProps {
  value?: Agent | null;
  agents: Agent[];
  onValueChange: (agent: Agent | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: "buyer" | "listing";
}

export function InlineEditAgent({
  value,
  agents,
  onValueChange,
  placeholder = "Select agent",
  className,
  disabled = false,
  type = "buyer"
}: InlineEditAgentProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredAgents = React.useMemo(() => {
    // Find the N/A agent to pin at top
    const naAgent = agents.find(agent => 
      agent.first_name === 'N/A' && agent.last_name?.includes('Not Applicable')
    );
    const otherAgents = agents.filter(agent => 
      !(agent.first_name === 'N/A' && agent.last_name?.includes('Not Applicable'))
    );
    
    if (!searchTerm) {
      // Pin N/A agent at top when no search
      return naAgent ? [naAgent, ...otherAgents] : otherAgents;
    }
    
    // Filter based on search term
    const filtered = agents.filter(agent =>
      `${agent.first_name} ${agent.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.brokerage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Still pin N/A at top if it matches
    const naMatch = filtered.find(agent => 
      agent.first_name === 'N/A' && agent.last_name?.includes('Not Applicable')
    );
    const othersMatch = filtered.filter(agent => 
      !(agent.first_name === 'N/A' && agent.last_name?.includes('Not Applicable'))
    );
    
    return naMatch ? [naMatch, ...othersMatch] : filtered;
  }, [agents, searchTerm]);

  const handleSelect = (agent: Agent) => {
    onValueChange(agent);
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
            "h-9 px-0 py-1 justify-start text-left font-normal hover:bg-muted/50 w-full relative",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center w-full relative pl-6">
            <UserCheck className="h-3 w-3 flex-shrink-0 absolute left-1 top-1/2 -translate-y-1/2" />
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm leading-tight truncate w-full">
                {value ? `${value.first_name} ${value.last_name}` : placeholder}
              </span>
              {value?.phone && (
                <span className="text-xs text-muted-foreground leading-tight truncate w-full">
                  {value.phone}
                </span>
              )}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
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
          {filteredAgents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleSelect(agent)}
              className="flex flex-col items-start p-3"
            >
              <div className="font-medium">
                {agent.first_name} {agent.last_name}
              </div>
              {agent.phone && (
                <div className="text-xs text-muted-foreground">
                  {agent.phone}
                </div>
              )}
            </DropdownMenuItem>
          ))}
          {filteredAgents.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              No agents found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}