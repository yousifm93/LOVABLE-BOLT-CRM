import { useState } from "react";
import { Check, X, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InlineEditDateTimeProps {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  className?: string;
}

export function InlineEditDateTime({ value, onValueChange, className }: InlineEditDateTimeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");

  const formatDateTime = (val: string | null | undefined) => {
    if (!val) return "-";
    try {
      const date = new Date(val);
      return format(date, "MMM dd h:mm a");
    } catch {
      return "-";
    }
  };

  const handleOpen = () => {
    if (value) {
      try {
        const date = new Date(value);
        setDateValue(format(date, "yyyy-MM-dd"));
        setTimeValue(format(date, "HH:mm"));
      } catch {
        setDateValue("");
        setTimeValue("");
      }
    } else {
      setDateValue("");
      setTimeValue("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (dateValue && timeValue) {
      const combined = `${dateValue}T${timeValue}:00`;
      onValueChange(combined);
    } else if (!dateValue && !timeValue) {
      onValueChange(null);
    }
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
          className={`text-left hover:bg-accent/50 px-2 py-1 rounded transition-colors whitespace-nowrap ${className}`}
        >
          <span className="text-sm">{formatDateTime(value)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <Label htmlFor="date" className="text-sm flex items-center gap-2 mb-2">
              <CalendarIcon className="h-3 w-3" />
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="time" className="text-sm flex items-center gap-2 mb-2">
              <Clock className="h-3 w-3" />
              Time
            </Label>
            <Input
              id="time"
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
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
