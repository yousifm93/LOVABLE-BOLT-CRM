import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface InlineEditCurrencyProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditCurrency({
  value,
  onValueChange,
  placeholder = "$0",
  className,
  disabled = false
}: InlineEditCurrencyProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value?.toString() || "");

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSave = () => {
    const numericValue = parseFloat(editValue.replace(/[$,]/g, '')) || null;
    onValueChange(numericValue);
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
        {formatCurrency(value)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <Input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("h-8 w-24", className)}
        placeholder="$0"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(value?.toString() || "");
      }}
      className={cn(
        "text-sm p-1 rounded hover:bg-muted/50 text-left",
        className
      )}
    >
      {formatCurrency(value)}
    </button>
  );
}