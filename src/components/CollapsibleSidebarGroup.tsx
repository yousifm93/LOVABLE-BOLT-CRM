import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollapsibleSidebarGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSidebarGroup({ 
  title, 
  children, 
  defaultOpen = true,
  className 
}: CollapsibleSidebarGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel className="flex items-center justify-between w-full p-0">
        <span className="text-xs uppercase tracking-wider text-sidebar-foreground/70 font-semibold">
          {title}
        </span>
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
      </SidebarGroupLabel>
      <SidebarGroupContent 
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}