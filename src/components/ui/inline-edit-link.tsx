import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";

interface InlineEditLinkProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineEditLink({
  value,
  onValueChange,
  placeholder = "Enter URL",
  className,
  disabled = false
}: InlineEditLinkProps) {
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
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value) {
      window.open(value, '_blank');
    }
  };

  if (disabled) {
    return (
      <div className={cn("flex items-center", className)}>
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-primary hover:underline"
            onClick={handleLinkClick}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Portal
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <Input
        type="url"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("h-8", className)}
        placeholder={placeholder}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (value) {
          handleLinkClick(e);
        } else {
          setIsEditing(true);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        "flex items-center text-sm p-1 rounded hover:bg-muted/50 text-left",
        className
      )}
    >
      {value ? (
        <>
          <ExternalLink className="h-3 w-3 mr-1 text-primary" />
          <span className="text-primary hover:underline">Portal</span>
        </>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
    </button>
  );
}