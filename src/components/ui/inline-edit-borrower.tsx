import * as React from "react";
import { cn } from "@/lib/utils";

interface InlineEditBorrowerProps {
  value?: string;
  borrowerId?: string;
  onBorrowerClick?: (borrowerId: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditBorrower({
  value,
  borrowerId,
  onBorrowerClick,
  placeholder = "No borrower",
  className,
  disabled = false
}: InlineEditBorrowerProps) {
  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {value || placeholder}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center min-w-0 max-w-full", className)}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          if (borrowerId && onBorrowerClick) {
            onBorrowerClick(borrowerId);
          }
        }}
        className={cn(
          "text-sm px-1 py-1 rounded transition-colors truncate min-w-0 max-w-full block whitespace-nowrap overflow-hidden text-ellipsis",
          borrowerId ? "cursor-pointer hover:text-primary hover:bg-muted/50" : "text-muted-foreground"
        )}
        title={value || placeholder}
      >
        {value || placeholder}
      </span>
    </div>
  );
}
