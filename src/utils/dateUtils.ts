import { format } from "date-fns";

/**
 * Parse a date string as LOCAL date (not UTC).
 * Handles both date-only strings (YYYY-MM-DD) and ISO timestamps.
 */
export function parseLocalDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // If it's a date-only string (YYYY-MM-DD), parse it as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  return isNaN(dateObj.getTime()) ? null : dateObj;
}

export function formatDateModern(date: Date | string | null | undefined): string {
  const dateObj = parseLocalDate(date);
  if (!dateObj) return "";
  
  return format(dateObj, "MMM dd");
}

export function formatDateForInput(date: Date | string | null | undefined): string {
  const dateObj = parseLocalDate(date);
  if (!dateObj) return "";
  
  return format(dateObj, "yyyy-MM-dd");
}

/**
 * Format date with full year (e.g., "Dec 19, 2025")
 */
export function formatDateFull(date: Date | string | null | undefined): string {
  const dateObj = parseLocalDate(date);
  if (!dateObj) return "";
  
  return format(dateObj, "MMM d, yyyy");
}