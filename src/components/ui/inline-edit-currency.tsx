import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface InlineEditCurrencyProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  compareValue?: number | null;
  showDifference?: boolean;
}

export function InlineEditCurrency({
  value,
  onValueChange,
  placeholder = "$0",
  className,
  disabled = false,
  compareValue,
  showDifference = false
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

  const formatCurrencyWithComparison = (
    amount: number | null,
    compareVal: number | null,
    showDiff: boolean
  ) => {
    if (!amount) return "-";

    const formatted = formatCurrency(amount);

    if (!showDiff || !compareVal) return formatted;

    const difference = amount - compareVal;
    const isEqual = difference === 0;
    const isGreater = difference > 0;

    const color = isEqual || isGreater ? 'text-green-600' : 'text-red-600';
    const sign = isGreater ? '+' : '';
    const diffFormatted = formatCurrency(Math.abs(difference));

    return (
      <span className={color}>
        {formatted} <span className="text-xs">({sign}{difference >= 0 ? diffFormatted.replace('$', '$') : `-${diffFormatted.replace('$', '$')}`})</span>
      </span>
    );
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
      {formatCurrencyWithComparison(value, compareValue || null, showDifference)}
    </button>
  );
}