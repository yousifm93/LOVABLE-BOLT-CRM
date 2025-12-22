import * as React from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { parseFileUpdatesByDate } from "@/utils/fileUpdatesParser";
import { cn } from "@/lib/utils";

interface FileUpdatesDisplayProps {
  content: string;
  onClick?: () => void;
}

/**
 * Renders file updates with today's entries visible and older entries in a collapsible section
 */
export function FileUpdatesDisplay({ content, onClick }: FileUpdatesDisplayProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const { todayUpdates, olderUpdates, olderCount } = parseFileUpdatesByDate(content);

  // Render a single entry with bolded timestamps
  const renderEntry = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/(\[\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\])/gi);
      return (
        <p key={`${keyPrefix}-${i}`} className="mb-1 last:mb-0">
          {parts.map((part, j) => 
            /^\[\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\]$/i.test(part) 
              ? <span key={j} className="font-bold">{part}</span> 
              : part
          ) || <br />}
        </p>
      );
    });
  };

  // If no parsed entries, show raw content
  if (todayUpdates.length === 0 && olderUpdates.length === 0) {
    return (
      <div 
        className="bg-white rounded-md p-2 text-xs border cursor-pointer hover:border-primary/50 transition-colors min-h-[80px]"
        onClick={onClick}
      >
        {content.split('\n').map((line, i) => (
          <p key={i} className="mb-1 last:mb-0">{line || <br />}</p>
        ))}
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-md p-2 text-xs border cursor-pointer hover:border-primary/50 transition-colors min-h-[80px]"
      onClick={(e) => {
        // Only trigger onClick if not clicking on the collapsible trigger
        if (!(e.target as HTMLElement).closest('[data-history-trigger]')) {
          onClick?.();
        }
      }}
    >
      {/* Today's Updates */}
      {todayUpdates.length > 0 ? (
        <div className="space-y-1">
          {todayUpdates.map((entry, i) => (
            <div key={`today-${i}`}>
              {renderEntry(entry, `today-${i}`)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground italic mb-2">No updates today</p>
      )}

      {/* Older Updates - Collapsible */}
      {olderCount > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger 
            data-history-trigger
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 pt-2 border-t w-full",
              "transition-colors cursor-pointer"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {historyOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>View History ({olderCount} older {olderCount === 1 ? 'entry' : 'entries'})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
            {olderUpdates.map((entry, i) => (
              <div key={`older-${i}`} className="pl-2 border-l-2 border-muted">
                {renderEntry(entry, `older-${i}`)}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
