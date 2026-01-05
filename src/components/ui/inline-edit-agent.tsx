import * as React from "react";
import { UserCheck, X } from "lucide-react";
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

  // Helper to check if an agent is the N/A agent
  const isNaAgent = (agent: Agent) => {
    const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
    return fullName.includes('n/a') && fullName.includes('not applicable');
  };

  // Separate N/A agent from others for pinning
  const naAgent = React.useMemo(() => agents.find(isNaAgent), [agents]);
  const otherAgents = React.useMemo(() => agents.filter(agent => !isNaAgent(agent)), [agents]);

  const handleSelect = (agent: Agent) => {
    onValueChange(agent);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(null);
    setOpen(false);
  };

  // Build searchable value for Command filtering
  const getSearchValue = (agent: Agent) => {
    return [
      agent.first_name || '',
      agent.last_name || '',
      agent.brokerage || '',
      agent.email || '',
      agent.phone || ''
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
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>No agents found</CommandEmpty>
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
            {naAgent && (
              <CommandGroup heading="Quick Select">
                <CommandItem
                  value={getSearchValue(naAgent)}
                  onSelect={() => handleSelect(naAgent)}
                  className="flex flex-col items-start p-3"
                >
                  <div className="font-medium">
                    {naAgent.first_name} {naAgent.last_name}
                  </div>
                  {naAgent.phone && (
                    <div className="text-xs text-muted-foreground">
                      {naAgent.phone}
                    </div>
                  )}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Agents">
              {otherAgents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={getSearchValue(agent)}
                  onSelect={() => handleSelect(agent)}
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
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
