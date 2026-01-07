import * as React from "react";
import { UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/utils/formatters";
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
  const [searchTerm, setSearchTerm] = React.useState("");

  // Normalize text for search: lowercase and remove non-alphanumeric characters
  const normalizeForSearch = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Helper to check if an agent is the N/A agent
  const isNaAgent = (agent: Agent) => {
    const firstName = (agent.first_name || '').toLowerCase().trim();
    const lastName = (agent.last_name || '').toLowerCase().trim();
    const normalized = normalizeForSearch(`${firstName} ${lastName}`);
    return normalized.includes('notapplicable') || 
           firstName === 'n/a' || 
           firstName === 'na' ||
           (firstName === 'not' && lastName.includes('applicable'));
  };

  // Helper to check if an agent is the Developer agent
  const isDeveloperAgent = (agent: Agent) => {
    const firstName = (agent.first_name || '').toLowerCase().trim();
    return firstName === 'developer';
  };

  // Helper to check if an agent is the ReFi agent
  const isRefiAgent = (agent: Agent) => {
    const firstName = (agent.first_name || '').toLowerCase().trim();
    return firstName === 'refi';
  };

  // Combined check for any special agent
  const isSpecialAgent = (agent: Agent) => {
    return isNaAgent(agent) || isDeveloperAgent(agent) || isRefiAgent(agent);
  };

  // Separate special agents from others for pinning
  const naAgent = React.useMemo(() => agents.find(isNaAgent), [agents]);
  const developerAgent = React.useMemo(() => agents.find(isDeveloperAgent), [agents]);
  const refiAgent = React.useMemo(() => agents.find(isRefiAgent), [agents]);
  const otherAgents = React.useMemo(() => agents.filter(agent => !isSpecialAgent(agent)), [agents]);

  // Manual filtering for large agent lists
  const filteredAgents = React.useMemo(() => {
    if (!searchTerm.trim()) {
      // Show first 50 when no search
      return otherAgents.slice(0, 50);
    }
    const normalizedSearch = normalizeForSearch(searchTerm);
    const lowerSearch = searchTerm.toLowerCase();
    
    return otherAgents.filter(agent => {
      const firstName = (agent.first_name || '').toLowerCase();
      const lastName = (agent.last_name || '').toLowerCase();
      const brokerage = (agent.brokerage || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const reverseName = `${lastName} ${firstName}`;
      const normalizedName = normalizeForSearch(fullName);
      
      return fullName.includes(lowerSearch) ||
             reverseName.includes(lowerSearch) ||
             normalizedName.includes(normalizedSearch) ||
             firstName.includes(lowerSearch) ||
             lastName.includes(lowerSearch) ||
             brokerage.includes(lowerSearch);
    }).slice(0, 50); // Limit to 50 results for performance
  }, [otherAgents, searchTerm]);

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
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchTerm("");
    }}>
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
                {value ? (
                  isNaAgent(value) ? 'N/A' : 
                  isDeveloperAgent(value) ? 'Developer' :
                  isRefiAgent(value) ? 'ReFi' :
                  `${value.first_name} ${value.last_name}`
                ) : placeholder}
              </span>
              {value?.phone && !isSpecialAgent(value) && (
                <span className="text-xs text-muted-foreground leading-tight truncate w-full">
                  {formatPhone(value.phone)}
                </span>
              )}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search agents..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
          <CommandEmpty>
              {searchTerm.trim() 
                ? `No agents found for "${searchTerm}"` 
                : agents.length === 0 
                  ? "Loading agents..." 
                  : "Type to search or scroll below"}
            </CommandEmpty>
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
            {(naAgent || developerAgent || refiAgent) && !searchTerm.trim() && (
              <CommandGroup heading="Quick Select">
                {naAgent && (
                  <CommandItem
                    onSelect={() => handleSelect(naAgent)}
                    className="flex flex-col items-start p-3"
                  >
                    <div className="font-medium">N/A</div>
                  </CommandItem>
                )}
                {developerAgent && (
                  <CommandItem
                    onSelect={() => handleSelect(developerAgent)}
                    className="flex flex-col items-start p-3"
                  >
                    <div className="font-medium">Developer</div>
                  </CommandItem>
                )}
                {refiAgent && (
                  <CommandItem
                    onSelect={() => handleSelect(refiAgent)}
                    className="flex flex-col items-start p-3"
                  >
                    <div className="font-medium">ReFi</div>
                  </CommandItem>
                )}
              </CommandGroup>
            )}
            <CommandGroup heading={searchTerm.trim() ? `Results (${filteredAgents.length})` : "Agents (showing first 50)"}>
              {filteredAgents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  onSelect={() => handleSelect(agent)}
                  className="flex flex-col items-start p-3"
                >
                  <div className="font-medium">
                    {agent.first_name} {agent.last_name}
                  </div>
                  {agent.phone && (
                    <div className="text-xs text-muted-foreground">
                      {formatPhone(agent.phone)}
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
