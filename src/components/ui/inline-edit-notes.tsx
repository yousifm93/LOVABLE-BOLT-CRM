import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface InlineEditNotesProps {
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export function InlineEditNotes({
  value,
  onValueChange,
  placeholder = "Add notes...",
  className,
  disabled = false,
  maxLength = 500
}: InlineEditNotesProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value || "");

  const handleSave = () => {
    onValueChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  if (disabled) {
    return (
      <div 
        className={cn("text-sm min-h-[36px] leading-relaxed p-1 rounded-md bg-muted/30 line-clamp-3 whitespace-normal", className)}
        title={value || undefined}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-1">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn("min-h-[60px] max-h-[120px] resize-none", className)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Press Ctrl+Enter to save, Esc to cancel</span>
          <span>{editValue.length}/{maxLength}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(value || "");
      }}
      className={cn(
        "text-sm text-left min-h-[36px] leading-relaxed w-full p-1 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border line-clamp-3 whitespace-normal",
        className
      )}
      title={value || undefined}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </button>
  );
}
