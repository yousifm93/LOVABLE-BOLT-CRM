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
  
  // Converted status colors (green/yellow/red scheme)
  if (statusLower === 'working on it') return 'bg-success/20 text-success';
  if (statusLower === 'converted') return 'bg-success text-success-foreground';
  if (statusLower === 'nurture') return 'bg-warning text-warning-foreground';
  if (statusLower === 'dead') return 'bg-destructive text-destructive-foreground';
  
  // Lead strength colors (High=green, Medium=yellow, Low=red)
  if (statusLower === 'high') return 'bg-success text-success-foreground';
  if (statusLower === 'medium') return 'bg-warning text-warning-foreground';
  if (statusLower === 'low') return 'bg-destructive text-destructive-foreground';
  
  // Referred via colors - now unified to avoid per-option color changes
  if (statusLower === 'email' || statusLower === 'text' || statusLower === 'call' || statusLower === 'web' || statusLower === 'in person') {
    return 'bg-muted text-muted-foreground';
  }
  
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
  const isTaskStatus = ['working on it', 'done', 'need help'].includes(status.toLowerCase());
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-xs font-medium transition-colors",
        variant === "square" ? "rounded" : "rounded-full",
        isGrayPriority ? "w-16 justify-center" : "", // Consistent width for priorities
        isTaskStatus ? "w-28 justify-center" : "", // Consistent width for task statuses
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