import { useState } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CollapsibleSidebarGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  locked?: boolean;
  badgeCount?: number;
}

export function CollapsibleSidebarGroup({ 
  title, 
  children, 
  defaultOpen = true,
  className,
  locked = false,
  badgeCount,
}: CollapsibleSidebarGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <SidebarGroup className={cn(className, locked && "opacity-50 pointer-events-none")}>
      <SidebarGroupLabel className="flex items-center justify-between w-full p-0">
        <span className={cn(
          "text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5",
          locked ? "text-sidebar-foreground/40" : "text-sidebar-foreground/70"
        )}>
          {title}
          {locked && <Lock className="h-3 w-3" />}
          {!locked && badgeCount && badgeCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-xs">
              {badgeCount}
            </Badge>
          )}
        </span>
        {!locked && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-4 w-4 p-0 hover:bg-sidebar-accent"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
      </SidebarGroupLabel>
      <SidebarGroupContent 
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen && !locked ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}