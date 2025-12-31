import { useMemo } from "react";

interface TaskDueDateDisplayProps {
  dueDate?: string | null;
  className?: string;
}

/**
 * Read-only display component for showing the earliest task due date.
 * Displays dates with color coding:
 * - Red: overdue
 * - Amber: due today
 * - Gray: future date
 * - Gray dash: no tasks
 */
export function TaskDueDateDisplay({ dueDate, className }: TaskDueDateDisplayProps) {
  const { formattedDate, colorClass } = useMemo(() => {
    if (!dueDate) {
      return { formattedDate: "-", colorClass: "text-muted-foreground" };
    }

    const dateStr = dueDate.includes("T") ? dueDate : `${dueDate}T00:00:00`;
    const date = new Date(dateStr);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDateObj = new Date(date);
    dueDateObj.setHours(0, 0, 0, 0);
    
    const isOverdue = dueDateObj.getTime() < today.getTime();
    const isToday = dueDateObj.getTime() === today.getTime();
    
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    let color = "text-muted-foreground";
    if (isOverdue) {
      color = "text-destructive font-medium";
    } else if (isToday) {
      color = "text-amber-600 font-medium";
    }
    
    return { formattedDate: formatted, colorClass: color };
  }, [dueDate]);

  return (
    <span className={`text-sm ${colorClass} ${className || ""}`}>
      {formattedDate}
    </span>
  );
}
