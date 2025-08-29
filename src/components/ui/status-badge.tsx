import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "square";
  className?: string;
  onClick?: () => void;
  forceGray?: boolean;
}

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  // Converted status colors
  if (statusLower.includes('working')) return 'bg-info text-info-foreground';
  if (statusLower.includes('pending')) return 'bg-warning text-warning-foreground';
  if (statusLower.includes('nurture')) return 'bg-accent text-accent-foreground';
  if (statusLower.includes('dead')) return 'bg-muted text-muted-foreground';
  if (statusLower.includes('attention')) return 'bg-destructive text-destructive-foreground';
  
  // Referred via colors
  if (statusLower === 'email') return 'bg-blue-500 text-white';
  if (statusLower === 'text') return 'bg-green-500 text-white';
  if (statusLower === 'call') return 'bg-purple-500 text-white';
  if (statusLower === 'web') return 'bg-indigo-500 text-white';
  if (statusLower === 'in-person') return 'bg-orange-500 text-white';
  
  // Priority colors - all gray for consistency
  if (statusLower === 'high') return 'bg-muted text-muted-foreground';
  if (statusLower === 'medium') return 'bg-muted text-muted-foreground';
  if (statusLower === 'low') return 'bg-muted text-muted-foreground';
  
  // Task status colors
  if (statusLower === 'done') return 'bg-success text-success-foreground';
  if (statusLower === 'in progress') return 'bg-info text-info-foreground';
  if (statusLower === 'open') return 'bg-muted text-muted-foreground';
  if (statusLower.includes('help')) return 'bg-destructive text-destructive-foreground';
  
  return 'bg-muted text-muted-foreground';
};

export function StatusBadge({ status, variant = "square", className, onClick, forceGray = false }: StatusBadgeProps) {
  const colorClass = forceGray ? 'bg-muted text-muted-foreground' : getStatusColor(status);
  const isGrayPriority = ['high', 'medium', 'low'].includes(status.toLowerCase());
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-xs font-medium transition-colors",
        variant === "square" ? "rounded" : "rounded-full",
        isGrayPriority ? "w-16 justify-center" : "", // Consistent width for priorities
        colorClass,
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={onClick}
    >
      {status}
    </span>
  );
}