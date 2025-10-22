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
    if (!searchTerm) return agents;
    return agents.filter(agent =>
      `${agent.first_name} ${agent.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.brokerage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
            "h-9 p-1 justify-start text-left font-normal hover:bg-muted/50 max-w-[200px]",
            !value && "text-muted-foreground",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-[16px_1fr] items-start gap-2 min-w-0 h-full">
            <UserCheck className="h-3 w-3 mt-1 flex-shrink-0" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm leading-5 truncate w-full">
                {value ? `${value.first_name} ${value.last_name}` : placeholder}
              </span>
              {value?.brokerage && (
                <span className="text-xs text-muted-foreground leading-4 truncate w-full">
                  {value.brokerage}
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
              {agent.brokerage && (
                <div className="text-xs text-muted-foreground">
                  {agent.brokerage}
                </div>
              )}
              {agent.email && (
                <div className="text-xs text-muted-foreground">
                  {agent.email}
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