import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InlineEditBooleanProps {
  value: boolean | null | undefined;
  onValueChange: (value: boolean | null) => void;
  className?: string;
}

export function InlineEditBoolean({ value, onValueChange, className }: InlineEditBooleanProps) {
  const handleToggle = () => {
    if (value === true) {
      onValueChange(false);
    } else if (value === false) {
      onValueChange(null);
    } else {
      onValueChange(true);
    }
  };

  const getBadgeContent = () => {
    if (value === true) {
      return (
        <Badge variant="default" className="cursor-pointer">
          <Check className="h-3 w-3 mr-1" />
          Yes
        </Badge>
      );
    } else if (value === false) {
      return (
        <Badge variant="secondary" className="cursor-pointer">
          <X className="h-3 w-3 mr-1" />
          No
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="cursor-pointer">
          -
        </Badge>
      );
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center transition-opacity hover:opacity-80 ${className}`}
    >
      {getBadgeContent()}
    </button>
  );
}
