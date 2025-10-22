import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditPhoneProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Format phone number as (XXX) XXX-XXXX
const formatPhoneDisplay = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return value;
};

// Strip all non-numeric characters
const stripPhoneFormat = (value: string): string => {
  return value.replace(/\D/g, '');
};

export function InlineEditPhone({
  value,
  onValueChange,
  placeholder = "Enter phone",
  className,
  disabled = false,
}: InlineEditPhoneProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (isEditing) {
      setEditValue(value || "");
    }
  }, [isEditing, value]);

  const handleSave = () => {
    const stripped = stripPhoneFormat(editValue);
    const finalValue = stripped.length > 0 ? stripped : null;
    onValueChange(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleaned = stripPhoneFormat(input);
    
    // Only allow up to 10 digits
    if (cleaned.length <= 10) {
      setEditValue(input);
    }
  };

  const displayValue = value ? formatPhoneDisplay(value) : "";

  if (disabled) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        {displayValue || "—"}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          type="tel"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 text-sm w-36"
          autoFocus
          onFocus={(e) => e.target.select()}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleSave}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "h-7 px-2 py-1 justify-start font-normal hover:bg-muted/50 text-sm whitespace-nowrap",
        !value && "text-muted-foreground",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {displayValue || (
        <span className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" />
          {placeholder}
        </span>
      )}
    </Button>
  );
}
