import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
}

interface InlineEditContactProps {
  value: string | null;
  contacts: Contact[];
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InlineEditContact({
  value,
  contacts,
  onValueChange,
  disabled = false,
  placeholder = "Select contact..."
}: InlineEditContactProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const search = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(search) ||
      contact.company?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search)
    );
  }, [contacts, searchTerm]);

  const handleSelect = (contactId: string) => {
    onValueChange(contactId);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(null);
    setSearchTerm("");
  };

  const selectedContact = contacts.find(c => c.id === value);

  if (disabled) {
    return (
      <div className="text-sm text-muted-foreground">
        {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : placeholder}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-xs h-8"
        >
          <span className="truncate">
            {selectedContact 
              ? `${selectedContact.first_name} ${selectedContact.last_name}${selectedContact.company ? ` (${selectedContact.company})` : ''}`
              : placeholder
            }
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <DropdownMenuItem
                key={contact.id}
                onClick={() => handleSelect(contact.id)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-3 w-3",
                    value === contact.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {contact.first_name} {contact.last_name}
                  </span>
                  {contact.company && (
                    <span className="text-xs text-muted-foreground">{contact.company}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
