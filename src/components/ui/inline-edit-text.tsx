import { useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineEditTextProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditText({
  value,
  onValueChange,
  placeholder = "Enter text",
  className,
  disabled = false,
}: InlineEditTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    onValueChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (disabled) {
    return <span className="text-sm">{value || "—"}</span>;
  }

  if (!isEditing) {
    return (
      <div
        className={cn(
          "group flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        <span className="text-sm">{value || placeholder}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        autoFocus
        className="h-8 text-sm"
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={handleSave}
      >
        <Check className="h-4 w-4 text-success" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={handleCancel}
      >
        <X className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
