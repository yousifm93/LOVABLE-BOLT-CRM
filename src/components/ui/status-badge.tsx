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
  
  // LEADS BOARD STATUSES
  if (statusLower === 'working on it') return 'bg-green-300 text-green-900'; // Light Green
  if (statusLower === 'converted') return 'bg-blue-500 text-white'; // Blue
  if (statusLower === 'nurture') return 'bg-orange-400 text-white'; // Orange
  if (statusLower === 'dead') return 'bg-red-400 text-white'; // Red
  
  // PENDING APP STATUSES
  if (statusLower === 'pending app') return 'bg-green-300 text-green-900'; // Light Green
  if (statusLower === 'app complete') return 'bg-green-600 text-white'; // Dark Green
  if (statusLower === 'standby') return 'bg-pink-400 text-white'; // Pink
  if (statusLower === 'dna') return 'bg-red-400 text-white'; // Red
  
  // SCREENING STATUSES
  if (statusLower === 'just applied') return 'bg-green-300 text-green-900'; // Light Green
  if (statusLower === 'screening') return 'bg-blue-500 text-white'; // Blue
  if (statusLower === 'pre-qualified') return 'bg-green-600 text-white'; // Dark Green
  
  // PRE-QUALIFIED STATUSES
  if (statusLower === 'ready for pre-approval') return 'bg-blue-500 text-white'; // Blue
  if (statusLower === 'pre-approved') return 'bg-green-600 text-white'; // Dark Green
  
  // PRE-APPROVED STATUSES
  if (statusLower === 'new') return 'bg-green-300 text-green-900'; // Light Green
  if (statusLower === 'shopping') return 'bg-blue-500 text-white'; // Blue
  if (statusLower === 'offers out') return 'bg-orange-400 text-white'; // Orange
  if (statusLower === 'under contract') return 'bg-green-600 text-white'; // Dark Green
  if (statusLower === 'incoming') return 'bg-purple-400 text-white'; // Purple
  if (statusLower === 'long term' || statusLower === 'long-term') return 'bg-pink-400 text-white'; // Pink
  
  // ACTIVE BOARD STATUSES (loan_status)
  if (statusLower === 'new' || statusLower === 'new rfp') return 'bg-green-300 text-green-900'; // Light Green
  if (statusLower === 'rfp') return 'bg-blue-400 text-white'; // Light Blue
  if (statusLower === 'sub' || statusLower === 'suv') return 'bg-blue-500 text-white'; // Blue
  if (statusLower === 'awc') return 'bg-orange-400 text-white'; // Orange
  if (statusLower === 'ctc') return 'bg-green-600 text-white'; // Dark Green
  
  // PAST CLIENTS STATUSES
  if (statusLower === 'closed') return 'bg-green-600 text-white'; // Dark Green
  if (statusLower === 'need support') return 'bg-orange-400 text-white'; // Orange
  if (statusLower === 'new lead') return 'bg-blue-500 text-white'; // Blue
  
  // Lead strength colors (High=green, Medium=yellow, Low=red)
  if (statusLower === 'high') return 'bg-success text-success-foreground';
  if (statusLower === 'medium') return 'bg-warning text-warning-foreground';
  if (statusLower === 'low') return 'bg-destructive text-destructive-foreground';
  
  // Task status colors
  if (statusLower === 'done') return 'bg-success text-success-foreground';
  if (statusLower === 'in progress') return 'bg-info text-info-foreground';
  if (statusLower === 'open') return 'bg-muted text-muted-foreground';
  if (statusLower.includes('help')) return 'bg-destructive text-destructive-foreground';
  
  // Default fallback
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