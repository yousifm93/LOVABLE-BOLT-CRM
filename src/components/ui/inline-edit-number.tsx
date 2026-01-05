import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface InlineEditNumberProps {
  value: number | null;
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  suffix?: string;
}

export function InlineEditNumber({
  value,
  onValueChange,
  placeholder = "0",
  className,
  disabled = false,
  min,
  max,
  suffix
}: InlineEditNumberProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value?.toString() || "");

  const handleSave = () => {
    const newValue = parseFloat(editValue) || 0;
    if (min !== undefined && newValue < min) return;
    if (max !== undefined && newValue > max) return;
    onValueChange(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {value !== null && value !== undefined ? `${value}${suffix || ''}` : "—"}
      </span>
    );
  }

  if (isEditing) {
    return (
      <Input
        type="number"
        step="any"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("h-8 w-16", className)}
        min={min}
        max={max}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        "text-sm p-1 rounded hover:bg-muted/50 text-left",
        className
      )}
    >
      {value !== null && value !== undefined ? `${value}${suffix || ''}` : "—"}
    </button>
  );
}