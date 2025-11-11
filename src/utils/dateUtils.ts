import { format } from "date-fns";

export function formatDateModern(date: Date | string | null | undefined): string {
  if (!date) return "";
  
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
  
  if (isNaN(dateObj.getTime())) return "";
  
  return format(dateObj, "MMM dd");
}

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // If it's a date-only string (YYYY-MM-DD), parse it as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return "";
  
  return format(dateObj, "yyyy-MM-dd");
}