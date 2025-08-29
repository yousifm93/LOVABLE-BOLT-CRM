import { format } from "date-fns";

export function formatDateModern(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";
  
  return format(dateObj, "MMM dd").toUpperCase();
}

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";
  
  return format(dateObj, "yyyy-MM-dd");
}