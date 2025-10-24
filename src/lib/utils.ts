import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a numeric input by removing formatting characters
 * @param input - String or number to sanitize
 * @returns Number or null if invalid
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  // If already a number, return it
  if (typeof input === 'number') return isNaN(input) ? null : input;
  
  // Convert to string and remove all non-numeric characters except . and -
  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  
  // Parse the cleaned string
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}
