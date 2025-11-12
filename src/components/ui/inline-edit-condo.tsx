import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Condo {
  id: string;
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
}

interface InlineEditCondoProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function InlineEditCondo({
  value,
  onValueChange,
  placeholder = "Select condo...",
  className,
}: InlineEditCondoProps) {
  const [open, setOpen] = useState(false);
  const [condos, setCondos] = useState<Condo[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCondos();
  }, []);

  useEffect(() => {
    if (value && condos.length > 0) {
      const condo = condos.find((c) => c.id === value);
      setSelectedCondo(condo || null);
    } else {
      setSelectedCondo(null);
    }
  }, [value, condos]);

  const loadCondos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("condos")
      .select("id, condo_name, street_address, city, state")
      .order("condo_name", { ascending: true });

    if (!error && data) {
      setCondos(data);
    }
    setLoading(false);
  };

  const handleSelect = (condoId: string) => {
    const newValue = condoId === value ? null : condoId;
    onValueChange(newValue);
    setOpen(false);
  };

  const formatCondoDisplay = (condo: Condo) => {
    const parts = [condo.condo_name];
    if (condo.city && condo.state) {
      parts.push(`${condo.city}, ${condo.state}`);
    } else if (condo.street_address) {
      parts.push(condo.street_address);
    }
    return parts.join(" - ");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedCondo ? (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {formatCondoDisplay(selectedCondo)}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search condos..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading condos..." : "No condo found."}
            </CommandEmpty>
            <CommandGroup>
              {condos.map((condo) => (
                <CommandItem
                  key={condo.id}
                  value={`${condo.condo_name} ${condo.street_address || ""} ${condo.city || ""} ${condo.state || ""}`}
                  onSelect={() => handleSelect(condo.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === condo.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{condo.condo_name}</span>
                    {(condo.city || condo.street_address) && (
                      <span className="text-xs text-muted-foreground">
                        {condo.street_address && `${condo.street_address}`}
                        {condo.city && condo.state && ` - ${condo.city}, ${condo.state}`}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
