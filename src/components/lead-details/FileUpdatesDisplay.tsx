import * as React from "react";
import { cn } from "@/lib/utils";

interface FileUpdatesDisplayProps {
  content: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Simple display for file updates - click to edit, shows content in a clean box
 */
export function FileUpdatesDisplay({ content, onClick, className }: FileUpdatesDisplayProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors min-h-[100px] whitespace-pre-wrap",
        className
      )}
      onClick={onClick}
    >
      {content ? (
        <p className="leading-relaxed text-foreground">{content}</p>
      ) : (
        <p className="text-muted-foreground italic">Click to add notes...</p>
      )}
    </div>
  );
}
