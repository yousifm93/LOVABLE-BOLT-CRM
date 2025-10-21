import { useState } from "react";
import { Check, X, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InlineEditPercentageProps {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  className?: string;
  decimals?: number;
}

export function InlineEditPercentage({ value, onValueChange, className, decimals = 2 }: InlineEditPercentageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState("");

  const formatPercentage = (val: number | null | undefined) => {
    if (!val && val !== 0) return "-";
    return `${val.toFixed(decimals)}%`;
  };

  const handleOpen = () => {
    setEditValue(value?.toString() || "");
    setIsOpen(true);
  };

  const handleSave = () => {
    const numValue = editValue ? parseFloat(editValue.replace(/[^0-9.-]+/g, "")) : null;
    onValueChange(numValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleOpen}
          className={`text-left hover:bg-accent/50 px-2 py-1 rounded transition-colors ${className}`}
        >
          <span className="font-medium">{formatPercentage(value)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              placeholder="0.00"
              className="pr-9"
              autoFocus
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1">
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
