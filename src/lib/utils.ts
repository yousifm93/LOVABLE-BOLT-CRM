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

// Known acronyms that should stay uppercase in lender names
const LENDER_ACRONYMS = ['EPM', 'PRMG', 'UWM', 'FEMBI', 'BAC', 'A&D'];

/**
 * Converts lender names from ALL CAPS to title case, preserving known acronyms
 * @param name - Lender name to convert
 * @returns Title-cased lender name with acronyms preserved
 * 
 * Examples:
 * - "ACRA" → "Acra"
 * - "ANGEL OAK" → "Angel Oak"
 * - "EPM" → "EPM" (acronym preserved)
 * - "UWM" → "UWM" (acronym preserved)
 * - "BB AMERICAS" → "BB Americas"
 */
export function toLenderTitleCase(name: string): string {
  if (!name) return name;
  
  // Check if entire name is a known acronym
  if (LENDER_ACRONYMS.includes(name.toUpperCase())) {
    return name.toUpperCase();
  }
  
  // Split by spaces and convert each word
  return name.split(' ').map(word => {
    const upper = word.toUpperCase();
    // Keep acronyms uppercase
    if (LENDER_ACRONYMS.includes(upper)) {
      return upper;
    }
    // Keep 2-letter words uppercase (likely acronyms like BB, TD, etc.)
    if (word.length <= 2) {
      return upper;
    }
    // Title case: first letter uppercase, rest lowercase
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}
